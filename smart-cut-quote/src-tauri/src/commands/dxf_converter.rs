use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::Manager;

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ConversionOptions {
    pub strip_height: f64,
    pub part_spacing: f64,
    pub arc_segments: u32,
}

#[derive(Serialize, Debug)]
pub struct ConversionResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub error: Option<String>,
}

/// Convert DXF files to JSON format for nesting
/// Uses dxf-converter.exe bundled with the application
#[tauri::command(rename_all = "camelCase")]
pub async fn convert_dxf_to_json(
    app_handle: tauri::AppHandle,
    input_files: Vec<String>,
    output_path: String,
    options: ConversionOptions,
) -> Result<ConversionResult, String> {
    // Debug: Print received parameters
    println!("=== convert_dxf_to_json called (NEW CODE) ===");
    println!("input_files: {:?}", input_files);
    println!("output_path: {}", output_path);
    println!("options: {:?}", options);

    // Resolve the path to dxf-converter.exe
    let resource_path = app_handle
        .path()
        .resolve("binaries/dxf-converter.exe", tauri::path::BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve dxf-converter.exe path: {}", e))?;

    // Check if the executable exists (in dev mode, use relative path)
    let exe_path = if resource_path.exists() {
        resource_path
    } else {
        // Development mode: use relative path
        std::env::current_dir()
            .map_err(|e| format!("Failed to get current directory: {}", e))?
            .join("../../binaries/dxf-converter.exe")
    };

    if !exe_path.exists() {
        let error_msg = format!("dxf-converter.exe not found at: {}", exe_path.display());
        println!("❌ ERROR: {}", error_msg);
        return Ok(ConversionResult {
            success: false,
            output_path: None,
            error: Some(error_msg),
        });
    }

    println!("✓ Found dxf-converter.exe at: {}", exe_path.display());

    // Build command
    let mut cmd = Command::new(&exe_path);

    // Debug logging
    println!("Converting {} files to JSON", input_files.len());
    for (i, file) in input_files.iter().enumerate() {
        println!("  File {}: {}", i + 1, file);
    }

    // Add input files
    // IMPORTANT: Use short flag -i (not --input) as shown in INTEGRATION_GUIDE.md
    // CRITICAL WORKAROUND: dxf-converter.exe expects PATH:QUANTITY format
    // But Windows absolute paths have drive letter colon (C:\...) which conflicts
    // Solution: Split path and quantity in Rust, then pass multiple -i arguments
    for file_spec in &input_files {
        // Split by LAST colon to separate path from quantity
        if let Some(last_colon_pos) = file_spec.rfind(':') {
            // Check if this looks like PATH:QUANTITY format (not just drive letter)
            // Drive letter format: "C:\path" (colon at position 1)
            // PATH:QTY format: "C:\path\file.dxf:10" (colon after position 2)
            if last_colon_pos > 2 {
                // This is PATH:QUANTITY format
                let path = &file_spec[..last_colon_pos];
                let quantity = &file_spec[last_colon_pos + 1..];

                // Pass as separate -i arguments for each quantity
                let qty_num: usize = quantity.parse().unwrap_or(1);
                for _ in 0..qty_num {
                    cmd.arg("-i").arg(path);
                }
                continue;
            }
        }

        // Fallback: no quantity found, pass as-is
        cmd.arg("-i").arg(file_spec);
    }

    // Add output
    cmd.arg("--output").arg(&output_path);

    // Add options
    cmd.arg("--height")
        .arg(options.strip_height.to_string());
    cmd.arg("--spacing")
        .arg(options.part_spacing.to_string());
    cmd.arg("--arc-segments")
        .arg(options.arc_segments.to_string());

    // Debug: Print the full command
    println!("Executing command: {:?}", cmd);

    // Execute
    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute dxf-converter: {}", e))?;

    // Debug: Print stdout and stderr
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    if !stdout.is_empty() {
        println!("dxf-converter stdout: {}", stdout);
    }
    if !stderr.is_empty() {
        println!("dxf-converter stderr: {}", stderr);
    }

    if output.status.success() {
        Ok(ConversionResult {
            success: true,
            output_path: Some(output_path),
            error: None,
        })
    } else {
        let error = String::from_utf8_lossy(&output.stderr).to_string();
        Ok(ConversionResult {
            success: false,
            output_path: None,
            error: Some(if error.is_empty() {
                "Unknown error occurred during conversion".to_string()
            } else {
                error
            }),
        })
    }
}
