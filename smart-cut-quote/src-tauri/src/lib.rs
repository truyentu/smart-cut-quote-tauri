// Commands module for external executables
mod commands;

// Integrated nesting engine (replaces sparrow-cli.exe)
pub mod nesting_engine;

use commands::dxf_converter::convert_dxf_to_json;
use commands::sparrow_cli::run_nesting;
use tauri_plugin_sql::{Migration, MigrationKind};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Get database migrations
fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "Initial schema with all tables",
            sql: include_str!("../migrations/001_initial_schema.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "Simplify operations to only Bending",
            sql: include_str!("../migrations/002_simplify_operations.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

/// Run nesting optimization using integrated engine
///
/// This replaces the old CLI-based approach with direct function call.
/// Should be called via spawn_blocking for long-running operations.
#[tauri::command]
async fn run_nesting_integrated(
    input: nesting_engine::NestingInput,
) -> Result<nesting_engine::NestingOutput, String> {
    // Run in blocking thread to avoid freezing UI
    tauri::async_runtime::spawn_blocking(move || {
        nesting_engine::run_nesting_engine(input)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:smart_cut_quote.db", get_migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            greet,
            convert_dxf_to_json,
            run_nesting,
            run_nesting_integrated
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
