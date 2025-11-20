/**
 * JSON Formatter for sparroWASM
 *
 * Formats converted items into CORRECT sparroWASM JSON format.
 * Based on actual sparroWASM repository examples and jagua-rs library.
 *
 * CORRECT sparroWASM Format (verified from repo):
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
 *
 * KEY DIFFERENCES FROM PREVIOUS (WRONG) FORMAT:
 * - Uses strip_height (NOT bin with width/height) - strip packing model
 * - Field "demand" not "quantity"
 * - Field "allowed_orientations" not "allowed_rotations"
 * - Angles are floats (0.0) not integers (0)
 * - Shape has {type, data} not {exterior, interiors}
 * - No "config" object in problem JSON
 * - Requires "dxf" path field
 * - Only supports simple polygons (NO HOLES)
 */

/**
 * Format items into CORRECT sparroWASM JSON structure
 * @param {Array} items - Array of item objects
 * @param {Object} settings - Configuration settings
 * @returns {Object} sparroWASM JSON
 */
/**
 * Clean coordinate - remove floating point errors and scientific notation
 * @param {number} value - Coordinate value
 * @returns {number} Cleaned value
 */
function cleanCoordinate(value) {
  // Round to 6 decimal places (0.001mm precision - more than enough for laser cutting)
  const rounded = Math.round(value * 1000000) / 1000000;

  // If result is extremely small (< 0.000001), treat as 0
  if (Math.abs(rounded) < 0.000001) {
    return 0;
  }

  return rounded;
}

/**
 * Clean polygon data - remove floating point errors and ensure CCW
 * @param {Array} polygonData - Array of [x, y] coordinates
 * @returns {Array} Cleaned polygon data in CCW order
 */
function cleanPolygonData(polygonData) {
  // First clean coordinates
  let cleaned = polygonData.map(coord => [
    cleanCoordinate(coord[0]),
    cleanCoordinate(coord[1])
  ]);

  // CRITICAL FIX: Remove duplicate consecutive points (especially [0,0] artifacts from SPLINE)
  // This is a final safety net to catch any duplicates that slipped through
  const tolerance = 0.01; // 0.01mm tolerance
  const withoutDuplicates = [];

  for (let i = 0; i < cleaned.length; i++) {
    const curr = cleaned[i];

    // Skip if this is a duplicate of the previous point
    if (withoutDuplicates.length > 0) {
      const prev = withoutDuplicates[withoutDuplicates.length - 1];
      const dist = Math.sqrt(
        Math.pow(curr[0] - prev[0], 2) +
        Math.pow(curr[1] - prev[1], 2)
      );

      if (dist < tolerance) {
        console.log(`  JSON formatter: Removing duplicate point [${curr[0]}, ${curr[1]}] (distance: ${dist.toFixed(6)}mm from previous)`);
        continue;
      }
    }

    withoutDuplicates.push(curr);
  }

  if (withoutDuplicates.length !== cleaned.length) {
    console.log(`  JSON formatter: Removed ${cleaned.length - withoutDuplicates.length} duplicate consecutive points`);
  }

  cleaned = withoutDuplicates;

  // Then ensure counter-clockwise (required by sparroWASM)
  return ensureCounterClockwise(cleaned);
}

/**
 * Ensure polygon is counter-clockwise (CCW)
 * sparroWASM expects CCW winding order for exteriors
 * @param {Array} points - Polygon vertices
 * @returns {Array} CCW polygon
 */
function ensureCounterClockwise(points) {
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

export function formatSparrowJson(items, settings = {}) {
  const defaultSettings = {
    stripHeight: 6000,
    problemName: 'dxf_conversion'
  };

  const config = { ...defaultSettings, ...settings };

  // Format items according to sparroWASM specification
  const formattedItems = items.map((item, index) => {
    // Get polygon data - use only exterior (simple polygons only)
    const polygonData = item.shape.exterior || [];

    // CRITICAL: Clean polygon data to remove scientific notation and floating point errors
    const cleanedPolygonData = cleanPolygonData(polygonData);

    // Check for holes and warn
    const hasHoles = item.shape.interiors && item.shape.interiors.length > 0;
    if (hasHoles) {
      console.warn(`Item ${item.id}: Has ${item.shape.interiors.length} hole(s) - sparroWASM only supports simple polygons. Holes will be ignored.`);
    }

    // Convert allowed_rotations integers to allowed_orientations floats
    const orientations = (item.allowed_rotations || [0, 90, 180, 270]).map(angle => {
      // Ensure it's a float
      return parseFloat(angle.toFixed(1));
    });

    return {
      id: parseInt(item.id),  // MUST be integer for Rust
      demand: parseInt(item.quantity || 1),  // MUST be integer for Rust
      dxf: item.metadata?.filename || `item_${item.id}.dxf`,
      allowed_orientations: orientations,
      shape: {
        type: "simple_polygon",
        data: cleanedPolygonData  // Use cleaned data
      }
    };
  });

  return {
    name: config.problemName,
    items: formattedItems,
    strip_height: parseFloat(config.stripHeight)
  };
}

/**
 * Validate sparroWASM JSON structure
 * @param {Object} json - JSON object to validate
 * @returns {Object} {valid: boolean, errors: Array, warnings: Array}
 */
export function validateSparrowJson(json) {
  const errors = [];
  const warnings = [];

  // Check name
  if (!json.name || typeof json.name !== 'string') {
    errors.push('Missing or invalid "name" property (must be string)');
  }

  // Check strip_height
  if (typeof json.strip_height !== 'number' || json.strip_height <= 0) {
    errors.push('Invalid strip_height: must be positive number');
  }

  // Check items
  if (!json.items) {
    errors.push('Missing "items" property');
  } else if (!Array.isArray(json.items)) {
    errors.push('"items" must be an array');
  } else if (json.items.length === 0) {
    warnings.push('Items array is empty');
  } else {
    // Validate each item
    json.items.forEach((item, index) => {
      const itemErrors = validateItem(item, index);
      errors.push(...itemErrors);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a single item
 * @param {Object} item - Item object
 * @param {number} index - Item index
 * @returns {Array} Array of error messages
 */
function validateItem(item, index) {
  const errors = [];

  // Check id
  if (typeof item.id !== 'number') {
    errors.push(`Item ${index}: Missing or invalid "id" (must be number)`);
  }

  // Check demand
  if (typeof item.demand !== 'number' || item.demand <= 0) {
    errors.push(`Item ${index}: Missing or invalid "demand" (must be positive number)`);
  }

  // Check dxf
  if (!item.dxf || typeof item.dxf !== 'string') {
    errors.push(`Item ${index}: Missing or invalid "dxf" (must be string path)`);
  }

  // Check allowed_orientations
  if (!item.allowed_orientations) {
    errors.push(`Item ${index}: Missing "allowed_orientations"`);
  } else if (!Array.isArray(item.allowed_orientations)) {
    errors.push(`Item ${index}: "allowed_orientations" must be an array`);
  } else if (item.allowed_orientations.length === 0) {
    errors.push(`Item ${index}: "allowed_orientations" must contain at least one orientation`);
  } else {
    const invalidOrientations = item.allowed_orientations.filter(
      o => typeof o !== 'number' || o < 0 || o >= 360
    );

    if (invalidOrientations.length > 0) {
      errors.push(`Item ${index}: Invalid orientations (must be 0-359 degrees)`);
    }
  }

  // Check shape
  if (!item.shape) {
    errors.push(`Item ${index}: Missing "shape" property`);
    return errors; // Can't continue validation without shape
  }

  // Check shape.type
  if (item.shape.type !== 'simple_polygon') {
    errors.push(`Item ${index}: shape.type must be "simple_polygon"`);
  }

  // Check shape.data
  if (!item.shape.data) {
    errors.push(`Item ${index}: Missing "shape.data"`);
  } else if (!Array.isArray(item.shape.data)) {
    errors.push(`Item ${index}: "shape.data" must be an array`);
  } else {
    const polygonErrors = validatePolygon(item.shape.data, `Item ${index}.shape.data`);
    errors.push(...polygonErrors);
  }

  return errors;
}

/**
 * Validate a polygon (array of points)
 * @param {Array} polygon - Array of [x, y] points
 * @param {string} label - Label for error messages
 * @returns {Array} Array of error messages
 */
function validatePolygon(polygon, label) {
  const errors = [];

  if (!Array.isArray(polygon)) {
    errors.push(`${label}: Must be an array of points`);
    return errors;
  }

  if (polygon.length < 3) {
    errors.push(`${label}: Must have at least 3 points (has ${polygon.length})`);
    return errors;
  }

  // Check each point
  polygon.forEach((point, pointIndex) => {
    if (!Array.isArray(point)) {
      errors.push(`${label}[${pointIndex}]: Point must be [x, y] array`);
    } else if (point.length !== 2) {
      errors.push(`${label}[${pointIndex}]: Point must have exactly 2 coordinates [x, y]`);
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
 * Convert sparroWASM JSON to proper float notation
 * CRITICAL: Rust deserializer requires ALL numbers as floats (0.0 not 0)
 * JavaScript JSON.stringify outputs integers as "60" not "60.0"
 * We need post-processing to add ".0" to all integers
 * @param {Object} json - JSON object
 * @param {number} indent - Number of spaces for indentation
 * @returns {string} JSON string with float notation
 */
export function stringifySparrowJson(json, indent = 2) {
  // Stringify normally first
  let jsonString = JSON.stringify(json, null, indent);

  // Strategy: Add .0 to integers in SPECIFIC contexts only
  // 1. In coordinate arrays (after [ or , in arrays)
  // 2. In allowed_orientations arrays
  // 3. strip_height value
  // But NOT id or demand

  // Use a more careful regex that looks at context
  // Match integers, but use lookbehind to check context

  jsonString = jsonString.replace(/("(?:id|demand|strip_height)"):\s*(-?\d+)(?![\.\d])/g, (match, key, number) => {
    // Check which field this is
    if (key === '"id"' || key === '"demand"') {
      // Keep as integer
      return `${key}: ${number}`;
    } else if (key === '"strip_height"') {
      // Convert to float
      return `${key}: ${number}.0`;
    } else {
      // Default: keep as-is (shouldn't happen)
      return match;
    }
  });

  // Convert integers in arrays (coordinates and allowed_orientations)
  // Match integers that appear after [ or , in array context
  // Need to handle both inline and newline-separated values
  jsonString = jsonString.replace(/(\[|,)(\s*)(-?\d+)(?![\.\d])/g, (match, before, whitespace1, number) => {
    return `${before}${whitespace1}${number}.0`;
  });

  return jsonString;
}

/**
 * Pretty print JSON with indentation
 * @param {Object} json - JSON object
 * @param {number} indent - Number of spaces for indentation
 * @returns {string} Formatted JSON string
 */
export function prettyPrintJson(json, indent = 2) {
  return JSON.stringify(json, null, indent);
}

/**
 * Minify JSON (compact format)
 * @param {Object} json - JSON object
 * @returns {string} Minified JSON string
 */
export function minifyJson(json) {
  return JSON.stringify(json);
}

/**
 * Calculate JSON file size
 * @param {Object} json - JSON object
 * @returns {Object} {bytes, kilobytes, formatted}
 */
export function calculateJsonSize(json) {
  const jsonString = JSON.stringify(json);
  const bytes = new Blob([jsonString]).size;
  const kilobytes = bytes / 1024;

  return {
    bytes,
    kilobytes,
    formatted: kilobytes < 1
      ? `${bytes} bytes`
      : `${kilobytes.toFixed(2)} KB`
  };
}

/**
 * Get JSON statistics
 * @param {Object} json - sparroWASM JSON
 * @returns {Object} Statistics
 */
export function getJsonStats(json) {
  if (!json || !json.items) {
    return {
      itemCount: 0,
      totalPoints: 0,
      totalDemand: 0,
      stripHeight: 0
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
    fileSize: calculateJsonSize(json)
  };
}

/**
 * Add metadata to JSON (for debugging/reference)
 * @param {Object} json - sparroWASM JSON
 * @param {Object} metadata - Metadata to add
 * @returns {Object} JSON with metadata
 */
export function addMetadata(json, metadata = {}) {
  return {
    ...json,
    _metadata: {
      generatedAt: new Date().toISOString(),
      generator: 'MVP DXF to JSON Converter',
      version: '2.0.0',
      format: 'sparroWASM strip packing',
      ...metadata
    }
  };
}

/**
 * Remove metadata from JSON (for sparroWASM compatibility)
 * @param {Object} json - JSON with metadata
 * @returns {Object} Clean JSON
 */
export function removeMetadata(json) {
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
  removeMetadata
};
