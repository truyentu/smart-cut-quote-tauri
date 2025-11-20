/**
 * DXF Converter - TypeScript Module
 *
 * Converts DXF file content to sparroWASM JSON format for nesting optimization.
 * This module runs entirely in the browser/frontend without Node.js dependencies.
 *
 * @example
 * ```typescript
 * import { convertDxfContent } from '@/lib/dxf-converter';
 *
 * const dxfString = await file.text();
 * const result = await convertDxfContent(dxfString, {
 *   filename: 'part.dxf',
 *   stripHeight: 6000,
 *   quantity: 5
 * });
 *
 * if (result.success) {
 *   console.log('Nesting JSON:', result.json);
 * }
 * ```
 */

// Export main converter functions
export { convertDxfToJson, convertSingleDxf, getConversionStats } from './converter';

// Export JSON formatter functions
export {
  formatSparrowJson,
  validateSparrowJson,
  stringifySparrowJson,
  getJsonStats,
} from './jsonFormatter';

// Export types
export type {
  // Basic geometry
  Point2D,
  Point3D,
  PointTuple,
  BoundingBox,

  // DXF entities
  DxfEntity,
  DxfEntityType,
  DxfLineEntity,
  DxfCircleEntity,
  DxfArcEntity,
  DxfPolylineEntity,
  DxfEllipseEntity,
  DxfSplineEntity,
  DxfDocument,

  // Options & configuration
  DxfConverterOptions,
  ConversionSettings,

  // Output types
  SparrowJson,
  SparrowItem,
  SparrowShape,
  NestingInputItem,
  NestingInputShape,

  // Results
  ConversionResult,
  ConversionError,
  ConversionWarning,
  ConversionStats,

  // Input types
  DxfFileInput,
} from './types';

// ============================================================================
// Main Entry Point Function
// ============================================================================

import { convertDxfToJson, convertSingleDxf } from './converter';
import { stringifySparrowJson } from './jsonFormatter';
import type {
  DxfConverterOptions,
  ConversionResult,
  SparrowJson,
} from './types';

/**
 * Options for converting DXF content
 */
export interface ConvertDxfContentOptions extends DxfConverterOptions {
  /** Filename for the DXF content (default: 'input.dxf') */
  filename?: string;
  /** Quantity/demand for this part (default: 1) */
  quantity?: number;
}

/**
 * Result of converting DXF content
 */
export interface ConvertDxfContentResult {
  /** Whether conversion was successful */
  success: boolean;
  /** The sparroWASM JSON object (null if failed) */
  json: SparrowJson | null;
  /** JSON as string with proper float notation for Rust */
  jsonString: string | null;
  /** Error messages */
  errors: string[];
  /** Warning messages */
  warnings: string[];
  /** Statistics about the conversion */
  stats?: {
    totalPoints: number;
    totalItems: number;
    jsonSize: number;
  };
}

/**
 * Convert DXF content string to sparroWASM JSON format
 *
 * This is the main entry point for the DXF converter module.
 * It accepts the raw DXF content as a string (not a file path).
 *
 * @param dxfString - The DXF file content as a string
 * @param options - Conversion options
 * @returns Conversion result with JSON output
 *
 * @example
 * ```typescript
 * // Read DXF file content (in React component)
 * const handleFileUpload = async (file: File) => {
 *   const content = await file.text();
 *   const result = await convertDxfContent(content, {
 *     filename: file.name,
 *     stripHeight: 6000,
 *     quantity: 1
 *   });
 *
 *   if (result.success) {
 *     // Use result.json for nesting API
 *     await invokeNesting(result.jsonString);
 *   } else {
 *     console.error('Conversion failed:', result.errors);
 *   }
 * };
 * ```
 */
export async function convertDxfContent(
  dxfString: string,
  options: ConvertDxfContentOptions = {}
): Promise<ConvertDxfContentResult> {
  const {
    filename = 'input.dxf',
    quantity = 1,
    ...converterOptions
  } = options;

  // Prepare file input
  const files = [
    {
      name: filename,
      content: dxfString,
      quantity: quantity,
    },
  ];

  // Run conversion
  const result: ConversionResult = await convertDxfToJson(files, converterOptions);

  // Format response
  if (!result.success || !result.json) {
    return {
      success: false,
      json: null,
      jsonString: null,
      errors: result.errors.map((e) => `[${e.file}] ${e.stage}: ${e.message}`),
      warnings: result.warnings.map((w) => `[${w.file}] ${w.message}`),
    };
  }

  // Calculate stats
  const totalPoints = result.json.items.reduce(
    (sum, item) => sum + item.shape.data.length,
    0
  );
  const jsonString = stringifySparrowJson(result.json);

  return {
    success: true,
    json: result.json,
    jsonString: jsonString,
    errors: result.errors.map((e) => `[${e.file}] ${e.stage}: ${e.message}`),
    warnings: result.warnings.map((w) => `[${w.file}] ${w.message}`),
    stats: {
      totalPoints,
      totalItems: result.json.items.length,
      jsonSize: jsonString.length,
    },
  };
}

/**
 * Convert multiple DXF content strings to a single sparroWASM JSON
 *
 * @param files - Array of DXF file contents with metadata
 * @param options - Conversion options
 * @returns Conversion result with combined JSON output
 *
 * @example
 * ```typescript
 * const files = [
 *   { name: 'part1.dxf', content: dxf1, quantity: 5 },
 *   { name: 'part2.dxf', content: dxf2, quantity: 3 },
 * ];
 *
 * const result = await convertMultipleDxf(files, {
 *   stripHeight: 6000
 * });
 * ```
 */
export async function convertMultipleDxf(
  files: Array<{
    name: string;
    content: string;
    quantity?: number;
  }>,
  options: DxfConverterOptions = {}
): Promise<ConvertDxfContentResult> {
  // Prepare file inputs
  const fileInputs = files.map((f) => ({
    name: f.name,
    content: f.content,
    quantity: f.quantity || 1,
  }));

  // Run conversion
  const result = await convertDxfToJson(fileInputs, options);

  // Format response
  if (!result.success || !result.json) {
    return {
      success: false,
      json: null,
      jsonString: null,
      errors: result.errors.map((e) => `[${e.file}] ${e.stage}: ${e.message}`),
      warnings: result.warnings.map((w) => `[${w.file}] ${w.message}`),
    };
  }

  // Calculate stats
  const totalPoints = result.json.items.reduce(
    (sum, item) => sum + item.shape.data.length,
    0
  );
  const jsonString = stringifySparrowJson(result.json);

  return {
    success: true,
    json: result.json,
    jsonString: jsonString,
    errors: result.errors.map((e) => `[${e.file}] ${e.stage}: ${e.message}`),
    warnings: result.warnings.map((w) => `[${w.file}] ${w.message}`),
    stats: {
      totalPoints,
      totalItems: result.json.items.length,
      jsonSize: jsonString.length,
    },
  };
}

// Default export
export default {
  convertDxfContent,
  convertMultipleDxf,
  convertDxfToJson,
  convertSingleDxf,
};
