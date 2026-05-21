use crate::models::config::AgentreeConfig;
use std::fs;
use std::path::Path;

const CONFIG_DIR: &str = ".agentree";
const CONFIG_FILE: &str = "config.json";

pub fn read_project_config(project_path: &Path) -> Result<AgentreeConfig, String> {
    let config_path = project_path.join(CONFIG_DIR).join(CONFIG_FILE);
    if !config_path.exists() {
        return Ok(AgentreeConfig::default());
    }
    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))
}

pub fn write_project_config(
    project_path: &Path,
    config: &AgentreeConfig,
) -> Result<(), String> {
    let config_dir = project_path.join(CONFIG_DIR);
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config dir: {}", e))?;
    }
    let config_path = config_dir.join(CONFIG_FILE);
    let content =
        serde_json::to_string_pretty(config).map_err(|e| format!("Failed to serialize: {}", e))?;
    fs::write(&config_path, content).map_err(|e| format!("Failed to write config: {}", e))
}

pub fn execute_setup_scripts(
    project_path: &Path,
    worktree_path: &Path,
    scripts: &[String],
    workspace_name: &str,
) -> Result<(), String> {
    let mut errors: Vec<String> = Vec::new();
    for script in scripts {
        let script_path = project_path.join(script);
        if !script_path.exists() {
            log::warn!("Setup script not found: {:?}", script_path);
            continue;
        }

        let output = std::process::Command::new("bash")
            .arg(&script_path)
            .current_dir(worktree_path)
            .env("AGENTREE_WORKSPACE_NAME", workspace_name)
            .env("AGENTREE_ROOT_PATH", project_path)
            .env("AGENTREE_WORKSPACE_PATH", worktree_path)
            .output()
            .map_err(|e| format!("Failed to run setup script '{}': {}", script, e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            log::error!("Setup script '{}' failed: {}", script, stderr);
            errors.push(format!("Setup script '{}' failed: {}", script, stderr.trim()));
        }
    }
    if !errors.is_empty() {
        return Err(errors.join("; "));
    }
    Ok(())
}

pub fn execute_teardown_scripts(
    project_path: &Path,
    worktree_path: &Path,
    scripts: &[String],
    workspace_name: &str,
) -> Result<(), String> {
    for script in scripts {
        let script_path = project_path.join(script);
        if !script_path.exists() {
            continue;
        }

        let result = std::process::Command::new("bash")
            .arg(&script_path)
            .current_dir(worktree_path)
            .env("AGENTREE_WORKSPACE_NAME", workspace_name)
            .env("AGENTREE_ROOT_PATH", project_path)
            .env("AGENTREE_WORKSPACE_PATH", worktree_path)
            .output();

        if let Ok(output) = result {
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                log::error!("Teardown script '{}' failed: {}", script, stderr);
            }
        } else {
            log::error!("Teardown script '{}' failed to execute", script);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_read_project_config_valid() {
        let dir = TempDir::new().unwrap();
        let config_dir = dir.path().join(CONFIG_DIR);
        fs::create_dir_all(&config_dir).unwrap();
        fs::write(
            config_dir.join(CONFIG_FILE),
            r#"{"label":"test","setup":["a.sh"],"teardown":[]}"#,
        )
        .unwrap();
        let config = read_project_config(dir.path()).unwrap();
        assert_eq!(config.label.as_deref(), Some("test"));
        assert_eq!(config.setup, vec!["a.sh"]);
    }

    #[test]
    fn test_read_project_config_missing() {
        let dir = TempDir::new().unwrap();
        let config = read_project_config(dir.path()).unwrap();
        assert!(config.label.is_none());
        assert!(config.setup.is_empty());
        assert!(config.teardown.is_empty());
    }

    #[test]
    fn test_write_project_config_creates_dir() {
        let dir = TempDir::new().unwrap();
        let config = AgentreeConfig {
            label: Some("hello".into()),
            setup: vec![],
            teardown: vec![],
        };
        write_project_config(dir.path(), &config).unwrap();
        let config_path = dir.path().join(CONFIG_DIR).join(CONFIG_FILE);
        assert!(config_path.exists());
        let roundtrip = read_project_config(dir.path()).unwrap();
        assert_eq!(roundtrip.label.as_deref(), Some("hello"));
    }

    #[test]
    fn test_execute_setup_scripts_success() {
        let dir = TempDir::new().unwrap();
        let script_path = dir.path().join("ok.sh");
        fs::write(
            &script_path,
            "#!/bin/bash\necho $AGENTREE_WORKSPACE_NAME > /dev/null\necho $AGENTREE_ROOT_PATH > /dev/null\necho $AGENTREE_WORKSPACE_PATH > /dev/null\n",
        )
        .unwrap();
        let scripts = vec!["ok.sh".to_string()];
        let result = execute_setup_scripts(dir.path(), dir.path(), &scripts, "ws");
        assert!(result.is_ok());
    }

    #[test]
    fn test_execute_setup_scripts_failure() {
        let dir = TempDir::new().unwrap();
        let script_path = dir.path().join("fail.sh");
        fs::write(&script_path, "#!/bin/bash\nexit 1\n").unwrap();
        let scripts = vec!["fail.sh".to_string()];
        let result = execute_setup_scripts(dir.path(), dir.path(), &scripts, "ws");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("fail.sh"));
    }

    #[test]
    fn test_execute_setup_scripts_missing_skipped() {
        let dir = TempDir::new().unwrap();
        let scripts = vec!["nonexistent.sh".to_string()];
        let result = execute_setup_scripts(dir.path(), dir.path(), &scripts, "ws");
        assert!(result.is_ok());
    }

    #[test]
    fn test_execute_setup_scripts_env_vars() {
        let dir = TempDir::new().unwrap();
        let out_file = dir.path().join("env_out.txt");
        let script_path = dir.path().join("check_env.sh");
        fs::write(
            &script_path,
            format!(
                "#!/bin/bash\necho \"$AGENTREE_WORKSPACE_NAME\" > {}\n",
                out_file.display()
            ),
        )
        .unwrap();
        let scripts = vec!["check_env.sh".to_string()];
        execute_setup_scripts(dir.path(), dir.path(), &scripts, "my-ws").unwrap();
        let content = fs::read_to_string(&out_file).unwrap();
        assert_eq!(content.trim(), "my-ws");
    }
}
