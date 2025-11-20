//! Nesting Engine Module
//!
//! Provides strip packing nesting optimization for cutting parts.
//! This module integrates the sparrow/jagua-rs algorithms directly into Tauri.

mod nesting;
mod serializer;
mod terminator;

// Re-export public types
pub use nesting::{run_nesting, NestingConfig, NestingResult};
pub use serializer::{NestingOutput, PlacedItem};
pub use terminator::NativeTerminator;

use anyhow::Result;
use log::info;
use sparrow::util::listener::DummySolListener;
use sparrow::util::terminator::Terminator;
use std::time::Duration;

/// Input configuration for nesting from frontend
#[derive(Debug, Clone, serde::Deserialize)]
pub struct NestingInput {
    /// JSON string containing the sparroWASM problem definition
    pub json_input: String,
    /// Time limit in seconds (default: 300)
    pub time_limit: Option<u64>,
    /// Random seed for reproducibility
    pub seed: Option<u64>,
    /// Enable early termination when solution stabilizes
    pub use_early_termination: Option<bool>,
    /// Number of worker threads (default: 1)
    pub n_workers: Option<usize>,
}

/// Run nesting optimization - main entry point for Tauri
///
/// This function is synchronous/blocking and should be called via
/// `tauri::async_runtime::spawn_blocking` to avoid blocking the main thread.
///
/// # Arguments
/// * `input` - Nesting configuration from frontend
///
/// # Returns
/// * `Ok(NestingOutput)` - Successful nesting result with placed items
/// * `Err(String)` - Error message if nesting failed
///
/// # Example
/// ```rust
/// let input = NestingInput {
///     json_input: json_string,
///     time_limit: Some(60),
///     seed: None,
///     use_early_termination: Some(false),
///     n_workers: Some(1),
/// };
///
/// let result = run_nesting_engine(input)?;
/// println!("Placed {} items", result.total_items_placed);
/// ```
pub fn run_nesting_engine(input: NestingInput) -> Result<NestingOutput, String> {
    // Initialize logging (only once)
    let _ = init_logger();

    // DEBUG: Print raw input values
    println!("🔍 DEBUG: run_nesting_engine received:");
    println!("   - input.time_limit = {:?}", input.time_limit);
    println!("   - input.seed = {:?}", input.seed);
    println!("   - input.use_early_termination = {:?}", input.use_early_termination);
    println!("   - input.n_workers = {:?}", input.n_workers);

    info!("Starting nesting engine with time_limit={:?}s", input.time_limit);

    // Build configuration
    let config = NestingConfig {
        time_limit: input.time_limit.or(Some(300)),
        seed: input.seed,
        use_early_termination: input.use_early_termination.unwrap_or(false),
        n_workers: input.n_workers.unwrap_or(1),
    };

    println!("🔍 DEBUG: NestingConfig built:");
    println!("   - config.time_limit = {:?}", config.time_limit);

    // Create listener and terminator
    let mut listener = DummySolListener;
    let mut terminator = NativeTerminator::new();

    // CRITICAL: Set timeout on terminator - sparrow checks terminator.kill() but does NOT call new_timeout()
    // We must set it here for the timeout to work
    if let Some(time_limit) = config.time_limit {
        terminator.new_timeout(Duration::from_secs(time_limit));
        println!("⏱️ TIMEOUT SET: {} seconds from now", time_limit);
        println!("⏱️ Deadline: {:?}", terminator.timeout_at());
    }

    // Run core nesting algorithm
    let result = run_nesting(&input.json_input, &config, &mut listener, &mut terminator)
        .map_err(|e| format!("Nesting failed: {}", e))?;

    // Convert to serializable output
    let mut output = NestingOutput::from_solution(
        &result.solution,
        &result.instance,
        result.ext_instance.name.clone(),
        result.computation_time,
    );

    // Generate SVG visualization
    let svg_string = generate_svg(&result);
    output.svg_string = Some(svg_string);

    info!(
        "Nesting completed: {} items placed in {:.2}s",
        output.total_items_placed,
        output.computation_time_secs
    );

    Ok(output)
}

/// Initialize the logger (call once at startup)
fn init_logger() -> Result<(), log::SetLoggerError> {
    use std::sync::Once;
    static INIT: Once = Once::new();

    let mut result = Ok(());

    INIT.call_once(|| {
        result = fern::Dispatch::new()
            .format(|out, message, record| {
                out.finish(format_args!(
                    "[{}][{}] {}",
                    record.level(),
                    record.target(),
                    message
                ))
            })
            .level(log::LevelFilter::Info)
            .chain(std::io::stdout())
            .apply();
    });

    result
}

/// Generate SVG visualization of the nesting result
///
/// # Arguments
/// * `result` - The nesting result from `run_nesting`
///
/// # Returns
/// SVG string that can be displayed in frontend
pub fn generate_svg(result: &NestingResult) -> String {
    use jagua_rs::io::svg::s_layout_to_svg;
    use sparrow::consts::DRAW_OPTIONS;

    let svg = s_layout_to_svg(
        &result.solution.layout_snapshot,
        &result.instance,
        DRAW_OPTIONS,
        "",
    );

    let svg_string = svg.to_string();

    // Post-process SVG to add margin to viewBox
    // This fixes the issue where items at the edge of the strip get clipped
    expand_svg_viewbox(&svg_string, 50.0)
}

/// Expand SVG viewBox to add margin around the content
///
/// This fixes the visual issue where items placed at the edge of the strip
/// appear to be cut off in the SVG rendering.
fn expand_svg_viewbox(svg: &str, margin: f64) -> String {
    use regex::Regex;

    // Match viewBox="minX minY width height"
    let viewbox_re = Regex::new(r#"viewBox="([^"]+)""#).unwrap();

    if let Some(caps) = viewbox_re.captures(svg) {
        let viewbox_str = &caps[1];
        let parts: Vec<&str> = viewbox_str.split_whitespace().collect();

        if parts.len() == 4 {
            if let (Ok(min_x), Ok(min_y), Ok(width), Ok(height)) = (
                parts[0].parse::<f64>(),
                parts[1].parse::<f64>(),
                parts[2].parse::<f64>(),
                parts[3].parse::<f64>(),
            ) {
                // Expand viewBox by margin on all sides
                let new_min_x = min_x - margin;
                let new_min_y = min_y - margin;
                let new_width = width + 2.0 * margin;
                let new_height = height + 2.0 * margin;

                let new_viewbox = format!(
                    "viewBox=\"{} {} {} {}\"",
                    new_min_x, new_min_y, new_width, new_height
                );

                println!("📐 Expanded viewBox: {} → {}", viewbox_str,
                    format!("{} {} {} {}", new_min_x, new_min_y, new_width, new_height));

                return viewbox_re.replace(svg, new_viewbox.as_str()).to_string();
            }
        }
    }

    // Return original if we couldn't parse viewBox
    svg.to_string()
}
