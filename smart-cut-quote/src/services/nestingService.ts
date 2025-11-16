/**
 * Nesting Service
 * Provides functions to call Tauri backend commands for DXF conversion and nesting
 * Based on IMPLEMENTATION_PLAN.md section 8.4
 */

import { invoke } from '@tauri-apps/api/core';
import { DxfFile, NestingResult as NestingResultType } from '../types/quote';

interface ConversionOptions {
  stripHeight: number;
  partSpacing: number;
  arcSegments: number;
}

interface NestingOptions {
  timeout: number;
  workers: number;
}

interface ConversionResult {
  success: boolean;
  output_path?: string;
  error?: string;
}

interface NestingResult {
  success: boolean;
  result_json?: string;
  result_svg?: string;
  error?: string;
}

interface NestingWorkflowResult {
  success: boolean;
  data?: NestingResultType;
  svgPath?: string;
  error?: string;
}

/**
 * Convert DXF files to JSON format using dxf-converter.exe
 */
export async function convertDxfToJson(
  inputFiles: string[],
  outputPath: string,
  options: ConversionOptions
): Promise<ConversionResult> {
  try {
    const result = await invoke<ConversionResult>('convert_dxf_to_json', {
      inputFiles,
      outputPath,
      options: {
        strip_height: options.stripHeight,
        part_spacing: options.partSpacing,
        arc_segments: options.arcSegments,
      },
    });
    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to convert DXF files',
    };
  }
}

/**
 * Run nesting optimization using sparrow-cli.exe
 */
export async function runNesting(
  inputJson: string,
  outputJson: string,
  outputSvg: string,
  options: NestingOptions
): Promise<NestingResult> {
  try {
    const result = await invoke<NestingResult>('run_nesting', {
      inputJson,
      outputJson,
      outputSvg,
      options,
    });
    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to run nesting',
    };
  }
}

/**
 * Parse nesting result JSON file
 */
async function parseNestingResult(jsonPath: string): Promise<NestingResultType | null> {
  try {
    // Read JSON file using Tauri fs API
    const { readTextFile } = await import('@tauri-apps/api/fs');
    const content = await readTextFile(jsonPath);
    const data = JSON.parse(content);

    // Transform to our NestingResult type
    return {
      stripWidth: data.strip_width || data.width || 0,
      stripHeight: data.strip_height || data.height || 0,
      utilization: data.utilization || 0,
      itemsPlaced: data.items_placed || data.placements?.length || 0,
      placements: (data.placements || []).map((p: any) => ({
        itemId: p.item_id || p.id || 0,
        x: p.x || 0,
        y: p.y || 0,
        rotation: p.rotation || p.angle || 0,
      })),
      svgPath: '', // Will be set by caller
    };
  } catch (error) {
    console.error('Failed to parse nesting result:', error);
    return null;
  }
}

/**
 * Complete nesting workflow: Convert DXF -> Run Nesting -> Parse Results
 * This is the main function to call from the UI
 */
export async function runNestingWorkflow(
  files: DxfFile[],
  stripHeight: number = 6000,
  partSpacing: number = 5
): Promise<NestingWorkflowResult> {
  try {
    // Step 1: Convert DXF files to JSON
    const inputFiles = files.map((f) => f.path);

    // Use temp directory for intermediate files
    const tempDir = await getTempDirectory();
    const nestingJsonPath = `${tempDir}/nesting.json`;
    const resultJsonPath = `${tempDir}/result.json`;
    const resultSvgPath = `${tempDir}/result.svg`;

    console.log('Step 1: Converting DXF files to JSON...');
    const conversionResult = await convertDxfToJson(inputFiles, nestingJsonPath, {
      stripHeight,
      partSpacing,
      arcSegments: 32,
    });

    if (!conversionResult.success) {
      throw new Error(conversionResult.error || 'Conversion failed');
    }

    // Step 2: Run nesting optimization
    console.log('Step 2: Running nesting optimization...');
    const nestingResult = await runNesting(
      nestingJsonPath,
      resultJsonPath,
      resultSvgPath,
      {
        timeout: 300, // 5 minutes
        workers: 1,
      }
    );

    if (!nestingResult.success) {
      throw new Error(nestingResult.error || 'Nesting failed');
    }

    // Step 3: Parse result JSON
    console.log('Step 3: Parsing results...');
    const resultData = await parseNestingResult(resultJsonPath);

    if (!resultData) {
      throw new Error('Failed to parse nesting result');
    }

    // Add SVG path to result
    resultData.svgPath = resultSvgPath;

    return {
      success: true,
      data: resultData,
      svgPath: resultSvgPath,
    };
  } catch (error: any) {
    console.error('Nesting workflow failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}

/**
 * Get temporary directory path
 */
async function getTempDirectory(): Promise<string> {
  try {
    const { appDataDir } = await import('@tauri-apps/api/path');
    const appDir = await appDataDir();
    return `${appDir}/temp`;
  } catch (error) {
    // Fallback to relative path
    return './temp';
  }
}
