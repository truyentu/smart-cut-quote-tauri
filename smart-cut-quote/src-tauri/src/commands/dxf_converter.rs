use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::Manager;

#[derive(Serialize, Deserialize, Debug)]
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
#[tauri::command]
pub async fn convert_dxf_to_json(
    app_handle: tauri::AppHandle,
    input_files: Vec<String>,
    output_path: String,
    options: ConversionOptions,
) -> Result<ConversionResult, String> {
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
        return Ok(ConversionResult {
            success: false,
            output_path: None,
            error: Some(format!(
                "dxf-converter.exe not found at: {}",
                exe_path.display()
            )),
        });
    }

    // Build command
    let mut cmd = Command::new(&exe_path);

    // Add input files
    for file in &input_files {
        cmd.arg("--input").arg(file);
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

    // Execute
    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute dxf-converter: {}", e))?;

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
