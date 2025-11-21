/**
 * Nesting Service
 *
 * Provides functions for DXF conversion and nesting optimization.
 * Uses integrated TypeScript DXF converter and Rust nesting engine.
 * No external CLI processes are spawned.
 */

import { invoke } from '@tauri-apps/api/core';
import { readTextFile, writeTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { convertMultipleDxf } from '../lib/dxf-converter';
import { DxfFile, NestingResult as NestingResultType } from '../types/quote';

// ============================================================================
// Types
// ============================================================================

interface NestingWorkflowResult {
  success: boolean;
  data?: NestingResultType;
  svgUrl?: string;
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

// Backend types (must match Rust structs)
interface NestingInput {
  json_input: string;
  time_limit?: number;
  seed?: number;
  use_early_termination?: boolean;
  n_workers?: number;
}

interface PlacedItem {
  item_id: number;
  rotation_degrees: number;
  position_x: number;
  position_y: number;
}

interface NestingOutput {
  instance_name: string;
  strip_width: number;
  strip_height: number;
  total_items_placed: number;
  layouts: PlacedItem[];
  utilization: number;
  computation_time_secs: number;
  status?: string;
  items_requested?: number;
  unplaced_item_ids: number[];
  svg_string?: string;
}

// ============================================================================
// Main Workflow Functions
// ============================================================================

/**
 * Complete nesting workflow: Convert DXF -> Run Nesting -> Return Results
 *
 * This function runs entirely in-memory without spawning external processes:
 * 1. Read DXF files from disk
 * 2. Convert to JSON using TypeScript DXF converter (frontend)
 * 3. Run nesting optimization using integrated Rust engine (backend)
 * 4. Return structured results
 */
export async function runNestingWorkflow(
  files: DxfFile[],
  stripHeight: number = 6000,
  partSpacing: number = 5,
  timeLimit: number = 60
): Promise<NestingWorkflowResult> {
  try {
    console.log('Starting nesting workflow for ' + files.length + ' files...');

    // Step 1: Read DXF file contents
    console.log('Step 1: Reading DXF file contents...');
    const fileContents: Array<{
      name: string;
      content: string;
      quantity: number;
    }> = [];

    for (const file of files) {
      try {
        const content = await readTextFile(file.path);
        const filename = file.path.split(/[/\\]/).pop() || 'unknown.dxf';

        fileContents.push({
          name: filename,
          content: content,
          quantity: file.quantity || 1,
        });

        console.log('  Read: ' + filename + ' (' + content.length + ' bytes, qty: ' + file.quantity + ')');
      } catch (error) {
        console.error('  Failed to read ' + file.path + ':', error);
        throw new Error('Failed to read file: ' + file.path);
      }
    }

    // Step 2: Convert DXF to JSON using TypeScript converter
    console.log('Step 2: Converting DXF to JSON...');
    const conversionResult = await convertMultipleDxf(fileContents, {
      stripHeight: stripHeight,
      spacing: partSpacing,
      arcSegments: 32,
      splineSegments: 100,
      tolerance: 0.5,
      autoClose: true,
      allowRotations: true,
      problemName: 'nesting_job',
    });

    if (!conversionResult.success || !conversionResult.jsonString) {
      const errorMsg = conversionResult.errors.join('; ') || 'DXF conversion failed';
      console.error('Conversion failed:', errorMsg);
      throw new Error(errorMsg);
    }

    // Log warnings if any
    if (conversionResult.warnings.length > 0) {
      console.warn('Conversion warnings:', conversionResult.warnings);
    }

    console.log('  Conversion successful: ' + conversionResult.stats?.totalItems + ' items, ' + conversionResult.stats?.totalPoints + ' points');

    // DEBUG: Save the JSON for manual inspection
    try {
      await writeTextFile('debug_nesting_output.json', conversionResult.jsonString, {
        baseDir: BaseDirectory.Desktop
      });
      console.log('💾 Saved debug file to Desktop: debug_nesting_output.json');
    } catch (debugError) {
      console.warn('⚠️ Could not save debug file:', debugError);
    }

    // Step 3: Run nesting optimization using integrated Rust engine
    console.log('Step 3: Running nesting optimization with time_limit=' + timeLimit + 's...');
    const nestingInput: NestingInput = {
      json_input: conversionResult.jsonString,
      time_limit: timeLimit,
      seed: undefined,
      // Enable early termination for faster response to timeout
      // This reduces iterations when no improvement is found
      use_early_termination: true,
      n_workers: 1,
    };

    // Debug: Log the exact payload being sent to backend
    console.log('🚀 Sending to Backend:', {
      time_limit: nestingInput.time_limit,
      seed: nestingInput.seed,
      use_early_termination: nestingInput.use_early_termination,
      n_workers: nestingInput.n_workers,
      json_input_preview: nestingInput.json_input.substring(0, 500) + '...',
      json_input_length: nestingInput.json_input.length,
    });

    const nestingOutput = await invoke<NestingOutput>('run_nesting_integrated', {
      input: nestingInput,
    });

    const timeStr = nestingOutput.computation_time_secs.toFixed(2);
    const utilStr = (nestingOutput.utilization * 100).toFixed(1);
    const widthStr = nestingOutput.strip_width.toFixed(1);
    const heightStr = nestingOutput.strip_height.toFixed(1);

    console.log('  Nesting completed: ' + nestingOutput.total_items_placed + ' items placed in ' + timeStr + 's');
    console.log('  Utilization: ' + utilStr + '%');
    console.log('  Strip dimensions: ' + widthStr + ' x ' + heightStr + 'mm');

    // Step 4: Transform result to UI format
    const resultData: NestingResultType = {
      stripWidth: nestingOutput.strip_width,
      stripHeight: nestingOutput.strip_height,
      utilization: nestingOutput.utilization,
      itemsPlaced: nestingOutput.total_items_placed,
      placements: nestingOutput.layouts.map((item) => ({
        itemId: item.item_id,
        x: item.position_x,
        y: item.position_y,
        rotation: item.rotation_degrees,
      })),
      svgPath: '', // No file path, using blob URL instead
      svgString: nestingOutput.svg_string, // Save SVG string for database persistence
    };

    // Create blob URL from SVG string if available
    let svgUrl: string | undefined;
    if (nestingOutput.svg_string) {
      svgUrl = createSvgBlobUrl(nestingOutput.svg_string);
      console.log('  SVG blob URL created');
    }

    return {
      success: true,
      data: resultData,
      svgUrl,
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Nesting workflow failed:', error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Run nesting workflow with automatic batching by Material + Thickness
 *
 * Groups files by material and thickness, then processes each batch separately.
 * This is the main function to use for production workflows.
 */
export async function runNestingWorkflowWithBatching(
  files: DxfFile[],
  stripHeight: number = 6000,
  partSpacing: number = 5
): Promise<BatchedNestingWorkflowResult> {
  try {
    console.log('Starting batched nesting workflow for ' + files.length + ' files...');

    // Step 1: Group files by Material Group + Thickness
    const batches = new Map<string, BatchInfo>();

    files.forEach((file) => {
      const materialGroup = file.materialGroup || file.material?.name || 'Unknown';
      const materialThickness = file.materialThickness || file.material?.thickness || 0;
      const batchKey = materialGroup + '-' + materialThickness + 'mm';

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

    console.log('Created ' + batches.size + ' batches based on Material + Thickness');

    // Step 2: Process each batch separately
    const batchResults: BatchedNestingResult[] = [];
    let successfulBatches = 0;
    let failedBatches = 0;

    for (const [batchKey, batchInfo] of batches) {
      console.log('Processing batch: ' + batchKey + ' (' + batchInfo.files.length + ' files)');

      const nestingResult = await runNestingWorkflow(
        batchInfo.files,
        stripHeight,
        partSpacing
      );

      if (nestingResult.success) {
        successfulBatches++;
        console.log('Batch ' + batchKey + ' completed successfully');
      } else {
        failedBatches++;
        console.error('Batch ' + batchKey + ' failed: ' + nestingResult.error);
      }

      batchResults.push({
        batchKey,
        materialGroup: batchInfo.materialGroup,
        materialThickness: batchInfo.materialThickness,
        files: batchInfo.files,
        nestingResult,
      });
    }

    console.log('Batched nesting completed: ' + successfulBatches + '/' + batches.size + ' successful');

    return {
      success: failedBatches === 0,
      batches: batchResults,
      totalBatches: batches.size,
      successfulBatches,
      failedBatches,
      error: failedBatches > 0
        ? failedBatches + ' batch(es) failed to complete'
        : undefined,
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Batched nesting workflow failed:', error);
    return {
      success: false,
      batches: [],
      totalBatches: 0,
      successfulBatches: 0,
      failedBatches: 0,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a blob URL from SVG string for display in UI
 */
export function createSvgBlobUrl(svgString: string): string {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  return URL.createObjectURL(blob);
}

/**
 * Revoke a blob URL when no longer needed
 */
export function revokeSvgBlobUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

// ============================================================================
// Exports
// ============================================================================

export type {
  NestingWorkflowResult,
  BatchedNestingResult,
  BatchedNestingWorkflowResult,
  NestingInput,
  NestingOutput,
  PlacedItem,
};
