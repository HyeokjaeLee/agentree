use crate::models::config::AgentreeConfig;
use crate::services::config;

#[tauri::command]
pub fn read_config(project_path: String) -> Result<AgentreeConfig, String> {
    let path = std::path::PathBuf::from(&project_path);
    config::read_project_config(&path)
}

#[tauri::command]
pub fn write_config(project_path: String, config: AgentreeConfig) -> Result<(), String> {
    let path = std::path::PathBuf::from(&project_path);
    config::write_project_config(&path, &config)
}
