/**
 * DXF Validation Service
 * Detect issues in DXF entities (open contours, duplicates, zero-length, etc.)
 */

import type { DxfEntity, ValidationIssue } from '../types/dxfHealing';

/**
 * Validate all entities and return list of issues
 * @param entities - Array of DXF entities to validate
 * @returns Array of validation issues found
 */
export function validateEntities(entities: DxfEntity[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Check for open contours
  issues.push(...checkOpenContours(entities));

  // 2. Check for duplicate entities
  issues.push(...checkDuplicateEntities(entities));

  // 3. Check for zero-length entities
  issues.push(...checkZeroLengthEntities(entities));

  // 4. Check for self-intersecting polylines
  issues.push(...checkSelfIntersectingPolylines(entities));

  return issues;
}

/**
 * Check for open contours (polylines that should be closed but aren't)
 */
function checkOpenContours(entities: DxfEntity[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const entity of entities) {
    // Only check polylines (not lines, arcs, circles)
    if (entity.type !== 'POLYLINE') {
      continue;
    }

    // Skip if already marked as closed
    if (entity.metadata.closed) {
      continue;
    }

    // Calculate gap between first and last vertex
    const first = entity.vertices[0];
    const last = entity.vertices[entity.vertices.length - 1];

    const gap = Math.sqrt(
      Math.pow(last.x - first.x, 2) +
      Math.pow(last.y - first.y, 2)
    );

    // If gap is significant (more than 1 micron), report as issue
    if (gap > 0.001) {
      issues.push({
        type: 'OPEN_CONTOUR',
        entityIds: [entity.id],
        severity: 'ERROR',
        message: `Open contour with ${gap.toFixed(3)}mm gap`,
        autoFixable: gap <= 0.1, // Can auto-merge if within snap tolerance
      });
    }
  }

  return issues;
}

/**
 * Check for duplicate entities (same geometry)
 */
function checkDuplicateEntities(entities: DxfEntity[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const checked = new Set<string>();

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const pairKey = `${entities[i].id}-${entities[j].id}`;

      // Skip if already checked this pair
      if (checked.has(pairKey)) {
        continue;
      }

      checked.add(pairKey);

      if (areEntitiesDuplicate(entities[i], entities[j])) {
        issues.push({
          type: 'DUPLICATE_LINE',
          entityIds: [entities[i].id, entities[j].id],
          severity: 'WARNING',
          message: 'Duplicate geometry detected',
          autoFixable: true,
        });
      }
    }
  }

  return issues;
}

/**
 * Check for zero-length entities
 */
function checkZeroLengthEntities(entities: DxfEntity[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const entity of entities) {
    if (entity.metadata.length < 0.001) { // Less than 1 micron
      issues.push({
        type: 'ZERO_LENGTH',
        entityIds: [entity.id],
        severity: 'WARNING',
        message: `Zero-length entity (${entity.metadata.length.toFixed(6)}mm)`,
        autoFixable: true, // Can auto-delete
      });
    }
  }

  return issues;
}

/**
 * Check for self-intersecting polylines
 */
function checkSelfIntersectingPolylines(entities: DxfEntity[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const entity of entities) {
    // Only check polylines with at least 4 vertices
    if (entity.type !== 'POLYLINE' || entity.vertices.length < 4) {
      continue;
    }

    if (hasSelfIntersection(entity.vertices)) {
      issues.push({
        type: 'SELF_INTERSECTING',
        entityIds: [entity.id],
        severity: 'WARNING',
        message: 'Self-intersecting polyline',
        autoFixable: false, // Requires manual fix
      });
    }
  }

  return issues;
}

/**
 * Check if two entities are duplicates
 */
function areEntitiesDuplicate(a: DxfEntity, b: DxfEntity): boolean {
  // Must be same type
  if (a.type !== b.type) {
    return false;
  }

  // Must have same number of vertices
  if (a.vertices.length !== b.vertices.length) {
    return false;
  }

  const tolerance = 0.001; // 1 micron tolerance

  // For lines, check both directions
  if (a.type === 'LINE' && a.vertices.length === 2 && b.vertices.length === 2) {
    const a1 = a.vertices[0];
    const a2 = a.vertices[1];
    const b1 = b.vertices[0];
    const b2 = b.vertices[1];

    // Same direction
    const sameDir =
      Math.abs(a1.x - b1.x) < tolerance &&
      Math.abs(a1.y - b1.y) < tolerance &&
      Math.abs(a2.x - b2.x) < tolerance &&
      Math.abs(a2.y - b2.y) < tolerance;

    // Reversed direction
    const revDir =
      Math.abs(a1.x - b2.x) < tolerance &&
      Math.abs(a1.y - b2.y) < tolerance &&
      Math.abs(a2.x - b1.x) < tolerance &&
      Math.abs(a2.y - b1.y) < tolerance;

    return sameDir || revDir;
  }

  // For polylines, check if all vertices match
  if (a.type === 'POLYLINE') {
    // Check forward direction
    let forwardMatch = true;
    for (let i = 0; i < a.vertices.length; i++) {
      const va = a.vertices[i];
      const vb = b.vertices[i];

      if (Math.abs(va.x - vb.x) >= tolerance || Math.abs(va.y - vb.y) >= tolerance) {
        forwardMatch = false;
        break;
      }
    }

    if (forwardMatch) {
      return true;
    }

    // Check reversed direction
    let reverseMatch = true;
    for (let i = 0; i < a.vertices.length; i++) {
      const va = a.vertices[i];
      const vb = b.vertices[b.vertices.length - 1 - i];

      if (Math.abs(va.x - vb.x) >= tolerance || Math.abs(va.y - vb.y) >= tolerance) {
        reverseMatch = false;
        break;
      }
    }

    return reverseMatch;
  }

  return false;
}

/**
 * Check if polyline has self-intersections
 * Uses line segment intersection algorithm
 */
function hasSelfIntersection(vertices: { x: number; y: number }[]): boolean {
  if (vertices.length < 4) {
    return false; // Need at least 4 vertices for self-intersection
  }

  // Check each line segment against all other non-adjacent segments
  for (let i = 0; i < vertices.length - 1; i++) {
    const seg1Start = vertices[i];
    const seg1End = vertices[i + 1];

    // Start from i+2 to skip adjacent segments
    for (let j = i + 2; j < vertices.length - 1; j++) {
      // Skip if checking last segment against first (they can touch at endpoints)
      if (i === 0 && j === vertices.length - 2) {
        continue;
      }

      const seg2Start = vertices[j];
      const seg2End = vertices[j + 1];

      if (segmentsIntersect(seg1Start, seg1End, seg2Start, seg2End)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if two line segments intersect
 * @returns true if segments intersect (not including endpoints)
 */
function segmentsIntersect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): boolean {
  // Calculate direction vectors
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;

  // Calculate cross product
  const cross = d1x * d2y - d1y * d2x;

  // Parallel lines (no intersection)
  if (Math.abs(cross) < 1e-10) {
    return false;
  }

  // Calculate intersection parameters
  const t1 = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / cross;
  const t2 = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / cross;

  // Check if intersection occurs within both segments
  // Exclude endpoints (t == 0 or t == 1)
  const epsilon = 1e-6;
  return (
    t1 > epsilon &&
    t1 < 1 - epsilon &&
    t2 > epsilon &&
    t2 < 1 - epsilon
  );
}

/**
 * Get summary of validation issues
 */
export function getValidationSummary(issues: ValidationIssue[]): {
  total: number;
  errors: number;
  warnings: number;
  autoFixable: number;
} {
  return {
    total: issues.length,
    errors: issues.filter(i => i.severity === 'ERROR').length,
    warnings: issues.filter(i => i.severity === 'WARNING').length,
    autoFixable: issues.filter(i => i.autoFixable).length,
  };
}

/**
 * Filter issues by type
 */
export function filterIssuesByType(
  issues: ValidationIssue[],
  type: ValidationIssue['type']
): ValidationIssue[] {
  return issues.filter(i => i.type === type);
}

/**
 * Filter issues by severity
 */
export function filterIssuesBySeverity(
  issues: ValidationIssue[],
  severity: ValidationIssue['severity']
): ValidationIssue[] {
  return issues.filter(i => i.severity === severity);
}

/**
 * Get all entity IDs that have issues
 */
export function getProblematicEntityIds(issues: ValidationIssue[]): string[] {
  const entityIds = new Set<string>();

  for (const issue of issues) {
    for (const id of issue.entityIds) {
      entityIds.add(id);
    }
  }

  return Array.from(entityIds);
}
