/**
 * DXF Parser Wrapper
 *
 * Wraps the dxf-parser library and provides helper methods
 * for extracting entities, layers, and metadata from DXF files.
 */

import DxfParser from 'dxf-parser';
import type {
  DxfDocument,
  DxfEntity,
  DxfParseResult,
  DxfHeaderInfo,
  DxfValidationResult,
  DxfEntityStats,
  Point2D,
  BoundingBox,
  DxfArcEntity,
  DxfCircleEntity,
  DxfPolylineEntity,
  DxfLineEntity,
  DxfSplineEntity,
} from './types';

/**
 * Parse DXF file content
 */
export function parseDxf(dxfContent: string): DxfParseResult {
  const parser = new DxfParser();

  try {
    const dxf = parser.parseSync(dxfContent) as DxfDocument;
    return {
      success: true,
      data: dxf,
      error: null,
    };
  } catch (error) {
    console.error('DXF parsing error:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Extract entities from parsed DXF
 */
export function extractEntities(dxf: DxfDocument): DxfEntity[] {
  if (!dxf || !dxf.entities) {
    return [];
  }

  return dxf.entities as DxfEntity[];
}

/**
 * Filter entities by type
 */
export function filterEntitiesByType(
  entities: DxfEntity[],
  types: string | string[]
): DxfEntity[] {
  const typeArray = Array.isArray(types) ? types : [types];
  return entities.filter((entity) => typeArray.includes(entity.type));
}

/**
 * Filter entities by layer
 */
export function filterEntitiesByLayer(
  entities: DxfEntity[],
  layers: string | string[]
): DxfEntity[] {
  const layerArray = Array.isArray(layers) ? layers : [layers];
  return entities.filter((entity) => entity.layer && layerArray.includes(entity.layer));
}

/**
 * Get all unique layers in DXF
 */
export function getLayers(dxf: DxfDocument): string[] {
  if (!dxf || !dxf.entities) {
    return [];
  }

  const layers = new Set<string>();
  dxf.entities.forEach((entity) => {
    if (entity.layer) {
      layers.add(entity.layer);
    }
  });

  return Array.from(layers);
}

/**
 * Get entity by handle (unique ID)
 */
export function getEntityByHandle(
  entities: DxfEntity[],
  handle: string
): DxfEntity | null {
  return entities.find((e) => e.handle === handle) || null;
}

/**
 * Extract header information
 */
export function getHeader(dxf: DxfDocument): DxfHeaderInfo {
  if (!dxf || !dxf.header) {
    return {
      version: 'Unknown',
      units: 0,
      drawingLimitsMin: { x: 0, y: 0 },
      drawingLimitsMax: { x: 0, y: 0 },
    };
  }

  return {
    version: dxf.header.$ACADVER || 'Unknown',
    units: dxf.header.$INSUNITS || 0,
    drawingLimitsMin: dxf.header.$LIMMIN || { x: 0, y: 0 },
    drawingLimitsMax: dxf.header.$LIMMAX || { x: 0, y: 0 },
  };
}

/**
 * Get start point of an entity
 */
export function getStartPoint(entity: DxfEntity): Point2D {
  switch (entity.type) {
    case 'LINE': {
      const lineEntity = entity as DxfLineEntity;
      return lineEntity.vertices[0];
    }

    case 'ARC': {
      const arcEntity = entity as DxfArcEntity;
      const startAngle = (arcEntity.startAngle * Math.PI) / 180;
      return {
        x: arcEntity.center.x + arcEntity.radius * Math.cos(startAngle),
        y: arcEntity.center.y + arcEntity.radius * Math.sin(startAngle),
        z: arcEntity.center.z || 0,
      };
    }

    case 'LWPOLYLINE':
    case 'POLYLINE': {
      const polyEntity = entity as DxfPolylineEntity;
      return polyEntity.vertices[0];
    }

    case 'CIRCLE': {
      const circleEntity = entity as DxfCircleEntity;
      return {
        x: circleEntity.center.x,
        y: circleEntity.center.y + circleEntity.radius,
        z: circleEntity.center.z || 0,
      };
    }

    case 'ELLIPSE':
      return entity.center;

    case 'SPLINE': {
      const splineEntity = entity as DxfSplineEntity;
      if (splineEntity.controlPoints && splineEntity.controlPoints.length > 0) {
        const tolerance = 0.0001;
        for (const point of splineEntity.controlPoints) {
          const distFromOrigin = Math.sqrt(point.x * point.x + point.y * point.y);
          if (distFromOrigin > tolerance) {
            return point;
          }
        }
        return splineEntity.controlPoints[0];
      }
      return { x: 0, y: 0, z: 0 };
    }

    default:
      console.warn(`getStartPoint: Unknown entity type ${entity.type}`);
      return { x: 0, y: 0, z: 0 };
  }
}

/**
 * Get end point of an entity
 */
export function getEndPoint(entity: DxfEntity): Point2D {
  switch (entity.type) {
    case 'LINE': {
      const lineEntity = entity as DxfLineEntity;
      return lineEntity.vertices[1];
    }

    case 'ARC': {
      const arcEntity = entity as DxfArcEntity;
      const endAngle = (arcEntity.endAngle * Math.PI) / 180;
      return {
        x: arcEntity.center.x + arcEntity.radius * Math.cos(endAngle),
        y: arcEntity.center.y + arcEntity.radius * Math.sin(endAngle),
        z: arcEntity.center.z || 0,
      };
    }

    case 'LWPOLYLINE':
    case 'POLYLINE': {
      const polyEntity = entity as DxfPolylineEntity;
      return polyEntity.vertices[polyEntity.vertices.length - 1];
    }

    case 'CIRCLE': {
      const circleEntity = entity as DxfCircleEntity;
      return {
        x: circleEntity.center.x,
        y: circleEntity.center.y + circleEntity.radius,
        z: circleEntity.center.z || 0,
      };
    }

    case 'ELLIPSE':
      return entity.center;

    case 'SPLINE': {
      const splineEntity = entity as DxfSplineEntity;
      if (splineEntity.controlPoints && splineEntity.controlPoints.length > 0) {
        const tolerance = 0.0001;
        for (let i = splineEntity.controlPoints.length - 1; i >= 0; i--) {
          const point = splineEntity.controlPoints[i];
          const distFromOrigin = Math.sqrt(point.x * point.x + point.y * point.y);
          if (distFromOrigin > tolerance) {
            return point;
          }
        }
        return splineEntity.controlPoints[splineEntity.controlPoints.length - 1];
      }
      return { x: 0, y: 0, z: 0 };
    }

    default:
      console.warn(`getEndPoint: Unknown entity type ${entity.type}`);
      return { x: 0, y: 0, z: 0 };
  }
}

/**
 * Check if entity is a closed shape
 */
export function isClosedEntity(entity: DxfEntity, tolerance: number = 0.01): boolean {
  switch (entity.type) {
    case 'CIRCLE':
    case 'ELLIPSE':
      return true;

    case 'LWPOLYLINE':
    case 'POLYLINE': {
      const polyEntity = entity as DxfPolylineEntity;
      if (polyEntity.shape || polyEntity.closed) {
        return true;
      }

      const first = polyEntity.vertices[0];
      const last = polyEntity.vertices[polyEntity.vertices.length - 1];
      const distance = Math.sqrt(
        Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2)
      );
      return distance < tolerance;
    }

    case 'LINE':
    case 'ARC':
      return false;

    default:
      return false;
  }
}

/**
 * Get all points from an entity (approximation for curves)
 */
function getEntityPoints(entity: DxfEntity, segments: number = 16): Point2D[] {
  const points: Point2D[] = [];

  switch (entity.type) {
    case 'LINE': {
      const lineEntity = entity as DxfLineEntity;
      points.push(lineEntity.vertices[0], lineEntity.vertices[1]);
      break;
    }

    case 'CIRCLE': {
      const circleEntity = entity as DxfCircleEntity;
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        points.push({
          x: circleEntity.center.x + circleEntity.radius * Math.cos(angle),
          y: circleEntity.center.y + circleEntity.radius * Math.sin(angle),
        });
      }
      break;
    }

    case 'ARC': {
      const arcEntity = entity as DxfArcEntity;
      const startAngle = (arcEntity.startAngle * Math.PI) / 180;
      const endAngle = (arcEntity.endAngle * Math.PI) / 180;
      let totalAngle = endAngle - startAngle;
      if (totalAngle < 0) totalAngle += 2 * Math.PI;

      for (let i = 0; i <= segments; i++) {
        const angle = startAngle + (totalAngle * i) / segments;
        points.push({
          x: arcEntity.center.x + arcEntity.radius * Math.cos(angle),
          y: arcEntity.center.y + arcEntity.radius * Math.sin(angle),
        });
      }
      break;
    }

    case 'LWPOLYLINE':
    case 'POLYLINE': {
      const polyEntity = entity as DxfPolylineEntity;
      points.push(...polyEntity.vertices);
      break;
    }

    case 'ELLIPSE':
      points.push(entity.center);
      break;

    default:
      console.warn(`getEntityPoints: Unknown entity type ${entity.type}`);
  }

  return points;
}

/**
 * Get bounding box of entities
 */
export function getEntitiesBoundingBox(entities: DxfEntity[]): BoundingBox {
  if (!entities || entities.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  entities.forEach((entity) => {
    const points = getEntityPoints(entity);

    points.forEach((point) => {
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
    height: maxY - minY,
  };
}

/**
 * Get statistics about DXF entities
 */
export function getEntityStats(entities: DxfEntity[]): DxfEntityStats {
  const stats: DxfEntityStats = {
    total: entities.length,
    byType: {},
    byLayer: {},
    closedShapes: 0,
    openShapes: 0,
  };

  entities.forEach((entity) => {
    // Count by type
    stats.byType[entity.type] = (stats.byType[entity.type] || 0) + 1;

    // Count by layer
    const layer = entity.layer || 'Default';
    stats.byLayer[layer] = (stats.byLayer[layer] || 0) + 1;

    // Count closed vs open
    if (isClosedEntity(entity)) {
      stats.closedShapes++;
    } else {
      stats.openShapes++;
    }
  });

  return stats;
}

/**
 * Validate DXF contains valid geometry
 */
export function validateDxf(dxf: DxfDocument): DxfValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!dxf) {
    errors.push('DXF object is null or undefined');
    return { valid: false, errors, warnings };
  }

  if (!dxf.entities || dxf.entities.length === 0) {
    errors.push('DXF contains no entities');
    return { valid: false, errors, warnings };
  }

  // Check for supported entity types
  const supportedTypes = [
    'LINE',
    'CIRCLE',
    'ARC',
    'LWPOLYLINE',
    'POLYLINE',
    'ELLIPSE',
    'SPLINE',
  ];
  const entities = dxf.entities || [];
  const unsupportedEntities = entities.filter(
    (e) => !supportedTypes.includes(e.type)
  );

  if (unsupportedEntities.length > 0) {
    const types = [...new Set(unsupportedEntities.map((e) => e.type))];
    warnings.push(
      `Unsupported entity types found (will be ignored): ${types.join(', ')}`
    );
    warnings.push(
      `${unsupportedEntities.length} unsupported entities will be skipped`
    );
  }

  // Check if there are ANY supported entities
  const supportedEntities = entities.filter((e) =>
    supportedTypes.includes(e.type)
  );
  if (supportedEntities.length === 0) {
    errors.push(
      'DXF contains no supported entities (LINE, CIRCLE, ARC, LWPOLYLINE, POLYLINE, ELLIPSE, SPLINE)'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export default {
  parseDxf,
  extractEntities,
  filterEntitiesByType,
  filterEntitiesByLayer,
  getLayers,
  getEntityByHandle,
  getHeader,
  getStartPoint,
  getEndPoint,
  isClosedEntity,
  getEntitiesBoundingBox,
  getEntityStats,
  validateDxf,
};
