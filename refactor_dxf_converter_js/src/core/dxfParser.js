/**
 * DXF Parser Wrapper
 *
 * Wraps the dxf-parser library and provides helper methods
 * for extracting entities, layers, and metadata from DXF files.
 *
 * Based on: docs/dxf_parser_documentation.md
 */

import DxfParser from 'dxf-parser';

/**
 * Parse DXF file content
 * @param {string} dxfContent - Raw DXF file content (text)
 * @returns {Object} Parsed DXF data structure
 */
export function parseDxf(dxfContent) {
  const parser = new DxfParser();

  try {
    const dxf = parser.parseSync(dxfContent);
    return {
      success: true,
      data: dxf,
      error: null
    };
  } catch (error) {
    console.error('DXF parsing error:', error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
}

/**
 * Extract entities from parsed DXF
 * @param {Object} dxf - Parsed DXF object
 * @returns {Array} Array of entity objects
 */
export function extractEntities(dxf) {
  if (!dxf || !dxf.entities) {
    return [];
  }

  return dxf.entities;
}

/**
 * Filter entities by type
 * @param {Array} entities - Array of entities
 * @param {string|Array} types - Entity type(s) to filter
 * @returns {Array} Filtered entities
 */
export function filterEntitiesByType(entities, types) {
  const typeArray = Array.isArray(types) ? types : [types];
  return entities.filter(entity => typeArray.includes(entity.type));
}

/**
 * Filter entities by layer
 * @param {Array} entities - Array of entities
 * @param {string|Array} layers - Layer name(s) to filter
 * @returns {Array} Filtered entities
 */
export function filterEntitiesByLayer(entities, layers) {
  const layerArray = Array.isArray(layers) ? layers : [layers];
  return entities.filter(entity => layerArray.includes(entity.layer));
}

/**
 * Get all unique layers in DXF
 * @param {Object} dxf - Parsed DXF object
 * @returns {Array} Array of layer names
 */
export function getLayers(dxf) {
  if (!dxf || !dxf.entities) {
    return [];
  }

  const layers = new Set();
  dxf.entities.forEach(entity => {
    if (entity.layer) {
      layers.add(entity.layer);
    }
  });

  return Array.from(layers);
}

/**
 * Get entity by handle (unique ID)
 * @param {Array} entities - Array of entities
 * @param {string} handle - Entity handle
 * @returns {Object|null} Entity object or null
 */
export function getEntityByHandle(entities, handle) {
  return entities.find(e => e.handle === handle) || null;
}

/**
 * Extract header information
 * @param {Object} dxf - Parsed DXF object
 * @returns {Object} Header data
 */
export function getHeader(dxf) {
  if (!dxf || !dxf.header) {
    return {};
  }

  return {
    version: dxf.header.$ACADVER || 'Unknown',
    units: dxf.header.$INSUNITS || 0, // 0=Unitless, 1=Inches, 2=Feet, 4=Millimeters, etc.
    drawingLimitsMin: dxf.header.$LIMMIN || { x: 0, y: 0 },
    drawingLimitsMax: dxf.header.$LIMMAX || { x: 0, y: 0 }
  };
}

/**
 * Get start point of an entity
 * @param {Object} entity - DXF entity
 * @returns {Object} Point {x, y}
 */
export function getStartPoint(entity) {
  switch (entity.type) {
    case 'LINE':
      return entity.vertices[0];

    case 'ARC':
      const startAngle = entity.startAngle * Math.PI / 180;
      return {
        x: entity.center.x + entity.radius * Math.cos(startAngle),
        y: entity.center.y + entity.radius * Math.sin(startAngle),
        z: entity.center.z || 0
      };

    case 'LWPOLYLINE':
    case 'POLYLINE':
      return entity.vertices[0];

    case 'CIRCLE':
      // Circle has no start point, return top point
      return {
        x: entity.center.x,
        y: entity.center.y + entity.radius,
        z: entity.center.z || 0
      };

    case 'ELLIPSE':
      return entity.center;

    case 'SPLINE':
      // For SPLINE, return first NON-ZERO control point to avoid connection issues
      if (entity.controlPoints && entity.controlPoints.length > 0) {
        // Find first control point that's not at origin (or very close to it)
        const tolerance = 0.0001;
        for (const point of entity.controlPoints) {
          const distFromOrigin = Math.sqrt(point.x * point.x + point.y * point.y);
          if (distFromOrigin > tolerance) {
            return point;
          }
        }
        // If all points are at origin, return first one anyway
        return entity.controlPoints[0];
      }
      // Fallback to origin if no control points
      return { x: 0, y: 0, z: 0 };

    default:
      console.warn(`getStartPoint: Unknown entity type ${entity.type}`);
      return { x: 0, y: 0, z: 0 };
  }
}

/**
 * Get end point of an entity
 * @param {Object} entity - DXF entity
 * @returns {Object} Point {x, y}
 */
export function getEndPoint(entity) {
  switch (entity.type) {
    case 'LINE':
      return entity.vertices[1];

    case 'ARC':
      const endAngle = entity.endAngle * Math.PI / 180;
      return {
        x: entity.center.x + entity.radius * Math.cos(endAngle),
        y: entity.center.y + entity.radius * Math.sin(endAngle),
        z: entity.center.z || 0
      };

    case 'LWPOLYLINE':
    case 'POLYLINE':
      return entity.vertices[entity.vertices.length - 1];

    case 'CIRCLE':
      // Circle has no end point, return top point (same as start)
      return {
        x: entity.center.x,
        y: entity.center.y + entity.radius,
        z: entity.center.z || 0
      };

    case 'ELLIPSE':
      return entity.center;

    case 'SPLINE':
      // For SPLINE, return last NON-ZERO control point to avoid connection issues
      if (entity.controlPoints && entity.controlPoints.length > 0) {
        // Find last control point that's not at origin (or very close to it)
        const tolerance = 0.0001;
        for (let i = entity.controlPoints.length - 1; i >= 0; i--) {
          const point = entity.controlPoints[i];
          const distFromOrigin = Math.sqrt(point.x * point.x + point.y * point.y);
          if (distFromOrigin > tolerance) {
            return point;
          }
        }
        // If all points are at origin, return last one anyway
        return entity.controlPoints[entity.controlPoints.length - 1];
      }
      // Fallback to origin if no control points
      return { x: 0, y: 0, z: 0 };

    default:
      console.warn(`getEndPoint: Unknown entity type ${entity.type}`);
      return { x: 0, y: 0, z: 0 };
  }
}

/**
 * Check if entity is a closed shape
 * @param {Object} entity - DXF entity
 * @param {number} tolerance - Distance tolerance for closure check
 * @returns {boolean}
 */
export function isClosedEntity(entity, tolerance = 0.01) {
  switch (entity.type) {
    case 'CIRCLE':
    case 'ELLIPSE':
      return true;

    case 'LWPOLYLINE':
    case 'POLYLINE':
      // Check if polyline has closed flag
      if (entity.shape || entity.closed) {
        return true;
      }

      // Check if first and last vertices are same
      const first = entity.vertices[0];
      const last = entity.vertices[entity.vertices.length - 1];
      const distance = Math.sqrt(
        Math.pow(last.x - first.x, 2) +
        Math.pow(last.y - first.y, 2)
      );
      return distance < tolerance;

    case 'LINE':
    case 'ARC':
      return false;

    default:
      return false;
  }
}

/**
 * Get bounding box of entities
 * @param {Array} entities - Array of entities
 * @returns {Object} {minX, minY, maxX, maxY}
 */
export function getEntitiesBoundingBox(entities) {
  if (!entities || entities.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  entities.forEach(entity => {
    const points = getEntityPoints(entity);

    points.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
  });

  return { minX, minY, maxX, maxY };
}

/**
 * Get all points from an entity (approximation for curves)
 * @param {Object} entity - DXF entity
 * @param {number} segments - Number of segments for curves
 * @returns {Array} Array of points
 */
function getEntityPoints(entity, segments = 16) {
  const points = [];

  switch (entity.type) {
    case 'LINE':
      points.push(entity.vertices[0], entity.vertices[1]);
      break;

    case 'CIRCLE':
      // Sample circle perimeter
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        points.push({
          x: entity.center.x + entity.radius * Math.cos(angle),
          y: entity.center.y + entity.radius * Math.sin(angle)
        });
      }
      break;

    case 'ARC':
      const startAngle = entity.startAngle * Math.PI / 180;
      const endAngle = entity.endAngle * Math.PI / 180;
      let totalAngle = endAngle - startAngle;
      if (totalAngle < 0) totalAngle += 2 * Math.PI;

      for (let i = 0; i <= segments; i++) {
        const angle = startAngle + (totalAngle * i / segments);
        points.push({
          x: entity.center.x + entity.radius * Math.cos(angle),
          y: entity.center.y + entity.radius * Math.sin(angle)
        });
      }
      break;

    case 'LWPOLYLINE':
    case 'POLYLINE':
      points.push(...entity.vertices);
      break;

    case 'ELLIPSE':
      points.push(entity.center);
      break;

    default:
      console.warn(`getEntityPoints: Unknown entity type ${entity.type}`);
  }

  return points;
}

/**
 * Get statistics about DXF entities
 * @param {Array} entities - Array of entities
 * @returns {Object} Statistics
 */
export function getEntityStats(entities) {
  const stats = {
    total: entities.length,
    byType: {},
    byLayer: {},
    closedShapes: 0,
    openShapes: 0
  };

  entities.forEach(entity => {
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
 * @param {Object} dxf - Parsed DXF object
 * @returns {Object} {valid: boolean, errors: Array}
 */
export function validateDxf(dxf) {
  const errors = [];
  const warnings = [];

  if (!dxf) {
    errors.push('DXF object is null or undefined');
    return { valid: false, errors, warnings };
  }

  if (!dxf.entities || dxf.entities.length === 0) {
    errors.push('DXF contains no entities');
    return { valid: false, errors, warnings };
  }

  // Check for supported entity types
  const supportedTypes = ['LINE', 'CIRCLE', 'ARC', 'LWPOLYLINE', 'POLYLINE', 'ELLIPSE', 'SPLINE'];
  const entities = dxf.entities || [];
  const unsupportedEntities = entities.filter(e => !supportedTypes.includes(e.type));

  // Unsupported entities are only a WARNING, not an error
  // They will be filtered out during processing
  if (unsupportedEntities.length > 0) {
    const types = [...new Set(unsupportedEntities.map(e => e.type))];
    warnings.push(`Unsupported entity types found (will be ignored): ${types.join(', ')}`);
    warnings.push(`${unsupportedEntities.length} unsupported entities will be skipped`);
  }

  // Check if there are ANY supported entities
  const supportedEntities = entities.filter(e => supportedTypes.includes(e.type));
  if (supportedEntities.length === 0) {
    errors.push('DXF contains no supported entities (LINE, CIRCLE, ARC, LWPOLYLINE, POLYLINE, ELLIPSE, SPLINE)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
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
  validateDxf
};
