mod status;

// Core module - shared between WASM and native
pub mod core;

// WASM-specific modules
#[cfg(target_arch = "wasm32")]
mod logger;
#[cfg(target_arch = "wasm32")]
mod sparrow;
#[cfg(target_arch = "wasm32")]
mod svg_exporter;
#[cfg(target_arch = "wasm32")]
mod terminator;

// Native-specific modules
#[cfg(not(target_arch = "wasm32"))]
pub mod native;

#[cfg(target_arch = "wasm32")]
pub use logger::init_logger;
#[cfg(target_arch = "wasm32")]
pub use sparrow::run_sparrow;
#[cfg(target_arch = "wasm32")]
pub use svg_exporter::WasmSvgExporter;
#[cfg(target_arch = "wasm32")]
pub use terminator::WasmTerminator;
#[cfg(target_arch = "wasm32")]
pub use wasm_bindgen_rayon::init_thread_pool;