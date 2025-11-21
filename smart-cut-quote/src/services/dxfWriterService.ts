/**
 * DXF Writer Service
 * Write internal entities back to DXF file format using dxf-writer library
 */

import DxfWriter from 'dxf-writer';
import { invoke } from '@tauri-apps/api/core';
import type { DxfEntity } from '../types/dxfHealing';

/**
 * Write entities to DXF file
 * @param filePath - Absolute path to save DXF file
 * @param entities - Array of entities to write
 */
export async function writeDxfFile(
  filePath: string,
  entities: DxfEntity[]
): Promise<void> {
  if (entities.length === 0) {
    throw new Error('Cannot write DXF file with no entities');
  }

  // Create new DXF writer
  const dxf = new DxfWriter();

  // Group entities by layer
  const layerGroups = groupByLayer(entities);

  // Create layers and write entities
  for (const [layerName, layerEntities] of Object.entries(layerGroups)) {
    // Add layer definition
    dxf.addLayer(layerName, DxfWriter.ACI.WHITE, 'CONTINUOUS');

    // Write entities on this layer
    for (const entity of layerEntities) {
      try {
        writeEntity(dxf, entity, layerName);
      } catch (error) {
        console.warn(`Failed to write entity ${entity.id}:`, error);
        // Continue with other entities
      }
    }
  }

  // Generate DXF string
  const dxfString = dxf.toDxfString();

  // Write to file via Tauri
  await invoke('write_dxf_file', { path: filePath, content: dxfString });
}

/**
 * Write a single entity to DXF
 */
function writeEntity(dxf: DxfWriter, entity: DxfEntity, layerName: string): void {
  dxf.setActiveLayer(layerName);

  switch (entity.type) {
    case 'LINE':
      writeLine(dxf, entity);
      break;

    case 'POLYLINE':
      writePolyline(dxf, entity);
      break;

    case 'ARC':
      writeArc(dxf, entity);
      break;

    case 'CIRCLE':
      writeCircle(dxf, entity);
      break;

    case 'SPLINE':
      // Splines are complex - write as polyline approximation
      writePolyline(dxf, entity);
      break;

    default:
      console.warn(`Unsupported entity type for writing: ${entity.type}`);
  }
}

/**
 * Write LINE entity
 */
function writeLine(dxf: DxfWriter, entity: DxfEntity): void {
  if (entity.vertices.length < 2) {
    throw new Error('LINE must have at least 2 vertices');
  }

  const start = entity.vertices[0];
  const end = entity.vertices[1];

  dxf.drawLine(start.x, start.y, end.x, end.y);
}

/**
 * Write POLYLINE entity
 */
function writePolyline(dxf: DxfWriter, entity: DxfEntity): void {
  if (entity.vertices.length < 2) {
    throw new Error('POLYLINE must have at least 2 vertices');
  }

  const points = entity.vertices.map(v => [v.x, v.y]);

  // Check if polyline should be closed
  const closed = entity.metadata.closed;

  dxf.drawPolyline(points, closed);
}

/**
 * Write ARC entity
 * Convert polyline vertices back to arc parameters
 */
function writeArc(dxf: DxfWriter, entity: DxfEntity): void {
  if (entity.vertices.length < 3) {
    throw new Error('ARC must have at least 3 vertices');
  }

  // Fit arc to vertices using least squares
  const arcParams = fitArcToVertices(entity.vertices);

  if (!arcParams) {
    // Fallback: write as polyline
    console.warn('Failed to fit arc, writing as polyline');
    writePolyline(dxf, entity);
    return;
  }

  dxf.drawArc(
    arcParams.center.x,
    arcParams.center.y,
    arcParams.radius,
    arcParams.startAngle,
    arcParams.endAngle
  );
}

/**
 * Write CIRCLE entity
 */
function writeCircle(dxf: DxfWriter, entity: DxfEntity): void {
  if (entity.vertices.length < 3) {
    throw new Error('CIRCLE must have at least 3 vertices');
  }

  // Calculate center and radius from vertices
  const circleParams = fitCircleToVertices(entity.vertices);

  if (!circleParams) {
    // Fallback: write as polyline
    console.warn('Failed to fit circle, writing as polyline');
    writePolyline(dxf, entity);
    return;
  }

  dxf.drawCircle(circleParams.center.x, circleParams.center.y, circleParams.radius);
}

/**
 * Group entities by layer
 */
function groupByLayer(entities: DxfEntity[]): Record<string, DxfEntity[]> {
  const groups: Record<string, DxfEntity[]> = {};

  for (const entity of entities) {
    const layer = entity.layer || 'CUTTING';

    if (!groups[layer]) {
      groups[layer] = [];
    }

    groups[layer].push(entity);
  }

  return groups;
}

/**
 * Fit arc to polyline vertices
 * Returns arc parameters (center, radius, start/end angles)
 */
function fitArcToVertices(vertices: { x: number; y: number }[]): {
  center: { x: number; y: number };
  radius: number;
  startAngle: number;
  endAngle: number;
} | null {
  if (vertices.length < 3) {
    return null;
  }

  // Use first, middle, and last points to define arc
  const p1 = vertices[0];
  const p2 = vertices[Math.floor(vertices.length / 2)];
  const p3 = vertices[vertices.length - 1];

  // Calculate center using perpendicular bisectors
  const center = findCircleCenter(p1, p2, p3);

  if (!center) {
    return null;
  }

  // Calculate radius
  const radius = Math.sqrt(
    Math.pow(p1.x - center.x, 2) +
    Math.pow(p1.y - center.y, 2)
  );

  // Calculate angles
  const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
  const endAngle = Math.atan2(p3.y - center.y, p3.x - center.x);

  return { center, radius, startAngle, endAngle };
}

/**
 * Fit circle to polyline vertices
 * Returns circle parameters (center, radius)
 */
function fitCircleToVertices(vertices: { x: number; y: number }[]): {
  center: { x: number; y: number };
  radius: number;
} | null {
  if (vertices.length < 3) {
    return null;
  }

  // Use first three non-collinear points
  const p1 = vertices[0];
  const p2 = vertices[Math.floor(vertices.length / 3)];
  const p3 = vertices[Math.floor(2 * vertices.length / 3)];

  const center = findCircleCenter(p1, p2, p3);

  if (!center) {
    return null;
  }

  // Calculate average radius from all vertices
  let radiusSum = 0;
  for (const v of vertices) {
    const r = Math.sqrt(
      Math.pow(v.x - center.x, 2) +
      Math.pow(v.y - center.y, 2)
    );
    radiusSum += r;
  }

  const radius = radiusSum / vertices.length;

  return { center, radius };
}

/**
 * Find circle center from three points
 * Uses perpendicular bisector method
 */
function findCircleCenter(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
): { x: number; y: number } | null {
  // Calculate midpoints
  const mid1 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const mid2 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };

  // Calculate slopes
  const dx1 = p2.x - p1.x;
  const dy1 = p2.y - p1.y;
  const dx2 = p3.x - p2.x;
  const dy2 = p3.y - p2.y;

  // Check for vertical lines
  if (Math.abs(dx1) < 1e-10 || Math.abs(dx2) < 1e-10) {
    return null; // Collinear points
  }

  // Calculate perpendicular slopes
  const slope1 = -dx1 / dy1;
  const slope2 = -dx2 / dy2;

  // Check if slopes are parallel (collinear points)
  if (Math.abs(slope1 - slope2) < 1e-10) {
    return null;
  }

  // Calculate intersection of perpendicular bisectors
  // y - mid1.y = slope1 * (x - mid1.x)
  // y - mid2.y = slope2 * (x - mid2.x)

  const x = (mid2.y - mid1.y + slope1 * mid1.x - slope2 * mid2.x) / (slope1 - slope2);
  const y = mid1.y + slope1 * (x - mid1.x);

  return { x, y };
}

/**
 * Validate DXF string before writing
 */
export function validateDxfString(dxfString: string): boolean {
  // Basic validation: check for required sections
  const requiredSections = ['HEADER', 'TABLES', 'ENTITIES', 'EOF'];

  for (const section of requiredSections) {
    if (!dxfString.includes(section)) {
      console.warn(`Missing required section: ${section}`);
      return false;
    }
  }

  return true;
}

/**
 * Get DXF file statistics
 */
export function getDxfStatistics(entities: DxfEntity[]): {
  totalEntities: number;
  entityTypes: Record<string, number>;
  layers: string[];
  totalLength: number;
  closedContours: number;
  openContours: number;
} {
  const entityTypes: Record<string, number> = {};
  const layerSet = new Set<string>();
  let totalLength = 0;
  let closedContours = 0;
  let openContours = 0;

  for (const entity of entities) {
    // Count entity types
    entityTypes[entity.type] = (entityTypes[entity.type] || 0) + 1;

    // Collect layers
    layerSet.add(entity.layer);

    // Sum lengths
    totalLength += entity.metadata.length;

    // Count contours
    if (entity.metadata.closed) {
      closedContours++;
    } else if (entity.type === 'POLYLINE') {
      openContours++;
    }
  }

  return {
    totalEntities: entities.length,
    entityTypes,
    layers: Array.from(layerSet),
    totalLength,
    closedContours,
    openContours,
  };
}
