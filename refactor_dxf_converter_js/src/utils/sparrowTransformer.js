/**
 * sparroWASM JSON Transformer
 *
 * Converts mvp-dxf-converter JSON format to sparroWASM format
 *
 * Input Format (DXF Converter):
 * {
 *   name: string,
 *   bin: { width, height },
 *   items: [{
 *     id: number,
 *     quantity: number,
 *     allowed_rotations: [0, 90, 180, 270],
 *     shape: { exterior: [[x,y], ...] }
 *   }]
 * }
 *
 * Output Format (sparroWASM):
 * {
 *   name: string,
 *   strip_height: number,
 *   items: [{
 *     id: number,
 *     demand: number,
 *     dxf: string,
 *     allowed_orientations: [0.0, 90.0, 180.0, 270.0],
 *     shape: { type: "simple_polygon", data: [[x,y], ...] }
 *   }]
 * }
 */

/**
 * Convert mvp-dxf-converter JSON format to sparroWASM format
 * @param {Object} dxfJson - JSON from DXF converter
 * @returns {Object} sparroWASM compatible JSON
 */
export function convertToSparrowFormat(dxfJson) {
  if (!dxfJson || !dxfJson.items) {
    throw new Error('Invalid DXF JSON: missing items array');
  }

  // Extract strip_height from various possible sources
  const stripHeight = parseFloat(
    dxfJson.strip_height ||
    dxfJson.bin?.height ||
    6000
  );

  return {
    name: dxfJson.name || "converted_dxf",
    strip_height: stripHeight,
    items: dxfJson.items.map(item => {
      // Get polygon data - handle both formats
      const polygonData = item.shape?.exterior || item.shape?.data || [];

      if (polygonData.length < 3) {
        console.warn(`Item ${item.id}: Polygon has less than 3 points`);
      }

      // Convert rotations to orientations (ensure floats)
      const orientations = (
        item.allowed_orientations ||
        item.allowed_rotations ||
        [0, 90, 180, 270]
      ).map(deg => parseFloat(deg));

      return {
        id: parseInt(item.id),
        demand: parseInt(item.quantity || item.demand || 1),
        dxf: item.metadata?.filename || item.dxf || `item_${item.id}.dxf`,
        allowed_orientations: orientations,
        shape: {
          type: "simple_polygon",
          data: polygonData
        }
      };
    })
  };
}

/**
 * Validate sparroWASM format compatibility
 * Returns both validation status and detailed error/warning messages
 * @param {Object} sparrowJson - sparroWASM JSON to validate
 * @returns {Object} {valid: boolean, errors: Array, warnings: Array}
 */
export function validateSparrowFormat(sparrowJson) {
  const errors = [];
  const warnings = [];

  // Check required fields
  if (!sparrowJson.name || typeof sparrowJson.name !== 'string') {
    errors.push('Missing or invalid "name" field (must be string)');
  }

  if (typeof sparrowJson.strip_height !== 'number' || sparrowJson.strip_height <= 0) {
    errors.push('Invalid "strip_height" (must be positive number)');
  }

  if (!Array.isArray(sparrowJson.items)) {
    errors.push('Missing or invalid "items" field (must be array)');
    return { valid: false, errors, warnings };
  }

  if (sparrowJson.items.length === 0) {
    warnings.push('Items array is empty');
  }

  // Validate each item
  sparrowJson.items.forEach((item, idx) => {
    const prefix = `Item ${idx}`;

    // Check id
    if (typeof item.id !== 'number') {
      errors.push(`${prefix}: Missing or invalid "id" (must be number)`);
    }

    // Check demand
    if (typeof item.demand !== 'number' || item.demand <= 0) {
      errors.push(`${prefix}: Invalid "demand" (must be positive number)`);
    }

    // Check dxf
    if (!item.dxf || typeof item.dxf !== 'string') {
      errors.push(`${prefix}: Missing or invalid "dxf" (must be string)`);
    }

    // Check allowed_orientations
    if (!Array.isArray(item.allowed_orientations)) {
      errors.push(`${prefix}: Missing or invalid "allowed_orientations" (must be array)`);
    } else if (item.allowed_orientations.length === 0) {
      errors.push(`${prefix}: "allowed_orientations" must contain at least one orientation`);
    } else {
      const invalidOrients = item.allowed_orientations.filter(
        o => typeof o !== 'number' || o < 0 || o >= 360
      );
      if (invalidOrients.length > 0) {
        errors.push(`${prefix}: Invalid orientations (must be 0-359.99 degrees): ${invalidOrients.join(', ')}`);
      }
    }

    // Check shape
    if (!item.shape) {
      errors.push(`${prefix}: Missing "shape" field`);
      return;
    }

    if (item.shape.type !== 'simple_polygon') {
      errors.push(`${prefix}: shape.type must be "simple_polygon"`);
    }

    if (!Array.isArray(item.shape.data)) {
      errors.push(`${prefix}: shape.data must be array of points`);
    } else if (item.shape.data.length < 3) {
      errors.push(`${prefix}: shape.data must have at least 3 points (has ${item.shape.data.length})`);
    } else {
      // Validate each point
      item.shape.data.forEach((point, pointIdx) => {
        if (!Array.isArray(point) || point.length !== 2) {
          errors.push(`${prefix}.shape.data[${pointIdx}]: Must be [x, y] array`);
        } else {
          if (typeof point[0] !== 'number' || !isFinite(point[0])) {
            errors.push(`${prefix}.shape.data[${pointIdx}]: x must be finite number`);
          }
          if (typeof point[1] !== 'number' || !isFinite(point[1])) {
            errors.push(`${prefix}.shape.data[${pointIdx}]: y must be finite number`);
          }
        }
      });
    }

    // Check for holes (sparroWASM doesn't support them)
    if (item.shape.interiors && item.shape.interiors.length > 0) {
      warnings.push(`${prefix}: Has ${item.shape.interiors.length} hole(s) - sparroWASM only supports simple polygons, holes will be ignored`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Convert and validate in one step
 * @param {Object} dxfJson - JSON from DXF converter
 * @returns {Object} {success: boolean, data: Object|null, errors: Array, warnings: Array}
 */
export function convertAndValidate(dxfJson) {
  try {
    const sparrowJson = convertToSparrowFormat(dxfJson);
    const validation = validateSparrowFormat(sparrowJson);

    return {
      success: validation.valid,
      data: validation.valid ? sparrowJson : null,
      errors: validation.errors,
      warnings: validation.warnings
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      errors: [error.message],
      warnings: []
    };
  }
}

/**
 * Get statistics about the sparroWASM JSON
 * @param {Object} sparrowJson - sparroWASM JSON
 * @returns {Object} Statistics
 */
export function getSparrowStats(sparrowJson) {
  if (!sparrowJson || !sparrowJson.items) {
    return {
      itemCount: 0,
      totalDemand: 0,
      totalPoints: 0,
      stripHeight: 0
    };
  }

  const itemCount = sparrowJson.items.length;

  const totalDemand = sparrowJson.items.reduce((sum, item) =>
    sum + (item.demand || 0), 0
  );

  const totalPoints = sparrowJson.items.reduce((sum, item) =>
    sum + (item.shape?.data?.length || 0), 0
  );

  return {
    itemCount,
    totalDemand,
    totalPoints,
    stripHeight: sparrowJson.strip_height || 0,
    problemName: sparrowJson.name || 'unknown'
  };
}

/**
 * Prepare JSON for iframe communication
 * Serializes to string with proper float notation for Rust WASM
 * @param {Object} sparrowJson - sparroWASM JSON
 * @returns {string} JSON string ready for postMessage
 */
export function prepareForIframe(sparrowJson) {
  // Use the stringifySparrowJson from jsonFormatter if available
  // Otherwise, use standard JSON.stringify
  let jsonString = JSON.stringify(sparrowJson, null, 2);

  // Ensure strip_height has .0 suffix for Rust
  jsonString = jsonString.replace(
    /"strip_height":\s*(\d+)(?![\.\d])/g,
    '"strip_height": $1.0'
  );

  // Ensure allowed_orientations values have .0 suffix
  jsonString = jsonString.replace(
    /(allowed_orientations":\s*\[[\s\d,]*?)(\d+)(?![\.\d])/g,
    '$1$2.0'
  );

  return jsonString;
}

export default {
  convertToSparrowFormat,
  validateSparrowFormat,
  convertAndValidate,
  getSparrowStats,
  prepareForIframe
};
