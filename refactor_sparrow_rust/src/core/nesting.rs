// Platform-agnostic core nesting logic
use anyhow::{Context, Result};
use jagua_rs::io::import::Importer;
use jagua_rs::probs::spp::entities::{SPInstance, SPSolution};
use jagua_rs::probs::spp::io::ext_repr::ExtSPInstance;
use log::{info, warn};
use rand::SeedableRng;
use rand_xoshiro::Xoshiro256PlusPlus;
use sparrow::config::*;
use sparrow::consts::{
    DEFAULT_COMPRESS_TIME_RATIO, DEFAULT_EXPLORE_TIME_RATIO, DEFAULT_FAIL_DECAY_RATIO_CMPR,
    DEFAULT_MAX_CONSEQ_FAILS_EXPL,
};
use sparrow::optimizer::optimize;
use sparrow::util::listener::SolutionListener;
use sparrow::util::terminator::Terminator;
use std::time::Duration;

/// Configuration for nesting optimization
pub struct NestingConfig {
    pub time_limit: Option<u64>,
    pub seed: Option<u64>,
    pub use_early_termination: bool,
    pub n_workers: usize,
}

impl Default for NestingConfig {
    fn default() -> Self {
        Self {
            time_limit: Some(300), // 5 minutes default
            seed: None,
            use_early_termination: false,
            n_workers: 1,
        }
    }
}

/// Result of nesting optimization
pub struct NestingResult {
    pub solution: SPSolution,
    pub instance: SPInstance,
    pub ext_instance: ExtSPInstance,
    pub computation_time: Duration,
}

/// Core nesting function - platform-agnostic
/// This function contains all the core logic extracted from run_sparrow()
pub fn run_nesting<L: SolutionListener, T: Terminator>(
    json_str: &str,
    config: &NestingConfig,
    listener: &mut L,
    terminator: &mut T,
) -> Result<NestingResult> {
    let start_time = std::time::Instant::now();

    info!("Started nesting optimization");

    // Parse input JSON
    let ext_sp_instance: ExtSPInstance = serde_json::from_str(json_str)
        .context("not a valid strip packing instance (ExtSPInstance)")?;

    // Configure optimization parameters
    let mut sparrow_config = DEFAULT_SPARROW_CONFIG;

    let (explore_dur, compress_dur) = match config.time_limit {
        Some(time_limit) => (
            Duration::from_secs(time_limit).mul_f32(DEFAULT_EXPLORE_TIME_RATIO),
            Duration::from_secs(time_limit).mul_f32(DEFAULT_COMPRESS_TIME_RATIO),
        ),
        None => {
            warn!("[MAIN] no time limit specified, using default 600s");
            (
                Duration::from_secs(600).mul_f32(DEFAULT_EXPLORE_TIME_RATIO),
                Duration::from_secs(600).mul_f32(DEFAULT_COMPRESS_TIME_RATIO),
            )
        }
    };

    info!(
        "[MAIN] Configured to explore for {}s and compress for {}s",
        explore_dur.as_secs(),
        compress_dur.as_secs()
    );

    sparrow_config.expl_cfg.time_limit = explore_dur;
    sparrow_config.cmpr_cfg.time_limit = compress_dur;

    sparrow_config.expl_cfg.separator_config.n_workers = config.n_workers;
    sparrow_config.cmpr_cfg.separator_config.n_workers = config.n_workers;

    if config.use_early_termination {
        sparrow_config.expl_cfg.max_conseq_failed_attempts =
            Some(DEFAULT_MAX_CONSEQ_FAILS_EXPL);
        sparrow_config.cmpr_cfg.shrink_decay =
            ShrinkDecayStrategy::FailureBased(DEFAULT_FAIL_DECAY_RATIO_CMPR);
        warn!("[MAIN] early termination enabled!");
    }

    // Setup random number generator
    let rng = match config.seed {
        Some(seed) => {
            info!("[MAIN] using seed: {}", seed);
            Xoshiro256PlusPlus::seed_from_u64(seed)
        }
        None => {
            let seed = rand::random();
            warn!("[MAIN] no seed provided, using: {}", seed);
            Xoshiro256PlusPlus::seed_from_u64(seed)
        }
    };

    // Import instance
    let importer = Importer::new(
        sparrow_config.cde_config,
        sparrow_config.poly_simpl_tolerance,
        sparrow_config.min_item_separation,
        sparrow_config.narrow_concavity_cutoff_ratio,
    );
    let instance = jagua_rs::probs::spp::io::import(&importer, &ext_sp_instance)
        .context("Failed to import instance")?;

    info!(
        "[MAIN] loaded instance {} with #{} items",
        ext_sp_instance.name,
        instance.total_item_qty()
    );

    // Run optimization
    let solution = optimize(
        instance.clone(),
        rng,
        listener,
        terminator,
        &sparrow_config.expl_cfg,
        &sparrow_config.cmpr_cfg,
    );

    let computation_time = start_time.elapsed();

    info!(
        "[MAIN] Optimization completed in {:.2}s",
        computation_time.as_secs_f64()
    );

    Ok(NestingResult {
        solution,
        instance,
        ext_instance: ext_sp_instance,
        computation_time,
    })
}
