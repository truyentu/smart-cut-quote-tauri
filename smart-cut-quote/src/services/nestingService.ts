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

interface BatchInfo {
  batchKey: string;
  materialGroup: string;
  materialThickness: number;
  files: DxfFile[];
}

interface BatchedNestingResult {
  batchKey: string;
  materialGroup: string;
  materialThickness: number;
  files: DxfFile[];
  nestingResult: NestingWorkflowResult;
}

interface BatchedNestingWorkflowResult {
  success: boolean;
  batches: BatchedNestingResult[];
  totalBatches: number;
  successfulBatches: number;
  failedBatches: number;
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
        stripHeight: options.stripHeight,
        partSpacing: options.partSpacing,
        arcSegments: options.arcSegments,
      },
    });
    return result;
  } catch (error: any) {
    // Log detailed error information for debugging
    console.error('❌ convertDxfToJson exception caught:');
    console.error('  Error type:', error.constructor.name);
    console.error('  Error message:', error.message);
    console.error('  Full error object:', error);

    return {
      success: false,
      error: error.message || error.toString() || 'Failed to convert DXF files',
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
    // Log detailed error information for debugging
    console.error('❌ runNesting exception caught:');
    console.error('  Error type:', error.constructor.name);
    console.error('  Error message:', error.message);
    console.error('  Full error object:', error);

    return {
      success: false,
      error: error.message || error.toString() || 'Failed to run nesting',
    };
  }
}

/**
 * Parse nesting result JSON file
 */
async function parseNestingResult(jsonPath: string): Promise<NestingResultType | null> {
  try {
    // Read JSON file using Tauri fs API
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
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
    // Format: "PATH:QUANTITY" as required by dxf-converter.exe (see INTEGRATION_GUIDE.md line 166-171)
    // Note: Keep Windows backslashes - dxf-converter.exe is a Windows executable
    // Using short flag -i in Rust command builder (see dxf_converter.rs)
    const inputFiles = files.map((f) => `${f.path}:${f.quantity}`);

    // Use temp directory for intermediate files
    const tempDir = await getTempDirectory();
    const nestingJsonPath = `${tempDir}/nesting.json`;
    const resultJsonPath = `${tempDir}/result.json`;
    const resultSvgPath = `${tempDir}/result.svg`;

    console.log('Step 1: Converting DXF files to JSON...');
    console.log('Input files:', inputFiles);
    console.log('Output path:', nestingJsonPath);
    const conversionResult = await convertDxfToJson(inputFiles, nestingJsonPath, {
      stripHeight,
      partSpacing,
      arcSegments: 32,
    });

    console.log('Conversion result:', JSON.stringify(conversionResult, null, 2));

    if (!conversionResult.success) {
      console.error('Conversion failed with error:', conversionResult.error);
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
 * Run nesting workflow with automatic batching by Material + Thickness
 * This is the MAIN function to use - it groups files and processes each batch separately
 */
export async function runNestingWorkflowWithBatching(
  files: DxfFile[],
  stripHeight: number = 6000,
  partSpacing: number = 5
): Promise<BatchedNestingWorkflowResult> {
  try {
    console.log(`Starting batched nesting workflow for ${files.length} files...`);

    // Step 1: Group files by Material Group + Thickness
    const batches = new Map<string, BatchInfo>();

    files.forEach((file) => {
      // Use materialGroup (or material.name) and materialThickness
      const materialGroup = file.materialGroup || file.material?.name || 'Unknown';
      const materialThickness = file.materialThickness || file.material?.thickness || 0;

      // Create batch key: "MaterialGroup-Thickness"
      const batchKey = `${materialGroup}-${materialThickness}mm`;

      if (!batches.has(batchKey)) {
        batches.set(batchKey, {
          batchKey,
          materialGroup,
          materialThickness,
          files: [],
        });
      }

      batches.get(batchKey)!.files.push(file);
    });

    console.log(`Created ${batches.size} batches based on Material + Thickness`);

    // Step 2: Process each batch separately
    const batchResults: BatchedNestingResult[] = [];
    let successfulBatches = 0;
    let failedBatches = 0;

    for (const [batchKey, batchInfo] of batches) {
      console.log(
        `Processing batch: ${batchKey} (${batchInfo.files.length} files)`
      );

      // Run nesting workflow for this specific batch
      const nestingResult = await runNestingWorkflow(
        batchInfo.files,
        stripHeight,
        partSpacing
      );

      if (nestingResult.success) {
        successfulBatches++;
        console.log(`✓ Batch ${batchKey} completed successfully`);
      } else {
        failedBatches++;
        console.error(`✗ Batch ${batchKey} failed: ${nestingResult.error}`);
      }

      batchResults.push({
        batchKey,
        materialGroup: batchInfo.materialGroup,
        materialThickness: batchInfo.materialThickness,
        files: batchInfo.files,
        nestingResult,
      });
    }

    console.log(
      `Batched nesting completed: ${successfulBatches}/${batches.size} successful`
    );

    return {
      success: failedBatches === 0,
      batches: batchResults,
      totalBatches: batches.size,
      successfulBatches,
      failedBatches,
      error:
        failedBatches > 0
          ? `${failedBatches} batch(es) failed to complete`
          : undefined,
    };
  } catch (error: any) {
    console.error('Batched nesting workflow failed:', error);
    return {
      success: false,
      batches: [],
      totalBatches: 0,
      successfulBatches: 0,
      failedBatches: 0,
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
    // Keep Windows path format for native Windows executables
    return `${appDir}\\temp`;
  } catch (error) {
    // Fallback to relative path
    return '.\\temp';
  }
}
