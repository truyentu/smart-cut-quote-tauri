#!/usr/bin/env node

/**
 * DXF to JSON Converter CLI
 *
 * Command-line tool to convert DXF files to sparroWASM JSON format.
 * Designed to be called as subprocess from C# WPF application.
 *
 * Usage:
 *   node dxf-converter-cli.js --input file1.dxf file2.dxf --output output.json [options]
 *
 * Options:
 *   --input, -i       Input DXF files (required, can specify multiple)
 *   --output, -o      Output JSON file path (required)
 *   --height, -h      Strip height in mm (default: 6000)
 *   --spacing, -s     Part spacing in mm (default: 5)
 *   --arc-segments    Number of segments for arcs/circles (default: 32)
 *   --spline-segments Number of segments for splines (default: 100)
 *   --tolerance       Point matching tolerance (default: 0.5)
 *   --allow-rotations Allow 0,90,180,270 rotations (default: true)
 *   --name, -n        Problem name (default: "dxf_conversion")
 *   --verbose, -v     Verbose logging
 *   --help            Show help
 *
 * Example:
 *   node dxf-converter-cli.js -i part1.dxf part2.dxf -o output.json -h 6000 -s 5
 *
 * C# Integration Example:
 *   var process = new Process();
 *   process.StartInfo.FileName = "node";
 *   process.StartInfo.Arguments = $"dxf-converter-cli.js -i {dxfFiles} -o {outputJson} -h {stripHeight}";
 */

import fs from 'fs';
import path from 'path';

// Import core converter
import { convertDxfToJson } from './src/core/converter.js';
import { stringifySparrowJson } from './src/core/jsonFormatter.js';

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    input: [],
    output: null,
    height: 6000,
    spacing: 5,
    arcSegments: 32,
    splineSegments: 100,
    tolerance: 0.5,
    allowRotations: true,
    name: 'dxf_conversion',
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--help':
        printHelp();
        process.exit(0);
        break;

      case '--input':
      case '-i':
        // Collect all input files until next flag or end
        // Support syntax: file.dxf:quantity
        i++;
        while (i < args.length && !args[i].startsWith('--') && !args[i].startsWith('-')) {
          const fileSpec = args[i];

          // Parse file:quantity syntax
          if (fileSpec.includes(':')) {
            const parts = fileSpec.split(':');
            const filePath = parts[0];
            const quantity = parseInt(parts[1]);

            if (isNaN(quantity) || quantity < 1) {
              console.error(`ERROR: Invalid quantity for ${filePath}: ${parts[1]}`);
              process.exit(1);
            }

            options.input.push({ path: filePath, quantity: quantity });
          } else {
            // No quantity specified, default to 1
            options.input.push({ path: fileSpec, quantity: 1 });
          }

          i++;
        }
        i--; // Adjust because for loop will increment
        break;

      case '--output':
      case '-o':
        options.output = args[++i];
        break;

      case '--height':
      case '-h':
        options.height = parseFloat(args[++i]);
        break;

      case '--spacing':
      case '-s':
        options.spacing = parseFloat(args[++i]);
        break;

      case '--arc-segments':
        options.arcSegments = parseInt(args[++i]);
        break;

      case '--spline-segments':
        options.splineSegments = parseInt(args[++i]);
        break;

      case '--tolerance':
        options.tolerance = parseFloat(args[++i]);
        break;

      case '--allow-rotations':
        const value = args[++i].toLowerCase();
        options.allowRotations = value === 'true' || value === '1' || value === 'yes';
        break;

      case '--name':
      case '-n':
        options.name = args[++i];
        break;

      case '--verbose':
      case '-v':
        options.verbose = true;
        break;

      default:
        console.error(`ERROR: Unknown option: ${arg}`);
        console.error('Use --help for usage information');
        process.exit(1);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
DXF to JSON Converter CLI v2.0.0

Converts DXF files to sparroWASM JSON format for nesting optimization.

Usage:
  node dxf-converter-cli.js --input <files...> --output <file> [options]

Required Arguments:
  --input, -i <files...>    Input DXF files (space-separated, can be multiple)
                           Syntax: file.dxf or file.dxf:quantity
                           Example: part1.dxf:5 part2.dxf:3 (5x part1, 3x part2)
  --output, -o <file>       Output JSON file path

Optional Arguments:
  --height, -h <mm>         Strip height in mm (default: 6000)
                           NOTE: Width is auto-calculated by sparrow-cli
  --spacing, -s <mm>        Part spacing in mm (default: 5)
  --arc-segments <num>      Arc/circle discretization segments (default: 32)
  --spline-segments <num>   Spline discretization segments (default: 100)
  --tolerance <mm>          Point matching tolerance (default: 0.5)
  --allow-rotations <bool>  Allow 0,90,180,270 rotations (default: true)
  --name, -n <name>         Problem name (default: "dxf_conversion")
  --verbose, -v             Enable verbose logging
  --help                    Show this help message

Examples:
  # Convert single DXF file
  node dxf-converter-cli.js -i part.dxf -o output.json

  # Convert multiple files with custom strip height
  node dxf-converter-cli.js -i part1.dxf part2.dxf -o output.json -h 6000 -s 5

  # Specify quantities for each part (5x part1, 3x part2, 10x part3)
  node dxf-converter-cli.js -i part1.dxf:5 part2.dxf:3 part3.dxf:10 -o output.json

  # Disable rotations for parts that must maintain orientation
  node dxf-converter-cli.js -i parts/*.dxf -o output.json --allow-rotations false

  # High precision mode (more segments)
  node dxf-converter-cli.js -i complex.dxf -o output.json --arc-segments 64 --spline-segments 200

Output Format:
  Generates sparroWASM-compatible JSON for strip packing nesting:
  {
    "name": "problem_name",
    "items": [{
      "id": 0,
      "demand": 1,
      "allowed_orientations": [0.0, 90.0, 180.0, 270.0],
      "shape": {
        "type": "simple_polygon",
        "data": [[x, y], ...]
      }
    }],
    "strip_height": 6000.0
  }

Integration:
  Output JSON can be directly used with sparrow-cli.exe:
  sparrow-cli.exe --input output.json --output result.json --output-svg result.svg

C# Integration Example:
  var psi = new ProcessStartInfo("node",
    $"dxf-converter-cli.js -i {dxfPath} -o {jsonPath} -h {height}");
  psi.RedirectStandardOutput = true;
  var process = Process.Start(psi);
  var output = process.StandardOutput.ReadToEnd();
  process.WaitForExit();

Exit Codes:
  0 - Success
  1 - Error (check stderr for details)
`);
}

function log(message) {
  console.log(message);
}

function logError(message) {
  console.error(`ERROR: ${message}`);
}

function logWarning(message) {
  console.warn(`WARNING: ${message}`);
}

// Main CLI entry point
async function main() {
  const options = parseArgs();

  // Validate required arguments
  if (options.input.length === 0) {
    logError('No input files specified');
    console.log('Use --help for usage information');
    process.exit(1);
  }

  if (!options.output) {
    logError('No output file specified');
    console.log('Use --help for usage information');
    process.exit(1);
  }

  // Verify input files exist
  for (const fileSpec of options.input) {
    if (!fs.existsSync(fileSpec.path)) {
      logError(`Input file not found: ${fileSpec.path}`);
      process.exit(1);
    }
  }

  try {
    if (!options.verbose) {
      // Suppress console.log from converter modules
      const originalLog = console.log;
      console.log = () => {};

      // Restore for our own output
      process.on('exit', () => {
        console.log = originalLog;
      });
    }

    log('=== DXF to JSON Converter CLI ===');
    log('');
    log(`Input files: ${options.input.length}`);
    options.input.forEach(f => log(`  - ${path.basename(f.path)} (quantity: ${f.quantity})`));
    log(`Output: ${options.output}`);
    log(`Strip height: ${options.height}mm`);
    log(`Part spacing: ${options.spacing}mm`);
    log(`Arc segments: ${options.arcSegments}`);
    log(`Spline segments: ${options.splineSegments}`);
    log(`Tolerance: ${options.tolerance}mm`);
    log(`Allow rotations: ${options.allowRotations}`);
    log('');

    // Read DXF files with quantities
    const files = [];
    for (const fileSpec of options.input) {
      const content = fs.readFileSync(fileSpec.path, 'utf8');
      files.push({
        name: path.basename(fileSpec.path),
        content: content,
        size: Buffer.byteLength(content),
        quantity: fileSpec.quantity  // Pass quantity to converter
      });
    }

    log('Converting DXF files...');
    log('');

    // Convert using core converter
    const result = await convertDxfToJson(files, {
      bin: {
        width: null,  // Not used by sparroWASM (strip packing model)
        height: options.height
      },
      spacing: options.spacing,
      arcSegments: options.arcSegments,
      splineSegments: options.splineSegments,
      tolerance: options.tolerance,
      allowRotations: options.allowRotations,
      rotationSteps: 4,
      autoClose: true
    });

    // Check for errors
    if (!result.success) {
      logError('Conversion failed:');
      result.errors.forEach(err => {
        logError(`  [${err.file}] ${err.stage}: ${err.message}`);
      });
      process.exit(1);
    }

    // Show warnings
    if (result.warnings && result.warnings.length > 0) {
      log('Warnings:');
      result.warnings.forEach(warn => {
        logWarning(`  [${warn.file}] ${warn.message}`);
      });
      log('');
    }

    // Override problem name if specified
    if (options.name !== 'dxf_conversion') {
      result.json.name = options.name;
    }

    // Stringify with proper float notation
    const jsonString = stringifySparrowJson(result.json, 2);

    // Write to file
    fs.writeFileSync(options.output, jsonString, 'utf8');
    const fileSize = fs.statSync(options.output).size;

    log('=== Conversion Complete ===');
    log(`Items converted: ${result.json.items.length}`);
    log(`Total parts (with demand): ${result.json.items.reduce((sum, item) => sum + item.demand, 0)}`);
    log(`Strip height: ${result.json.strip_height}mm`);
    log(`Output file: ${options.output}`);
    log(`File size: ${(fileSize / 1024).toFixed(2)} KB`);
    log('');
    log('✓ Success! JSON is ready for sparrow-cli.exe');
    log('');
    log('Next step:');
    log(`  sparrow-cli.exe --input ${options.output} --output result.json --output-svg result.svg`);

    process.exit(0);

  } catch (error) {
    log('');
    logError(`Conversion failed: ${error.message}`);
    if (options.verbose && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run CLI
main();
