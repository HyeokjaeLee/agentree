export interface Project {
  id: string;
  name: string;
  path: string;
  label?: string;
  branches: Branch[];
  remote_branches?: string[];
  worktrees: Worktree[];
}

export interface Branch {
  id: string;
  name: string;
  label?: string;
  project_id: string;
  terminals: Terminal[];
}

export interface Worktree {
  id: string;
  branch: string;
  path: string;
  label?: string;
  project_id: string;
  status: "Clean" | "Dirty" | "Detached";
  terminals: Terminal[];
}

export interface Terminal {
  id: string;
  name: string;
  label?: string;
  parent_id: string;
  parent_type: "branch" | "worktree";
  project_id: string;
  pty_id?: string;
}
