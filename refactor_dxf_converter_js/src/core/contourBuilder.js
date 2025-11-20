/**
 * Contour Builder
 *
 * Groups connected DXF entities into closed contours (paths).
 * Handles:
 * - Finding connected entities (within tolerance)
 * - Building chains of connected entities
 * - Detecting closed vs open contours
 * - Separating multiple contours from a single DXF file
 *
 * Based on: docs/MVP_DXF_TO_JSON_CONVERTER.md
 */

import { getStartPoint, getEndPoint, isClosedEntity } from './dxfParser.js';

/**
 * Calculate distance between two points
 * @param {Object} p1 - Point {x, y}
 * @param {Object} p2 - Point {x, y}
 * @returns {number} Distance
 */
function pointDistance(p1, p2) {
  if (!p1 || !p2) return Infinity;
  return Math.sqrt(
    Math.pow(p2.x - p1.x, 2) +
    Math.pow(p2.y - p1.y, 2)
  );
}

/**
 * Check if two points are within tolerance
 * @param {Object} p1 - Point {x, y}
 * @param {Object} p2 - Point {x, y}
 * @param {number} tolerance - Distance tolerance
 * @returns {boolean}
 */
function pointsMatch(p1, p2, tolerance = 0.1) {
  return pointDistance(p1, p2) < tolerance;
}

/**
 * Build closed contours from DXF entities
 *
 * Algorithm:
 * 1. Start with first unused entity
 * 2. Find next entity whose start point matches current end point
 * 3. Continue until loop closes or no more connections
 * 4. Repeat for all unused entities
 *
 * @param {Array} entities - Array of DXF entities
 * @param {Object} options - Configuration options
 * @returns {Array} Array of contour objects
 */
export function buildContours(entities, options = {}) {
  const {
    tolerance = 0.1,           // Distance tolerance for point matching
    autoClose = true,          // Automatically close open contours
    minContourLength = 1,      // Minimum number of entities in contour (1 = allow single POLYLINE, 3 = triangle, 4 = rectangle)
    separateClosedEntities = true  // Treat circles/closed polylines as separate contours
  } = options;

  const contours = [];
  const used = new Set();

  // First pass: Handle already-closed single entities (CIRCLE, closed POLYLINE)
  if (separateClosedEntities) {
    entities.forEach((entity, index) => {
      if (isClosedEntity(entity)) {
        contours.push({
          entities: [entity],
          closed: true,
          single: true,
          boundingBox: getContourBoundingBox([entity])
        });
        used.add(index);
      }
    });
  }

  // Second pass: Build contours from connected entities
  console.log(`  Building contours from ${entities.length - used.size} remaining entities...`);

  for (let i = 0; i < entities.length; i++) {
    if (used.has(i)) continue;

    const startEntity = entities[i];
    const contour = [startEntity];
    used.add(i);

    let currentEndPoint = getEndPoint(startEntity);
    let foundConnection = true;

    console.log(`  Starting new contour from entity ${i} (${startEntity.type})`);

    // Keep searching for connected entities
    while (foundConnection) {
      foundConnection = false;

      for (let j = 0; j < entities.length; j++) {
        if (used.has(j)) continue;

        const nextEntity = entities[j];
        const nextStartPoint = getStartPoint(nextEntity);
        const nextEndPoint = getEndPoint(nextEntity);

        // Check if next entity connects to current end point
        const distToStart = pointDistance(currentEndPoint, nextStartPoint);
        const distToEnd = pointDistance(currentEndPoint, nextEndPoint);

        if (distToStart < tolerance) {
          // Forward connection
          console.log(`    Connected entity ${j} (${nextEntity.type}) forward, distance: ${distToStart.toFixed(3)}`);
          contour.push(nextEntity);
          used.add(j);
          currentEndPoint = nextEndPoint;
          foundConnection = true;
          break;
        } else if (distToEnd < tolerance) {
          // Reverse connection (need to reverse entity)
          console.log(`    Connected entity ${j} (${nextEntity.type}) reversed, distance: ${distToEnd.toFixed(3)}`);
          const reversedEntity = reverseEntity(nextEntity);
          contour.push(reversedEntity);
          used.add(j);
          currentEndPoint = getEndPoint(reversedEntity);
          foundConnection = true;
          break;
        }
      }
    }

    // Check if contour meets minimum length requirement
    if (contour.length < minContourLength) {
      console.warn(`  Contour has only ${contour.length} entities (min: ${minContourLength}), skipping`);
      continue;
    }

    // Check if contour is closed
    const firstPoint = getStartPoint(contour[0]);
    const lastPoint = getEndPoint(contour[contour.length - 1]);
    const closingDistance = pointDistance(firstPoint, lastPoint);
    const isClosed = closingDistance < tolerance;

    console.log(`  Contour completed: ${contour.length} entities, closing distance: ${closingDistance.toFixed(3)}, closed: ${isClosed}`);

    // Auto-close if requested and almost closed
    if (!isClosed && autoClose && pointsMatch(firstPoint, lastPoint, tolerance * 10)) {
      console.log(`Auto-closing contour (distance: ${pointDistance(firstPoint, lastPoint).toFixed(3)})`);
    }

    contours.push({
      entities: contour,
      closed: isClosed || autoClose,
      single: false,
      boundingBox: getContourBoundingBox(contour),
      warning: !isClosed && !autoClose ? 'Open contour detected' : null
    });
  }

  return contours;
}

/**
 * Reverse an entity (swap start and end points)
 * @param {Object} entity - DXF entity
 * @returns {Object} Reversed entity
 */
function reverseEntity(entity) {
  const reversed = { ...entity };

  switch (entity.type) {
    case 'LINE':
      reversed.vertices = [entity.vertices[1], entity.vertices[0]];
      break;

    case 'ARC':
      // Swap start and end angles
      reversed.startAngle = entity.endAngle;
      reversed.endAngle = entity.startAngle;
      break;

    case 'LWPOLYLINE':
    case 'POLYLINE':
      reversed.vertices = [...entity.vertices].reverse();
      break;

    default:
      console.warn(`reverseEntity: Cannot reverse entity type ${entity.type}`);
  }

  return reversed;
}

/**
 * Get bounding box of a contour
 * @param {Array} entities - Array of entities in contour
 * @returns {Object} {minX, minY, maxX, maxY, width, height}
 */
function getContourBoundingBox(entities) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  entities.forEach(entity => {
    const points = getEntityPointsForBounds(entity);

    points.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
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
 * Get representative points from entity for bounding box calculation
 * @param {Object} entity - DXF entity
 * @returns {Array} Array of points
 */
function getEntityPointsForBounds(entity) {
  const points = [];

  switch (entity.type) {
    case 'LINE':
      points.push(...entity.vertices);
      break;

    case 'CIRCLE':
      // Circle extrema
      points.push(
        { x: entity.center.x - entity.radius, y: entity.center.y },
        { x: entity.center.x + entity.radius, y: entity.center.y },
        { x: entity.center.x, y: entity.center.y - entity.radius },
        { x: entity.center.x, y: entity.center.y + entity.radius }
      );
      break;

    case 'ARC':
      // Arc center and endpoints
      points.push(entity.center);
      points.push(getStartPoint(entity));
      points.push(getEndPoint(entity));
      break;

    case 'LWPOLYLINE':
    case 'POLYLINE':
      points.push(...entity.vertices);
      break;

    case 'ELLIPSE':
      points.push(entity.center);
      break;

    case 'SPLINE':
      // For SPLINE, use all control points for bounding box
      if (entity.controlPoints && entity.controlPoints.length > 0) {
        points.push(...entity.controlPoints);
      }
      break;

    default:
      console.warn(`getEntityPointsForBounds: Unknown entity type ${entity.type}`);
  }

  return points;
}

/**
 * Separate contours into exterior and holes
 * Based on area calculation (clockwise vs counter-clockwise)
 *
 * @param {Array} contours - Array of contour objects
 * @returns {Array} Array of {exterior, holes}
 */
export function separateExteriorAndHoles(contours) {
  if (contours.length === 0) return [];

  // If only one contour, it's the exterior
  if (contours.length === 1) {
    return [{
      exterior: contours[0],
      holes: []
    }];
  }

  // Sort by bounding box area (largest first)
  const sortedContours = [...contours].sort((a, b) => {
    const areaA = a.boundingBox.width * a.boundingBox.height;
    const areaB = b.boundingBox.width * b.boundingBox.height;
    return areaB - areaA;
  });

  // First contour is exterior, rest are potential holes
  const exterior = sortedContours[0];
  const potentialHoles = sortedContours.slice(1);

  // Check if holes are inside exterior bounding box
  const holes = potentialHoles.filter(hole => {
    return isInsideBoundingBox(hole.boundingBox, exterior.boundingBox);
  });

  return [{
    exterior,
    holes
  }];
}

/**
 * Check if one bounding box is inside another
 * @param {Object} inner - Inner bounding box
 * @param {Object} outer - Outer bounding box
 * @returns {boolean}
 */
function isInsideBoundingBox(inner, outer) {
  return (
    inner.minX >= outer.minX &&
    inner.maxX <= outer.maxX &&
    inner.minY >= outer.minY &&
    inner.maxY <= outer.maxY
  );
}

/**
 * Group contours by proximity (for multi-part DXF files)
 * @param {Array} contours - Array of contour objects
 * @param {number} maxDistance - Maximum distance to consider as same part
 * @returns {Array} Array of contour groups
 */
export function groupContoursByProximity(contours, maxDistance = 100) {
  if (contours.length === 0) return [];
  if (contours.length === 1) return [contours];

  const groups = [];
  const used = new Set();

  contours.forEach((contour, index) => {
    if (used.has(index)) return;

    const group = [contour];
    used.add(index);

    // Find nearby contours
    contours.forEach((other, otherIndex) => {
      if (used.has(otherIndex)) return;

      const distance = boundingBoxDistance(contour.boundingBox, other.boundingBox);

      if (distance < maxDistance) {
        group.push(other);
        used.add(otherIndex);
      }
    });

    groups.push(group);
  });

  return groups;
}

/**
 * Calculate minimum distance between two bounding boxes
 * @param {Object} box1 - Bounding box 1
 * @param {Object} box2 - Bounding box 2
 * @returns {number} Minimum distance
 */
function boundingBoxDistance(box1, box2) {
  // If boxes overlap, distance is 0
  if (
    box1.minX <= box2.maxX &&
    box1.maxX >= box2.minX &&
    box1.minY <= box2.maxY &&
    box1.maxY >= box2.minY
  ) {
    return 0;
  }

  // Calculate minimum distance between edges
  const dx = Math.max(0, Math.max(box1.minX - box2.maxX, box2.minX - box1.maxX));
  const dy = Math.max(0, Math.max(box1.minY - box2.maxY, box2.minY - box1.maxY));

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Validate contours
 * @param {Array} contours - Array of contour objects
 * @returns {Object} {valid: boolean, errors: Array, warnings: Array}
 */
export function validateContours(contours) {
  const errors = [];
  const warnings = [];

  if (!contours || contours.length === 0) {
    errors.push('No contours found');
    return { valid: false, errors, warnings };
  }

  contours.forEach((contour, index) => {
    if (!contour.entities || contour.entities.length === 0) {
      errors.push(`Contour ${index}: No entities`);
    }

    if (!contour.closed) {
      warnings.push(`Contour ${index}: Open contour (not closed)`);
    }

    if (contour.entities.length < 3 && !contour.single) {
      warnings.push(`Contour ${index}: Only ${contour.entities.length} entities`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export default {
  buildContours,
  separateExteriorAndHoles,
  groupContoursByProximity,
  validateContours
};
