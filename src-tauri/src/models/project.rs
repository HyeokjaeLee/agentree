use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: PathBuf,
    pub label: Option<String>,
    pub branches: Vec<Branch>,
    #[serde(default)]
    pub remote_branches: Vec<String>,
    pub worktrees: Vec<Worktree>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Branch {
    pub id: String,
    pub name: String,
    pub label: Option<String>,
    pub project_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Worktree {
    pub id: String,
    pub branch: String,
    pub path: PathBuf,
    pub label: Option<String>,
    pub project_id: String,
    pub status: WorktreeStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WorktreeStatus {
    Clean,
    Dirty,
    Detached,
}
