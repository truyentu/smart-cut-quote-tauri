/**
 * DXF Parser Service
 * Parse DXF files to internal entity format using dxf-parser library
 */

import DxfParser from 'dxf-parser';
import { invoke } from '@tauri-apps/api/core';
import type { DxfEntity, DxfVertex, ParsedDxf } from '../types/dxfHealing';

/**
 * Parse DXF file from disk
 * @param filePath - Absolute path to DXF file
 * @returns Parsed entities, layers, and bounds
 */
export async function parseDxfFile(filePath: string): Promise<ParsedDxf> {
  // 1. Read file via Tauri
  const content = await invoke<string>('read_dxf_file', { path: filePath });

  // 2. Parse with dxf-parser
  const parser = new DxfParser();
  let dxf;

  try {
    dxf = parser.parseSync(content);
  } catch (error) {
    throw new Error(`Failed to parse DXF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (!dxf || !dxf.entities) {
    throw new Error('Invalid DXF file: No entities found');
  }

  // 3. Extract entities
  const entities: DxfEntity[] = [];

  for (const entity of dxf.entities) {
    try {
      const parsed = parseEntity(entity);
      if (parsed) {
        entities.push(parsed);
      }
    } catch (error) {
      console.warn(`Failed to parse entity ${entity.type}:`, error);
      // Continue with other entities
    }
  }

  if (entities.length === 0) {
    throw new Error('No supported entities found in DXF file');
  }

  // 4. Extract unique layers
  const layers = [...new Set(entities.map(e => e.layer))];

  // 5. Calculate bounds for camera setup
  const bounds = calculateBounds(entities);

  return { entities, layers, bounds };
}

/**
 * Parse a single DXF entity to internal format
 */
function parseEntity(entity: any): DxfEntity | null {
  const vertices = extractVertices(entity);

  if (vertices.length === 0) {
    return null; // Skip unsupported entities
  }

  const entityType = normalizeEntityType(entity.type);
  if (!entityType) {
    return null;
  }

  const metadata = calculateMetadata(entityType, vertices);

  return {
    id: generateId(),
    type: entityType,
    layer: entity.layer || 'CUTTING',
    vertices,
    color: entity.color || 0xffffff,
    selected: false,
    metadata,
  };
}

/**
 * Normalize entity type to our supported types
 */
function normalizeEntityType(type: string): DxfEntity['type'] | null {
  const upperType = type.toUpperCase();

  switch (upperType) {
    case 'LINE':
      return 'LINE';
    case 'ARC':
      return 'ARC';
    case 'CIRCLE':
      return 'CIRCLE';
    case 'POLYLINE':
    case 'LWPOLYLINE':
      return 'POLYLINE';
    case 'SPLINE':
      return 'SPLINE';
    default:
      console.warn(`Unsupported entity type: ${type}`);
      return null;
  }
}

/**
 * Extract vertices from DXF entity
 */
function extractVertices(entity: any): DxfVertex[] {
  const type = entity.type.toUpperCase();

  switch (type) {
    case 'LINE':
      return extractLineVertices(entity);

    case 'POLYLINE':
    case 'LWPOLYLINE':
      return extractPolylineVertices(entity);

    case 'ARC':
      return extractArcVertices(entity);

    case 'CIRCLE':
      return extractCircleVertices(entity);

    case 'SPLINE':
      return extractSplineVertices(entity);

    default:
      return [];
  }
}

/**
 * Extract vertices from LINE entity
 */
function extractLineVertices(entity: any): DxfVertex[] {
  if (!entity.vertices || entity.vertices.length < 2) {
    return [];
  }

  return [
    { x: entity.vertices[0].x, y: entity.vertices[0].y },
    { x: entity.vertices[1].x, y: entity.vertices[1].y },
  ];
}

/**
 * Extract vertices from POLYLINE/LWPOLYLINE entity
 */
function extractPolylineVertices(entity: any): DxfVertex[] {
  if (!entity.vertices || entity.vertices.length === 0) {
    return [];
  }

  return entity.vertices.map((v: any) => ({
    x: v.x,
    y: v.y,
  }));
}

/**
 * Extract vertices from ARC entity (sample to polyline)
 */
function extractArcVertices(entity: any): DxfVertex[] {
  if (!entity.center || !entity.radius) {
    return [];
  }

  const center = entity.center;
  const radius = entity.radius;
  const startAngle = entity.startAngle || 0;
  const endAngle = entity.endAngle || Math.PI * 2;

  return sampleArc(center, radius, startAngle, endAngle);
}

/**
 * Extract vertices from CIRCLE entity (sample to polyline)
 */
function extractCircleVertices(entity: any): DxfVertex[] {
  if (!entity.center || !entity.radius) {
    return [];
  }

  return sampleCircle(entity.center, entity.radius);
}

/**
 * Extract vertices from SPLINE entity (tessellate to polyline)
 */
function extractSplineVertices(entity: any): DxfVertex[] {
  if (!entity.controlPoints || entity.controlPoints.length === 0) {
    return [];
  }

  // Simple linear interpolation between control points
  // For production, use proper B-spline evaluation
  return entity.controlPoints.map((cp: any) => ({
    x: cp.x,
    y: cp.y,
  }));
}

/**
 * Sample arc to polyline vertices
 * @param center - Arc center point
 * @param radius - Arc radius
 * @param startAngle - Start angle in radians
 * @param endAngle - End angle in radians
 * @param segments - Number of line segments (default: 32)
 */
function sampleArc(
  center: { x: number; y: number },
  radius: number,
  startAngle: number,
  endAngle: number,
  segments: number = 32
): DxfVertex[] {
  const vertices: DxfVertex[] = [];

  // Normalize angles
  let start = startAngle;
  let end = endAngle;

  // Handle wrap-around
  if (end < start) {
    end += Math.PI * 2;
  }

  const angleRange = end - start;
  const step = angleRange / segments;

  for (let i = 0; i <= segments; i++) {
    const angle = start + step * i;
    vertices.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    });
  }

  return vertices;
}

/**
 * Sample circle to polyline vertices
 * @param center - Circle center point
 * @param radius - Circle radius
 * @param segments - Number of line segments (default: 64)
 */
function sampleCircle(
  center: { x: number; y: number },
  radius: number,
  segments: number = 64
): DxfVertex[] {
  const vertices: DxfVertex[] = [];
  const step = (Math.PI * 2) / segments;

  for (let i = 0; i <= segments; i++) {
    const angle = step * i;
    vertices.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    });
  }

  return vertices;
}

/**
 * Calculate entity metadata (closed, length, area)
 */
function calculateMetadata(
  type: DxfEntity['type'],
  vertices: DxfVertex[]
): DxfEntity['metadata'] {
  const closed = isClosedContour(type, vertices);
  const length = calculateLength(vertices);
  const area = closed ? calculateArea(vertices) : undefined;

  return { closed, length, area };
}

/**
 * Check if contour is closed
 */
function isClosedContour(type: DxfEntity['type'], vertices: DxfVertex[]): boolean {
  // Circles are always closed
  if (type === 'CIRCLE') {
    return true;
  }

  // Need at least 3 vertices to form a closed contour
  if (vertices.length < 3) {
    return false;
  }

  // Check if first and last vertex are the same (within tolerance)
  const first = vertices[0];
  const last = vertices[vertices.length - 1];

  const distance = Math.sqrt(
    Math.pow(last.x - first.x, 2) +
    Math.pow(last.y - first.y, 2)
  );

  return distance < 0.001; // 1 micron tolerance
}

/**
 * Calculate total length of polyline
 */
function calculateLength(vertices: DxfVertex[]): number {
  if (vertices.length < 2) {
    return 0;
  }

  let totalLength = 0;

  for (let i = 0; i < vertices.length - 1; i++) {
    const v1 = vertices[i];
    const v2 = vertices[i + 1];

    const segmentLength = Math.sqrt(
      Math.pow(v2.x - v1.x, 2) +
      Math.pow(v2.y - v1.y, 2)
    );

    totalLength += segmentLength;
  }

  return totalLength;
}

/**
 * Calculate area of closed polygon using Shoelace formula
 */
function calculateArea(vertices: DxfVertex[]): number {
  if (vertices.length < 3) {
    return 0;
  }

  let area = 0;

  for (let i = 0; i < vertices.length - 1; i++) {
    const v1 = vertices[i];
    const v2 = vertices[i + 1];

    area += v1.x * v2.y - v2.x * v1.y;
  }

  // Close the polygon
  const first = vertices[0];
  const last = vertices[vertices.length - 1];
  area += last.x * first.y - first.x * last.y;

  return Math.abs(area) / 2;
}

/**
 * Calculate bounding box for all entities
 */
function calculateBounds(entities: DxfEntity[]): ParsedDxf['bounds'] {
  if (entities.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const entity of entities) {
    for (const vertex of entity.vertices) {
      if (vertex.x < minX) minX = vertex.x;
      if (vertex.y < minY) minY = vertex.y;
      if (vertex.x > maxX) maxX = vertex.x;
      if (vertex.y > maxY) maxY = vertex.y;
    }
  }

  // Add 10% padding
  const paddingX = (maxX - minX) * 0.1;
  const paddingY = (maxY - minY) * 0.1;

  return {
    minX: minX - paddingX,
    minY: minY - paddingY,
    maxX: maxX + paddingX,
    maxY: maxY + paddingY,
  };
}

/**
 * Generate unique ID for entity
 */
function generateId(): string {
  return `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
