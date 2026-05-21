import { invoke } from "@tauri-apps/api/core";
import type { Project, Branch, Worktree } from "@/types/project";
import type { AgentreeConfig } from "@/types/config";
import type { AgentNotification } from "@/types/notification";

export async function addProject(path: string, label?: string): Promise<Project> {
  return invoke("add_project", { path, label });
}

export async function refreshProject(project: Project): Promise<Project> {
  return invoke("refresh_project", { project });
}

export async function createBranch(projectPath: string, name: string): Promise<Branch> {
  return invoke("create_branch", { projectPath, name });
}

export async function deleteBranch(projectPath: string, name: string): Promise<void> {
  return invoke("delete_branch", { projectPath, name });
}

export async function listBranches(projectPath: string): Promise<Branch[]> {
  return invoke("list_branches", { projectPath });
}

export async function createWorktree(
  projectPath: string,
  branch: string,
  label?: string
): Promise<Worktree> {
  return invoke("create_worktree", { projectPath, branch, label });
}

export async function removeWorktree(projectPath: string, worktreePath: string): Promise<void> {
  return invoke("remove_worktree", { projectPath, worktreePath });
}

export async function listWorktrees(projectPath: string): Promise<Worktree[]> {
  return invoke("list_worktrees", { projectPath });
}

export async function switchBranch(
  projectPath: string,
  branch: string,
  worktreePath?: string
): Promise<void> {
  return invoke("switch_branch", { projectPath, branch, worktreePath: worktreePath ?? null });
}

export async function readConfig(projectPath: string): Promise<AgentreeConfig> {
  return invoke("read_config", { projectPath });
}

export async function writeConfig(projectPath: string, config: AgentreeConfig): Promise<void> {
  return invoke("write_config", { projectPath, config });
}

export async function setLabel(
  entityType: string,
  entityId: string,
  label: string
): Promise<void> {
  return invoke("set_label", { entityType, entityId, label });
}

export async function getLabels(): Promise<Record<string, string>> {
  return invoke("get_labels");
}

export async function removeLabel(entityType: string, entityId: string): Promise<void> {
  return invoke("remove_label", { entityType, entityId });
}

export async function getNotifications(): Promise<AgentNotification[]> {
  return invoke("get_notifications");
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  return invoke("mark_notification_read", { notificationId });
}

export async function saveAppState(projects: Project[]): Promise<void> {
  return invoke("save_app_state", { projects });
}

export async function loadAppState(): Promise<Project[]> {
  return invoke("load_app_state");
}

export interface GhosttyConfig {
  font_family: string;
  font_size: number;
  theme: string;
  cursor_style: string;
  cursor_blink: boolean;
  background: string;
  foreground: string;
  palette: Record<string, string>;
  scrollback_limit: number;
  copy_on_select: boolean;
  confirm_close_surface: boolean;
  window_padding_x: number;
  window_padding_y: number;
  macos_titlebar_style: string;
}

export async function getGhosttyConfig(): Promise<GhosttyConfig> {
  return invoke("get_ghostty_config");
}

export async function triggerTestNotification(agent: string, message: string): Promise<void> {
  return invoke("trigger_test_notification", { agent, message });
}

export async function ghosttyStatus(): Promise<string> {
  return invoke("ghostty_status");
}

export async function ghosttyInit(): Promise<string> {
  return invoke("ghostty_init");
}
