import { v4 as uuid } from "uuid";
import { setLabel } from "@/lib/invoke";
import type { Branch, Project, Terminal, Worktree } from "@/types/project";
import {
  computeNewActiveId,
  findProject,
  findTerminalParent,
  getTerminals,
  mapTerminalNames,
  type StoreGet,
  type StoreSet,
  updateProjectTerminals,
} from "./projectStoreTypes";

function persist(get: StoreGet): void {
  get().saveToStorage();
}

export function renameTerminalAction(
  set: StoreSet,
  get: StoreGet,
  terminalId: string,
  newName: string,
): void {
  set((s) => ({
    projects: s.projects.map((p) => mapTerminalNames(p, terminalId, newName)),
  }));
  persist(get);
}

function getTerminalCount(
  proj: Project,
  parentId: string,
  parentType: "branch" | "worktree",
): number {
  if (parentType === "worktree") {
    const wt = proj.worktrees.find((w) => w.id === parentId);
    return getTerminals(wt ?? ({} as Worktree)).length;
  }
  const br = proj.branches.find((b) => b.id === parentId);
  return getTerminals(br ?? ({} as Branch)).length;
}

export function addTerminalAction(
  set: StoreSet,
  get: StoreGet,
  projectId: string,
  parentId: string,
  parentType: "branch" | "worktree",
): string {
  const id = uuid();
  const proj = findProject(get().projects, projectId);
  if (!proj) return id;

  const terminalCount = getTerminalCount(proj, parentId, parentType);
  const terminal: Terminal = {
    id,
    name: `Terminal ${terminalCount + 1}`,
    parent_id: parentId,
    parent_type: parentType,
    project_id: projectId,
  };

  const appendTerminal = (parent: Branch | Worktree) => ({
    ...parent,
    terminals: [...getTerminals(parent), terminal],
  });

  set((s) => ({
    projects: s.projects.map((p) =>
      p.id === projectId ? updateProjectTerminals(p, parentId, parentType, appendTerminal) : p,
    ),
    activeTerminalId: id,
  }));
  persist(get);
  return id;
}

export function removeTerminalAction(
  set: StoreSet,
  get: StoreGet,
  projectId: string,
  parentId: string,
  parentType: "branch" | "worktree",
  terminalId: string,
): void {
  const filterTerminal = (parent: Branch | Worktree) => ({
    ...parent,
    terminals: getTerminals(parent).filter((t) => t.id !== terminalId),
  });

  set((s) => {
    const newActive = computeNewActiveId(
      s.projects,
      projectId,
      parentId,
      parentType,
      terminalId,
      s.activeTerminalId,
    );
    return {
      projects: s.projects.map((p) =>
        p.id === projectId ? updateProjectTerminals(p, parentId, parentType, filterTerminal) : p,
      ),
      activeTerminalId: newActive,
    };
  });
  persist(get);
}

function updateEntityLabel(
  terms: Terminal[],
  entityType: string,
  entityId: string,
  label: string,
): Terminal[] {
  return terms.map((t) => (entityType === "terminal" && t.id === entityId ? { ...t, label } : t));
}

function applyLabelToBranches(
  project: Project,
  entityType: string,
  entityId: string,
  label: string,
) {
  return project.branches.map((b) => {
    if (entityType === "branch" && b.id === entityId) return { ...b, label };
    return { ...b, terminals: updateEntityLabel(getTerminals(b), entityType, entityId, label) };
  });
}

function applyLabelToWorktrees(
  project: Project,
  entityType: string,
  entityId: string,
  label: string,
) {
  return project.worktrees.map((w) => {
    if (entityType === "worktree" && w.id === entityId) return { ...w, label };
    return { ...w, terminals: updateEntityLabel(getTerminals(w), entityType, entityId, label) };
  });
}

export async function setLabelAction(
  set: StoreSet,
  get: StoreGet,
  entityType: string,
  entityId: string,
  label: string,
): Promise<void> {
  await setLabel(entityType, entityId, label);

  set((s) => ({
    projects: s.projects.map((p) => {
      if (entityType === "project" && p.id === entityId) return { ...p, label };
      return {
        ...p,
        branches: applyLabelToBranches(p, entityType, entityId, label),
        worktrees: applyLabelToWorktrees(p, entityType, entityId, label),
      };
    }),
  }));
  persist(get);
}

export function getActiveTerminalGetter(get: StoreGet): Terminal | null {
  const { projects, activeTerminalId } = get();
  if (!activeTerminalId) return null;

  const result = findTerminalParent(projects, activeTerminalId);
  if (!result) return null;
  return result.terminals.find((t) => t.id === activeTerminalId) ?? null;
}

export function getActiveWorktreeGetter(get: StoreGet): Worktree | null {
  const { projects, activeTerminalId } = get();
  if (!activeTerminalId) return null;

  const result = findTerminalParent(projects, activeTerminalId);
  if (!result || result.parentType !== "worktree") return null;
  return result.parent as Worktree;
}

export function getActiveTerminalParentGetter(get: StoreGet): {
  projectId: string;
  parentId: string;
  parentType: "branch" | "worktree";
} | null {
  const { projects, activeTerminalId } = get();
  if (!activeTerminalId) return null;

  const result = findTerminalParent(projects, activeTerminalId);
  if (!result) return null;
  return {
    projectId: result.project.id,
    parentId: result.parent.id,
    parentType: result.parentType,
  };
}
