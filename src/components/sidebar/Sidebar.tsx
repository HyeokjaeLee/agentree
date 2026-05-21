import { useState, useCallback, useMemo } from "react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useNotificationStore, AGENT_ICONS } from "@/stores/useNotificationStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  useFloating,
  useClick,
  useDismiss,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager,
  autoUpdate,
  offset,
  shift,
} from "@floating-ui/react";
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
  X,
} from "lucide-react";
import type { Project, Worktree, Terminal as TerminalType } from "@/types/project";
import type { AgentType } from "@/types/notification";
import { cn } from "@/lib/utils";

const POPOVER_CLASS = "z-50 rounded-md border border-border bg-popover shadow-md animate-popover-in";

function usePopover(placement: "bottom-start" | "bottom-end" = "bottom-start") {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    strategy: "fixed",
    middleware: [offset(4), shift({ padding: 8, crossAxis: true })],
    whileElementsMounted: (...args) => autoUpdate(...args, { animationFrame: true }),
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);
  return { open, setOpen, refs, floatingStyles, context, getReferenceProps, getFloatingProps };
}

function NotificationBell() {
  const { notifications, unreadCount, markAllRead, markRead } = useNotificationStore();
  const { open, refs, floatingStyles, context, getReferenceProps, getFloatingProps } = usePopover();

  return (
    <>
      <Button ref={refs.setReference} variant="ghost" size="icon" className="relative h-7 w-7" {...getReferenceProps()}>
        <Bell className="h-3.5 w-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] text-white font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>
      <FloatingPortal>
        <FloatingFocusManager context={context} modal={false}>
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              visibility: open ? "visible" : "hidden",
              pointerEvents: open ? "auto" : "none",
            }}
            className={cn(POPOVER_CLASS, "w-72 py-0")}
            {...getFloatingProps()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] text-primary hover:text-primary/80"
                >
                  Mark all read
                </button>
              )}
            </div>
            <ScrollArea className="max-h-56">
              {notifications.length === 0 ? (
                <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                  No notifications yet
                </p>
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-2 px-3 py-2 border-b border-border last:border-0 cursor-pointer hover:bg-accent/50",
                      !n.read && "bg-primary/5"
                    )}
                    onClick={() => markRead(n.id)}
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                      {AGENT_ICONS[n.agent as AgentType] || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate">{n.message}</p>
                      <p className="text-[9px] text-muted-foreground">
                        {new Date(n.timestamp * 1000).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
        </FloatingFocusManager>
      </FloatingPortal>
    </>
  );
}

function AddProjectPopover() {
  const [path, setPath] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { open, setOpen, refs, floatingStyles, context, getReferenceProps, getFloatingProps } = usePopover();
  const { addProject } = useProjectStore();

  const handleBrowse = async () => {
    const selected = await openDialog({ directory: true, multiple: false, title: "Select Project Folder" });
    if (selected) setPath(selected);
  };

  const handleSubmit = async () => {
    if (!path.trim()) return;
    setLoading(true);
    setError("");
    try {
      await addProject(path.trim(), label.trim() || undefined);
      setPath("");
      setLabel("");
      setOpen(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setPath("");
    setLabel("");
    setError("");
    setOpen(false);
  };

  return (
    <>
      <Button ref={refs.setReference} variant="ghost" size="icon" className="h-7 w-7" {...getReferenceProps()}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
      <FloatingPortal>
        <FloatingFocusManager context={context} modal={false}>
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              visibility: open ? "visible" : "hidden",
              pointerEvents: open ? "auto" : "none",
            }}
            className={cn(POPOVER_CLASS, "w-64 p-0")}
            {...getFloatingProps()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs font-semibold">Add Project</span>
              <button onClick={close} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="p-3 space-y-2.5">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Path</label>
                <div className="mt-1 flex gap-1.5">
                  <Input
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="/path/to/repo"
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    className="h-7 text-xs"
                  />
                  <Button variant="outline" size="sm" onClick={handleBrowse} className="h-7 text-xs shrink-0">
                    <FolderOpen className="h-3 w-3 mr-1" />
                    Browse
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Label (optional)</label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="My Project"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="h-7 text-xs mt-1"
                />
              </div>
              {error && <p className="text-[10px] text-destructive">{error}</p>}
              <Button
                onClick={handleSubmit}
                disabled={loading || !path.trim()}
                className="w-full h-7 text-xs"
              >
                {loading ? "Adding..." : "Add Project"}
              </Button>
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingPortal>
    </>
  );
}

function NewWorktreePopover({ projectId }: { projectId: string }) {
  const [selectedBranch, setSelectedBranch] = useState("");
  const [label, setLabel] = useState("");
  const { open, setOpen, refs, floatingStyles, context, getReferenceProps, getFloatingProps } = usePopover();
  const { createWorktree, projects } = useProjectStore();

  const project = projects.find((p) => p.id === projectId);
  const branches = project?.branches ?? [];
  const worktreeCount = project?.worktrees.length ?? 0;

  const handleSubmit = () => {
    if (!selectedBranch.trim()) return;
    createWorktree(projectId, selectedBranch.trim(), label.trim() || undefined);
    setSelectedBranch("");
    setLabel("");
    setOpen(false);
  };

  const close = () => {
    setSelectedBranch("");
    setLabel("");
    setOpen(false);
  };

  return (
    <>
      <Button
        ref={refs.setReference}
        variant="ghost"
        size="icon"
        className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 text-primary"
        {...getReferenceProps()}
      >
        <Plus className="h-3 w-3" />
      </Button>
      <FloatingPortal>
        <FloatingFocusManager context={context} modal={false}>
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              visibility: open ? "visible" : "hidden",
              pointerEvents: open ? "auto" : "none",
            }}
            className={cn(POPOVER_CLASS, "w-60 p-0")}
            {...getFloatingProps()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs font-semibold">New Worktree</span>
              <button onClick={close} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="p-3 space-y-2.5">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Branch</label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={branches.length === 0}>
                  <SelectTrigger className="h-7 text-xs mt-1">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.name} className="text-xs">
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Label</label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={`${selectedBranch || "branch"}-agentree-${worktreeCount + 1}`}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="h-7 text-xs mt-1"
                />
              </div>
              <Button onClick={handleSubmit} disabled={!selectedBranch.trim()} className="w-full h-7 text-xs">
                Create Worktree
              </Button>
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingPortal>
    </>
  );
}

function WorktreeCard({
  worktree,
  isActive,
  loading,
  onDelete,
  onRename,
  activeTerminalId,
  onTerminalClick,
  onTerminalClose,
  onAddTerminal,
  onWorktreeClick,
}: {
  worktree: Worktree;
  isActive: boolean;
  loading: boolean;
  onDelete: () => void;
  onRename: (label: string) => void;
  activeTerminalId: string | null;
  onTerminalClick: (terminalId: string) => void;
  onTerminalClose: (terminalId: string) => void;
  onAddTerminal: () => void;
  onWorktreeClick: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(worktree.label || "");
  const { open: menuOpen, setOpen: setMenuOpen, refs: menuRefs, floatingStyles: menuStyles, context: menuContext, getReferenceProps: getMenuRefProps, getFloatingProps: getMenuFloatProps } = usePopover();

  const terminals = (worktree as Worktree & { terminals?: TerminalType[] }).terminals ?? [];

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
      <AccordionItem value={worktree.id} className="border-none">
        <div
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2",
            "bg-card border-y border-primary/30"
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
            className="flex-1 min-w-0 bg-secondary text-xs text-foreground outline-none px-1.5 py-0.5"
          />
        </div>
      </AccordionItem>
    );
  }

  const menuRefProps = getMenuRefProps();
  const handleMenuButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <AccordionItem value={worktree.id} className="border-none">
      <AccordionTrigger
        className={cn(
          "group w-full flex items-center gap-2 px-3 py-2 text-left transition-colors cursor-pointer hover:no-underline",
          isActive
            ? "bg-primary/10 border-y border-primary/30"
            : "hover:bg-accent/50 border-y border-transparent",
          loading && "opacity-60 pointer-events-none",
          "[&>svg]:hidden"
        )}
        onClick={() => {
          onWorktreeClick();
        }}
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
          <div
            ref={menuRefs.setReference}
            className={cn(
              "shrink-0 h-5 w-5 flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground",
              !menuOpen && "opacity-0 group-hover:opacity-100"
            )}
            onClick={handleMenuButtonClick}
            {...menuRefProps}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </div>
        )}
      </AccordionTrigger>
      <AccordionContent className="border-b">
        <div className={cn(
          "bg-card py-1 px-1",
          isActive ? "border-primary/30 bg-primary/5" : "border-border"
        )}>
          {terminals.map((t) => (
            <div
              key={t.id}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 text-xs cursor-pointer group",
                t.id === activeTerminalId
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
              onClick={(e) => { e.stopPropagation(); onTerminalClick(t.id); }}
            >
              <TerminalIcon className="h-3 w-3 shrink-0" />
              <span className="flex-1 min-w-0 truncate">{t.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onTerminalClose(t.id); }}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            onClick={(e) => { e.stopPropagation(); onAddTerminal(); }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-muted-foreground hover:text-primary hover:bg-accent/50 w-full cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>Add terminal</span>
          </button>
        </div>
      </AccordionContent>
      <FloatingPortal>
        <FloatingFocusManager context={menuContext} modal={false}>
          <div
            ref={menuRefs.setFloating}
            style={{
              ...menuStyles,
              visibility: menuOpen ? "visible" : "hidden",
              pointerEvents: menuOpen ? "auto" : "none",
            }}
            className={cn(POPOVER_CLASS, "w-36 py-1")}
            {...getMenuFloatProps()}
          >
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
        </FloatingFocusManager>
      </FloatingPortal>
    </AccordionItem>
  );
}

function ProjectSection({ project }: { project: Project }) {
  const {
    activeTerminalId,
    setActiveTerminal,
    addTerminal,
    removeTerminal,
    removeWorktree,
    setLabel,
    refreshProject,
  } = useProjectStore();

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

  const handleTerminalClose = useCallback(
    (worktreeId: string, terminalId: string) => {
      removeTerminal(project.id, worktreeId, "worktree", terminalId);
    },
    [project.id, removeTerminal]
  );

  const handleAddTerminal = useCallback(
    (worktreeId: string) => {
      addTerminal(project.id, worktreeId, "worktree");
    },
    [project.id, addTerminal]
  );

  return (
    <div className="pb-2">
      <div className="flex items-center gap-1.5 px-3 py-1.5 group">
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
        <NewWorktreePopover projectId={project.id} />
      </div>
      <Accordion type="multiple">
        {worktrees.map((w) => {
          const isCreating = w.id.startsWith("temp-");
          const isDeleting = deletingIds.has(w.id);
          return (
            <WorktreeCard
              key={w.id}
              worktree={w}
              isActive={activeWorktree?.id === w.id}
              loading={isCreating || isDeleting}
              onDelete={() => handleDelete(w.id)}
              onRename={(label) => handleRename(w.id, label)}
              activeTerminalId={activeTerminalId}
              onTerminalClick={setActiveTerminal}
              onTerminalClose={(tId) => handleTerminalClose(w.id, tId)}
              onAddTerminal={() => handleAddTerminal(w.id)}
              onWorktreeClick={() => handleWorktreeClick(w)}
            />
          );
        })}
      </Accordion>
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
            <AddProjectPopover />
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
            <div className="pt-2">
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
