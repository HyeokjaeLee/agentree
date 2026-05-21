import { FolderOpen, RefreshCw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/stores/useProjectStore";
import type { Project, Terminal as TerminalType, Worktree } from "@/types/project";
import { NewWorktreePopover } from "./NewWorktreePopover";
import { WorktreeCard } from "./WorktreeCard";

export function ProjectSection({ project }: { project: Project }) {
  const {
    activeTerminalId,
    setActiveTerminal,
    addTerminal,
    removeWorktree,
    setLabel,
    refreshProject,
  } = useProjectStore();

  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const worktrees = project.worktrees;

  const activeWorktree = useActiveWorktree(activeTerminalId, worktrees);
  const handleWorktreeClick = useWorktreeClick(
    project.id,
    activeTerminalId,
    deletingIds,
    setActiveTerminal,
    addTerminal,
  );
  const handleDelete = useDeleteWorktree(project.id, removeWorktree, setDeletingIds);

  return (
    <div className="border-border border-b pb-2">
      <ProjectHeader project={project} onRefresh={() => refreshProject(project.id)} />
      <Accordion type="multiple">
        {worktrees.map((w) => (
          <WorktreeCardWithState
            key={w.id}
            worktree={w}
            activeWorktreeId={activeWorktree?.id}
            activeTerminalId={activeTerminalId}
            deletingIds={deletingIds}
            onWorktreeClick={handleWorktreeClick}
            onDelete={handleDelete}
            onRename={(label) => setLabel("worktree", w.id, label)}
            onTerminalClick={setActiveTerminal}
          />
        ))}
      </Accordion>
    </div>
  );
}

function ProjectHeader({ project, onRefresh }: { project: Project; onRefresh: () => void }) {
  return (
    <div className="group flex items-center gap-1.5 px-3 py-1.5">
      <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate font-semibold text-foreground text-xs">
        {project.label || project.name}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
        onClick={onRefresh}
      >
        <RefreshCw className="h-2.5 w-2.5" />
      </Button>
      <NewWorktreePopover projectId={project.id} />
    </div>
  );
}

function WorktreeCardWithState({
  worktree,
  activeWorktreeId,
  activeTerminalId,
  deletingIds,
  onWorktreeClick,
  onDelete,
  onRename,
  onTerminalClick,
}: {
  worktree: Worktree;
  activeWorktreeId: string | undefined;
  activeTerminalId: string | null;
  deletingIds: Set<string>;
  onWorktreeClick: (w: Worktree) => void;
  onDelete: (id: string) => Promise<void>;
  onRename: (label: string) => void;
  onTerminalClick: (id: string) => void;
}) {
  const isCreating = worktree.id.startsWith("temp-");
  const isDeleting = deletingIds.has(worktree.id);

  return (
    <WorktreeCard
      worktree={worktree}
      isActive={activeWorktreeId === worktree.id}
      loading={isCreating || isDeleting}
      onDelete={() => onDelete(worktree.id)}
      onRename={onRename}
      activeTerminalId={activeTerminalId}
      onTerminalClick={onTerminalClick}
      onWorktreeClick={() => onWorktreeClick(worktree)}
    />
  );
}

function useActiveWorktree(activeTerminalId: string | null, worktrees: Worktree[]) {
  return useMemo(() => {
    if (!activeTerminalId) return null;
    for (const w of worktrees) {
      const terminals = (w as Worktree & { terminals?: TerminalType[] }).terminals ?? [];
      if (terminals.some((t) => t.id === activeTerminalId)) return w;
    }
    return null;
  }, [activeTerminalId, worktrees]);
}

function useWorktreeClick(
  projectId: string,
  activeTerminalId: string | null,
  deletingIds: Set<string>,
  setActiveTerminal: (id: string) => void,
  addTerminal: (pId: string, wId: string, type: "branch" | "worktree") => string,
) {
  return useCallback(
    (worktree: Worktree) => {
      if (worktree.id.startsWith("temp-") || deletingIds.has(worktree.id)) return;
      const terminals = (worktree as Worktree & { terminals?: TerminalType[] }).terminals ?? [];
      const first = terminals[0];
      if (first) {
        if (!(activeTerminalId && terminals.some((t) => t.id === activeTerminalId))) {
          setActiveTerminal(first.id);
        }
      } else {
        addTerminal(projectId, worktree.id, "worktree");
      }
    },
    [projectId, activeTerminalId, setActiveTerminal, addTerminal, deletingIds],
  );
}

function useDeleteWorktree(
  projectId: string,
  removeWorktree: (pId: string, wId: string) => Promise<void>,
  setDeletingIds: React.Dispatch<React.SetStateAction<Set<string>>>,
) {
  return useCallback(
    async (worktreeId: string) => {
      setDeletingIds((prev) => new Set(prev).add(worktreeId));
      try {
        await removeWorktree(projectId, worktreeId);
      } catch {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(worktreeId);
          return next;
        });
      }
    },
    [projectId, removeWorktree, setDeletingIds],
  );
}
