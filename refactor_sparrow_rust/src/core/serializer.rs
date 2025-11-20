// JSON output serialization for CLI
use jagua_rs::probs::spp::entities::{SPInstance, SPSolution};
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize)]
pub struct NestingOutput {
    pub instance_name: String,
    pub strip_width: f64,
    pub strip_height: f64,
    pub total_items_placed: usize,
    pub layouts: Vec<PlacedItem>,
    pub utilization: f64,
    pub computation_time_secs: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub items_requested: Option<usize>,
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub unplaced_item_ids: Vec<usize>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlacedItem {
    pub item_id: usize,
    pub rotation_degrees: f64,
    pub position_x: f64,
    pub position_y: f64,
}

impl NestingOutput {
    /// Create output from solution and instance
    pub fn from_solution(
        solution: &SPSolution,
        instance: &SPInstance,
        instance_name: String,
        computation_time: Duration,
    ) -> Self {
        let strip_width = solution.strip_width() as f64;
        let strip_height = instance.base_strip.fixed_height as f64;

        // Extract placed items from solution
        let mut layouts = Vec::new();
        let layout_snapshot = &solution.layout_snapshot;

        for (_key, placed_item) in layout_snapshot.placed_items.iter() {
            let item_id = placed_item.item_id;
            let d_transf = &placed_item.d_transf;

            // Extract rotation in degrees
            // Note: rotation() returns f32 in radians
            let rotation_degrees = d_transf.rotation().to_degrees() as f64;

            // Extract position (translation vector)
            // Note: translation() returns (f32, f32) tuple
            let (pos_x, pos_y) = d_transf.translation();
            let position_x = pos_x as f64;
            let position_y = pos_y as f64;

            layouts.push(PlacedItem {
                item_id,
                rotation_degrees,
                position_x,
                position_y,
            });
        }

        let total_items_placed = layouts.len();

        // Calculate total area of all items
        // Note: SPInstance stores items as Vec<(Item, quantity)>
        let total_item_area: f64 = instance.items
            .iter()
            .map(|(item, qty)| {
                item.shape_orig.area() as f64 * (*qty as f64)
            })
            .sum();

        // Calculate utilization
        let strip_area = strip_width * strip_height;
        let utilization = if strip_area > 0.0 {
            total_item_area / strip_area
        } else {
            0.0
        };

        // Determine status
        let total_requested = instance.total_item_qty();
        let status = if total_items_placed < total_requested {
            Some("partial".to_string())
        } else {
            Some("complete".to_string())
        };

        // Count how many of each item was placed
        let mut placed_counts: std::collections::HashMap<usize, usize> =
            std::collections::HashMap::new();
        for placed_item in layouts.iter() {
            *placed_counts.entry(placed_item.item_id).or_insert(0) += 1;
        }

        // Find unplaced items by comparing placed count vs requested quantity
        let mut unplaced_item_ids = Vec::new();
        for (item, requested_qty) in instance.items.iter() {
            let placed_qty = placed_counts.get(&item.id).copied().unwrap_or(0);
            let unplaced_qty = requested_qty.saturating_sub(placed_qty);

            // Add item_id for each unplaced instance
            for _ in 0..unplaced_qty {
                unplaced_item_ids.push(item.id);
            }
        }

        Self {
            instance_name,
            strip_width,
            strip_height,
            total_items_placed,
            layouts,
            utilization,
            computation_time_secs: computation_time.as_secs_f64(),
            status,
            items_requested: Some(total_requested),
            unplaced_item_ids,
        }
    }
}
