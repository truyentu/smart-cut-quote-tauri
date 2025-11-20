//! Native terminator implementation for Tauri
//!
//! Provides a way to terminate the optimization algorithm from outside.
//! Supports both external termination signals and timeout-based termination.

use sparrow::util::terminator::Terminator;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};

// Debug flag to print timeout message only once
use std::sync::atomic::AtomicUsize;
static TIMEOUT_PRINTED: AtomicUsize = AtomicUsize::new(0);

/// Native terminator for desktop/Tauri environment
///
/// This implements the `Terminator` trait from sparrow, allowing
/// both external cancellation and timeout-based termination.
///
/// The terminator checks two conditions:
/// 1. External stop signal (via AtomicBool)
/// 2. Timeout deadline (via RwLock<Option<Instant>>)
#[derive(Clone)]
pub struct NativeTerminator {
    /// Shared flag indicating if termination was requested externally
    stop: Arc<AtomicBool>,
    /// Deadline for timeout-based termination
    deadline: Arc<RwLock<Option<Instant>>>,
}

impl NativeTerminator {
    /// Create a new terminator
    pub fn new() -> Self {
        Self {
            stop: Arc::new(AtomicBool::new(false)),
            deadline: Arc::new(RwLock::new(None)),
        }
    }

    /// Request termination of the optimization
    ///
    /// Call this from another thread to stop the optimization gracefully.
    pub fn terminate(&self) {
        self.stop.store(true, Ordering::SeqCst);
    }

    /// Check if termination was requested (either by signal or timeout)
    pub fn is_terminated(&self) -> bool {
        // Check external stop signal
        if self.stop.load(Ordering::SeqCst) {
            return true;
        }

        // Check timeout deadline
        if let Ok(deadline) = self.deadline.read() {
            if let Some(timeout) = *deadline {
                return Instant::now() > timeout;
            }
        }

        false
    }

    /// Reset the terminator for reuse
    pub fn reset(&self) {
        self.stop.store(false, Ordering::SeqCst);
        if let Ok(mut deadline) = self.deadline.write() {
            *deadline = None;
        }
    }

    /// Get a clone of the terminator that can be shared across threads
    pub fn get_handle(&self) -> NativeTerminator {
        self.clone()
    }
}

impl Default for NativeTerminator {
    fn default() -> Self {
        Self::new()
    }
}

impl Terminator for NativeTerminator {
    /// Check if termination condition is met
    ///
    /// Returns true if:
    /// - External stop signal was set, OR
    /// - Timeout deadline has passed
    fn kill(&self) -> bool {
        // Check external stop signal
        if self.stop.load(Ordering::SeqCst) {
            return true;
        }

        // Check timeout deadline
        if let Ok(deadline) = self.deadline.read() {
            if let Some(timeout) = *deadline {
                if Instant::now() > timeout {
                    // Print only once
                    let count = TIMEOUT_PRINTED.fetch_add(1, Ordering::SeqCst);
                    if count == 0 {
                        println!("🛑 TIME UP! Stopping optimization...");
                    }
                    // Print every 100 calls to show it's being checked
                    if count % 100 == 0 && count > 0 {
                        println!("🛑 kill() returned true {} times", count);
                    }
                    return true;
                }
            }
        }

        false
    }

    /// Set a new timeout duration
    ///
    /// The optimization will terminate after this duration has elapsed.
    ///
    /// NOTE: We intentionally IGNORE this call from sparrow's optimizer because
    /// sparrow tries to set separate timeouts for exploration and compression phases.
    /// We want a single global timeout that applies to the entire optimization.
    fn new_timeout(&mut self, duration: Duration) {
        // Check if deadline is already set - if so, IGNORE this call
        // This prevents sparrow from resetting our global timeout
        if let Ok(deadline) = self.deadline.read() {
            if deadline.is_some() {
                println!("⏱️ new_timeout() called with {:?} - IGNORED (deadline already set)", duration);
                return;
            }
        }

        println!("⏱️ new_timeout() called with duration: {:?}", duration);
        if let Ok(mut deadline) = self.deadline.write() {
            *deadline = Some(Instant::now() + duration);
            println!("⏱️ New deadline set: {:?}", *deadline);
        }
    }

    /// Get the timeout deadline instant
    fn timeout_at(&self) -> Option<Instant> {
        self.deadline.read().ok().and_then(|d| *d)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_terminator_default_state() {
        let term = NativeTerminator::new();
        assert!(!term.is_terminated());
        assert!(!term.kill());
    }

    #[test]
    fn test_terminator_signal() {
        let term = NativeTerminator::new();
        term.terminate();
        assert!(term.is_terminated());
        assert!(term.kill());
    }

    #[test]
    fn test_terminator_reset() {
        let term = NativeTerminator::new();
        term.terminate();
        assert!(term.is_terminated());
        term.reset();
        assert!(!term.is_terminated());
    }

    #[test]
    fn test_terminator_clone() {
        let term1 = NativeTerminator::new();
        let term2 = term1.get_handle();

        term1.terminate();
        assert!(term2.is_terminated());
    }

    #[test]
    fn test_terminator_timeout() {
        let mut term = NativeTerminator::new();

        // Set a very short timeout (1ms)
        term.new_timeout(Duration::from_millis(1));

        // Should not be terminated immediately
        assert!(term.timeout_at().is_some());

        // Wait for timeout
        std::thread::sleep(Duration::from_millis(10));

        // Should be terminated after timeout
        assert!(term.kill());
    }

    #[test]
    fn test_terminator_no_timeout() {
        let term = NativeTerminator::new();

        // No timeout set
        assert!(term.timeout_at().is_none());
        assert!(!term.kill());
    }
}
