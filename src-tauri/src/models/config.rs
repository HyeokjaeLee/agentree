use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentreeConfig {
    #[serde(default)]
    pub label: Option<String>,
    #[serde(default)]
    pub setup: Vec<String>,
    #[serde(default)]
    pub teardown: Vec<String>,
}

impl Default for AgentreeConfig {
    fn default() -> Self {
        Self {
            label: None,
            setup: vec![],
            teardown: vec![],
        }
    }
}
