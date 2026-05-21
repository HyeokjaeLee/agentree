use crate::models::project::Branch;
use crate::services::git;
use std::path::PathBuf;
use uuid::Uuid;

#[tauri::command]
pub async fn create_branch(project_path: String, name: String) -> Result<Branch, String> {
    tokio::task::spawn_blocking(move || {
        let path = PathBuf::from(&project_path);
        git::create_branch(&path, &name)?;
        Ok(Branch {
            id: Uuid::new_v4().to_string(),
            name,
            label: None,
            project_id: String::new(),
        })
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_branch(project_path: String, name: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let path = PathBuf::from(&project_path);
        git::delete_branch(&path, &name)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn switch_branch(
    project_path: String,
    worktree_path: Option<String>,
    branch: String,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let target = match worktree_path {
            Some(ref wt) => PathBuf::from(wt),
            None => PathBuf::from(&project_path),
        };
        git::checkout_branch(&target, &branch)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn list_branches(project_path: String) -> Result<Vec<Branch>, String> {
    tokio::task::spawn_blocking(move || {
        let path = PathBuf::from(&project_path);
        let names = git::list_branches(&path)?;
        Ok(names
            .into_iter()
            .map(|name| Branch {
                id: Uuid::new_v4().to_string(),
                name,
                label: None,
                project_id: String::new(),
            })
            .collect())
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn fetch_remote_branches(project_path: String) -> Result<Vec<String>, String> {
    tokio::task::spawn_blocking(move || {
        let path = PathBuf::from(&project_path);
        git::fetch_all(&path)?;
        git::list_remote_branches(&path)
    }).await.map_err(|e| e.to_string())?
}
