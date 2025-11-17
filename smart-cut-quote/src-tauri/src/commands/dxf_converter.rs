use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::Manager;

/// Input file with path and quantity
/// Frontend sends this struct instead of pre-formatted "PATH:QUANTITY" string
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DxfFileInput {
    pub path: String,
    pub quantity: u32,
}

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
/// Backend now handles path normalization and command building
#[tauri::command(rename_all = "camelCase")]
pub async fn convert_dxf_to_json(
    app_handle: tauri::AppHandle,
    input_files: Vec<DxfFileInput>,  // ✅ Changed: Now receives struct instead of pre-formatted strings
    output_path: String,
    options: ConversionOptions,
) -> Result<ConversionResult, String> {
    // Debug: Print received parameters
    println!("=== convert_dxf_to_json called (FIXED VERSION) ===");
    println!("Received {} files:", input_files.len());
    for (i, file) in input_files.iter().enumerate() {
        println!("  File {}: path='{}', quantity={}", i + 1, file.path, file.quantity);
    }
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

    // ✅ WORKAROUND: Call -i multiple times instead of using :quantity syntax
    // REASON: dxf-converter.exe has a bug parsing Windows absolute paths with :quantity
    // Example bug: "C:\Users\file.dxf:5" → split(':') → ["C", "\Users\file.dxf", "5"]
    //              dxf-converter only sees path="C" → Error: Input file not found: C
    //
    // WORKAROUND: Instead of "-i C:\file.dxf:5"
    //             Use: "-i C:\file.dxf -i C:\file.dxf -i C:\file.dxf -i C:\file.dxf -i C:\file.dxf"
    //
    // TODO: Fix dxf-converter.exe source to use lastIndexOf(':') instead of split(':')
    //       Repo: https://github.com/truyentu/converters-mvp

    println!("Building command arguments (using duplicate -i workaround):");
    for file_input in &input_files {
        // Step 1: Normalize path to Windows format (replace forward slashes with backslashes)
        // This ensures consistent Windows native paths
        let normalized_path = file_input.path.replace("/", "\\");

        // Step 2: Add -i flag multiple times based on quantity
        // Each call creates one instance in the output JSON
        println!("  Adding file: {} (quantity: {})", normalized_path, file_input.quantity);
        for i in 0..file_input.quantity {
            println!("    -i {} (copy {})", normalized_path, i + 1);
            cmd.arg("-i").arg(&normalized_path);
        }
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
