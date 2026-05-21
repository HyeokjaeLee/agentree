use std::fs;
use std::path::PathBuf;

const LABELS_FILE: &str = "labels.json";

fn labels_path() -> Result<PathBuf, String> {
    let data_dir = dirs::data_dir().ok_or("Cannot determine data directory")?;
    let dir = data_dir.join("agentree");
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(dir.join(LABELS_FILE))
}

fn load_labels() -> Result<std::collections::HashMap<String, String>, String> {
    let path = labels_path()?;
    if !path.exists() {
        return Ok(std::collections::HashMap::new());
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

fn save_labels(labels: &std::collections::HashMap<String, String>) -> Result<(), String> {
    let path = labels_path()?;
    let content = serde_json::to_string_pretty(labels).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_label(entity_type: String, entity_id: String, label: String) -> Result<(), String> {
    let mut labels = load_labels()?;
    let key = format!("{}:{}", entity_type, entity_id);
    labels.insert(key, label);
    save_labels(&labels)
}

#[tauri::command]
pub fn get_labels() -> Result<std::collections::HashMap<String, String>, String> {
    load_labels()
}

#[tauri::command]
pub fn remove_label(entity_type: String, entity_id: String) -> Result<(), String> {
    let mut labels = load_labels()?;
    let key = format!("{}:{}", entity_type, entity_id);
    labels.remove(&key);
    save_labels(&labels)
}
