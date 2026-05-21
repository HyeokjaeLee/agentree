import { useState, useCallback, useMemo } from "react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useUIStore } from "@/stores/useUIStore";
import { useNotificationStore, AGENT_ICONS } from "@/stores/useNotificationStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Bell,
  Plus,
  FolderOpen,
  GitFork,
  Terminal as TerminalIcon,
  RefreshCw,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import type { Project, Worktree, Terminal as TerminalType } from "@/types/project";
import type { AgentType } from "@/types/notification";
import { cn } from "@/lib/utils";

function NotificationBell() {
  const { notifications, unreadCount, markAllRead, markRead } = useNotificationStore();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-7 w-7">
          <Bell className="h-3.5 w-3.5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] text-white font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-6">
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-64">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">
              No notifications yet
            </p>
          ) : (
            notifications.slice(0, 20).map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-2 p-3 border-b last:border-0 cursor-pointer hover:bg-accent/50",
                  !n.read && "bg-primary/5"
                )}
                onClick={() => markRead(n.id)}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {AGENT_ICONS[n.agent as AgentType] || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(n.timestamp * 1000).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function WorktreeCard({
  worktree,
  isActive,
  loading,
  onClick,
  onDelete,
  onRename,
}: {
  worktree: Worktree;
  isActive: boolean;
  loading: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename: (label: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(worktree.label || "");

  const status = worktree.status;
  const statusColor =
    status === "Dirty"
      ? "bg-primary"
      : status === "Detached"
        ? "bg-muted-foreground"
        : "bg-[var(--trading-up)]";

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    setDraft(worktree.label || "");
    setEditing(true);
  };

  if (editing) {
    return (
      <div
        className={cn(
          "w-full flex items-center gap-2 rounded-lg px-3 py-2",
          "bg-card border border-primary/30"
        )}
      >
        <span className={cn("h-2 w-2 rounded-full shrink-0", statusColor)} />
        <GitFork className="h-3.5 w-3.5 shrink-0 text-primary" />
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft.trim()) onRename(draft.trim());
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (draft.trim()) onRename(draft.trim());
              setEditing(false);
            }
            if (e.key === "Escape") {
              setDraft(worktree.label || "");
              setEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 min-w-0 bg-secondary text-xs text-foreground outline-none rounded px-1.5 py-0.5"
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={onClick}
        disabled={loading}
        className={cn(
          "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors",
          isActive
            ? "bg-primary/10 border border-primary/30"
            : "bg-card hover:bg-accent/50 border border-transparent",
          loading && "opacity-60 pointer-events-none"
        )}
      >
        <span className={cn("h-2 w-2 rounded-full shrink-0", statusColor)} />
        <GitFork className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
        <div className="flex-1 min-w-0">
          <span className={cn("block truncate text-xs font-medium", isActive ? "text-primary" : "text-foreground")}>
            {worktree.label || worktree.branch || "detached"}
          </span>
          <span className="block truncate text-[10px] text-muted-foreground">
            {worktree.branch || "detached"}
          </span>
        </div>
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="shrink-0 h-5 w-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        )}
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-2 top-9 z-50 w-36 rounded-md border border-border bg-popover shadow-md py-1">
            <button
              onClick={startEdit}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent"
            >
              <Pencil className="h-3 w-3" />
              Edit Label
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-accent"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ProjectSection({ project }: { project: Project }) {
  const {
    activeTerminalId,
    setActiveTerminal,
    addTerminal,
    removeWorktree,
    setLabel,
    refreshProject,
  } = useProjectStore();

  const { openNewWorktreeDialog } = useUIStore();
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const worktrees = project.worktrees;

  const activeWorktree = useMemo(() => {
    if (!activeTerminalId) return null;
    for (const w of worktrees) {
      const terminals = (w as Worktree & { terminals?: TerminalType[] }).terminals ?? [];
      if (terminals.some((t) => t.id === activeTerminalId)) return w;
    }
    return null;
  }, [activeTerminalId, worktrees]);

  const handleWorktreeClick = useCallback(
    (worktree: Worktree) => {
      if (worktree.id.startsWith("temp-") || deletingIds.has(worktree.id)) return;
      const terminals = (worktree as Worktree & { terminals?: TerminalType[] }).terminals ?? [];
      const first = terminals[0];
      if (first) {
        if (!activeTerminalId || !terminals.some((t) => t.id === activeTerminalId)) {
          setActiveTerminal(first.id);
        }
      } else {
        addTerminal(project.id, worktree.id, "worktree");
      }
    },
    [project.id, activeTerminalId, setActiveTerminal, addTerminal, deletingIds]
  );

  const handleDelete = useCallback(
    async (worktreeId: string) => {
      setDeletingIds((prev) => new Set(prev).add(worktreeId));
      try {
        await removeWorktree(project.id, worktreeId);
      } catch {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(worktreeId);
          return next;
        });
      }
    },
    [project.id, removeWorktree]
  );

  const handleRename = useCallback(
    (worktreeId: string, label: string) => {
      setLabel("worktree", worktreeId, label);
    },
    [setLabel]
  );

  return (
    <div className="px-2 pb-2">
      <div className="flex items-center gap-1.5 px-1 py-1.5 group">
        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="flex-1 min-w-0 truncate text-xs font-semibold text-foreground">
          {project.label || project.name}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
          onClick={() => refreshProject(project.id)}
        >
          <RefreshCw className="h-2.5 w-2.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 text-primary"
          onClick={() => openNewWorktreeDialog(project.id, "")}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <div className="space-y-1">
        {worktrees.map((w) => {
          const isCreating = w.id.startsWith("temp-");
          const isDeleting = deletingIds.has(w.id);
          return (
            <WorktreeCard
              key={w.id}
              worktree={w}
              isActive={activeWorktree?.id === w.id}
              loading={isCreating || isDeleting}
              onClick={() => handleWorktreeClick(w)}
              onDelete={() => handleDelete(w.id)}
              onRename={(label) => handleRename(w.id, label)}
            />
          );
        })}
      </div>
    </div>
  );
}

function SidebarFooter() {
  const {
    activeTerminalId,
    getActiveWorktree,
    getProjectById,
    getActiveTerminalParent,
    switchBranch,
  } = useProjectStore();

  const activeWorktree = getActiveWorktree();
  const terminalParent = getActiveTerminalParent();

  if (!activeTerminalId || !activeWorktree || !terminalParent) return null;

  const project = getProjectById(terminalParent.projectId);
  if (!project) return null;

  const currentBranch = activeWorktree.branch;

  const handleBranchChange = async (newBranch: string) => {
    if (newBranch === currentBranch) return;
    await switchBranch(terminalParent.projectId, newBranch, activeWorktree.path);
  };

  return (
    <div className="border-t border-border px-3 py-2">
      <Select value={currentBranch} onValueChange={handleBranchChange}>
        <SelectTrigger className="h-7 w-full text-xs bg-card border-border">
          <GitFork className="h-3 w-3 mr-1.5 text-muted-foreground" />
          <SelectValue placeholder="Select branch" />
        </SelectTrigger>
        <SelectContent>
          {project.branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.name} className="text-xs">
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function Sidebar() {
  const { projects } = useProjectStore();
  const { setAddProjectDialogOpen } = useUIStore();

  return (
    <TooltipProvider>
      <div className="flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2">
            <TerminalIcon className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">Agentree</span>
          </div>
          <div className="flex items-center gap-0.5">
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setAddProjectDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                No projects yet.
                <br />
                Click + to add one.
              </p>
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              {projects.map((p) => (
                <ProjectSection key={p.id} project={p} />
              ))}
            </div>
          )}
        </ScrollArea>
        <SidebarFooter />
      </div>
    </TooltipProvider>
  );
}
