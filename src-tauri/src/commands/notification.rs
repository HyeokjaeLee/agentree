use crate::services::notification::{self, AgentNotification};

#[tauri::command]
pub fn get_notifications() -> Result<Vec<AgentNotification>, String> {
    let data_dir = dirs::data_dir().ok_or("Cannot determine data directory")?;
    Ok(notification::check_agent_notifications(&data_dir))
}

#[tauri::command]
pub fn trigger_test_notification(agent: String, message: String) -> Result<(), String> {
    let data_dir = dirs::data_dir().ok_or("Cannot determine data directory")?;
    notification::trigger_test_notification(&data_dir, &agent, &message)
}

#[tauri::command]
pub fn mark_notification_read(_notification_id: String) -> Result<(), String> {
    Ok(())
}
