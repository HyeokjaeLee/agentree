use crate::models::project::{Branch, Project, Worktree, WorktreeStatus};
use crate::services::git;
use serde::Deserialize;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct AddProjectPayload {
    pub path: String,
    pub label: Option<String>,
}

#[tauri::command]
pub async fn add_project(path: String, label: Option<String>) -> Result<Project, String> {
    tokio::task::spawn_blocking(move || {
        let repo_path = PathBuf::from(&path);
        if !repo_path.exists() {
            return Err(format!("Path does not exist: {}", path));
        }

        git::git_cmd(&repo_path, &["rev-parse", "--git-dir"])
            .map_err(|_| format!("Not a git repository: {}", path))?;

        let name = repo_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "Unknown".to_string());

        let branches = git::list_branches(&repo_path)?
            .into_iter()
            .map(|b| Branch {
                id: Uuid::new_v4().to_string(),
                name: b,
                label: None,
                project_id: String::new(),
            })
            .collect();

        let worktree_infos = git::list_worktrees(&repo_path)?;
        let worktrees = worktree_infos
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
            .collect();

        Ok(Project {
            id: Uuid::new_v4().to_string(),
            name,
            path: repo_path,
            label,
            branches,
            worktrees,
        })
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn refresh_project(project: Project) -> Result<Project, String> {
    tokio::task::spawn_blocking(move || {
        let repo_path = &project.path;
        let mut updated = project.clone();

        updated.branches = git::list_branches(repo_path)?
            .into_iter()
            .map(|b| Branch {
                id: Uuid::new_v4().to_string(),
                name: b,
                label: None,
                project_id: project.id.clone(),
            })
            .collect();

        let worktree_infos = git::list_worktrees(repo_path)?;
        updated.worktrees = worktree_infos
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
                    project_id: project.id.clone(),
                    status,
                }
            })
            .collect();

        Ok(updated)
    }).await.map_err(|e| e.to_string())?
}
