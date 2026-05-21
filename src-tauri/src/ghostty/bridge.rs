use once_cell::sync::Lazy;
use std::path::PathBuf;

#[derive(Debug, Clone, serde::Serialize)]
pub enum GhosttyRuntime {
    Unavailable(String),
    ConfigOnly,
    Native,
}

static GHOSTTY_RUNTIME: Lazy<GhosttyRuntime> = Lazy::new(|| {
    if let Some(path) = find_library() {
        if verify_library_symbols(&path) {
            log::info!("Ghostty library found at {:?}", path);
            GhosttyRuntime::ConfigOnly
        } else {
            GhosttyRuntime::ConfigOnly
        }
    } else {
        GhosttyRuntime::Unavailable("libghostty.dylib not found".into())
    }
});

fn find_library() -> Option<PathBuf> {
    let candidates: Vec<Option<PathBuf>> = vec![
        std::env::current_exe().ok().and_then(|exe| {
            exe.parent()
                .map(|dir| dir.join("../Resources/libghostty.dylib"))
        }),
        std::env::current_exe().ok().and_then(|exe| {
            exe.parent()
                .map(|dir| dir.join("resources/libghostty.dylib"))
        }),
        Some(PathBuf::from("src-tauri/resources/libghostty.dylib")),
    ];

    for candidate in candidates.iter().flatten() {
        if candidate.exists() {
            return Some(
                candidate
                    .canonicalize()
                    .unwrap_or_else(|_| candidate.clone()),
            );
        }
    }
    None
}

fn verify_library_symbols(path: &PathBuf) -> bool {
    use std::process::Command;
    let output = Command::new("nm")
        .args(["-gU", &path.to_string_lossy()])
        .output();

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            stdout.contains("ghostty_config_new")
        }
        Err(_) => false,
    }
}

#[tauri::command]
pub fn ghostty_status() -> Result<String, String> {
    match &*GHOSTTY_RUNTIME {
        GhosttyRuntime::Native => Ok("native".into()),
        GhosttyRuntime::ConfigOnly => Ok("config-only".into()),
        GhosttyRuntime::Unavailable(e) => Err(e.clone()),
    }
}

#[tauri::command]
pub fn ghostty_runtime_info() -> Result<serde_json::Value, String> {
    let runtime = &*GHOSTTY_RUNTIME;
    Ok(serde_json::json!({
        "status": match runtime {
            GhosttyRuntime::Native => "native",
            GhosttyRuntime::ConfigOnly => "config-only",
            GhosttyRuntime::Unavailable(_) => "unavailable",
        },
        "library_path": find_library().map(|p| p.to_string_lossy().to_string()),
        "config_available": true,
        "message": match runtime {
            GhosttyRuntime::Native => "Full Ghostty runtime loaded",
            GhosttyRuntime::ConfigOnly => "Ghostty-compatible config/theme mode. Native rendering requires building libghostty from source.",
            GhosttyRuntime::Unavailable(e) => e,
        }
    }))
}
