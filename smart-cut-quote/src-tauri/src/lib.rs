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
        Migration {
            version: 3,
            description: "Add cut_price_per_meter to material_stock for length-based pricing",
            sql: include_str!("../migrations/003_add_material_pricing.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "Add nesting settings and currency symbol",
            sql: include_str!("../migrations/004_add_nesting_settings.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "Add tasks table for workflow management",
            sql: include_str!("../migrations/005_add_tasks.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "Add production tracking and soft delete",
            sql: include_str!("../migrations/006_add_production_tracking.sql"),
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

/// Read DXF file content from disk
///
/// Used by DXF healing editor to load file for editing
#[tauri::command]
async fn read_dxf_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read DXF file '{}': {}", path, e))
}

/// Write DXF file content to disk
///
/// Used by DXF healing editor to save modified file
#[tauri::command]
async fn write_dxf_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content)
        .map_err(|e| format!("Failed to write DXF file '{}': {}", path, e))
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
            run_nesting_integrated,
            read_dxf_file,
            write_dxf_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
