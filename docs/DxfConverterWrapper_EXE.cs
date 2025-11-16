using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading.Tasks;

namespace SmartCutQuote.Nesting
{
    /// <summary>
    /// Wrapper class for DXF to JSON converter (Standalone EXE version)
    /// Version: Single EXE - No dependencies required
    /// </summary>
    public class DxfConverterWrapper
    {
        private readonly string _converterExePath;
        private readonly int _defaultTimeout = 60000; // 60 seconds

        /// <summary>
        /// Initialize DXF converter wrapper
        /// </summary>
        /// <param name="converterExePath">Path to dxf-converter.exe (default: looks in app directory)</param>
        public DxfConverterWrapper(string converterExePath = null)
        {
            // Default to EXE in same directory as application
            if (string.IsNullOrEmpty(converterExePath))
            {
                var baseDir = AppDomain.CurrentDomain.BaseDirectory;
                _converterExePath = Path.Combine(baseDir, "dxf-converter.exe");
            }
            else
            {
                _converterExePath = converterExePath;
            }

            ValidateSetup();
        }

        /// <summary>
        /// Validate that converter EXE is available
        /// </summary>
        private void ValidateSetup()
        {
            if (!File.Exists(_converterExePath))
            {
                throw new FileNotFoundException(
                    $"DXF converter not found: {_converterExePath}\n" +
                    "Please ensure dxf-converter.exe is copied to application directory.");
            }
        }

        /// <summary>
        /// Convert DXF files to sparroWASM JSON format
        /// </summary>
        public async Task<ConversionResult> ConvertAsync(
            List<string> inputDxfFiles,
            string outputJsonPath,
            ConversionOptions options = null)
        {
            // Validate input files
            foreach (var dxfFile in inputDxfFiles)
            {
                if (!File.Exists(dxfFile))
                {
                    return ConversionResult.Failure($"Input file not found: {dxfFile}");
                }
            }

            // Use default options if not provided
            options ??= new ConversionOptions();

            // Build command-line arguments
            var args = BuildArguments(inputDxfFiles, outputJsonPath, options);

            // Run converter process
            var result = await RunProcessAsync(args, options.TimeoutMilliseconds ?? _defaultTimeout);

            if (result.Success)
            {
                return ConversionResult.Success(outputJsonPath, result.Output);
            }
            else
            {
                return ConversionResult.Failure(result.Error);
            }
        }

        /// <summary>
        /// Convert DXF files synchronously (blocking)
        /// </summary>
        public ConversionResult Convert(
            List<string> inputDxfFiles,
            string outputJsonPath,
            ConversionOptions options = null)
        {
            return ConvertAsync(inputDxfFiles, outputJsonPath, options).GetAwaiter().GetResult();
        }

        /// <summary>
        /// Build CLI arguments string
        /// </summary>
        private string BuildArguments(
            List<string> inputDxfFiles,
            string outputJsonPath,
            ConversionOptions options)
        {
            var args = new StringBuilder();

            // Add input files
            args.Append("--input");
            foreach (var dxfFile in inputDxfFiles)
            {
                args.Append($" \"{dxfFile}\"");
            }

            // Add output path
            args.Append($" --output \"{outputJsonPath}\"");

            // Add optional parameters
            if (options.StripHeight.HasValue)
            {
                args.Append($" --height {options.StripHeight.Value}");
            }

            if (options.PartSpacing.HasValue)
            {
                args.Append($" --spacing {options.PartSpacing.Value}");
            }

            if (options.ArcSegments.HasValue)
            {
                args.Append($" --arc-segments {options.ArcSegments.Value}");
            }

            if (options.SplineSegments.HasValue)
            {
                args.Append($" --spline-segments {options.SplineSegments.Value}");
            }

            if (options.Tolerance.HasValue)
            {
                args.Append($" --tolerance {options.Tolerance.Value}");
            }

            if (options.AllowRotations.HasValue)
            {
                args.Append($" --allow-rotations {options.AllowRotations.Value.ToString().ToLower()}");
            }

            if (!string.IsNullOrEmpty(options.ProblemName))
            {
                args.Append($" --name \"{options.ProblemName}\"");
            }

            if (options.Verbose)
            {
                args.Append(" --verbose");
            }

            return args.ToString();
        }

        /// <summary>
        /// Run converter process and capture output
        /// </summary>
        private async Task<ProcessResult> RunProcessAsync(string arguments, int timeoutMs)
        {
            var outputBuilder = new StringBuilder();
            var errorBuilder = new StringBuilder();

            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = _converterExePath,  // Call .exe directly
                    Arguments = arguments,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    StandardOutputEncoding = Encoding.UTF8,
                    StandardErrorEncoding = Encoding.UTF8
                }
            };

            // Capture output
            process.OutputDataReceived += (sender, e) =>
            {
                if (e.Data != null)
                {
                    outputBuilder.AppendLine(e.Data);
                }
            };

            process.ErrorDataReceived += (sender, e) =>
            {
                if (e.Data != null)
                {
                    errorBuilder.AppendLine(e.Data);
                }
            };

            try
            {
                process.Start();
                process.BeginOutputReadLine();
                process.BeginErrorReadLine();

                // Wait for exit with timeout
                var exited = await Task.Run(() => process.WaitForExit(timeoutMs));

                if (!exited)
                {
                    process.Kill();
                    return new ProcessResult
                    {
                        Success = false,
                        Error = $"Conversion timeout after {timeoutMs}ms"
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
                        error = $"Conversion failed with exit code {process.ExitCode}";
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
                    Error = $"Failed to run converter: {ex.Message}"
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
    /// DXF to JSON conversion options
    /// </summary>
    public class ConversionOptions
    {
        public double? StripHeight { get; set; } = 6000;
        public double? PartSpacing { get; set; } = 5;
        public int? ArcSegments { get; set; } = 32;
        public int? SplineSegments { get; set; } = 100;
        public double? Tolerance { get; set; } = 0.5;
        public bool? AllowRotations { get; set; } = true;
        public string ProblemName { get; set; } = "dxf_conversion";
        public bool Verbose { get; set; } = false;
        public int? TimeoutMilliseconds { get; set; } = 60000;

        public static ConversionOptions Fast => new ConversionOptions
        {
            ArcSegments = 16,
            SplineSegments = 50,
            Tolerance = 1.0
        };

        public static ConversionOptions HighPrecision => new ConversionOptions
        {
            ArcSegments = 64,
            SplineSegments = 200,
            Tolerance = 0.1
        };
    }

    /// <summary>
    /// DXF to JSON conversion result
    /// </summary>
    public class ConversionResult
    {
        public bool Success { get; set; }
        public string OutputJsonPath { get; set; }
        public string Message { get; set; }
        public string ErrorMessage { get; set; }

        public static ConversionResult Success(string outputPath, string message = "Conversion successful")
        {
            return new ConversionResult
            {
                Success = true,
                OutputJsonPath = outputPath,
                Message = message
            };
        }

        public static ConversionResult Failure(string errorMessage)
        {
            return new ConversionResult
            {
                Success = false,
                ErrorMessage = errorMessage
            };
        }
    }
}
