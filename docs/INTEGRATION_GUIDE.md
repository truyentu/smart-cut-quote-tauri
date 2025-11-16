# sparroWASM Integration Guide

**Complete guide for integrating DXF Converter and Nesting Engine into C# or Python applications**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [MVP 1: DXF Converter](#mvp-1-dxf-converter)
4. [MVP 2: Nesting Engine (sparrow-cli)](#mvp-2-nesting-engine-sparrow-cli)
5. [C# Integration](#c-integration)
6. [Python Integration](#python-integration)
7. [Complete Workflow Example](#complete-workflow-example)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This project provides **two standalone native executables** for 2D nesting optimization:

1. **dxf-converter.exe** (3.1 MB) - Converts DXF CAD files to JSON format
2. **sparrow-cli.exe** (1.8 MB) - Optimizes 2D nesting layout and generates SVG

Both are **Rust native binaries** (not Node.js/pkg), ensuring:
- ✅ **No Windows Defender issues** (unlike pkg-bundled executables)
- ✅ **Fast execution** (native code, no JavaScript runtime)
- ✅ **Small file size** (3.1MB + 1.8MB = 4.9MB total)
- ✅ **Single-file deployment** (no dependencies, no DLLs)

---

## System Architecture

```
┌─────────────────┐
│   DXF Files     │  Input: CAD drawings (.dxf)
│  (1.dxf, etc)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│          dxf-converter.exe (MVP 1)                  │
│  • Parses DXF entities (LINE, CIRCLE, ARC, etc)     │
│  • Builds contours from connected entities          │
│  • Handles SPLINE with artifact filtering           │
│  • Subdivides long edges for stability              │
│  • Detects exterior vs holes                        │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  JSON Format    │  Intermediate: Polygon data
│  (output.json)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│         sparrow-cli.exe (MVP 2)                     │
│  • Loads polygon shapes from JSON                   │
│  • Runs 2D bin packing optimization                 │
│  • Generates optimized layout                       │
│  • Exports JSON + SVG results                       │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│         Output Files                                │
│  • result.json  - Placement coordinates             │
│  • result.svg   - Visual layout preview             │
└─────────────────────────────────────────────────────┘
```

---

## MVP 1: DXF Converter

### 📍 Location
```
target/release/dxf-converter.exe
```

### 🎯 Purpose
Converts DXF CAD files to sparroWASM JSON format for nesting optimization.

### 📥 Input Format

**DXF Files** - Standard AutoCAD drawing format
- Supported entities: `LINE`, `CIRCLE`, `ARC`, `LWPOLYLINE`, `POLYLINE`, `SPLINE`
- Units: millimeters (mm)
- Can contain multiple separate shapes
- Holes are detected but currently ignored (only exterior contour used)

### 📤 Output Format

**JSON Structure:**
```json
{
  "name": "dxf_conversion",
  "items": [
    {
      "id": 0,
      "demand": 2,
      "dxf": "part1.dxf",
      "allowed_orientations": [0.0, 90.0, 180.0, 270.0],
      "shape": {
        "type": "simple_polygon",
        "data": [
          [0.0, 0.0],
          [100.0, 0.0],
          [100.0, 50.0],
          [0.0, 50.0],
          [0.0, 0.0]
        ]
      }
    }
  ],
  "strip_height": 6000.0
}
```

**Field Descriptions:**
- `name` - Problem identifier
- `items` - Array of shapes to nest
  - `id` - Unique item ID (0-indexed)
  - `demand` - Quantity of this part needed
  - `dxf` - Original DXF filename (metadata)
  - `allowed_orientations` - Rotation angles in degrees (0, 90, 180, 270)
  - `shape.type` - Always `"simple_polygon"`
  - `shape.data` - Polygon vertices as `[x, y]` coordinates in mm
- `strip_height` - Maximum strip height in mm (default: 6000)

### 🔧 Command Line Interface

**Basic Usage:**
```bash
dxf-converter.exe -i <input.dxf> -o <output.json>
```

**Multiple Files with Quantities:**
```bash
dxf-converter.exe \
  -i part1.dxf:5 \
  -i part2.dxf:3 \
  -i part3.dxf:10 \
  -o output.json
```

**All Parameters:**
```bash
dxf-converter.exe \
  --input <FILES>...           # Input DXF files (required)
  --output <FILE>              # Output JSON file (required)
  --height <MM>                # Strip height in mm (default: 6000)
  --spacing <MM>               # Part spacing in mm (default: 5)
  --arc-segments <NUM>         # Arc/circle discretization (default: 32)
  --spline-segments <NUM>      # Spline discretization (default: 100)
  --tolerance <MM>             # Point matching tolerance (default: 0.5)
  --allow-rotations <BOOL>     # Allow rotations (default: true)
  --name <NAME>                # Problem name (default: "dxf_conversion")
  --verbose                    # Enable verbose logging
```

**Quantity Syntax:**
```bash
# Syntax: filename.dxf:quantity
-i part.dxf:5    # Convert part.dxf with quantity=5
-i part.dxf      # Convert part.dxf with quantity=1 (default)
```

### ⚙️ Processing Details

**What the converter does:**

1. **Entity Extraction**
   - Parses DXF file structure
   - Extracts geometric entities: LINE, CIRCLE, ARC, POLYLINE, SPLINE

2. **Contour Building**
   - Connects LINE entities by matching endpoints (within tolerance)
   - Treats closed shapes (CIRCLE, closed POLYLINE) as separate contours
   - Handles forward and reverse connections

3. **SPLINE Processing**
   - Filters artifact control points at origin [0,0]
   - Uses Catmull-Rom interpolation for smooth curves
   - Discretizes into polygon points (default: 100 segments)

4. **Edge Subdivision**
   - Splits edges longer than 20mm
   - Prevents numerical instability in nesting engine
   - Ensures edge ratio < 100x

5. **Polygon Finalization**
   - Ensures polygon is closed (first point = last point)
   - Detects exterior vs holes using signed area
   - Currently uses only exterior contour (holes ignored with warning)

### 📊 Example Output Log

```
=== DXF to JSON Converter CLI v3.0 ===

Input files: 4
  - 1.DXF (quantity: 2)
  - 2.DXF (quantity: 3)
  - 3.DXF (quantity: 1)
  - 4.DXF (quantity: 5)
Output: output.json
Tolerance: 0.5mm

Converting DXF files...

Processing: 1.DXF (quantity: 2)
  Entities: 1
  Contours: 1
  Found 1 polygons, using exterior (33 points, area: 487.73)
  ✓ Successfully converted 1.DXF

Processing: 2.DXF (quantity: 3)
  Entities: 4
  Building contours from 4 entities...
  Starting new contour from entity 0 (LINE)
    Connected entity 3 (LINE) forward, distance: 0.000
    Connected entity 1 (LINE) forward, distance: 0.000
    Connected entity 2 (LINE) forward, distance: 0.000
  Subdivided polygon: 5 → 11 points
  ✓ Successfully converted 2.DXF

=== Conversion Complete ===
Items converted: 4
Total parts (with demand): 11
Output file: output.json
File size: 8.04 KB
```

---

## MVP 2: Nesting Engine (sparrow-cli)

### 📍 Location
```
target/release/sparrow-cli.exe
```

### 🎯 Purpose
Optimizes 2D bin packing/nesting layout using advanced algorithms.

### 📥 Input Format

**JSON from dxf-converter** (see MVP 1 output format above)

Key requirements:
- All polygons must be **closed** (first point = last point)
- **No duplicate consecutive points** (within 0.01mm tolerance)
- Coordinates in **millimeters**
- Counter-clockwise winding for exterior polygons

### 📤 Output Format

**1. JSON Result (result.json):**
```json
{
  "problem_name": "dxf_conversion",
  "strip_width": 83.41,
  "strip_height": 6000.0,
  "utilization": 0.06124,
  "items_placed": 11,
  "items_total": 11,
  "placements": [
    {
      "item_id": 0,
      "x": 10.5,
      "y": 20.3,
      "rotation": 90.0
    }
  ]
}
```

**2. SVG Visual (result.svg):**
- Visual representation of optimized layout
- Can be opened in web browser or vector graphics software
- Shows all parts positioned on strip

### 🔧 Command Line Interface

**Basic Usage:**
```bash
sparrow-cli.exe --input <input.json> --output <result.json>
```

**With SVG Output:**
```bash
sparrow-cli.exe \
  --input output.json \
  --output result.json \
  --output-svg result.svg
```

**All Parameters:**
```bash
sparrow-cli.exe \
  --input <FILE>              # Input JSON file (required)
  --output <FILE>             # Output JSON file (required)
  --output-svg <FILE>         # Output SVG file (optional)
  --timeout <SECONDS>         # Optimization timeout (default: 300)
  --workers <NUM>             # Number of parallel workers (default: 1)
  --early-termination         # Stop early if no improvement
  --seed <NUM>                # Random seed for reproducibility
```

### ⚙️ Processing Details

**Optimization Process:**

1. **Phase 1: Exploration (80% of time)**
   - Tries different arrangements
   - Gradually shrinks strip width
   - Uses heuristics to find good solutions

2. **Phase 2: Compression (20% of time)**
   - Fine-tunes best solution found
   - Attempts to compress strip width further

**Termination:**
- Timeout reached
- Early termination (no improvement after N attempts)
- Perfect packing found (100% utilization)

### 📊 Example Output Log

```
=== Sparrow Nesting CLI ===
Reading input from: output.json
Configuration:
  - Timeout: 15s
  - Workers: 1
  - Early termination: true

Starting nesting optimization...
[INFO] [00:00:00] [MAIN] loaded instance dxf_conversion with #11 items
[INFO] [00:00:00] [EXPL] starting optimization with initial width: 83.431
[INFO] [00:00:00] [EXPL] shrinking strip by 0.1%: 83.431 -> 83.347
[INFO] [00:00:06] [EXPL] finished, best feasible solution: width: 83.456
[INFO] [00:00:09] [CMPR] finished, compressed to 83.414
[INFO] [00:00:09] [MAIN] Optimization completed in 9.08s

=== Results ===
Instance: dxf_conversion
Strip dimensions: 83.41 × 6000.00
Items placed: 11 / 11
Utilization: 6.1%
Computation time: 9.08s
Status: complete

✓ Success! Total time: 9.08s
```

---

## C# Integration

### 📦 Files to Provide

Provide these files to the AI coder:

```
📁 Integration Package/
├── 📄 dxf-converter.exe                    # DXF converter binary
├── 📄 sparrow-cli.exe                      # Nesting engine binary
├── 📄 DxfConverterWrapper_EXE.cs           # C# wrapper for dxf-converter
├── 📄 SparrowNestingWrapper.cs             # C# wrapper for sparrow-cli (see below)
├── 📄 INTEGRATION_GUIDE.md                 # This file
└── 📁 examples/
    ├── 📄 sample.dxf                       # Sample DXF file
    ├── 📄 output.json                      # Sample JSON from converter
    └── 📄 result.svg                       # Sample SVG output
```

### 🔌 DXF Converter Wrapper (Already Provided)

**File:** `DxfConverterWrapper_EXE.cs`

**Location:** `converters mvp/DxfConverterWrapper_EXE.cs`

**Usage Example:**
```csharp
using SmartCutQuote.Nesting;

// Initialize wrapper (auto-detects exe in application directory)
var converter = new DxfConverterWrapper();

// Prepare input files
var inputFiles = new List<string>
{
    @"C:\parts\part1.dxf",
    @"C:\parts\part2.dxf",
    @"C:\parts\part3.dxf"
};

// Configure options
var options = new ConversionOptions
{
    StripHeight = 6000,      // mm
    PartSpacing = 5,         // mm
    ArcSegments = 32,        // circle smoothness
    SplineSegments = 100,    // spline smoothness
    Tolerance = 0.5,         // mm
    AllowRotations = true,
    Verbose = false,
    TimeoutMilliseconds = 60000
};

// Convert (async)
var result = await converter.ConvertAsync(
    inputFiles,
    @"C:\output\nesting.json",
    options
);

// Check result
if (result.Success)
{
    Console.WriteLine($"Success! Output: {result.OutputJsonPath}");
    Console.WriteLine($"Message: {result.Message}");
}
else
{
    Console.WriteLine($"Error: {result.ErrorMessage}");
}

// Or convert synchronously
var syncResult = converter.Convert(inputFiles, @"C:\output\nesting.json", options);
```

**Predefined Option Presets:**
```csharp
// Fast conversion (lower quality)
var fastOptions = ConversionOptions.Fast;

// High precision (slower, better quality)
var preciseOptions = ConversionOptions.HighPrecision;
```

### 🔌 Nesting Engine Wrapper (New - Create This)

**File:** `SparrowNestingWrapper.cs`

```csharp
using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading.Tasks;

namespace SmartCutQuote.Nesting
{
    /// <summary>
    /// Wrapper for sparrow-cli.exe nesting engine
    /// </summary>
    public class SparrowNestingWrapper
    {
        private readonly string _cliExePath;
        private readonly int _defaultTimeout = 300000; // 5 minutes

        public SparrowNestingWrapper(string cliExePath = null)
        {
            if (string.IsNullOrEmpty(cliExePath))
            {
                var baseDir = AppDomain.CurrentDomain.BaseDirectory;
                _cliExePath = Path.Combine(baseDir, "sparrow-cli.exe");
            }
            else
            {
                _cliExePath = cliExePath;
            }

            if (!File.Exists(_cliExePath))
            {
                throw new FileNotFoundException(
                    $"sparrow-cli.exe not found: {_cliExePath}\n" +
                    "Please ensure sparrow-cli.exe is in application directory.");
            }
        }

        /// <summary>
        /// Run nesting optimization
        /// </summary>
        public async Task<NestingResult> OptimizeAsync(
            string inputJsonPath,
            string outputJsonPath,
            NestingOptions options = null)
        {
            if (!File.Exists(inputJsonPath))
            {
                return NestingResult.Failure($"Input file not found: {inputJsonPath}");
            }

            options ??= new NestingOptions();

            var args = BuildArguments(inputJsonPath, outputJsonPath, options);
            var result = await RunProcessAsync(args, options.TimeoutMilliseconds ?? _defaultTimeout);

            if (result.Success)
            {
                return NestingResult.Success(outputJsonPath, options.OutputSvgPath, result.Output);
            }
            else
            {
                return NestingResult.Failure(result.Error);
            }
        }

        /// <summary>
        /// Run nesting synchronously
        /// </summary>
        public NestingResult Optimize(
            string inputJsonPath,
            string outputJsonPath,
            NestingOptions options = null)
        {
            return OptimizeAsync(inputJsonPath, outputJsonPath, options).GetAwaiter().GetResult();
        }

        private string BuildArguments(string inputPath, string outputPath, NestingOptions options)
        {
            var args = new StringBuilder();

            args.Append($"--input \"{inputPath}\"");
            args.Append($" --output \"{outputPath}\"");

            if (!string.IsNullOrEmpty(options.OutputSvgPath))
            {
                args.Append($" --output-svg \"{options.OutputSvgPath}\"");
            }

            if (options.TimeoutSeconds.HasValue)
            {
                args.Append($" --timeout {options.TimeoutSeconds.Value}");
            }

            if (options.Workers.HasValue)
            {
                args.Append($" --workers {options.Workers.Value}");
            }

            if (options.EarlyTermination)
            {
                args.Append(" --early-termination");
            }

            if (options.Seed.HasValue)
            {
                args.Append($" --seed {options.Seed.Value}");
            }

            return args.ToString();
        }

        private async Task<ProcessResult> RunProcessAsync(string arguments, int timeoutMs)
        {
            var outputBuilder = new StringBuilder();
            var errorBuilder = new StringBuilder();

            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = _cliExePath,
                    Arguments = arguments,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    StandardOutputEncoding = Encoding.UTF8,
                    StandardErrorEncoding = Encoding.UTF8
                }
            };

            process.OutputDataReceived += (sender, e) =>
            {
                if (e.Data != null) outputBuilder.AppendLine(e.Data);
            };

            process.ErrorDataReceived += (sender, e) =>
            {
                if (e.Data != null) errorBuilder.AppendLine(e.Data);
            };

            try
            {
                process.Start();
                process.BeginOutputReadLine();
                process.BeginErrorReadLine();

                var exited = await Task.Run(() => process.WaitForExit(timeoutMs));

                if (!exited)
                {
                    process.Kill();
                    return new ProcessResult
                    {
                        Success = false,
                        Error = $"Optimization timeout after {timeoutMs}ms"
                    };
                }

                if (process.ExitCode == 0)
                {
                    return new ProcessResult
                    {
                        Success = true,
                        Output = outputBuilder.ToString()
                    };
                }
                else
                {
                    var error = errorBuilder.ToString();
                    if (string.IsNullOrEmpty(error))
                    {
                        error = $"Optimization failed with exit code {process.ExitCode}";
                    }

                    return new ProcessResult
                    {
                        Success = false,
                        Error = error
                    };
                }
            }
            catch (Exception ex)
            {
                return new ProcessResult
                {
                    Success = false,
                    Error = $"Failed to run optimizer: {ex.Message}"
                };
            }
            finally
            {
                process?.Dispose();
            }
        }

        private class ProcessResult
        {
            public bool Success { get; set; }
            public string Output { get; set; }
            public string Error { get; set; }
        }
    }

    /// <summary>
    /// Nesting optimization options
    /// </summary>
    public class NestingOptions
    {
        public int? TimeoutSeconds { get; set; } = 300;
        public int? TimeoutMilliseconds => TimeoutSeconds * 1000;
        public int? Workers { get; set; } = 1;
        public bool EarlyTermination { get; set; } = true;
        public ulong? Seed { get; set; } = null;
        public string OutputSvgPath { get; set; } = null;

        public static NestingOptions Fast => new NestingOptions
        {
            TimeoutSeconds = 60,
            EarlyTermination = true,
            Workers = 1
        };

        public static NestingOptions Thorough => new NestingOptions
        {
            TimeoutSeconds = 600,
            EarlyTermination = false,
            Workers = 4
        };
    }

    /// <summary>
    /// Nesting optimization result
    /// </summary>
    public class NestingResult
    {
        public bool Success { get; set; }
        public string OutputJsonPath { get; set; }
        public string OutputSvgPath { get; set; }
        public string Message { get; set; }
        public string ErrorMessage { get; set; }

        public static NestingResult Success(string jsonPath, string svgPath, string message)
        {
            return new NestingResult
            {
                Success = true,
                OutputJsonPath = jsonPath,
                OutputSvgPath = svgPath,
                Message = message
            };
        }

        public static NestingResult Failure(string errorMessage)
        {
            return new NestingResult
            {
                Success = false,
                ErrorMessage = errorMessage
            };
        }
    }
}
```

**Usage Example:**
```csharp
using SmartCutQuote.Nesting;

// Initialize optimizer
var optimizer = new SparrowNestingWrapper();

// Configure options
var options = new NestingOptions
{
    TimeoutSeconds = 300,        // 5 minutes
    Workers = 1,                 // Parallel workers
    EarlyTermination = true,     // Stop if no improvement
    OutputSvgPath = @"C:\output\layout.svg"  // Optional SVG
};

// Run optimization (async)
var result = await optimizer.OptimizeAsync(
    @"C:\output\nesting.json",      // From dxf-converter
    @"C:\output\result.json",       // Placement result
    options
);

// Check result
if (result.Success)
{
    Console.WriteLine($"Success! JSON: {result.OutputJsonPath}");
    Console.WriteLine($"SVG: {result.OutputSvgPath}");
    Console.WriteLine($"Log:\n{result.Message}");
}
else
{
    Console.WriteLine($"Error: {result.ErrorMessage}");
}
```

### 🔄 Complete C# Workflow

```csharp
using SmartCutQuote.Nesting;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

public class NestingWorkflow
{
    public async Task<bool> RunCompleteWorkflowAsync(
        List<string> dxfFiles,
        string outputDirectory)
    {
        try
        {
            // Step 1: Convert DXF to JSON
            Console.WriteLine("Step 1: Converting DXF files...");

            var converter = new DxfConverterWrapper();
            var jsonPath = Path.Combine(outputDirectory, "nesting.json");

            var conversionResult = await converter.ConvertAsync(
                dxfFiles,
                jsonPath,
                ConversionOptions.Fast  // or HighPrecision
            );

            if (!conversionResult.Success)
            {
                Console.WriteLine($"Conversion failed: {conversionResult.ErrorMessage}");
                return false;
            }

            Console.WriteLine($"✓ Conversion complete: {jsonPath}");

            // Step 2: Optimize nesting
            Console.WriteLine("\nStep 2: Optimizing nesting layout...");

            var optimizer = new SparrowNestingWrapper();
            var resultJsonPath = Path.Combine(outputDirectory, "result.json");
            var resultSvgPath = Path.Combine(outputDirectory, "layout.svg");

            var nestingResult = await optimizer.OptimizeAsync(
                jsonPath,
                resultJsonPath,
                new NestingOptions
                {
                    TimeoutSeconds = 300,
                    EarlyTermination = true,
                    OutputSvgPath = resultSvgPath
                }
            );

            if (!nestingResult.Success)
            {
                Console.WriteLine($"Optimization failed: {nestingResult.ErrorMessage}");
                return false;
            }

            Console.WriteLine($"✓ Optimization complete!");
            Console.WriteLine($"  Result JSON: {resultJsonPath}");
            Console.WriteLine($"  Layout SVG: {resultSvgPath}");

            // Step 3: Parse results (optional)
            var resultData = File.ReadAllText(resultJsonPath);
            Console.WriteLine($"\nResult data:\n{resultData}");

            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Workflow error: {ex.Message}");
            return false;
        }
    }
}

// Usage
var workflow = new NestingWorkflow();
var dxfFiles = new List<string>
{
    @"C:\parts\part1.dxf",
    @"C:\parts\part2.dxf",
    @"C:\parts\part3.dxf"
};

var success = await workflow.RunCompleteWorkflowAsync(
    dxfFiles,
    @"C:\output"
);
```

---

## Python Integration

### 📦 Files to Provide

Provide these files:

```
📁 Integration Package/
├── 📄 dxf-converter.exe
├── 📄 sparrow-cli.exe
├── 📄 nesting_wrapper.py          # Python wrapper (see below)
├── 📄 INTEGRATION_GUIDE.md
└── 📁 examples/
    ├── 📄 sample.dxf
    ├── 📄 output.json
    └── 📄 result.svg
```

### 🐍 Python Wrapper Module

**File:** `nesting_wrapper.py`

```python
"""
sparroWASM Python Wrapper
Provides easy integration with DXF converter and nesting engine
"""

import subprocess
import json
import os
from pathlib import Path
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field


@dataclass
class ConversionOptions:
    """Options for DXF conversion"""
    strip_height: float = 6000.0
    part_spacing: float = 5.0
    arc_segments: int = 32
    spline_segments: int = 100
    tolerance: float = 0.5
    allow_rotations: bool = True
    problem_name: str = "dxf_conversion"
    verbose: bool = False
    timeout_seconds: int = 60


@dataclass
class NestingOptions:
    """Options for nesting optimization"""
    timeout_seconds: int = 300
    workers: int = 1
    early_termination: bool = True
    seed: Optional[int] = None
    output_svg: Optional[str] = None


@dataclass
class ConversionResult:
    """Result from DXF conversion"""
    success: bool
    output_path: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None


@dataclass
class NestingResult:
    """Result from nesting optimization"""
    success: bool
    output_json: Optional[str] = None
    output_svg: Optional[str] = None
    utilization: Optional[float] = None
    strip_width: Optional[float] = None
    items_placed: Optional[int] = None
    message: Optional[str] = None
    error: Optional[str] = None


class DxfConverter:
    """Wrapper for dxf-converter.exe"""

    def __init__(self, exe_path: Optional[str] = None):
        if exe_path is None:
            # Look in same directory as this script
            script_dir = Path(__file__).parent
            exe_path = script_dir / "dxf-converter.exe"

        self.exe_path = Path(exe_path)

        if not self.exe_path.exists():
            raise FileNotFoundError(f"dxf-converter.exe not found: {self.exe_path}")

    def convert(
        self,
        dxf_files: List[str],
        output_json: str,
        options: Optional[ConversionOptions] = None
    ) -> ConversionResult:
        """
        Convert DXF files to JSON format

        Args:
            dxf_files: List of DXF file paths (can use "file.dxf:quantity" syntax)
            output_json: Output JSON file path
            options: Conversion options

        Returns:
            ConversionResult with success status and details
        """
        if options is None:
            options = ConversionOptions()

        # Verify input files exist
        for dxf_spec in dxf_files:
            # Handle "file.dxf:quantity" syntax
            dxf_file = dxf_spec.split(':')[0]
            if not os.path.exists(dxf_file):
                return ConversionResult(
                    success=False,
                    error=f"Input file not found: {dxf_file}"
                )

        # Build command
        cmd = [str(self.exe_path)]

        # Add input files
        for dxf_file in dxf_files:
            cmd.extend(["-i", dxf_file])

        # Add output
        cmd.extend(["-o", output_json])

        # Add options
        cmd.extend(["--height", str(options.strip_height)])
        cmd.extend(["--spacing", str(options.part_spacing)])
        cmd.extend(["--arc-segments", str(options.arc_segments)])
        cmd.extend(["--spline-segments", str(options.spline_segments)])
        cmd.extend(["--tolerance", str(options.tolerance)])
        cmd.extend(["--allow-rotations", str(options.allow_rotations).lower()])
        cmd.extend(["--name", options.problem_name])

        if options.verbose:
            cmd.append("--verbose")

        try:
            # Run conversion
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=options.timeout_seconds
            )

            if result.returncode == 0:
                return ConversionResult(
                    success=True,
                    output_path=output_json,
                    message=result.stdout
                )
            else:
                return ConversionResult(
                    success=False,
                    error=result.stderr or f"Exit code: {result.returncode}"
                )

        except subprocess.TimeoutExpired:
            return ConversionResult(
                success=False,
                error=f"Conversion timeout after {options.timeout_seconds}s"
            )
        except Exception as e:
            return ConversionResult(
                success=False,
                error=f"Conversion error: {str(e)}"
            )


class NestingOptimizer:
    """Wrapper for sparrow-cli.exe"""

    def __init__(self, exe_path: Optional[str] = None):
        if exe_path is None:
            # Look in same directory as this script
            script_dir = Path(__file__).parent
            exe_path = script_dir / "sparrow-cli.exe"

        self.exe_path = Path(exe_path)

        if not self.exe_path.exists():
            raise FileNotFoundError(f"sparrow-cli.exe not found: {self.exe_path}")

    def optimize(
        self,
        input_json: str,
        output_json: str,
        options: Optional[NestingOptions] = None
    ) -> NestingResult:
        """
        Run nesting optimization

        Args:
            input_json: Input JSON from DXF converter
            output_json: Output JSON file path
            options: Nesting options

        Returns:
            NestingResult with optimization details
        """
        if options is None:
            options = NestingOptions()

        if not os.path.exists(input_json):
            return NestingResult(
                success=False,
                error=f"Input file not found: {input_json}"
            )

        # Build command
        cmd = [
            str(self.exe_path),
            "--input", input_json,
            "--output", output_json,
            "--timeout", str(options.timeout_seconds),
            "--workers", str(options.workers)
        ]

        if options.early_termination:
            cmd.append("--early-termination")

        if options.seed is not None:
            cmd.extend(["--seed", str(options.seed)])

        if options.output_svg:
            cmd.extend(["--output-svg", options.output_svg])

        try:
            # Run optimization
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=options.timeout_seconds + 10  # Extra buffer
            )

            if result.returncode == 0:
                # Parse result JSON for metadata
                result_data = {}
                utilization = None
                strip_width = None
                items_placed = None

                try:
                    with open(output_json, 'r') as f:
                        result_data = json.load(f)

                    utilization = result_data.get('utilization')
                    strip_width = result_data.get('strip_width')
                    items_placed = result_data.get('items_placed')
                except:
                    pass

                return NestingResult(
                    success=True,
                    output_json=output_json,
                    output_svg=options.output_svg,
                    utilization=utilization,
                    strip_width=strip_width,
                    items_placed=items_placed,
                    message=result.stdout
                )
            else:
                return NestingResult(
                    success=False,
                    error=result.stderr or f"Exit code: {result.returncode}"
                )

        except subprocess.TimeoutExpired:
            return NestingResult(
                success=False,
                error=f"Optimization timeout after {options.timeout_seconds}s"
            )
        except Exception as e:
            return NestingResult(
                success=False,
                error=f"Optimization error: {str(e)}"
            )


class NestingWorkflow:
    """Complete workflow: DXF → JSON → Nesting → Results"""

    def __init__(
        self,
        converter_exe: Optional[str] = None,
        optimizer_exe: Optional[str] = None
    ):
        self.converter = DxfConverter(converter_exe)
        self.optimizer = NestingOptimizer(optimizer_exe)

    def run(
        self,
        dxf_files: List[str],
        output_dir: str,
        conversion_options: Optional[ConversionOptions] = None,
        nesting_options: Optional[NestingOptions] = None
    ) -> Dict[str, Any]:
        """
        Run complete nesting workflow

        Args:
            dxf_files: List of DXF files to process
            output_dir: Output directory for all files
            conversion_options: DXF conversion options
            nesting_options: Nesting optimization options

        Returns:
            Dictionary with results from both steps
        """
        os.makedirs(output_dir, exist_ok=True)

        # Paths
        json_path = os.path.join(output_dir, "nesting.json")
        result_json = os.path.join(output_dir, "result.json")
        result_svg = os.path.join(output_dir, "layout.svg")

        # Set SVG output if not specified
        if nesting_options is None:
            nesting_options = NestingOptions()
        if nesting_options.output_svg is None:
            nesting_options.output_svg = result_svg

        # Step 1: Convert DXF
        print("Step 1: Converting DXF files...")
        conversion_result = self.converter.convert(
            dxf_files,
            json_path,
            conversion_options
        )

        if not conversion_result.success:
            return {
                "success": False,
                "stage": "conversion",
                "error": conversion_result.error
            }

        print(f"✓ Conversion complete: {json_path}")

        # Step 2: Optimize nesting
        print("\nStep 2: Optimizing nesting layout...")
        nesting_result = self.optimizer.optimize(
            json_path,
            result_json,
            nesting_options
        )

        if not nesting_result.success:
            return {
                "success": False,
                "stage": "optimization",
                "error": nesting_result.error,
                "json_path": json_path
            }

        print(f"✓ Optimization complete!")
        print(f"  Result JSON: {result_json}")
        print(f"  Layout SVG: {result_svg}")

        if nesting_result.utilization:
            print(f"  Utilization: {nesting_result.utilization*100:.2f}%")
        if nesting_result.strip_width:
            print(f"  Strip width: {nesting_result.strip_width:.2f}mm")
        if nesting_result.items_placed:
            print(f"  Items placed: {nesting_result.items_placed}")

        return {
            "success": True,
            "json_path": json_path,
            "result_json": result_json,
            "result_svg": result_svg,
            "utilization": nesting_result.utilization,
            "strip_width": nesting_result.strip_width,
            "items_placed": nesting_result.items_placed
        }


# Convenience functions
def convert_dxf(dxf_files: List[str], output_json: str, **kwargs) -> ConversionResult:
    """Shortcut to convert DXF files"""
    converter = DxfConverter()
    options = ConversionOptions(**kwargs) if kwargs else None
    return converter.convert(dxf_files, output_json, options)


def optimize_nesting(input_json: str, output_json: str, **kwargs) -> NestingResult:
    """Shortcut to run nesting optimization"""
    optimizer = NestingOptimizer()
    options = NestingOptions(**kwargs) if kwargs else None
    return optimizer.optimize(input_json, output_json, options)


def run_workflow(dxf_files: List[str], output_dir: str, **kwargs) -> Dict[str, Any]:
    """Shortcut to run complete workflow"""
    workflow = NestingWorkflow()
    return workflow.run(dxf_files, output_dir, **kwargs)


# Example usage
if __name__ == "__main__":
    # Simple example
    result = run_workflow(
        dxf_files=["part1.dxf", "part2.dxf:5", "part3.dxf"],
        output_dir="output",
        verbose=True
    )

    if result["success"]:
        print(f"\n✓ Complete! Results in: {result['result_json']}")
    else:
        print(f"\n✗ Failed at {result['stage']}: {result['error']}")
```

### 🐍 Python Usage Examples

**Example 1: Simple Conversion**
```python
from nesting_wrapper import convert_dxf

result = convert_dxf(
    dxf_files=["part1.dxf", "part2.dxf"],
    output_json="output.json"
)

if result.success:
    print(f"Success: {result.output_path}")
else:
    print(f"Error: {result.error}")
```

**Example 2: Simple Optimization**
```python
from nesting_wrapper import optimize_nesting

result = optimize_nesting(
    input_json="output.json",
    output_json="result.json",
    output_svg="layout.svg",
    timeout_seconds=300
)

if result.success:
    print(f"Utilization: {result.utilization*100:.1f}%")
    print(f"Strip width: {result.strip_width}mm")
```

**Example 3: Complete Workflow**
```python
from nesting_wrapper import run_workflow

result = run_workflow(
    dxf_files=["part1.dxf:2", "part2.dxf:5", "part3.dxf"],
    output_dir="output",
    verbose=True,
    timeout_seconds=300
)

if result["success"]:
    print(f"Layout SVG: {result['result_svg']}")
    print(f"Utilization: {result['utilization']*100:.1f}%")
```

**Example 4: Advanced Workflow**
```python
from nesting_wrapper import NestingWorkflow, ConversionOptions, NestingOptions

# Initialize workflow
workflow = NestingWorkflow()

# Configure options
conversion_opts = ConversionOptions(
    strip_height=6000,
    arc_segments=64,      # Higher quality circles
    tolerance=0.1,        # Tighter tolerance
    verbose=True
)

nesting_opts = NestingOptions(
    timeout_seconds=600,
    workers=4,            # Use 4 parallel workers
    early_termination=False,  # Run full time
    seed=12345           # Reproducible results
)

# Run workflow
result = workflow.run(
    dxf_files=["part1.dxf", "part2.dxf", "part3.dxf"],
    output_dir="output",
    conversion_options=conversion_opts,
    nesting_options=nesting_opts
)

# Check results
if result["success"]:
    print(f"✓ Success!")
    print(f"  Items placed: {result['items_placed']}")
    print(f"  Strip: {result['strip_width']:.1f}mm")
    print(f"  Utilization: {result['utilization']*100:.2f}%")
    print(f"  SVG: {result['result_svg']}")
else:
    print(f"✗ Failed at {result['stage']}: {result['error']}")
```

---

## Complete Workflow Example

### Scenario
Convert 3 DXF parts and optimize nesting layout.

### Input Files
```
parts/
├── bracket.dxf      # Need 5 copies
├── plate.dxf        # Need 3 copies
└── spacer.dxf       # Need 10 copies
```

### Step-by-Step Process

**Step 1: Convert DXF to JSON**
```bash
dxf-converter.exe \
  -i parts/bracket.dxf:5 \
  -i parts/plate.dxf:3 \
  -i parts/spacer.dxf:10 \
  -o nesting.json \
  --height 6000 \
  --verbose
```

**Output:** `nesting.json` (contains 18 total parts: 5+3+10)

**Step 2: Optimize Nesting**
```bash
sparrow-cli.exe \
  --input nesting.json \
  --output result.json \
  --output-svg layout.svg \
  --timeout 300 \
  --early-termination
```

**Output:**
- `result.json` - Placement coordinates for each part
- `layout.svg` - Visual layout (open in browser)

**Step 3: View Results**
- Open `layout.svg` in web browser to see optimized layout
- Parse `result.json` to get X, Y, rotation for each part
- Use placement data for CNC cutting, laser cutting, etc.

---

## Troubleshooting

### Common Issues

#### 1. "duplicate points" Error

**Symptom:**
```
called `Result::unwrap()` on an `Err` value:
Simple polygon should not contain duplicate points
```

**Cause:** Circle entity not properly closed, or old JSON from previous converter version.

**Solution:**
- Re-convert DXF files with latest `dxf-converter.exe v3.0`
- Ensure you're using the fixed version (check with `--version`)
- Delete old `output.json` and regenerate

#### 2. Windows Defender Deleting EXE

**Symptom:** EXE file becomes 0 KB or disappears after first run.

**Cause:** Only affects old pkg-bundled version (37MB).

**Solution:**
- Use Rust native binaries (3.1MB + 1.8MB)
- These are NOT flagged by Windows Defender
- If using old version, switch to v3.0

#### 3. "File not found" Error

**Symptom:** Cannot find DXF file or EXE.

**Solution:**
- Use absolute paths: `C:\full\path\to\file.dxf`
- Or ensure working directory is correct
- For C#: Place EXE in application base directory
- For Python: Place EXE in same folder as script

#### 4. Conversion Timeout

**Symptom:** Conversion takes too long and times out.

**Solution:**
- Reduce `arc-segments` and `spline-segments` for faster conversion
- Increase timeout value
- Check DXF file for corruption

#### 5. Poor Nesting Quality

**Symptom:** Low utilization, parts not packed well.

**Solution:**
- Increase `timeout` for longer optimization
- Use more `workers` for parallel search
- Disable `early-termination` for thorough search
- Ensure `allow-rotations=true` for better packing

#### 6. SVG Not Generated

**Symptom:** No SVG file created.

**Solution:**
- Ensure `--output-svg` parameter is specified
- Check file path is writable
- Verify optimization succeeded (check exit code)

---

## Performance Tips

### For DXF Conversion

**Fast (lower quality):**
```bash
--arc-segments 16 --spline-segments 50 --tolerance 1.0
```

**Balanced (default):**
```bash
--arc-segments 32 --spline-segments 100 --tolerance 0.5
```

**High quality (slower):**
```bash
--arc-segments 64 --spline-segments 200 --tolerance 0.1
```

### For Nesting Optimization

**Quick (1 minute):**
```bash
--timeout 60 --workers 1 --early-termination
```

**Balanced (5 minutes):**
```bash
--timeout 300 --workers 1 --early-termination
```

**Thorough (10+ minutes):**
```bash
--timeout 600 --workers 4
```

---

## File Size Reference

| File | Size | Purpose |
|------|------|---------|
| `dxf-converter.exe` | 3.1 MB | DXF to JSON conversion |
| `sparrow-cli.exe` | 1.8 MB | Nesting optimization |
| **Total** | **4.9 MB** | Complete solution |

Compare to old pkg version: 37 MB (single file)

---

## Version History

### v3.0 (Current) - 2024-11-16
- ✅ Complete JavaScript logic port to Rust
- ✅ Contour building from connected LINEs
- ✅ SPLINE support with artifact filtering
- ✅ Edge subdivision for stability
- ✅ Fixed duplicate points bug
- ✅ Native Rust binary (3.1 MB)
- ✅ No Windows Defender issues

### v2.1 (Previous)
- ⚠️ Node.js pkg-bundled (37 MB)
- ⚠️ Windows Defender flagged as malware
- ⚠️ Duplicate points errors

---

## Contact & Support

For integration questions or issues:

1. **Check this guide first** - Most questions answered here
2. **Provide example files** - Include DXF, JSON, and error messages
3. **Include version info** - Run `dxf-converter.exe --version`
4. **Share logs** - Use `--verbose` flag for detailed output

---

**End of Integration Guide**

*Last updated: 2024-11-16*
*Version: 3.0*
