use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentNotification {
    pub id: String,
    pub agent: String,
    pub message: String,
    pub project_id: Option<String>,
    pub worktree_id: Option<String>,
    pub read: bool,
    pub timestamp: u64,
}

const AGENT_CONFIGS: &[(&str, &str)] = &[
    ("claude", "Claude Code"),
    ("opencode", "OpenCode"),
    ("codex", "Codex"),
    ("gemini", "Gemini CLI"),
    ("pi", "Pi"),
];

pub fn check_agent_notifications(data_dir: &PathBuf) -> Vec<AgentNotification> {
    let mut notifications = Vec::new();

    for (agent_id, agent_label) in AGENT_CONFIGS {
        let done_file = data_dir.join(format!(".{}-done", agent_id));
        if done_file.exists() {
            let content = fs::read_to_string(&done_file).unwrap_or_default();
            let message = if content.trim().is_empty() {
                format!("{} task completed", agent_label)
            } else {
                content.trim().to_string()
            };

            notifications.push(AgentNotification {
                id: uuid::Uuid::new_v4().to_string(),
                agent: agent_id.to_string(),
                message,
                project_id: None,
                worktree_id: None,
                read: false,
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs(),
            });

            let _ = fs::remove_file(&done_file);
        }
    }

    notifications
}

pub fn trigger_test_notification(
    data_dir: &PathBuf,
    agent: &str,
    message: &str,
) -> Result<(), String> {
    let valid_agents = ["claude", "opencode", "codex", "gemini", "pi"];
    if !valid_agents.contains(&agent) {
        return Err(format!(
            "Unknown agent: {}. Valid: {}",
            agent,
            valid_agents.join(", ")
        ));
    }
    let done_file = data_dir.join(format!(".{}-done", agent));
    fs::write(&done_file, message).map_err(|e| format!("Failed to write: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_check_agent_notifications_reads_file() {
        let dir = TempDir::new().unwrap();
        let done_file = dir.path().join(".claude-done");
        fs::write(&done_file, "task done").unwrap();
        let notifications = check_agent_notifications(&dir.path().to_path_buf());
        assert_eq!(notifications.len(), 1);
        assert_eq!(notifications[0].agent, "claude");
        assert_eq!(notifications[0].message, "task done");
    }

    #[test]
    fn test_check_agent_notifications_cleans_up() {
        let dir = TempDir::new().unwrap();
        let done_file = dir.path().join(".claude-done");
        fs::write(&done_file, "done").unwrap();
        let _ = check_agent_notifications(&dir.path().to_path_buf());
        assert!(!done_file.exists());
    }

    #[test]
    fn test_check_agent_notifications_empty_message() {
        let dir = TempDir::new().unwrap();
        let done_file = dir.path().join(".claude-done");
        fs::write(&done_file, "").unwrap();
        let notifications = check_agent_notifications(&dir.path().to_path_buf());
        assert_eq!(notifications.len(), 1);
        assert_eq!(notifications[0].message, "Claude Code task completed");
    }

    #[test]
    fn test_check_agent_notifications_none() {
        let dir = TempDir::new().unwrap();
        let notifications = check_agent_notifications(&dir.path().to_path_buf());
        assert!(notifications.is_empty());
    }

    #[test]
    fn test_trigger_test_notification_creates_file() {
        let dir = TempDir::new().unwrap();
        trigger_test_notification(&dir.path().to_path_buf(), "claude", "hello").unwrap();
        let done_file = dir.path().join(".claude-done");
        assert!(done_file.exists());
        assert_eq!(fs::read_to_string(&done_file).unwrap(), "hello");
    }

    #[test]
    fn test_trigger_test_notification_rejects_invalid() {
        let dir = TempDir::new().unwrap();
        let result = trigger_test_notification(&dir.path().to_path_buf(), "invalid_agent", "msg");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unknown agent"));
    }
}
