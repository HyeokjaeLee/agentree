mod commands;
mod models;
mod services;
mod ghostty;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_pty::init())
        .invoke_handler(tauri::generate_handler![
            commands::project::add_project,
            commands::project::refresh_project,
            commands::branch::create_branch,
            commands::branch::delete_branch,
            commands::branch::list_branches,
            commands::branch::fetch_remote_branches,
            commands::branch::switch_branch,
            commands::worktree::create_worktree,
            commands::worktree::remove_worktree,
            commands::worktree::list_worktrees,
            commands::config::read_config,
            commands::config::write_config,
            commands::label::set_label,
            commands::label::get_labels,
            commands::label::remove_label,
            commands::notification::get_notifications,
            commands::notification::mark_notification_read,
            commands::notification::trigger_test_notification,
            commands::app_state::save_app_state,
            commands::app_state::load_app_state,
            ghostty::config::get_ghostty_config,
            ghostty::bridge::ghostty_status,
            ghostty::bridge::ghostty_runtime_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Agentree");
}
