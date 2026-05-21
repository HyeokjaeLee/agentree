import {
  addProject,
  createBranch,
  createWorktree,
  deleteBranch,
  loadAppState,
  refreshProject,
  removeWorktree,
  saveAppState,
  switchBranch,
} from "@/lib/invoke";
import type { Branch, Project, Terminal, Worktree } from "@/types/project";
import { findProject, type StoreGet, type StoreSet } from "./projectStoreTypes";

function migrateTerminal(t: unknown): Terminal {
  const rec = t as Record<string, unknown>;
  return {
    ...(t as Terminal),
    parent_id: ((rec.parent_id ?? rec.worktree_id) as string) || "",
    parent_type: (rec.parent_type ?? "worktree") as "branch" | "worktree",
  };
}

function hydrateProject(p: Project): Project {
  const mapBranch = (b: Branch) => {
    const br = b as unknown as Record<string, unknown>;
    return {
      ...b,
      project_id: p.id,
      terminals: ((br.terminals ?? []) as unknown[]).map(migrateTerminal),
    };
  };
  const mapWorktree = (w: Worktree) => {
    const wt = w as unknown as Record<string, unknown>;
    return {
      ...w,
      project_id: p.id,
      terminals: ((wt.terminals ?? []) as unknown[]).map(migrateTerminal),
    };
  };
  return { ...p, branches: p.branches.map(mapBranch), worktrees: p.worktrees.map(mapWorktree) };
}

function persist(get: StoreGet): void {
  get().saveToStorage();
}

export async function loadFromStorageAction(set: StoreSet): Promise<void> {
  set({ loading: true });
  try {
    const projects = await loadAppState();
    set({ projects: projects.map(hydrateProject), loading: false });
  } catch {
    set({ loading: false });
  }
}

export async function saveToStorageAction(get: StoreGet): Promise<void> {
  try {
    await saveAppState(get().projects);
  } catch {}
}

export async function addProjectAction(
  set: StoreSet,
  get: StoreGet,
  path: string,
  label?: string,
): Promise<void> {
  const project = await addProject(path, label);
  project.branches = project.branches.map((b) => ({ ...b, project_id: project.id, terminals: [] }));
  project.remote_branches = project.remote_branches ?? [];
  project.worktrees = project.worktrees.map((w) => ({
    ...w,
    project_id: project.id,
    terminals: [],
  }));
  set((s) => ({ projects: [...s.projects, project] }));
  persist(get);
}

export async function removeProjectAction(set: StoreSet, get: StoreGet, id: string): Promise<void> {
  set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
  await get().saveToStorage();
}

function mergeExistingBranchData(b: Branch, id: string, existingBranches: Branch[]): Branch {
  const existing = existingBranches.find((eb) => eb.name === b.name);
  return {
    ...b,
    project_id: id,
    id: existing?.id ?? b.id,
    label: existing?.label ?? b.label,
    terminals: existing?.terminals ?? [],
  };
}

function mergeExistingWorktreeData(
  w: Worktree,
  id: string,
  existingWorktrees: Worktree[],
): Worktree {
  const existing = existingWorktrees.find((ew) => ew.path === w.path);
  return {
    ...w,
    project_id: id,
    terminals: existing?.terminals ?? [],
    label: existing?.label ?? w.label,
  };
}

export async function refreshProjectAction(
  set: StoreSet,
  get: StoreGet,
  id: string,
): Promise<void> {
  const proj = findProject(get().projects, id);
  if (!proj) return;

  const updated = await refreshProject(proj);
  updated.id = id;
  updated.branches = updated.branches.map((b) => mergeExistingBranchData(b, id, proj.branches));
  updated.worktrees = updated.worktrees.map((w) =>
    mergeExistingWorktreeData(w, id, proj.worktrees),
  );
  updated.remote_branches = updated.remote_branches ?? [];

  set((s) => ({ projects: s.projects.map((p) => (p.id === id ? updated : p)) }));
  persist(get);
}

export async function createBranchAction(
  set: StoreSet,
  get: StoreGet,
  projectId: string,
  name: string,
): Promise<void> {
  const proj = findProject(get().projects, projectId);
  if (!proj) return;

  const branch = await createBranch(proj.path, name);
  branch.project_id = projectId;
  (branch as Branch & { terminals: Terminal[] }).terminals = [];

  set((s) => ({
    projects: s.projects.map((p) =>
      p.id === projectId ? { ...p, branches: [...p.branches, branch] } : p,
    ),
  }));
  persist(get);
}

export async function deleteBranchAction(
  set: StoreSet,
  get: StoreGet,
  projectId: string,
  name: string,
): Promise<void> {
  const proj = findProject(get().projects, projectId);
  if (!proj) return;

  await deleteBranch(proj.path, name);
  set((s) => ({
    projects: s.projects.map((p) =>
      p.id === projectId ? { ...p, branches: p.branches.filter((b) => b.name !== name) } : p,
    ),
  }));
  persist(get);
}

export async function createWorktreeAction(
  set: StoreSet,
  get: StoreGet,
  projectId: string,
  branch: string,
  label?: string,
): Promise<void> {
  const proj = findProject(get().projects, projectId);
  if (!proj) return;

  const autoLabel = label || `${branch.replace(/\//gu, "-")}-agentree-${proj.worktrees.length + 1}`;
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
      p.id === projectId ? { ...p, worktrees: [...p.worktrees, placeholder] } : p,
    ),
  }));

  try {
    const worktree = await createWorktree(proj.path, branch, autoLabel);
    worktree.project_id = projectId;
    (worktree as Worktree & { terminals: Terminal[] }).terminals = [];
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? { ...p, worktrees: p.worktrees.map((w) => (w.id === tempId ? worktree : w)) }
          : p,
      ),
    }));
    persist(get);
  } catch (e) {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, worktrees: p.worktrees.filter((w) => w.id !== tempId) } : p,
      ),
    }));
    throw e;
  }
}

export async function removeWorktreeAction(
  set: StoreSet,
  get: StoreGet,
  projectId: string,
  worktreeId: string,
): Promise<void> {
  const proj = findProject(get().projects, projectId);
  if (!proj) return;

  const wt = proj.worktrees.find((w) => w.id === worktreeId);
  if (!wt) return;

  await removeWorktree(proj.path, wt.path);
  set((s) => ({
    projects: s.projects.map((p) =>
      p.id === projectId ? { ...p, worktrees: p.worktrees.filter((w) => w.id !== worktreeId) } : p,
    ),
  }));
  persist(get);
}

export async function switchBranchAction(
  get: StoreGet,
  projectId: string,
  branch: string,
  worktreePath?: string,
): Promise<void> {
  const proj = findProject(get().projects, projectId);
  if (!proj) return;

  await switchBranch(proj.path, branch, worktreePath);
  await get().refreshProject(projectId);
}
