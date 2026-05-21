use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GhosttyConfig {
    pub font_family: String,
    pub font_size: u16,
    pub theme: String,
    pub cursor_style: String,
    pub cursor_blink: bool,
    pub background: String,
    pub foreground: String,
    pub palette: HashMap<String, String>,
    pub scrollback_limit: u32,
    pub copy_on_select: bool,
    pub confirm_close_surface: bool,
    pub window_padding_x: u16,
    pub window_padding_y: u16,
    pub macos_titlebar_style: String,
}

impl Default for GhosttyConfig {
    fn default() -> Self {
        let mut palette = HashMap::new();
        palette.insert("black".into(), "#0b0e11".into());
        palette.insert("red".into(), "#f6465d".into());
        palette.insert("green".into(), "#0ecb81".into());
        palette.insert("yellow".into(), "#fcd535".into());
        palette.insert("blue".into(), "#3b82f6".into());
        palette.insert("magenta".into(), "#2dbdb6".into());
        palette.insert("cyan".into(), "#2dbdb6".into());
        palette.insert("white".into(), "#eaecef".into());
        palette.insert("bright_black".into(), "#707a8a".into());
        palette.insert("bright_red".into(), "#f6465d".into());
        palette.insert("bright_green".into(), "#0ecb81".into());
        palette.insert("bright_yellow".into(), "#fcd535".into());
        palette.insert("bright_blue".into(), "#3b82f6".into());
        palette.insert("bright_magenta".into(), "#2dbdb6".into());
        palette.insert("bright_cyan".into(), "#2dbdb6".into());
        palette.insert("bright_white".into(), "#eaecef".into());

        Self {
            font_family: "Goorm Sans Code".into(),
            font_size: 14,
            theme: "agentree".into(),
            cursor_style: "bar".into(),
            cursor_blink: true,
            background: "#0b0e11".into(),
            foreground: "#eaecef".into(),
            palette,
            scrollback_limit: 10000,
            copy_on_select: false,
            confirm_close_surface: false,
            window_padding_x: 8,
            window_padding_y: 8,
            macos_titlebar_style: "native".into(),
        }
    }
}

impl GhosttyConfig {
    pub fn load() -> Self {
        let config_paths = Self::config_paths();
        for path in &config_paths {
            if path.exists() {
                if let Ok(content) = fs::read_to_string(path) {
                    return Self::parse_ghostty_config(&content);
                }
            }
        }
        Self::default()
    }

    fn config_paths() -> Vec<PathBuf> {
        let mut paths = Vec::new();
        if let Some(home) = dirs::home_dir() {
            paths.push(home.join(".config/ghostty/config"));
        }
        if let Some(config_dir) = dirs::config_dir() {
            paths.push(config_dir.join("ghostty/config"));
        }
        paths
    }

    fn parse_ghostty_config(content: &str) -> Self {
        let mut config = Self::default();
        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            let parts: Vec<&str> = line.splitn(2, '=').collect();
            if parts.len() != 2 {
                continue;
            }
            let key = parts[0].trim();
            let value = parts[1].trim();

            match key {
                "font-family" => config.font_family = value.into(),
                "font-size" => {
                    if let Ok(size) = value.parse() {
                        config.font_size = size;
                    }
                }
                "theme" => config.theme = value.into(),
                "cursor-style" => config.cursor_style = value.into(),
                "cursor-style-blink" => config.cursor_blink = value == "true",
                "background" => config.background = value.into(),
                "foreground" => config.foreground = value.into(),
                "scrollback-limit" => {
                    if let Ok(limit) = value.parse() {
                        config.scrollback_limit = limit;
                    }
                }
                "copy-on-select" => config.copy_on_select = value == "true",
                "confirm-close-surface" => config.confirm_close_surface = value == "true",
                "window-padding-x" => {
                    if let Ok(pad) = value.parse() {
                        config.window_padding_x = pad;
                    }
                }
                "window-padding-y" => {
                    if let Ok(pad) = value.parse() {
                        config.window_padding_y = pad;
                    }
                }
                "macos-titlebar-style" => config.macos_titlebar_style = value.into(),
                _ => {
                    if key.starts_with("palette-") {
                        let color_name = key.trim_start_matches("palette-").into();
                        config.palette.insert(color_name, value.into());
                    }
                }
            }
        }
        config
    }

    pub fn to_terminal_theme(&self) -> HashMap<String, String> {
        let mut theme = HashMap::new();
        theme.insert("background".into(), self.background.clone());
        theme.insert("foreground".into(), self.foreground.clone());
        theme.insert("cursor".into(), self.foreground.clone());
        theme.insert("cursorAccent".into(), self.background.clone());
        theme.insert(
            "selectionBackground".into(),
            format!("{}40", self.foreground),
        );
        for (key, value) in &self.palette {
            theme.insert(key.clone(), value.clone());
        }
        theme
    }
}

#[tauri::command]
pub fn get_ghostty_config() -> Result<GhosttyConfig, String> {
    Ok(GhosttyConfig::load())
}
