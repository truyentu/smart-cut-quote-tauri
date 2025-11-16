// Commands module for external executables
mod commands;

use commands::dxf_converter::convert_dxf_to_json;
use commands::sparrow_cli::run_nesting;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            convert_dxf_to_json,
            run_nesting
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
