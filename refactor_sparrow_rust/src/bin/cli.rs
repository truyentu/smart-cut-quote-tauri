// CLI binary for sparroWASM nesting engine
use anyhow::{Context, Result};
use clap::Parser;
use jagua_rs::io::svg::s_layout_to_svg;
use log::{info, warn, LevelFilter};
use sparrow::consts::DRAW_OPTIONS;
use sparrow::util::listener::DummySolListener;
use sparroWASM::core::nesting::{run_nesting, NestingConfig};
use sparroWASM::core::serializer::NestingOutput;
use sparroWASM::native::logger;
use sparroWASM::native::terminator::NativeTerminator;
use std::fs;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "sparrow-cli")]
#[command(about = "CLI tool for strip packing nesting optimization", long_about = None)]
struct Args {
    /// Input JSON file path
    #[arg(short, long)]
    input: PathBuf,

    /// Output JSON file path
    #[arg(short, long)]
    output: PathBuf,

    /// Output SVG file path (optional)
    #[arg(long)]
    output_svg: Option<PathBuf>,

    /// Timeout in seconds (default: 300)
    #[arg(short = 't', long, default_value = "300")]
    timeout: u64,

    /// Random seed (optional, for reproducible results)
    #[arg(short, long)]
    seed: Option<u64>,

    /// Number of worker threads (default: 1)
    #[arg(short = 'w', long, default_value = "1")]
    workers: usize,

    /// Enable verbose logging
    #[arg(short, long)]
    verbose: bool,

    /// Enable early termination
    #[arg(short = 'e', long)]
    early_termination: bool,
}

fn main() -> Result<()> {
    let args = Args::parse();

    // Initialize logger
    // Default to Info to show optimization progress, use Warn with --verbose for debugging
    let log_level = if args.verbose {
        LevelFilter::Debug
    } else {
        LevelFilter::Info
    };

    logger::init_logger(log_level)
        .map_err(|e| anyhow::anyhow!("Failed to initialize logger: {}", e))?;

    println!("=== Sparrow Nesting CLI ===");
    println!("Reading input from: {}", args.input.display());

    // Read input JSON
    let input_content = fs::read_to_string(&args.input)
        .with_context(|| format!("Failed to read input file: {}", args.input.display()))?;

    info!("Input file read successfully ({} bytes)", input_content.len());

    // Parse to validate JSON format
    let _validation: serde_json::Value = serde_json::from_str(&input_content)
        .context("Input file is not valid JSON")?;

    // Create nesting configuration
    let config = NestingConfig {
        time_limit: Some(args.timeout),
        seed: args.seed,
        use_early_termination: args.early_termination,
        n_workers: args.workers,
    };

    // Display configuration
    println!("Configuration:");
    println!("  - Timeout: {}s", args.timeout);
    println!("  - Workers: {}", args.workers);
    println!("  - Early termination: {}", args.early_termination);
    if let Some(seed) = args.seed {
        println!("  - Seed: {}", seed);
    }
    println!();

    // Run nesting optimization
    println!("Starting nesting optimization...");
    info!("Phase: Exploration + Compression");

    let mut terminator = NativeTerminator::new();
    let result = run_nesting(
        &input_content,
        &config,
        &mut DummySolListener,
        &mut terminator,
    )?;

    println!("Optimization completed!");
    println!();

    // Create output
    let output = NestingOutput::from_solution(
        &result.solution,
        &result.instance,
        result.ext_instance.name.clone(),
        result.computation_time,
    );

    // Display summary
    println!("=== Results ===");
    println!("Instance: {}", output.instance_name);
    println!("Strip dimensions: {:.2} × {:.2}", output.strip_width, output.strip_height);
    println!("Items placed: {} / {}", output.total_items_placed, output.items_requested.unwrap_or(0));
    println!("Utilization: {:.1}%", output.utilization * 100.0);
    println!("Computation time: {:.2}s", output.computation_time_secs);

    if let Some(status) = &output.status {
        println!("Status: {}", status);
        if status == "partial" && !output.unplaced_item_ids.is_empty() {
            warn!(
                "Warning: Could not place all items. Unplaced item IDs: {:?}",
                output.unplaced_item_ids
            );
            println!("⚠ Warning: Could not place all items ({} unplaced)", output.unplaced_item_ids.len());
        }
    }
    println!();

    // Write JSON output
    println!("Writing output to: {}", args.output.display());
    let output_json = serde_json::to_string_pretty(&output)
        .context("Failed to serialize output to JSON")?;

    fs::write(&args.output, output_json)
        .with_context(|| format!("Failed to write output file: {}", args.output.display()))?;

    info!("JSON output written successfully");

    // Write SVG output if requested
    if let Some(svg_path) = args.output_svg {
        println!("Writing SVG to: {}", svg_path.display());

        let svg_content = s_layout_to_svg(
            &result.solution.layout_snapshot,
            &result.instance,
            DRAW_OPTIONS,
            &output.instance_name,
        )
        .to_string();

        fs::write(&svg_path, svg_content)
            .with_context(|| format!("Failed to write SVG file: {}", svg_path.display()))?;

        info!("SVG output written successfully");
    }

    println!();
    println!("✓ Success! Total time: {:.2}s", result.computation_time.as_secs_f64());

    Ok(())
}
