/**
 * Geometry Utilities for DXF to JSON Conversion
 * Handles arc discretization, area calculation, and shape detection
 */

/**
 * Convert ARC entity to array of points
 * @param {Object} arc - DXF ARC entity with center, radius, startAngle, endAngle
 * @param {number} segments - Number of segments to discretize arc
 * @returns {Array<[number, number]>} Array of [x, y] points
 */
export function arcToPoints(arc, segments = 16) {
  const points = [];
  
  const startAngle = arc.startAngle * Math.PI / 180;
  const endAngle = arc.endAngle * Math.PI / 180;
  
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
 * @param {Object} circle - DXF CIRCLE entity with center and radius
 * @param {number} segments - Number of segments (default: 32 for smooth circle)
 * @returns {Array<[number, number]>} Array of [x, y] points
 */
export function circleToPoints(circle, segments = 32) {
  const points = [];
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
 * @param {Array<[number, number]>} points - Polygon vertices
 * @returns {number} Signed area (positive = CCW, negative = CW)
 */
export function calculateSignedArea(points) {
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
 * Most geometry libraries (including sparroWASM) expect CCW for exteriors
 * @param {Array<[number, number]>} points - Polygon vertices
 * @returns {Array<[number, number]>} CCW polygon
 */
export function ensureCounterClockwise(points) {
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
 * @param {Array<Array<[number, number]>>} polygons - Array of polygon contours
 * @returns {Object} { exterior: Array, holes: Array }
 */
export function detectShape(polygons) {
  if (!polygons || polygons.length === 0) {
    return { exterior: [], holes: [] };
  }
  
  const exteriors = [];
  const holes = [];
  
  polygons.forEach(polygon => {
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
  const sortedExteriors = exteriors.sort((a, b) => 
    Math.abs(calculateSignedArea(b)) - Math.abs(calculateSignedArea(a))
  );
  
  return {
    exterior: sortedExteriors[0] || [],
    holes: holes
  };
}

/**
 * Calculate distance between two points
 * @param {Object} p1 - Point with x, y properties
 * @param {Object} p2 - Point with x, y properties
 * @returns {number} Euclidean distance
 */
export function pointDistance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if a contour is closed (start point = end point within tolerance)
 * @param {Array<[number, number]>} points - Polygon vertices
 * @param {number} tolerance - Distance tolerance (default: 0.1mm)
 * @returns {boolean} True if closed
 */
export function isClosedContour(points, tolerance = 0.1) {
  if (!points || points.length < 3) return false;
  
  const first = points[0];
  const last = points[points.length - 1];
  
  const distance = Math.sqrt(
    Math.pow(last[0] - first[0], 2) + 
    Math.pow(last[1] - first[1], 2)
  );
  
  return distance < tolerance;
}

/**
 * Close a contour by adding first point to end if not already closed
 * @param {Array<[number, number]>} points - Polygon vertices
 * @param {number} tolerance - Distance tolerance
 * @returns {Array<[number, number]>} Closed polygon
 */
export function closeContour(points, tolerance = 0.1) {
  if (!points || points.length < 3) return points;
  
  if (isClosedContour(points, tolerance)) {
    return points; // Already closed
  }
  
  // Add first point to close
  return [...points, points[0]];
}

/**
 * Calculate bounding box of points
 * @param {Array<[number, number]>} points - Array of points
 * @returns {Object} { minX, minY, maxX, maxY, width, height }
 */
export function calculateBoundingBox(points) {
  if (!points || points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
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
    height: maxY - minY
  };
}

/**
 * Convert SPLINE entity to array of points using parametric sampling
 * Supports cubic and quadratic splines with control points
 * @param {Object} spline - DXF SPLINE entity with controlPoints, degree, etc.
 * @param {number} segments - Number of segments to discretize spline (default: 32)
 * @returns {Array<[number, number]>} Array of [x, y] points
 */
export function splineToPoints(spline, segments = 32) {
  const points = [];

  // Get control points from spline entity
  let controlPoints = spline.controlPoints || [];

  if (controlPoints.length === 0) {
    console.warn('  SPLINE has no control points');
    return points;
  }

  // CRITICAL FIX: Filter out control points that are artifacts
  // SPLINE control points sometimes have [0,0] or near-zero points that are NOT part of the actual curve
  // These are coordinate system artifacts that must be removed
  const originTolerance = 0.01; // 0.01mm - points this close to origin are likely artifacts
  const duplicateTolerance = 0.0001; // Very small tolerance for duplicate detection

  // Step 1: Remove ALL control points at or very near origin [0,0] - these are artifacts!
  let filteredControlPoints = controlPoints.filter((p, index) => {
    const distFromOrigin = Math.sqrt(p.x * p.x + p.y * p.y);

    if (distFromOrigin < originTolerance) {
      console.log(`  SPLINE: Removing control point ${index} at [${p.x.toFixed(6)}, ${p.y.toFixed(6)}] - too close to origin (artifact)`);
      return false;
    }

    return true;
  });

  // Step 2: Remove consecutive duplicate points
  const uniqueControlPoints = [];

  for (let i = 0; i < filteredControlPoints.length; i++) {
    const p = filteredControlPoints[i];

    // Skip if this point is a duplicate of the previous point
    if (uniqueControlPoints.length > 0) {
      const prev = uniqueControlPoints[uniqueControlPoints.length - 1];
      const dist = Math.sqrt(
        Math.pow(p.x - prev.x, 2) +
        Math.pow(p.y - prev.y, 2)
      );

      if (dist < duplicateTolerance) {
        console.log(`  SPLINE: Skipping duplicate control point [${p.x}, ${p.y}] (distance: ${dist})`);
        continue;
      }
    }

    uniqueControlPoints.push(p);
  }

  if (uniqueControlPoints.length !== controlPoints.length) {
    console.log(`  SPLINE: Filtered control points ${controlPoints.length} → ${uniqueControlPoints.length} (removed ${controlPoints.length - uniqueControlPoints.length} artifacts/duplicates)`);
  }

  controlPoints = uniqueControlPoints;

  if (controlPoints.length === 0) {
    console.warn('  SPLINE has no valid control points after filtering');
    return points;
  }

  // If spline has fit points, use them instead
  if (spline.fitPoints && spline.fitPoints.length > 0) {
    console.log(`  SPLINE: Using ${spline.fitPoints.length} fit points`);

    // Filter out fit points at origin (artifacts)
    const filteredFitPoints = spline.fitPoints.filter((p, index) => {
      const distFromOrigin = Math.sqrt(p.x * p.x + p.y * p.y);
      if (distFromOrigin < originTolerance) {
        console.log(`  SPLINE: Removing fit point ${index} at [${p.x.toFixed(6)}, ${p.y.toFixed(6)}] - too close to origin (artifact)`);
        return false;
      }
      return true;
    });

    const fitPoints = filteredFitPoints.map(p => [p.x, p.y]);

    // Also filter fit points for duplicates with larger tolerance
    const outputTolerance = 0.01;
    return filterDuplicatePoints(fitPoints, outputTolerance);
  }

  const degree = spline.degree || 3; // Default to cubic (degree 3)

  console.log(`  SPLINE: degree=${degree}, ${controlPoints.length} control points, ${segments} segments`);

  // Simple parametric sampling approach
  // For more accuracy, would need to implement proper B-spline basis functions
  // This is a simplified linear interpolation through control points

  if (degree === 1 || controlPoints.length <= 2) {
    // Linear spline - just connect control points
    const linearPoints = controlPoints.map(p => [p.x, p.y]);
    return filterDuplicatePoints(linearPoints, tolerance);
  }

  // For higher degree splines, use Catmull-Rom interpolation as approximation
  // This gives smooth curves through control points
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
  // Use slightly larger tolerance (0.01mm) to catch near-duplicates from interpolation
  const outputTolerance = 0.01;
  const filteredPoints = filterDuplicatePoints(points, outputTolerance);

  if (filteredPoints.length !== points.length) {
    console.log(`  SPLINE: Filtered output ${points.length} → ${filteredPoints.length} points (removed ${points.length - filteredPoints.length} duplicates)`);
  }

  return filteredPoints;
}

/**
 * Catmull-Rom spline interpolation
 * Provides smooth curve through p1 and p2, using p0 and p3 for curvature
 * @param {Object} p0 - Point before start {x, y}
 * @param {Object} p1 - Start point {x, y}
 * @param {Object} p2 - End point {x, y}
 * @param {Object} p3 - Point after end {x, y}
 * @param {number} t - Parameter 0-1
 * @returns {Object} Interpolated point {x, y}
 */
function catmullRomInterpolate(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;

  const x = 0.5 * (
    (2 * p1.x) +
    (-p0.x + p2.x) * t +
    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
  );

  const y = 0.5 * (
    (2 * p1.y) +
    (-p0.y + p2.y) * t +
    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
  );

  return { x, y };
}

/**
 * Filter duplicate consecutive points from an array of points
 * CRITICAL for preventing degenerate polygons
 * @param {Array<[number, number]>} points - Array of [x, y] points
 * @param {number} tolerance - Distance threshold for considering points duplicates (default: 0.0001)
 * @returns {Array<[number, number]>} Filtered array with duplicates removed
 */
function filterDuplicatePoints(points, tolerance = 0.0001) {
  if (!points || points.length === 0) {
    return [];
  }

  const filtered = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const current = points[i];
    const prev = filtered[filtered.length - 1];

    const dist = Math.sqrt(
      Math.pow(current[0] - prev[0], 2) +
      Math.pow(current[1] - prev[1], 2)
    );

    // Only add if not a duplicate
    if (dist >= tolerance) {
      filtered.push(current);
    }
  }

  return filtered;
}
