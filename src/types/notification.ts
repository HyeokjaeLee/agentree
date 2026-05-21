export type AgentType = "claude" | "opencode" | "codex" | "gemini" | "pi";

export interface AgentNotification {
  id: string;
  agent: AgentType;
  message: string;
  project_id?: string;
  worktree_id?: string;
  read: boolean;
  timestamp: number;
}
