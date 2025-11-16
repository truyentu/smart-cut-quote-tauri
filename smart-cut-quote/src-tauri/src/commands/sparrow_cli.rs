use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::Manager;

#[derive(Deserialize, Debug)]
pub struct NestingOptions {
    pub timeout: u32,
    pub workers: u32,
}

#[derive(Serialize, Debug)]
pub struct NestingResult {
    pub success: bool,
    pub result_json: Option<String>,
    pub result_svg: Option<String>,
    pub error: Option<String>,
}

/// Run nesting optimization using sparrow-cli.exe
#[tauri::command]
pub async fn run_nesting(
    app_handle: tauri::AppHandle,
    input_json: String,
    output_json: String,
    output_svg: String,
    options: NestingOptions,
) -> Result<NestingResult, String> {
    // Resolve the path to sparrow-cli.exe
    let resource_path = app_handle
        .path()
        .resolve("binaries/sparrow-cli.exe", tauri::path::BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve sparrow-cli.exe path: {}", e))?;

    // Check if the executable exists (in dev mode, use relative path)
    let exe_path = if resource_path.exists() {
        resource_path
    } else {
        // Development mode: use relative path
        std::env::current_dir()
            .map_err(|e| format!("Failed to get current directory: {}", e))?
            .join("../../binaries/sparrow-cli.exe")
    };

    if !exe_path.exists() {
        return Ok(NestingResult {
            success: false,
            result_json: None,
            result_svg: None,
            error: Some(format!(
                "sparrow-cli.exe not found at: {}",
                exe_path.display()
            )),
        });
    }

    // Build command
    let mut cmd = Command::new(&exe_path);

    cmd.arg("--input")
        .arg(&input_json)
        .arg("--output")
        .arg(&output_json)
        .arg("--output-svg")
        .arg(&output_svg)
        .arg("--timeout")
        .arg(options.timeout.to_string())
        .arg("--workers")
        .arg(options.workers.to_string());

    // Execute
    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute sparrow-cli: {}", e))?;

    if output.status.success() {
        Ok(NestingResult {
            success: true,
            result_json: Some(output_json),
            result_svg: Some(output_svg),
            error: None,
        })
    } else {
        let error = String::from_utf8_lossy(&output.stderr).to_string();
        Ok(NestingResult {
            success: false,
            result_json: None,
            result_svg: None,
            error: Some(if error.is_empty() {
                "Unknown error occurred during nesting".to_string()
            } else {
                error
            }),
        })
    }
}
