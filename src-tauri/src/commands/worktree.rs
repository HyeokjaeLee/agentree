use crate::models::project::{Worktree, WorktreeStatus};
use crate::services::{config, git};
use std::path::PathBuf;
use uuid::Uuid;

#[tauri::command]
pub async fn create_worktree(
    project_path: String,
    branch: String,
    label: Option<String>,
    worktree_name: Option<String>,
) -> Result<Worktree, String> {
    tokio::task::spawn_blocking(move || {
        let repo_path = PathBuf::from(&project_path);
        let worktree_dir_name = match worktree_name {
            Some(ref name) => name.clone(),
            None => format!("{}-{}", branch.replace('/', "-"), Uuid::new_v4().as_simple()),
        };
        let parent = repo_path.parent().ok_or("Cannot determine parent dir")?;
        let worktree_path = parent.join(&worktree_dir_name);

        git::create_worktree(&repo_path, worktree_path.to_str().unwrap_or(""), &branch)?;

        let agentree_config = config::read_project_config(&repo_path).unwrap_or_default();
        if !agentree_config.setup.is_empty() {
            config::execute_setup_scripts(
                &repo_path,
                &worktree_path,
                &agentree_config.setup,
                &worktree_dir_name,
            )?;
        }

        Ok(Worktree {
            id: Uuid::new_v4().to_string(),
            branch,
            path: worktree_path,
            label,
            project_id: String::new(),
            status: WorktreeStatus::Clean,
        })
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn remove_worktree(project_path: String, worktree_path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let repo_path = PathBuf::from(&project_path);
        let wt_path = PathBuf::from(&worktree_path);

        let agentree_config = config::read_project_config(&repo_path).unwrap_or_default();
        if !agentree_config.teardown.is_empty() {
            let wt_name = wt_path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();
            let _ = config::execute_teardown_scripts(
                &repo_path,
                &wt_path,
                &agentree_config.teardown,
                &wt_name,
            );
        }

        git::remove_worktree(&repo_path, &worktree_path)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn list_worktrees(project_path: String) -> Result<Vec<Worktree>, String> {
    tokio::task::spawn_blocking(move || {
        let repo_path = PathBuf::from(&project_path);
        let infos = git::list_worktrees(&repo_path)?;
        Ok(infos
            .into_iter()
            .map(|wt| {
                let wt_path = PathBuf::from(&wt.path);
                let status = if wt.branch.is_none() {
                    WorktreeStatus::Detached
                } else if git::is_dirty(&wt_path) {
                    WorktreeStatus::Dirty
                } else {
                    WorktreeStatus::Clean
                };
                Worktree {
                    id: Uuid::new_v4().to_string(),
                    branch: wt.branch.unwrap_or_default(),
                    path: wt_path,
                    label: None,
                    project_id: String::new(),
                    status,
                }
            })
            .collect())
    }).await.map_err(|e| e.to_string())?
}
