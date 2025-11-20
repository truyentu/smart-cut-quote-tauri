/**
 * Main DXF to JSON Converter
 *
 * Orchestrates the entire conversion process:
 * 1. Parse DXF files
 * 2. Extract entities
 * 3. Build contours
 * 4. Convert to polygon points
 * 5. Detect exterior vs holes
 * 6. Format as sparroWASM JSON
 *
 * Based on: docs/MVP_DXF_TO_JSON_CONVERTER.md
 */

import { parseDxf, extractEntities, validateDxf, getEntityStats, filterEntitiesByType } from './dxfParser.js';
import { buildContours, separateExteriorAndHoles, validateContours } from './contourBuilder.js';
import { arcToPoints, circleToPoints, splineToPoints, calculateSignedArea, detectShape } from './geometryUtils.js';
import { formatSparrowJson, validateSparrowJson } from './jsonFormatter.js';

/**
 * Convert multiple DXF files to sparroWASM JSON format
 *
 * @param {Array} files - Array of file objects: {name: string, content: string}
 * @param {Object} settings - Conversion settings
 * @returns {Promise<Object>} {success, json, errors, warnings}
 */
export async function convertDxfToJson(files, settings = {}) {
  const defaultSettings = {
    bin: {
      width: 1500,
      height: 6000
    },
    spacing: 5,
    arcSegments: 32,        // Increased from 16 to 32 for smoother arcs
    splineSegments: 100,    // CRITICAL: 100 segments for SPLINE to avoid long edges (was causing unreachable error)
    allowRotations: true,
    rotationSteps: 4,
    tolerance: 0.1,
    autoClose: true
  };

  const config = { ...defaultSettings, ...settings };

  const items = [];
  const errors = [];
  const warnings = [];

  // Process each DXF file
  for (let i = 0; i < files.length; i++) {
    const fileObj = files[i];
    // Handle both old format (File objects) and new format (objects with file and quantity)
    const file = fileObj.file || fileObj;
    const quantity = fileObj.quantity || 1;

    try {
      console.log(`Processing file ${i + 1}/${files.length}: ${file.name} (quantity: ${quantity})`);

      // Step 1: Parse DXF
      const parseResult = parseDxf(file.content);

      if (!parseResult.success) {
        errors.push({
          file: file.name,
          stage: 'parsing',
          message: parseResult.error
        });
        continue;
      }

      const dxf = parseResult.data;

      // Step 2: Validate DXF
      const validation = validateDxf(dxf);

      if (!validation.valid) {
        errors.push({
          file: file.name,
          stage: 'validation',
          message: validation.errors.join('; ')
        });
        continue;
      }

      if (validation.warnings && validation.warnings.length > 0) {
        warnings.push(...validation.warnings.map(w => ({
          file: file.name,
          message: w
        })));
      }

      // Step 3: Extract entities
      const allEntities = extractEntities(dxf);

      // Filter to supported types only
      const supportedTypes = ['LINE', 'CIRCLE', 'ARC', 'LWPOLYLINE', 'POLYLINE', 'SPLINE'];
      const entities = filterEntitiesByType(allEntities, supportedTypes);

      console.log(`  Entities: ${entities.length} (${allEntities.length} total)`);

      if (entities.length === 0) {
        errors.push({
          file: file.name,
          stage: 'extraction',
          message: 'No supported entities found'
        });
        continue;
      }

      // Step 4: Build contours
      const contours = buildContours(entities, {
        tolerance: config.tolerance || 0.5,  // Increased default tolerance for better LINE connection
        autoClose: config.autoClose,
        minContourLength: 1  // Allow single entity or multiple LINEs
      });

      console.log(`  Contours: ${contours.length}`);

      // Validate contours
      const contourValidation = validateContours(contours);

      if (!contourValidation.valid) {
        errors.push({
          file: file.name,
          stage: 'contour building',
          message: contourValidation.errors.join('; ')
        });
        continue;
      }

      if (contourValidation.warnings.length > 0) {
        warnings.push(...contourValidation.warnings.map(w => ({
          file: file.name,
          message: w
        })));
      }

      // Step 5: Convert contours to polygon points
      const polygons = contours.map(contour =>
        contourToPolygon(contour, config.arcSegments, config.splineSegments)
      );

      // Step 6: Detect exterior vs holes
      const shape = detectShapeFromPolygons(polygons);

      // Step 6.5: Validate polygon for degenerate cases
      const polygonValidation = validatePolygon(shape.exterior, file.name);
      if (polygonValidation.warnings.length > 0) {
        warnings.push(...polygonValidation.warnings.map(w => ({
          file: file.name,
          message: w
        })));
      }
      if (!polygonValidation.valid) {
        errors.push({
          file: file.name,
          stage: 'polygon validation',
          message: polygonValidation.errors.join('; ')
        });
        continue;
      }

      // Step 7: Create item for this file
      const item = {
        id: i,  // Start from 0 (required by sparroWASM)
        quantity: quantity,  // Use quantity from file object
        shape: {
          exterior: shape.exterior,
          interiors: shape.holes
        },
        allowed_rotations: config.allowRotations
          ? [0, 90, 180, 270]
          : [0],
        metadata: {
          filename: file.name,
          originalEntityCount: allEntities.length,
          contourCount: contours.length,
          boundingBox: shape.boundingBox
        }
      };

      items.push(item);
      console.log(`  ✓ Successfully converted ${file.name}`);

    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
      errors.push({
        file: file.name,
        stage: 'conversion',
        message: error.message
      });
    }
  }

  // Step 8: Format final JSON
  if (items.length === 0) {
    return {
      success: false,
      json: null,
      errors,
      warnings,
      message: 'No items were successfully converted'
    };
  }

  const json = formatSparrowJson(items, config);

  // Step 9: Validate output JSON
  const jsonValidation = validateSparrowJson(json);

  if (!jsonValidation.valid) {
    return {
      success: false,
      json: null,
      errors: [...errors, ...jsonValidation.errors.map(e => ({
        file: 'output',
        stage: 'json validation',
        message: e
      }))],
      warnings,
      message: 'Generated JSON is invalid'
    };
  }

  return {
    success: true,
    json,
    errors,
    warnings,
    stats: {
      totalFiles: files.length,
      successfulFiles: items.length,
      failedFiles: errors.length,
      totalItems: items.length
    }
  };
}

/**
 * Convert a single contour to polygon points
 * CRITICAL: Polygon MUST be CLOSED (first point == last point) for sparroWASM
 * @param {Object} contour - Contour object with entities
 * @param {number} arcSegments - Number of segments for arcs/circles
 * @param {number} splineSegments - Number of segments for splines (default: 100)
 * @returns {Array} Array of [x, y] points
 */
function contourToPolygon(contour, arcSegments = 16, splineSegments = 100) {
  const points = [];

  contour.entities.forEach(entity => {
    const entityPoints = entityToPoints(entity, arcSegments, splineSegments);

    // Add points, avoiding duplicates at connection points
    entityPoints.forEach((point, index) => {
      // Skip first point if it matches last added point (continuity)
      if (index === 0 && points.length > 0) {
        const lastPoint = points[points.length - 1];
        const distance = Math.sqrt(
          Math.pow(point[0] - lastPoint[0], 2) +
          Math.pow(point[1] - lastPoint[1], 2)
        );

        if (distance < 0.01) {
          return; // Skip duplicate
        }
      }

      points.push(point);
    });
  });

  // CRITICAL FIX: Ensure polygon is CLOSED (first point == last point)
  // sparroWASM requires this!
  if (points.length > 0) {
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    const distance = Math.sqrt(
      Math.pow(lastPoint[0] - firstPoint[0], 2) +
      Math.pow(lastPoint[1] - firstPoint[1], 2)
    );

    // If not already closed, add closing point
    if (distance > 0.01) {
      points.push([firstPoint[0], firstPoint[1]]);
      console.log('  Closed polygon by adding closing point');
    }
  }

  // CRITICAL FIX: Subdivide ALL long edges (including closing edge!)
  // This prevents numerical instability in sparroWASM
  // Max edge length: 20 units (prevents edge ratio > 10x)
  const maxEdgeLength = 20.0;
  const subdivided = subdivideAllLongEdges(points, maxEdgeLength);

  if (subdivided.length !== points.length) {
    console.log(`  Subdivided polygon: ${points.length} → ${subdivided.length} points (added ${subdivided.length - points.length} points to split long edges)`);
  }

  return subdivided;
}

/**
 * Subdivide all edges longer than maxLength
 * CRITICAL for sparroWASM: Prevents numerical instability from edge length ratio
 *
 * Problem: If max_edge/avg_edge > 100x → sparroWASM "unreachable" error
 * Solution: Subdivide ALL edges > maxLength (including closing edge)
 *
 * @param {Array} points - Polygon vertices [[x, y], ...]
 * @param {number} maxLength - Maximum allowed edge length (default: 20 units)
 * @returns {Array} Polygon with subdivided edges
 */
function subdivideAllLongEdges(points, maxLength = 20.0) {
  if (!points || points.length < 2) {
    return points;
  }

  const subdivided = [];

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length]; // Wrap around for closing edge

    subdivided.push(p1);

    // Calculate edge length
    const edgeLength = Math.sqrt(
      Math.pow(p2[0] - p1[0], 2) +
      Math.pow(p2[1] - p1[1], 2)
    );

    // If edge is too long, subdivide it
    if (edgeLength > maxLength) {
      const numSegments = Math.ceil(edgeLength / maxLength);

      // Add intermediate points
      for (let j = 1; j < numSegments; j++) {
        const t = j / numSegments;
        const x = p1[0] + t * (p2[0] - p1[0]);
        const y = p1[1] + t * (p2[1] - p1[1]);
        subdivided.push([x, y]);
      }
    }
  }

  return subdivided;
}

/**
 * Convert a single entity to array of points
 * @param {Object} entity - DXF entity
 * @param {number} arcSegments - Number of segments for arcs/circles
 * @param {number} splineSegments - Number of segments for splines (default: 100)
 * @returns {Array} Array of [x, y] points
 */
function entityToPoints(entity, arcSegments = 16, splineSegments = 100) {
  const points = [];

  switch (entity.type) {
    case 'LINE':
      points.push(
        [entity.vertices[0].x, entity.vertices[0].y],
        [entity.vertices[1].x, entity.vertices[1].y]
      );
      break;

    case 'CIRCLE':
      const circlePoints = circleToPoints(entity, arcSegments);
      points.push(...circlePoints);
      break;

    case 'ARC':
      const arcPoints = arcToPoints(entity, arcSegments);
      points.push(...arcPoints);
      break;

    case 'LWPOLYLINE':
    case 'POLYLINE':
      entity.vertices.forEach(vertex => {
        points.push([vertex.x, vertex.y]);
      });

      // Handle bulge (arc segments) in LWPOLYLINE
      if (entity.vertices.some(v => v.bulge !== undefined && v.bulge !== 0)) {
        console.warn('LWPOLYLINE with bulge detected - bulge handling not yet implemented');
        // TODO: Implement bulge to arc conversion
      }
      break;

    case 'ELLIPSE':
      console.warn('ELLIPSE entity detected - converting to approximate circle');
      // Approximate as circle (simplified)
      const ellipsePoints = circleToPoints({
        center: entity.center,
        radius: entity.majorAxisEndPoint ?
          Math.sqrt(
            Math.pow(entity.majorAxisEndPoint.x, 2) +
            Math.pow(entity.majorAxisEndPoint.y, 2)
          ) : 10
      }, arcSegments);
      points.push(...ellipsePoints);
      break;

    case 'SPLINE':
      console.log(`  Converting SPLINE entity to points with ${splineSegments} segments`);
      const splinePoints = splineToPoints(entity, splineSegments);  // Use splineSegments, not arcSegments!
      points.push(...splinePoints);
      break;

    default:
      console.warn(`entityToPoints: Unknown entity type ${entity.type}`);
  }

  return points;
}

/**
 * Detect exterior and holes from multiple polygons
 * @param {Array} polygons - Array of polygon point arrays
 * @returns {Object} {exterior, holes, boundingBox}
 */
function detectShapeFromPolygons(polygons) {
  if (polygons.length === 0) {
    return {
      exterior: [],
      holes: [],
      boundingBox: { minX: 0, minY: 0, maxX: 0, maxY: 0 }
    };
  }

  // Single polygon - it's the exterior
  if (polygons.length === 1) {
    return {
      exterior: polygons[0],
      holes: [],
      boundingBox: calculateBoundingBox(polygons[0])
    };
  }

  // Multiple polygons - use area to detect exterior vs holes
  const shape = detectShape(polygons);

  return {
    exterior: shape.exterior,
    holes: shape.holes,
    boundingBox: calculateBoundingBox(shape.exterior)
  };
}

/**
 * Calculate bounding box from points
 * @param {Array} points - Array of [x, y] points
 * @returns {Object} {minX, minY, maxX, maxY, width, height}
 */
function calculateBoundingBox(points) {
  if (!points || points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  points.forEach(point => {
    const x = point[0];
    const y = point[1];

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Validate polygon for degenerate cases
 * CRITICAL: Detect issues that would cause sparroWASM "unreachable" errors
 * @param {Array} polygon - Array of [x, y] points
 * @param {string} filename - File name for error messages
 * @returns {Object} {valid, errors, warnings}
 */
function validatePolygon(polygon, filename) {
  const errors = [];
  const warnings = [];

  if (!polygon || polygon.length === 0) {
    errors.push('Polygon has no points');
    return { valid: false, errors, warnings };
  }

  if (polygon.length < 3) {
    errors.push(`Polygon has less than 3 points (${polygon.length})`);
    return { valid: false, errors, warnings };
  }

  // Check for duplicate consecutive points
  const tolerance = 0.01; // 0.01mm tolerance
  let duplicateCount = 0;

  for (let i = 1; i < polygon.length; i++) {
    const prev = polygon[i - 1];
    const curr = polygon[i];

    const dist = Math.sqrt(
      Math.pow(curr[0] - prev[0], 2) +
      Math.pow(curr[1] - prev[1], 2)
    );

    if (dist < tolerance) {
      duplicateCount++;
      console.warn(`  Polygon validation: Found duplicate points at index ${i - 1} and ${i}: [${prev[0]}, ${prev[1]}] ≈ [${curr[0]}, ${curr[1]}]`);
    }
  }

  if (duplicateCount > 0) {
    warnings.push(`Found ${duplicateCount} duplicate consecutive point(s) - this may cause nesting issues`);
  }

  // Check for points at or very near origin that might be artifacts
  const nearOriginCount = polygon.filter(p => {
    const distFromOrigin = Math.sqrt(p[0] * p[0] + p[1] * p[1]);
    return distFromOrigin < 0.01;
  }).length;

  if (nearOriginCount > 1) {
    warnings.push(`Found ${nearOriginCount} points near origin [0,0] - may indicate conversion artifacts`);
  }

  // Check for very small polygons (degenerate)
  const bbox = calculateBoundingBox(polygon);
  if (bbox.width < 0.1 || bbox.height < 0.1) {
    warnings.push(`Polygon is very small (${bbox.width.toFixed(3)}mm x ${bbox.height.toFixed(3)}mm) - may be degenerate`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Convert a single DXF file (convenience function)
 * @param {string} filename - File name
 * @param {string} content - DXF file content
 * @param {Object} settings - Conversion settings
 * @returns {Promise<Object>} Conversion result
 */
export async function convertSingleDxf(filename, content, settings = {}) {
  return convertDxfToJson([{ name: filename, content }], settings);
}

/**
 * Get conversion statistics
 * @param {Object} result - Conversion result
 * @returns {Object} Statistics summary
 */
export function getConversionStats(result) {
  if (!result.success) {
    return {
      status: 'failed',
      message: result.message,
      errorCount: result.errors.length,
      warningCount: result.warnings.length
    };
  }

  return {
    status: 'success',
    ...result.stats,
    errorCount: result.errors.length,
    warningCount: result.warnings.length,
    totalPoints: result.json.items.reduce(
      (sum, item) => sum + item.shape.exterior.length,
      0
    ),
    jsonSize: JSON.stringify(result.json).length
  };
}

export default {
  convertDxfToJson,
  convertSingleDxf,
  getConversionStats
};
