pub mod config;
pub mod bridge;

#[cfg(feature = "ghostty-link")]
pub mod ffi;

pub use config::GhosttyConfig;
