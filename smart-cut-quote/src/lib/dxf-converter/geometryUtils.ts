/**
 * Geometry Utilities for DXF to JSON Conversion
 * Handles arc discretization, area calculation, and shape detection
 */

import type {
  Point2D,
  PointTuple,
  BoundingBox,
  DxfArcEntity,
  DxfCircleEntity,
  DxfSplineEntity,
} from './types';

/**
 * Convert ARC entity to array of points
 */
export function arcToPoints(
  arc: DxfArcEntity,
  segments: number = 16
): PointTuple[] {
  const points: PointTuple[] = [];

  const startAngle = (arc.startAngle * Math.PI) / 180;
  const endAngle = (arc.endAngle * Math.PI) / 180;

  // Handle angle wrap-around (e.g., 350° to 10°)
  let totalAngle = endAngle - startAngle;
  if (totalAngle < 0) totalAngle += 2 * Math.PI;

  const angleStep = totalAngle / segments;

  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + angleStep * i;
    const x = arc.center.x + arc.radius * Math.cos(angle);
    const y = arc.center.y + arc.radius * Math.sin(angle);
    points.push([x, y]);
  }

  return points;
}

/**
 * Convert CIRCLE entity to array of points
 */
export function circleToPoints(
  circle: DxfCircleEntity | { center: Point2D; radius: number },
  segments: number = 32
): PointTuple[] {
  const points: PointTuple[] = [];
  const angleStep = (2 * Math.PI) / segments;

  for (let i = 0; i < segments; i++) {
    const angle = angleStep * i;
    const x = circle.center.x + circle.radius * Math.cos(angle);
    const y = circle.center.y + circle.radius * Math.sin(angle);
    points.push([x, y]);
  }

  // Close the circle by adding first point at end
  points.push(points[0]);

  return points;
}

/**
 * Calculate signed area of polygon using Shoelace formula
 */
export function calculateSignedArea(points: PointTuple[]): number {
  if (!points || points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }
  return area / 2;
}

/**
 * Ensure polygon is counter-clockwise (CCW)
 */
export function ensureCounterClockwise(points: PointTuple[]): PointTuple[] {
  if (!points || points.length < 3) return points;

  const signedArea = calculateSignedArea(points);

  // If area is negative, polygon is clockwise - reverse it
  if (signedArea < 0) {
    return [...points].reverse();
  }

  return points;
}

/**
 * Detect shape structure: exterior vs holes based on signed area
 */
export function detectShape(
  polygons: PointTuple[][]
): { exterior: PointTuple[]; holes: PointTuple[][] } {
  if (!polygons || polygons.length === 0) {
    return { exterior: [], holes: [] };
  }

  const exteriors: PointTuple[][] = [];
  const holes: PointTuple[][] = [];

  polygons.forEach((polygon) => {
    const area = calculateSignedArea(polygon);

    if (area > 0) {
      // CCW = Exterior (outer boundary)
      exteriors.push(polygon);
    } else if (area < 0) {
      // CW = Hole (inner boundary), reverse to CCW for sparroWASM
      holes.push([...polygon].reverse());
    }
  });

  // Use largest exterior if multiple
  const sortedExteriors = exteriors.sort(
    (a, b) =>
      Math.abs(calculateSignedArea(b)) - Math.abs(calculateSignedArea(a))
  );

  return {
    exterior: sortedExteriors[0] || [],
    holes: holes,
  };
}

/**
 * Calculate distance between two points
 */
export function pointDistance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if a contour is closed (start point = end point within tolerance)
 */
export function isClosedContour(
  points: PointTuple[],
  tolerance: number = 0.1
): boolean {
  if (!points || points.length < 3) return false;

  const first = points[0];
  const last = points[points.length - 1];

  const distance = Math.sqrt(
    Math.pow(last[0] - first[0], 2) + Math.pow(last[1] - first[1], 2)
  );

  return distance < tolerance;
}

/**
 * Close a contour by adding first point to end if not already closed
 */
export function closeContour(
  points: PointTuple[],
  tolerance: number = 0.1
): PointTuple[] {
  if (!points || points.length < 3) return points;

  if (isClosedContour(points, tolerance)) {
    return points;
  }

  // Add first point to close
  return [...points, points[0]];
}

/**
 * Calculate bounding box of points
 */
export function calculateBoundingBox(points: PointTuple[]): BoundingBox {
  if (!points || points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  points.forEach(([x, y]) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Filter duplicate consecutive points from an array of points
 */
function filterDuplicatePoints(
  points: PointTuple[],
  tolerance: number = 0.0001
): PointTuple[] {
  if (!points || points.length === 0) {
    return [];
  }

  const filtered: PointTuple[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const current = points[i];
    const prev = filtered[filtered.length - 1];

    const dist = Math.sqrt(
      Math.pow(current[0] - prev[0], 2) + Math.pow(current[1] - prev[1], 2)
    );

    // Only add if not a duplicate
    if (dist >= tolerance) {
      filtered.push(current);
    }
  }

  return filtered;
}

/**
 * Catmull-Rom spline interpolation
 */
function catmullRomInterpolate(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  t: number
): Point2D {
  const t2 = t * t;
  const t3 = t2 * t;

  const x =
    0.5 *
    (2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

  const y =
    0.5 *
    (2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

  return { x, y };
}

/**
 * Convert SPLINE entity to array of points using parametric sampling
 */
export function splineToPoints(
  spline: DxfSplineEntity,
  segments: number = 32
): PointTuple[] {
  const points: PointTuple[] = [];

  // Get control points from spline entity
  let controlPoints = spline.controlPoints || [];

  if (controlPoints.length === 0) {
    console.warn('  SPLINE has no control points');
    return points;
  }

  // CRITICAL FIX: Filter out control points that are artifacts
  const originTolerance = 0.01;
  const duplicateTolerance = 0.0001;

  // Step 1: Remove ALL control points at or very near origin [0,0]
  let filteredControlPoints = controlPoints.filter((p, index) => {
    const distFromOrigin = Math.sqrt(p.x * p.x + p.y * p.y);

    if (distFromOrigin < originTolerance) {
      console.log(
        `  SPLINE: Removing control point ${index} at [${p.x.toFixed(6)}, ${p.y.toFixed(6)}] - too close to origin (artifact)`
      );
      return false;
    }

    return true;
  });

  // Step 2: Remove consecutive duplicate points
  const uniqueControlPoints: Point2D[] = [];

  for (let i = 0; i < filteredControlPoints.length; i++) {
    const p = filteredControlPoints[i];

    if (uniqueControlPoints.length > 0) {
      const prev = uniqueControlPoints[uniqueControlPoints.length - 1];
      const dist = Math.sqrt(
        Math.pow(p.x - prev.x, 2) + Math.pow(p.y - prev.y, 2)
      );

      if (dist < duplicateTolerance) {
        console.log(
          `  SPLINE: Skipping duplicate control point [${p.x}, ${p.y}] (distance: ${dist})`
        );
        continue;
      }
    }

    uniqueControlPoints.push(p);
  }

  if (uniqueControlPoints.length !== controlPoints.length) {
    console.log(
      `  SPLINE: Filtered control points ${controlPoints.length} → ${uniqueControlPoints.length} (removed ${controlPoints.length - uniqueControlPoints.length} artifacts/duplicates)`
    );
  }

  controlPoints = uniqueControlPoints;

  if (controlPoints.length === 0) {
    console.warn('  SPLINE has no valid control points after filtering');
    return points;
  }

  // If spline has fit points, use them instead
  if (spline.fitPoints && spline.fitPoints.length > 0) {
    console.log(`  SPLINE: Using ${spline.fitPoints.length} fit points`);

    const filteredFitPoints = spline.fitPoints.filter((p, index) => {
      const distFromOrigin = Math.sqrt(p.x * p.x + p.y * p.y);
      if (distFromOrigin < originTolerance) {
        console.log(
          `  SPLINE: Removing fit point ${index} at [${p.x.toFixed(6)}, ${p.y.toFixed(6)}] - too close to origin (artifact)`
        );
        return false;
      }
      return true;
    });

    const fitPoints: PointTuple[] = filteredFitPoints.map((p) => [p.x, p.y]);
    const outputTolerance = 0.01;
    return filterDuplicatePoints(fitPoints, outputTolerance);
  }

  const degree = spline.degree || 3;

  console.log(
    `  SPLINE: degree=${degree}, ${controlPoints.length} control points, ${segments} segments`
  );

  if (degree === 1 || controlPoints.length <= 2) {
    // Linear spline - just connect control points
    const linearPoints: PointTuple[] = controlPoints.map((p) => [p.x, p.y]);
    return filterDuplicatePoints(linearPoints, 0.0001);
  }

  // For higher degree splines, use Catmull-Rom interpolation as approximation
  for (let i = 0; i < controlPoints.length - 1; i++) {
    const p0 = controlPoints[Math.max(0, i - 1)];
    const p1 = controlPoints[i];
    const p2 = controlPoints[i + 1];
    const p3 = controlPoints[Math.min(controlPoints.length - 1, i + 2)];

    const segmentsPerSection = Math.ceil(segments / (controlPoints.length - 1));

    for (let j = 0; j < segmentsPerSection; j++) {
      const t = j / segmentsPerSection;
      const point = catmullRomInterpolate(p0, p1, p2, p3, t);
      points.push([point.x, point.y]);
    }
  }

  // Add last control point
  const last = controlPoints[controlPoints.length - 1];
  points.push([last.x, last.y]);

  // CRITICAL: Filter duplicate consecutive points in final output
  const outputTolerance = 0.01;
  const filteredPoints = filterDuplicatePoints(points, outputTolerance);

  if (filteredPoints.length !== points.length) {
    console.log(
      `  SPLINE: Filtered output ${points.length} → ${filteredPoints.length} points (removed ${points.length - filteredPoints.length} duplicates)`
    );
  }

  return filteredPoints;
}

export default {
  arcToPoints,
  circleToPoints,
  calculateSignedArea,
  ensureCounterClockwise,
  detectShape,
  pointDistance,
  isClosedContour,
  closeContour,
  calculateBoundingBox,
  splineToPoints,
};
