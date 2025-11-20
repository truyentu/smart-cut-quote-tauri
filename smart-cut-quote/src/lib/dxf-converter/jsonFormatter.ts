/**
 * JSON Formatter for sparroWASM
 *
 * Formats converted items into CORRECT sparroWASM JSON format.
 *
 * CORRECT sparroWASM Format:
 * {
 *   name: "problem_name",
 *   items: [
 *     {
 *       id: number,
 *       demand: number,
 *       dxf: "path/to/file.dxf",
 *       allowed_orientations: [0.0, 90.0, 180.0, 270.0],
 *       shape: {
 *         type: "simple_polygon",
 *         data: [[x, y], ...]
 *       }
 *     }
 *   ],
 *   strip_height: number
 * }
 */

import type {
  PointTuple,
  SparrowJson,
  SparrowItem,
  NestingInputItem,
  JsonSizeInfo,
  JsonStats,
  ConversionSettings,
} from './types';

/**
 * Clean coordinate - remove floating point errors and scientific notation
 */
function cleanCoordinate(value: number): number {
  // Round to 6 decimal places (0.001mm precision)
  const rounded = Math.round(value * 1000000) / 1000000;

  // If result is extremely small (< 0.000001), treat as 0
  if (Math.abs(rounded) < 0.000001) {
    return 0;
  }

  return rounded;
}

/**
 * Ensure polygon is counter-clockwise (CCW)
 */
function ensureCounterClockwise(points: PointTuple[]): PointTuple[] {
  if (!points || points.length < 3) return points;

  // Calculate signed area using Shoelace formula
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }

  // If area is negative, polygon is clockwise - reverse it
  if (area < 0) {
    console.log('  Reversing polygon to ensure CCW winding order');
    return [...points].reverse();
  }

  return points;
}

/**
 * Clean polygon data - remove floating point errors and ensure CCW
 */
function cleanPolygonData(polygonData: PointTuple[]): PointTuple[] {
  // First clean coordinates
  let cleaned: PointTuple[] = polygonData.map((coord) => [
    cleanCoordinate(coord[0]),
    cleanCoordinate(coord[1]),
  ]);

  // CRITICAL FIX: Remove duplicate consecutive points
  const tolerance = 0.01;
  const withoutDuplicates: PointTuple[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const curr = cleaned[i];

    if (withoutDuplicates.length > 0) {
      const prev = withoutDuplicates[withoutDuplicates.length - 1];
      const dist = Math.sqrt(
        Math.pow(curr[0] - prev[0], 2) + Math.pow(curr[1] - prev[1], 2)
      );

      if (dist < tolerance) {
        console.log(
          `  JSON formatter: Removing duplicate point [${curr[0]}, ${curr[1]}] (distance: ${dist.toFixed(6)}mm from previous)`
        );
        continue;
      }
    }

    withoutDuplicates.push(curr);
  }

  if (withoutDuplicates.length !== cleaned.length) {
    console.log(
      `  JSON formatter: Removed ${cleaned.length - withoutDuplicates.length} duplicate consecutive points`
    );
  }

  cleaned = withoutDuplicates;

  // Then ensure counter-clockwise (required by sparroWASM)
  return ensureCounterClockwise(cleaned);
}

/**
 * Format items into CORRECT sparroWASM JSON structure
 */
export function formatSparrowJson(
  items: NestingInputItem[],
  settings: Partial<ConversionSettings> = {}
): SparrowJson {
  const defaultSettings = {
    stripHeight: 6000,
    problemName: 'dxf_conversion',
  };

  const config = { ...defaultSettings, ...settings };

  // Format items according to sparroWASM specification
  const formattedItems: SparrowItem[] = items.map((item) => {
    // Get polygon data - use only exterior (simple polygons only)
    const polygonData = item.shape.exterior || [];

    // CRITICAL: Clean polygon data
    const cleanedPolygonData = cleanPolygonData(polygonData);

    // Check for holes and warn
    const hasHoles = item.shape.interiors && item.shape.interiors.length > 0;
    if (hasHoles) {
      console.warn(
        `Item ${item.id}: Has ${item.shape.interiors.length} hole(s) - sparroWASM only supports simple polygons. Holes will be ignored.`
      );
    }

    // Convert allowed_rotations integers to allowed_orientations floats
    const orientations = (item.allowed_rotations || [0, 90, 180, 270]).map(
      (angle) => {
        return parseFloat(angle.toFixed(1));
      }
    );

    return {
      id: item.id,
      demand: item.quantity || 1,
      dxf: item.metadata?.filename || `item_${item.id}.dxf`,
      allowed_orientations: orientations,
      shape: {
        type: 'simple_polygon' as const,
        data: cleanedPolygonData,
      },
    };
  });

  return {
    name: config.problemName || 'dxf_conversion',
    items: formattedItems,
    strip_height: config.stripHeight || 6000,
  };
}

/**
 * Validate a single item
 */
function validateItem(item: SparrowItem, index: number): string[] {
  const errors: string[] = [];

  if (typeof item.id !== 'number') {
    errors.push(`Item ${index}: Missing or invalid "id" (must be number)`);
  }

  if (typeof item.demand !== 'number' || item.demand <= 0) {
    errors.push(
      `Item ${index}: Missing or invalid "demand" (must be positive number)`
    );
  }

  if (!item.dxf || typeof item.dxf !== 'string') {
    errors.push(`Item ${index}: Missing or invalid "dxf" (must be string path)`);
  }

  if (!item.allowed_orientations) {
    errors.push(`Item ${index}: Missing "allowed_orientations"`);
  } else if (!Array.isArray(item.allowed_orientations)) {
    errors.push(`Item ${index}: "allowed_orientations" must be an array`);
  } else if (item.allowed_orientations.length === 0) {
    errors.push(
      `Item ${index}: "allowed_orientations" must contain at least one orientation`
    );
  } else {
    const invalidOrientations = item.allowed_orientations.filter(
      (o) => typeof o !== 'number' || o < 0 || o >= 360
    );

    if (invalidOrientations.length > 0) {
      errors.push(`Item ${index}: Invalid orientations (must be 0-359 degrees)`);
    }
  }

  if (!item.shape) {
    errors.push(`Item ${index}: Missing "shape" property`);
    return errors;
  }

  if (item.shape.type !== 'simple_polygon') {
    errors.push(`Item ${index}: shape.type must be "simple_polygon"`);
  }

  if (!item.shape.data) {
    errors.push(`Item ${index}: Missing "shape.data"`);
  } else if (!Array.isArray(item.shape.data)) {
    errors.push(`Item ${index}: "shape.data" must be an array`);
  } else {
    const polygonErrors = validatePolygon(
      item.shape.data,
      `Item ${index}.shape.data`
    );
    errors.push(...polygonErrors);
  }

  return errors;
}

/**
 * Validate a polygon (array of points)
 */
function validatePolygon(polygon: PointTuple[], label: string): string[] {
  const errors: string[] = [];

  if (!Array.isArray(polygon)) {
    errors.push(`${label}: Must be an array of points`);
    return errors;
  }

  if (polygon.length < 3) {
    errors.push(`${label}: Must have at least 3 points (has ${polygon.length})`);
    return errors;
  }

  polygon.forEach((point, pointIndex) => {
    if (!Array.isArray(point)) {
      errors.push(`${label}[${pointIndex}]: Point must be [x, y] array`);
    } else if (point.length !== 2) {
      errors.push(
        `${label}[${pointIndex}]: Point must have exactly 2 coordinates [x, y]`
      );
    } else {
      if (typeof point[0] !== 'number' || !isFinite(point[0])) {
        errors.push(`${label}[${pointIndex}]: x coordinate must be finite number`);
      }

      if (typeof point[1] !== 'number' || !isFinite(point[1])) {
        errors.push(`${label}[${pointIndex}]: y coordinate must be finite number`);
      }
    }
  });

  return errors;
}

/**
 * Validate sparroWASM JSON structure
 */
export function validateSparrowJson(json: SparrowJson): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!json.name || typeof json.name !== 'string') {
    errors.push('Missing or invalid "name" property (must be string)');
  }

  if (typeof json.strip_height !== 'number' || json.strip_height <= 0) {
    errors.push('Invalid strip_height: must be positive number');
  }

  if (!json.items) {
    errors.push('Missing "items" property');
  } else if (!Array.isArray(json.items)) {
    errors.push('"items" must be an array');
  } else if (json.items.length === 0) {
    warnings.push('Items array is empty');
  } else {
    json.items.forEach((item, index) => {
      const itemErrors = validateItem(item, index);
      errors.push(...itemErrors);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Convert sparroWASM JSON to proper float notation
 * CRITICAL: Rust deserializer requires ALL numbers as floats (0.0 not 0)
 */
export function stringifySparrowJson(json: SparrowJson, indent: number = 2): string {
  let jsonString = JSON.stringify(json, null, indent);

  // Add .0 to specific fields that need float notation
  jsonString = jsonString.replace(
    /(\"(?:id|demand|strip_height)\"):\s*(-?\d+)(?![\.\d])/g,
    (match, key, number) => {
      if (key === '"id"' || key === '"demand"') {
        return `${key}: ${number}`;
      } else if (key === '"strip_height"') {
        return `${key}: ${number}.0`;
      }
      return match;
    }
  );

  // Convert integers in arrays (coordinates and allowed_orientations)
  jsonString = jsonString.replace(
    /(\[|,)(\s*)(-?\d+)(?![\.\d])/g,
    (match, before, whitespace1, number) => {
      return `${before}${whitespace1}${number}.0`;
    }
  );

  return jsonString;
}

/**
 * Pretty print JSON with indentation
 */
export function prettyPrintJson(json: SparrowJson, indent: number = 2): string {
  return JSON.stringify(json, null, indent);
}

/**
 * Minify JSON (compact format)
 */
export function minifyJson(json: SparrowJson): string {
  return JSON.stringify(json);
}

/**
 * Calculate JSON file size
 */
export function calculateJsonSize(json: SparrowJson): JsonSizeInfo {
  const jsonString = JSON.stringify(json);
  const bytes = new Blob([jsonString]).size;
  const kilobytes = bytes / 1024;

  return {
    bytes,
    kilobytes,
    formatted: kilobytes < 1 ? `${bytes} bytes` : `${kilobytes.toFixed(2)} KB`,
  };
}

/**
 * Get JSON statistics
 */
export function getJsonStats(json: SparrowJson): JsonStats {
  if (!json || !json.items) {
    return {
      itemCount: 0,
      totalPoints: 0,
      totalDemand: 0,
      stripHeight: 0,
    };
  }

  const itemCount = json.items.length;

  const totalPoints = json.items.reduce((sum, item) => {
    return sum + (item.shape.data?.length || 0);
  }, 0);

  const totalDemand = json.items.reduce((sum, item) => {
    return sum + (item.demand || 1);
  }, 0);

  return {
    itemCount,
    totalPoints,
    totalDemand,
    stripHeight: json.strip_height || 0,
    problemName: json.name || 'unknown',
    fileSize: calculateJsonSize(json),
  };
}

/**
 * Add metadata to JSON (for debugging/reference)
 */
export function addMetadata(
  json: SparrowJson,
  metadata: Record<string, unknown> = {}
): SparrowJson & { _metadata: Record<string, unknown> } {
  return {
    ...json,
    _metadata: {
      generatedAt: new Date().toISOString(),
      generator: 'DXF Converter TypeScript Module',
      version: '3.0.0',
      format: 'sparroWASM strip packing',
      ...metadata,
    },
  };
}

/**
 * Remove metadata from JSON (for sparroWASM compatibility)
 */
export function removeMetadata(
  json: SparrowJson & { _metadata?: unknown }
): SparrowJson {
  const { _metadata, ...cleanJson } = json;
  return cleanJson;
}

export default {
  formatSparrowJson,
  validateSparrowJson,
  stringifySparrowJson,
  prettyPrintJson,
  minifyJson,
  calculateJsonSize,
  getJsonStats,
  addMetadata,
  removeMetadata,
};
