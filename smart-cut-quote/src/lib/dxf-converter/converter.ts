/**
 * Main DXF to JSON Converter
 *
 * Orchestrates the entire conversion process:
 * 1. Parse DXF content
 * 2. Extract entities
 * 3. Build contours
 * 4. Convert to polygon points
 * 5. Detect exterior vs holes
 * 6. Format as sparroWASM JSON
 */

import {
  parseDxf,
  extractEntities,
  validateDxf,
  filterEntitiesByType,
} from './dxfParser';
import { buildContours, validateContours } from './contourBuilder';
import {
  arcToPoints,
  circleToPoints,
  splineToPoints,
  detectShape,
  calculateBoundingBox,
} from './geometryUtils';
import { formatSparrowJson, validateSparrowJson } from './jsonFormatter';
import type {
  DxfConverterOptions,
  ConversionResult,
  ConversionError,
  ConversionWarning,
  DxfFileInput,
  NestingInputItem,
  PointTuple,
  BoundingBox,
  Contour,
  DxfEntity,
  DxfLineEntity,
  DxfCircleEntity,
  DxfArcEntity,
  DxfPolylineEntity,
  DxfEllipseEntity,
  DxfSplineEntity,
  SparrowJson,
  PolygonValidationResult,
} from './types';

/**
 * Convert multiple DXF files to sparroWASM JSON format
 */
export async function convertDxfToJson(
  files: DxfFileInput[],
  settings: DxfConverterOptions = {}
): Promise<ConversionResult> {
  const defaultSettings: Required<DxfConverterOptions> = {
    stripHeight: 6000,
    spacing: 5,
    arcSegments: 32,
    splineSegments: 100,
    allowRotations: true,
    tolerance: 0.1,
    autoClose: true,
    problemName: 'dxf_conversion',
  };

  const config = { ...defaultSettings, ...settings };

  const items: NestingInputItem[] = [];
  const errors: ConversionError[] = [];
  const warnings: ConversionWarning[] = [];

  // Process each DXF file
  for (let i = 0; i < files.length; i++) {
    const fileObj = files[i];
    const file = fileObj;
    const quantity = fileObj.quantity || 1;

    try {
      console.log(
        `Processing file ${i + 1}/${files.length}: ${file.name} (quantity: ${quantity})`
      );

      // Step 1: Parse DXF
      const parseResult = parseDxf(file.content);

      if (!parseResult.success || !parseResult.data) {
        errors.push({
          file: file.name,
          stage: 'parsing',
          message: parseResult.error || 'Unknown parsing error',
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
          message: validation.errors.join('; '),
        });
        continue;
      }

      if (validation.warnings && validation.warnings.length > 0) {
        warnings.push(
          ...validation.warnings.map((w) => ({
            file: file.name,
            message: w,
          }))
        );
      }

      // Step 3: Extract entities
      const allEntities = extractEntities(dxf);

      // Filter to supported types only
      const supportedTypes = [
        'LINE',
        'CIRCLE',
        'ARC',
        'LWPOLYLINE',
        'POLYLINE',
        'SPLINE',
      ];
      const entities = filterEntitiesByType(allEntities, supportedTypes);

      console.log(`  Entities: ${entities.length} (${allEntities.length} total)`);

      if (entities.length === 0) {
        errors.push({
          file: file.name,
          stage: 'extraction',
          message: 'No supported entities found',
        });
        continue;
      }

      // Step 4: Build contours
      const contours = buildContours(entities, {
        tolerance: config.tolerance || 0.5,
        autoClose: config.autoClose,
        minContourLength: 1,
      });

      console.log(`  Contours: ${contours.length}`);

      // Validate contours
      const contourValidation = validateContours(contours);

      if (!contourValidation.valid) {
        errors.push({
          file: file.name,
          stage: 'contour building',
          message: contourValidation.errors.join('; '),
        });
        continue;
      }

      if (contourValidation.warnings.length > 0) {
        warnings.push(
          ...contourValidation.warnings.map((w) => ({
            file: file.name,
            message: w,
          }))
        );
      }

      // Step 5: Convert contours to polygon points
      const polygons = contours.map((contour) =>
        contourToPolygon(contour, config.arcSegments, config.splineSegments)
      );

      // Step 6: Detect exterior vs holes
      const shape = detectShapeFromPolygons(polygons);

      // Step 6.5: Validate polygon for degenerate cases
      const polygonValidation = validatePolygon(shape.exterior, file.name);
      if (polygonValidation.warnings.length > 0) {
        warnings.push(
          ...polygonValidation.warnings.map((w) => ({
            file: file.name,
            message: w,
          }))
        );
      }
      if (!polygonValidation.valid) {
        errors.push({
          file: file.name,
          stage: 'polygon validation',
          message: polygonValidation.errors.join('; '),
        });
        continue;
      }

      // Step 7: Create item for this file
      // IMPORTANT: Use items.length as ID to ensure consecutive IDs starting from 0
      // jagua-rs requires: "All items should have consecutive IDs starting from 0"
      const item: NestingInputItem = {
        id: items.length, // Use current array length as ID (0, 1, 2, ...)
        quantity: quantity,
        shape: {
          exterior: shape.exterior,
          interiors: shape.holes,
        },
        allowed_rotations: config.allowRotations ? [0, 90, 180, 270] : [0],
        metadata: {
          filename: file.name,
          originalEntityCount: allEntities.length,
          contourCount: contours.length,
          boundingBox: shape.boundingBox,
        },
      };

      items.push(item);
      console.log(`  ✓ Successfully converted ${file.name}`);
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
      errors.push({
        file: file.name,
        stage: 'conversion',
        message: error instanceof Error ? error.message : String(error),
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
      message: 'No items were successfully converted',
    };
  }

  const json = formatSparrowJson(items, {
    stripHeight: config.stripHeight,
    problemName: config.problemName,
  });

  // Step 9: Validate output JSON
  const jsonValidation = validateSparrowJson(json);

  if (!jsonValidation.valid) {
    return {
      success: false,
      json: null,
      errors: [
        ...errors,
        ...jsonValidation.errors.map((e) => ({
          file: 'output',
          stage: 'json validation',
          message: e,
        })),
      ],
      warnings,
      message: 'Generated JSON is invalid',
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
      totalItems: items.length,
    },
  };
}

/**
 * Convert a single contour to polygon points
 * CRITICAL: Polygon MUST be CLOSED (first point == last point) for sparroWASM
 */
function contourToPolygon(
  contour: Contour,
  arcSegments: number = 16,
  splineSegments: number = 100
): PointTuple[] {
  const points: PointTuple[] = [];

  contour.entities.forEach((entity) => {
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
          return;
        }
      }

      points.push(point);
    });
  });

  // CRITICAL FIX: Ensure polygon is CLOSED (first point == last point)
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

  // CRITICAL FIX: Subdivide ALL long edges
  const maxEdgeLength = 20.0;
  const subdivided = subdivideAllLongEdges(points, maxEdgeLength);

  if (subdivided.length !== points.length) {
    console.log(
      `  Subdivided polygon: ${points.length} → ${subdivided.length} points (added ${subdivided.length - points.length} points to split long edges)`
    );
  }

  return subdivided;
}

/**
 * Subdivide all edges longer than maxLength
 */
function subdivideAllLongEdges(
  points: PointTuple[],
  maxLength: number = 20.0
): PointTuple[] {
  if (!points || points.length < 2) {
    return points;
  }

  const subdivided: PointTuple[] = [];

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];

    subdivided.push(p1);

    // Calculate edge length
    const edgeLength = Math.sqrt(
      Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2)
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
 */
function entityToPoints(
  entity: DxfEntity,
  arcSegments: number = 16,
  splineSegments: number = 100
): PointTuple[] {
  const points: PointTuple[] = [];

  switch (entity.type) {
    case 'LINE': {
      const lineEntity = entity as DxfLineEntity;
      points.push(
        [lineEntity.vertices[0].x, lineEntity.vertices[0].y],
        [lineEntity.vertices[1].x, lineEntity.vertices[1].y]
      );
      break;
    }

    case 'CIRCLE': {
      const circleEntity = entity as DxfCircleEntity;
      const circlePoints = circleToPoints(circleEntity, arcSegments);
      points.push(...circlePoints);
      break;
    }

    case 'ARC': {
      const arcEntity = entity as DxfArcEntity;
      const arcPoints = arcToPoints(arcEntity, arcSegments);
      points.push(...arcPoints);
      break;
    }

    case 'LWPOLYLINE':
    case 'POLYLINE': {
      const polyEntity = entity as DxfPolylineEntity;
      polyEntity.vertices.forEach((vertex) => {
        points.push([vertex.x, vertex.y]);
      });

      // Handle bulge (arc segments) in LWPOLYLINE
      if (polyEntity.vertices.some((v) => v.bulge !== undefined && v.bulge !== 0)) {
        console.warn(
          'LWPOLYLINE with bulge detected - bulge handling not yet implemented'
        );
      }
      break;
    }

    case 'ELLIPSE': {
      const ellipseEntity = entity as DxfEllipseEntity;
      console.warn('ELLIPSE entity detected - converting to approximate circle');
      const ellipsePoints = circleToPoints(
        {
          center: ellipseEntity.center,
          radius: ellipseEntity.majorAxisEndPoint
            ? Math.sqrt(
                Math.pow(ellipseEntity.majorAxisEndPoint.x, 2) +
                  Math.pow(ellipseEntity.majorAxisEndPoint.y, 2)
              )
            : 10,
        },
        arcSegments
      );
      points.push(...ellipsePoints);
      break;
    }

    case 'SPLINE': {
      const splineEntity = entity as DxfSplineEntity;
      console.log(
        `  Converting SPLINE entity to points with ${splineSegments} segments`
      );
      const splinePoints = splineToPoints(splineEntity, splineSegments);
      points.push(...splinePoints);
      break;
    }

    default:
      console.warn(`entityToPoints: Unknown entity type ${entity.type}`);
  }

  return points;
}

/**
 * Detect exterior and holes from multiple polygons
 */
function detectShapeFromPolygons(polygons: PointTuple[][]): {
  exterior: PointTuple[];
  holes: PointTuple[][];
  boundingBox: BoundingBox;
} {
  if (polygons.length === 0) {
    return {
      exterior: [],
      holes: [],
      boundingBox: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
    };
  }

  // Single polygon - it's the exterior
  if (polygons.length === 1) {
    return {
      exterior: polygons[0],
      holes: [],
      boundingBox: calculateBoundingBox(polygons[0]),
    };
  }

  // Multiple polygons - use area to detect exterior vs holes
  const shape = detectShape(polygons);

  return {
    exterior: shape.exterior,
    holes: shape.holes,
    boundingBox: calculateBoundingBox(shape.exterior),
  };
}

/**
 * Validate polygon for degenerate cases
 */
function validatePolygon(
  polygon: PointTuple[],
  filename: string
): PolygonValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!polygon || polygon.length === 0) {
    errors.push('Polygon has no points');
    return { valid: false, errors, warnings };
  }

  if (polygon.length < 3) {
    errors.push(`Polygon has less than 3 points (${polygon.length})`);
    return { valid: false, errors, warnings };
  }

  // Check for duplicate consecutive points
  const tolerance = 0.01;
  let duplicateCount = 0;

  for (let i = 1; i < polygon.length; i++) {
    const prev = polygon[i - 1];
    const curr = polygon[i];

    const dist = Math.sqrt(
      Math.pow(curr[0] - prev[0], 2) + Math.pow(curr[1] - prev[1], 2)
    );

    if (dist < tolerance) {
      duplicateCount++;
      console.warn(
        `  Polygon validation: Found duplicate points at index ${i - 1} and ${i}: [${prev[0]}, ${prev[1]}] ≈ [${curr[0]}, ${curr[1]}]`
      );
    }
  }

  if (duplicateCount > 0) {
    warnings.push(
      `Found ${duplicateCount} duplicate consecutive point(s) - this may cause nesting issues`
    );
  }

  // Check for points at or very near origin
  const nearOriginCount = polygon.filter((p) => {
    const distFromOrigin = Math.sqrt(p[0] * p[0] + p[1] * p[1]);
    return distFromOrigin < 0.01;
  }).length;

  if (nearOriginCount > 1) {
    warnings.push(
      `Found ${nearOriginCount} points near origin [0,0] - may indicate conversion artifacts`
    );
  }

  // Check for very small polygons (degenerate)
  const bbox = calculateBoundingBox(polygon);
  if (bbox.width < 0.1 || bbox.height < 0.1) {
    warnings.push(
      `Polygon is very small (${bbox.width.toFixed(3)}mm x ${bbox.height.toFixed(3)}mm) - may be degenerate`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Convert a single DXF content string (convenience function)
 */
export async function convertSingleDxf(
  filename: string,
  content: string,
  settings: DxfConverterOptions = {}
): Promise<ConversionResult> {
  return convertDxfToJson([{ name: filename, content }], settings);
}

/**
 * Get conversion statistics
 */
export function getConversionStats(result: ConversionResult): {
  status: string;
  message?: string;
  errorCount: number;
  warningCount: number;
  totalFiles?: number;
  successfulFiles?: number;
  failedFiles?: number;
  totalItems?: number;
  totalPoints?: number;
  jsonSize?: number;
} {
  if (!result.success) {
    return {
      status: 'failed',
      message: result.message,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
    };
  }

  return {
    status: 'success',
    ...result.stats,
    errorCount: result.errors.length,
    warningCount: result.warnings.length,
    totalPoints: result.json?.items.reduce(
      (sum, item) => sum + item.shape.data.length,
      0
    ),
    jsonSize: result.json ? JSON.stringify(result.json).length : 0,
  };
}

export default {
  convertDxfToJson,
  convertSingleDxf,
  getConversionStats,
};
