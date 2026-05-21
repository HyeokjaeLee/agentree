import type { Branch, Project, Terminal, Worktree } from "@/types/project";

export interface ProjectState {
  projects: Project[];
  activeTerminalId: string | null;
  loading: boolean;

  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
  addProject: (path: string, label?: string) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  refreshProject: (id: string) => Promise<void>;

  createBranch: (projectId: string, name: string) => Promise<void>;
  deleteBranch: (projectId: string, name: string) => Promise<void>;

  createWorktree: (projectId: string, branch: string, label?: string) => Promise<void>;
  removeWorktree: (projectId: string, worktreeId: string) => Promise<void>;
  switchBranch: (projectId: string, branch: string, worktreePath?: string) => Promise<void>;
  renameTerminal: (terminalId: string, newName: string) => void;

  addTerminal: (projectId: string, parentId: string, parentType: "branch" | "worktree") => string;
  removeTerminal: (
    projectId: string,
    parentId: string,
    parentType: "branch" | "worktree",
    terminalId: string,
  ) => void;
  setActiveTerminal: (terminalId: string | null) => void;

  setLabel: (entityType: string, entityId: string, label: string) => Promise<void>;

  getActiveTerminal: () => Terminal | null;
  getActiveWorktree: () => Worktree | null;
  getActiveTerminalParent: () => {
    projectId: string;
    parentId: string;
    parentType: "branch" | "worktree";
  } | null;
  getProjectById: (id: string) => Project | undefined;
}

export type StoreSet = (
  partial: Partial<ProjectState> | ((state: ProjectState) => Partial<ProjectState>),
  replace?: false | undefined,
) => void;

export type StoreGet = () => ProjectState;

/** Safely get terminals array from a branch or worktree. */
export function getTerminals(entity: Branch | Worktree): Terminal[] {
  return (entity as Branch & { terminals?: Terminal[] }).terminals ?? [];
}

/** Find a project by ID. */
export function findProject(projects: Project[], id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

/** Find the parent entity containing a terminal across all projects. */
export function findTerminalParent(
  projects: Project[],
  terminalId: string,
): {
  project: Project;
  parent: Branch | Worktree;
  parentType: "branch" | "worktree";
  terminals: Terminal[];
} | null {
  for (const p of projects) {
    for (const w of p.worktrees) {
      const terminals = getTerminals(w);
      if (terminals.some((t) => t.id === terminalId)) {
        return { project: p, parent: w, parentType: "worktree", terminals };
      }
    }
    for (const b of p.branches) {
      const terminals = getTerminals(b);
      if (terminals.some((t) => t.id === terminalId)) {
        return { project: p, parent: b, parentType: "branch", terminals };
      }
    }
  }
  return null;
}

/** Compute the new active terminal ID after removing a terminal. */
export function computeNewActiveId(
  projects: Project[],
  projectId: string,
  parentId: string,
  parentType: "branch" | "worktree",
  removedId: string,
  currentActiveId: string | null,
): string | null {
  if (currentActiveId !== removedId) return currentActiveId;

  const proj = findProject(projects, projectId);
  if (!proj) return null;

  const parent =
    parentType === "worktree"
      ? proj.worktrees.find((w) => w.id === parentId)
      : proj.branches.find((b) => b.id === parentId);
  if (!parent) return null;

  const siblings = getTerminals(parent);
  const idx = siblings.findIndex((t) => t.id === removedId);
  const remaining = siblings.filter((t) => t.id !== removedId);

  if (remaining.length === 0) return null;
  return remaining[Math.min(idx, remaining.length - 1)]?.id ?? null;
}

/** Map over a parent list, applying an updater to the matching parent by ID. */
function mapParentList<T extends Branch | Worktree>(
  list: T[],
  parentId: string,
  updater: (item: T) => T,
): T[] {
  return list.map((item) => (item.id === parentId ? updater(item) : item));
}

/** Update terminals in a project for a specific parent (branch or worktree). */
export function updateProjectTerminals(
  project: Project,
  parentId: string,
  parentType: "branch" | "worktree",
  updater: (parent: Branch | Worktree) => Branch | Worktree,
): Project {
  return {
    ...project,
    worktrees:
      parentType === "worktree"
        ? mapParentList(project.worktrees, parentId, updater as (w: Worktree) => Worktree)
        : project.worktrees,
    branches:
      parentType === "branch"
        ? mapParentList(project.branches, parentId, updater as (b: Branch) => Branch)
        : project.branches,
  };
}

/** Map terminal names across branches and worktrees of a project. */
export function mapTerminalNames(project: Project, terminalId: string, newName: string): Project {
  const mapTerms = (terms: Terminal[]) =>
    terms.map((t) => (t.id === terminalId ? { ...t, name: newName } : t));

  return {
    ...project,
    branches: project.branches.map((b) => ({ ...b, terminals: mapTerms(getTerminals(b)) })),
    worktrees: project.worktrees.map((w) => ({ ...w, terminals: mapTerms(getTerminals(w)) })),
  };
}
