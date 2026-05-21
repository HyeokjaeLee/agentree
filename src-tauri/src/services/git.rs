use std::process::Command;
use std::path::Path;

pub fn git_cmd(repo_path: &Path, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(repo_path)
        .output()
        .map_err(|e| format!("Failed to execute git: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("git {} failed: {}", args.join(" "), stderr));
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

pub fn list_branches(repo_path: &Path) -> Result<Vec<String>, String> {
    let output = git_cmd(repo_path, &["branch", "--format=%(refname:short)"])?;
    if output.is_empty() {
        return Ok(vec![]);
    }
    Ok(output.lines().map(|l| l.trim().to_string()).collect())
}

pub fn create_branch(repo_path: &Path, name: &str) -> Result<(), String> {
    git_cmd(repo_path, &["branch", name])?;
    Ok(())
}

pub fn delete_branch(repo_path: &Path, name: &str) -> Result<(), String> {
    git_cmd(repo_path, &["branch", "-D", name])?;
    Ok(())
}

pub struct WorktreeInfo {
    pub path: String,
    pub commit: String,
    pub branch: Option<String>,
}

pub fn list_worktrees(repo_path: &Path) -> Result<Vec<WorktreeInfo>, String> {
    let output = git_cmd(repo_path, &["worktree", "list", "--porcelain"])?;
    let mut worktrees = Vec::new();
    let mut current_path = String::new();
    let mut current_commit = String::new();
    let mut current_branch: Option<String> = None;

    for line in output.lines() {
        if line.starts_with("worktree ") {
            current_path = line.trim_start_matches("worktree ").to_string();
        } else if line.starts_with("HEAD ") {
            current_commit = line.trim_start_matches("HEAD ").to_string();
        } else if line.starts_with("branch ") {
            let branch = line.trim_start_matches("branch refs/heads/").to_string();
            current_branch = Some(branch);
        } else if line.is_empty() && !current_path.is_empty() {
            worktrees.push(WorktreeInfo {
                path: current_path.clone(),
                commit: current_commit.clone(),
                branch: current_branch.clone(),
            });
            current_path.clear();
            current_commit.clear();
            current_branch = None;
        }
    }

    if !current_path.is_empty() {
        worktrees.push(WorktreeInfo {
            path: current_path,
            commit: current_commit,
            branch: current_branch,
        });
    }

    Ok(worktrees)
}

pub fn create_worktree(
    repo_path: &Path,
    worktree_path: &str,
    branch: &str,
) -> Result<(), String> {
    let worktree_name = Path::new(worktree_path)
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Invalid worktree path".to_string())?;

    git_cmd(
        repo_path,
        &["worktree", "add", "-b", worktree_name, worktree_path, branch],
    )
    .map(|_| ())
}

pub fn remove_worktree(repo_path: &Path, worktree_path: &str) -> Result<(), String> {
    git_cmd(repo_path, &["worktree", "remove", worktree_path, "--force"]).map(|_| ())
}

pub fn checkout_branch(repo_path: &Path, branch: &str) -> Result<(), String> {
    git_cmd(repo_path, &["checkout", branch])?;
    Ok(())
}

pub fn is_dirty(repo_path: &Path) -> bool {
    git_cmd(repo_path, &["status", "--porcelain"])
        .map(|out| !out.is_empty())
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::process::Command;
    use tempfile::TempDir;

    fn init_repo() -> TempDir {
        let dir = TempDir::new().unwrap();
        Command::new("git")
            .args(["init"])
            .current_dir(dir.path())
            .output()
            .unwrap();
        Command::new("git")
            .args(["config", "user.email", "test@test.com"])
            .current_dir(dir.path())
            .output()
            .unwrap();
        Command::new("git")
            .args(["config", "user.name", "Test"])
            .current_dir(dir.path())
            .output()
            .unwrap();
        // Create initial commit so branch exists
        std::fs::write(dir.path().join("README.md"), "init").unwrap();
        Command::new("git")
            .args(["add", "."])
            .current_dir(dir.path())
            .output()
            .unwrap();
        Command::new("git")
            .args(["commit", "-m", "init"])
            .current_dir(dir.path())
            .output()
            .unwrap();
        dir
    }

    #[test]
    fn test_list_branches() {
        let repo = init_repo();
        let branches = list_branches(repo.path()).unwrap();
        assert!(!branches.is_empty());
        assert!(branches.iter().any(|b| b == "main" || b == "master"));
    }

    #[test]
    fn test_create_branch() {
        let repo = init_repo();
        create_branch(repo.path(), "test-branch").unwrap();
        let branches = list_branches(repo.path()).unwrap();
        assert!(branches.iter().any(|b| b == "test-branch"));
    }

    #[test]
    fn test_delete_branch() {
        let repo = init_repo();
        create_branch(repo.path(), "to-delete").unwrap();
        delete_branch(repo.path(), "to-delete").unwrap();
        let branches = list_branches(repo.path()).unwrap();
        assert!(!branches.iter().any(|b| b == "to-delete"));
    }

    #[test]
    fn test_is_dirty_clean() {
        let repo = init_repo();
        assert!(!is_dirty(repo.path()));
    }

    #[test]
    fn test_git_cmd_invalid_args() {
        let repo = init_repo();
        let result = git_cmd(repo.path(), &["nonexistent-subcommand-xyz"]);
        assert!(result.is_err());
    }
}
