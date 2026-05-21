use crate::models::project::Project;
use std::fs;
use std::path::PathBuf;

const STATE_FILE: &str = "agentree-state.json";

fn state_path() -> Result<PathBuf, String> {
    let data_dir = dirs::data_dir().ok_or("Cannot determine data directory")?;
    let dir = data_dir.join("agentree");
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(dir.join(STATE_FILE))
}

#[tauri::command]
pub fn save_app_state(projects: Vec<Project>) -> Result<(), String> {
    let path = state_path()?;
    let content = serde_json::to_string_pretty(&projects).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_app_state() -> Result<Vec<Project>, String> {
    let path = state_path()?;
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}
