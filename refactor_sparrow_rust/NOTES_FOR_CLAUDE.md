# Refactor Instructions
I want to integrate this Rust logic directly into my Tauri Application backend, removing the need for an external CLI EXE.

**Goal:** Create a local Rust module that I can call from a Tauri Command.

**Constraints:**
1. This will be used as a library dependency in a Tauri app.
2. Look at `src/bin/cli.rs` to understand how parameters are passed, but create a function `pub fn run_nesting(input: InputStruct) -> Result<OutputStruct>` instead of parsing CLI args.
3. KEEP the core nesting logic in `src/core/nesting.rs` unmodified to ensure algorithm stability.
4. Ensure `serde` structs in `serializer.rs` are public so I can use them in Tauri frontend.