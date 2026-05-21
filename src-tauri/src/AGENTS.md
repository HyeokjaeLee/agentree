# Backend (src-tauri/src/)

## CONVENTIONS

- Commands = thin IPC wrappers. All logic in `services/`.
- Git ops use `Command::new("git")` — no git2 crate.
- Error type: `Result<T, String>` for Tauri commands.
- Models derive `Serialize`, `Deserialize`, `Clone` — shared with frontend via JSON.
- Ghostty module gated behind `ghostty-link` Cargo feature.

## TESTING

17 tests across 3 service files (all co-located in `#[cfg(test)] mod tests`):
- `services/git.rs`: 5 tests — branch CRUD, dirty detection
- `services/config.rs`: 6 tests — config I/O, setup scripts, env vars
- `services/notification.rs`: 6 tests — notification read/cleanup, agent detection

Run: `cargo test` from `src-tauri/`. Uses `tempfile::TempDir` for isolation.

## GOTCHAS

- `ffi.rs` has 5 `unsafe extern "C"` bindings — modify only with `// SAFETY:` docs
- `main.rs` has Windows console suppression comment — DO NOT REMOVE
- `lib.rs:38` uses `.expect()` — will panic on Tauri init failure
- `libghostty.dylib` bundled in `resources/` — not a standard dependency
