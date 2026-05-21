import { create } from "zustand";
import { v4 as uuid } from "uuid";
import type { Project, Branch, Worktree, Terminal } from "@/types/project";
import * as api from "@/lib/invoke";

interface ProjectState {
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
  removeTerminal: (projectId: string, parentId: string, parentType: "branch" | "worktree", terminalId: string) => void;
  setActiveTerminal: (terminalId: string | null) => void;

  setLabel: (entityType: string, entityId: string, label: string) => Promise<void>;

  getActiveTerminal: () => Terminal | null;
  getActiveWorktree: () => Worktree | null;
  getActiveTerminalParent: () => { projectId: string; parentId: string; parentType: "branch" | "worktree" } | null;
  getProjectById: (id: string) => Project | undefined;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeTerminalId: null,
  loading: false,

  loadFromStorage: async () => {
    set({ loading: true });
    try {
      const projects = await api.loadAppState();
      const migrateTerminal = (t: unknown): Terminal => {
        const rec = t as Record<string, unknown>;
        return {
          ...(t as Terminal),
          parent_id: ((rec.parent_id ?? rec.worktree_id) as string) || "",
          parent_type: ((rec.parent_type ?? "worktree") as "branch" | "worktree"),
        };
      };
      const hydrated = projects.map((p) => ({
        ...p,
        branches: p.branches.map((b) => {
          const br = b as unknown as Record<string, unknown>;
          return {
            ...b,
            project_id: p.id,
            terminals: ((br.terminals ?? []) as unknown[]).map(migrateTerminal),
          };
        }),
        worktrees: p.worktrees.map((w) => {
          const wt = w as unknown as Record<string, unknown>;
          return {
            ...w,
            project_id: p.id,
            terminals: ((wt.terminals ?? []) as unknown[]).map(migrateTerminal),
          };
        }),
      }));
      set({ projects: hydrated, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  saveToStorage: async () => {
    try {
      await api.saveAppState(get().projects);
    } catch (e) {
      console.error("Failed to save state:", e);
    }
  },

  addProject: async (path, label) => {
    const project = await api.addProject(path, label);
    project.branches = project.branches.map((b) => ({ ...b, project_id: project.id, terminals: [] }));
    project.worktrees = project.worktrees.map((w) => ({
      ...w,
      project_id: project.id,
      terminals: [],
    }));
    set((s) => ({ projects: [...s.projects, project] }));
    get().saveToStorage();
  },

  removeProject: async (id) => {
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
    get().saveToStorage();
  },

  refreshProject: async (id) => {
    const proj = get().projects.find((p) => p.id === id);
    if (!proj) return;
    const updated = await api.refreshProject(proj);
    updated.id = id;
    updated.branches = updated.branches.map((b) => {
      const existing = proj.branches.find((eb) => eb.name === b.name);
      return {
        ...b,
        project_id: id,
        id: existing?.id ?? b.id,
        label: existing?.label ?? b.label,
        terminals: existing?.terminals ?? [],
      };
    });
    const existingWts = proj.worktrees;
    updated.worktrees = updated.worktrees.map((w) => {
      const existing = existingWts.find((ew) => ew.path === w.path);
      return {
        ...w,
        project_id: id,
        terminals: existing?.terminals ?? [],
        label: existing?.label ?? w.label,
      };
    });
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? updated : p)),
    }));
    get().saveToStorage();
  },

  createBranch: async (projectId, name) => {
    const proj = get().projects.find((p) => p.id === projectId);
    if (!proj) return;
    const branch = await api.createBranch(proj.path, name);
    branch.project_id = projectId;
    (branch as Branch & { terminals: Terminal[] }).terminals = [];
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, branches: [...p.branches, branch] } : p
      ),
    }));
    get().saveToStorage();
  },

  deleteBranch: async (projectId, name) => {
    const proj = get().projects.find((p) => p.id === projectId);
    if (!proj) return;
    await api.deleteBranch(proj.path, name);
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? { ...p, branches: p.branches.filter((b) => b.name !== name) }
          : p
      ),
    }));
    get().saveToStorage();
  },

  createWorktree: async (projectId, branch, label) => {
    const proj = get().projects.find((p) => p.id === projectId);
    if (!proj) return;
    const autoLabel = label || `${branch.replace(/\//g, "-")}-agentree-${proj.worktrees.length + 1}`;
    const tempId = `temp-${Date.now()}`;
    const placeholder: Worktree = {
      id: tempId,
      branch,
      path: "",
      label: autoLabel,
      project_id: projectId,
      status: "Clean",
      terminals: [],
    };
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, worktrees: [...p.worktrees, placeholder] } : p
      ),
    }));
    try {
      const worktree = await api.createWorktree(proj.path, branch, autoLabel);
      worktree.project_id = projectId;
      (worktree as Worktree & { terminals: Terminal[] }).terminals = [];
      set((s) => ({
        projects: s.projects.map((p) =>
          p.id === projectId
            ? { ...p, worktrees: p.worktrees.map((w) => (w.id === tempId ? worktree : w)) }
            : p
        ),
      }));
      get().saveToStorage();
    } catch (e) {
      set((s) => ({
        projects: s.projects.map((p) =>
          p.id === projectId
            ? { ...p, worktrees: p.worktrees.filter((w) => w.id !== tempId) }
            : p
        ),
      }));
      throw e;
    }
  },

  removeWorktree: async (projectId, worktreeId) => {
    const proj = get().projects.find((p) => p.id === projectId);
    if (!proj) return;
    const wt = proj.worktrees.find((w) => w.id === worktreeId);
    if (!wt) return;
    await api.removeWorktree(proj.path, wt.path);
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? { ...p, worktrees: p.worktrees.filter((w) => w.id !== worktreeId) }
          : p
      ),
    }));
    get().saveToStorage();
  },

  switchBranch: async (projectId, branch, worktreePath) => {
    const proj = get().projects.find((p) => p.id === projectId);
    if (!proj) return;
    await api.switchBranch(proj.path, branch, worktreePath);
    await get().refreshProject(projectId);
  },

  renameTerminal: (terminalId, newName) => {
    set((s) => {
      const projects = s.projects.map((p) => ({
        ...p,
        branches: p.branches.map((b) => ({
          ...b,
          terminals: b.terminals.map((t) =>
            t.id === terminalId ? { ...t, name: newName } : t
          ),
        })),
        worktrees: p.worktrees.map((w) => ({
          ...w,
          terminals: w.terminals.map((t) =>
            t.id === terminalId ? { ...t, name: newName } : t
          ),
        })),
      }));
      return { projects };
    });
    get().saveToStorage();
  },

  addTerminal: (projectId, parentId, parentType) => {
    const id = uuid();
    const proj = get().projects.find((p) => p.id === projectId);
    if (!proj) return id;

    let terminalCount = 0;
    if (parentType === "worktree") {
      const wt = proj.worktrees.find((w) => w.id === parentId) as
        | (Worktree & { terminals?: Terminal[] })
        | undefined;
      terminalCount = wt?.terminals?.length ?? 0;
    } else {
      const br = proj.branches.find((b) => b.id === parentId) as
        | (Branch & { terminals?: Terminal[] })
        | undefined;
      terminalCount = br?.terminals?.length ?? 0;
    }

    const terminal: Terminal = {
      id,
      name: `Terminal ${terminalCount + 1}`,
      parent_id: parentId,
      parent_type: parentType,
      project_id: projectId,
    };

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              worktrees:
                parentType === "worktree"
                  ? p.worktrees.map((w) =>
                      w.id === parentId
                        ? {
                            ...w,
                            terminals: [
                              ...((w as Worktree & { terminals?: Terminal[] }).terminals ?? []),
                              terminal,
                            ],
                          }
                        : w
                    )
                  : p.worktrees,
              branches:
                parentType === "branch"
                  ? p.branches.map((b) =>
                      b.id === parentId
                        ? {
                            ...b,
                            terminals: [
                              ...((b as Branch & { terminals?: Terminal[] }).terminals ?? []),
                              terminal,
                            ],
                          }
                        : b
                    )
                  : p.branches,
            }
          : p
      ),
      activeTerminalId: id,
    }));
    get().saveToStorage();
    return id;
  },

  removeTerminal: (projectId, parentId, parentType, terminalId) => {
    set((s) => {
      let newActive = s.activeTerminalId;
      if (s.activeTerminalId === terminalId) {
        const proj = s.projects.find((p) => p.id === projectId);
        if (proj) {
          const parent = parentType === "worktree"
            ? proj.worktrees.find((w) => w.id === parentId)
            : proj.branches.find((b) => b.id === parentId);
          if (parent) {
            const siblings = ((parent as any).terminals ?? []) as Terminal[];
            const idx = siblings.findIndex((t) => t.id === terminalId);
            const remaining = siblings.filter((t) => t.id !== terminalId);
            if (remaining.length > 0) {
              const fallback = remaining[Math.min(idx, remaining.length - 1)];
              if (fallback) newActive = fallback.id;
            } else {
              newActive = null;
            }
          }
        }
      }
      return {
        projects: s.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                worktrees:
                  parentType === "worktree"
                    ? p.worktrees.map((w) =>
                        w.id === parentId
                          ? {
                              ...w,
                              terminals: (
                                (w as Worktree & { terminals?: Terminal[] }).terminals ?? []
                              ).filter((t: Terminal) => t.id !== terminalId),
                            }
                          : w
                      )
                    : p.worktrees,
                branches:
                  parentType === "branch"
                    ? p.branches.map((b) =>
                        b.id === parentId
                          ? {
                              ...b,
                              terminals: (
                                (b as Branch & { terminals?: Terminal[] }).terminals ?? []
                              ).filter((t: Terminal) => t.id !== terminalId),
                            }
                          : b
                      )
                    : p.branches,
              }
            : p
        ),
        activeTerminalId: newActive,
      };
    });
    get().saveToStorage();
  },

  setActiveTerminal: (terminalId) => set({ activeTerminalId: terminalId }),

  setLabel: async (entityType, entityId, label) => {
    await api.setLabel(entityType, entityId, label);

    set((s) => {
      const projects = s.projects.map((p) => {
        if (entityType === "project" && p.id === entityId) {
          return { ...p, label };
        }
        const branches = p.branches.map((b) => {
          if (entityType === "branch" && b.id === entityId) {
            return { ...b, label };
          }
          const br = b as Branch & { terminals?: Terminal[] };
          const terminals = (br.terminals ?? []).map((t) =>
            entityType === "terminal" && t.id === entityId ? { ...t, label } : t
          );
          return { ...b, terminals };
        });
        const worktrees = p.worktrees.map((w) => {
          if (entityType === "worktree" && w.id === entityId) {
            return { ...w, label };
          }
          const wt = w as Worktree & { terminals?: Terminal[] };
          const terminals = (wt.terminals ?? []).map((t) =>
            entityType === "terminal" && t.id === entityId ? { ...t, label } : t
          );
          return { ...w, terminals };
        });
        return { ...p, branches, worktrees };
      });
      return { projects };
    });
    get().saveToStorage();
  },

  getActiveTerminal: () => {
    const { projects, activeTerminalId } = get();
    if (!activeTerminalId) return null;
    for (const p of projects) {
      for (const w of p.worktrees) {
        const terminals = (w as Worktree & { terminals?: Terminal[] }).terminals ?? [];
        const t = terminals.find((t: Terminal) => t.id === activeTerminalId);
        if (t) return t;
      }
      for (const b of p.branches) {
        const terminals = (b as Branch & { terminals?: Terminal[] }).terminals ?? [];
        const t = terminals.find((t: Terminal) => t.id === activeTerminalId);
        if (t) return t;
      }
    }
    return null;
  },

  getActiveWorktree: () => {
    const { projects, activeTerminalId } = get();
    if (!activeTerminalId) return null;
    for (const p of projects) {
      for (const w of p.worktrees) {
        const terminals = (w as Worktree & { terminals?: Terminal[] }).terminals ?? [];
        if (terminals.some((t: Terminal) => t.id === activeTerminalId)) return w;
      }
    }
    return null;
  },

  getActiveTerminalParent: () => {
    const { projects, activeTerminalId } = get();
    if (!activeTerminalId) return null;
    for (const p of projects) {
      for (const w of p.worktrees) {
        const terminals = (w as Worktree & { terminals?: Terminal[] }).terminals ?? [];
        if (terminals.some((t: Terminal) => t.id === activeTerminalId)) {
          return { projectId: p.id, parentId: w.id, parentType: "worktree" as const };
        }
      }
      for (const b of p.branches) {
        const terminals = (b as Branch & { terminals?: Terminal[] }).terminals ?? [];
        if (terminals.some((t: Terminal) => t.id === activeTerminalId)) {
          return { projectId: p.id, parentId: b.id, parentType: "branch" as const };
        }
      }
    }
    return null;
  },

  getProjectById: (id) => get().projects.find((p) => p.id === id),
}));
