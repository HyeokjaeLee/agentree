import {
  autoUpdate,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  Bell,
  FolderOpen,
  GitFork,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Terminal as TerminalIcon,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useId, useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AGENT_ICONS, useNotificationStore } from "@/stores/useNotificationStore";
import { useProjectStore } from "@/stores/useProjectStore";
import type { AgentType } from "@/types/notification";
import type { Project, Terminal as TerminalType, Worktree } from "@/types/project";

const POPOVER_CLASS =
  "z-50 rounded-md border border-border bg-popover shadow-md animate-fade-in animate-duration-150";

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
  const { open, refs, context, getReferenceProps, getFloatingProps } = usePopover();

  return (
    <>
      <Button
        ref={refs.setReference}
        variant="ghost"
        size="icon"
        className="relative h-7 w-7"
        {...getReferenceProps()}
      >
        <Bell className="h-3.5 w-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive font-bold text-[8px] text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>
      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              className={cn(POPOVER_CLASS, "w-72 py-0")}
              {...getFloatingProps()}
            >
              <div className="flex items-center justify-between border-border border-b px-3 py-2">
                <span className="font-semibold text-xs">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[10px] text-primary hover:text-primary/80"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <ScrollArea className="max-h-56">
                {notifications.length === 0 ? (
                  <p className="px-3 py-4 text-center text-muted-foreground text-xs">
                    No notifications yet
                  </p>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <button
                      type="button"
                      key={n.id}
                      className={cn(
                        "flex w-full cursor-pointer items-start gap-2 border-border border-b px-3 py-2 last:border-0 hover:bg-accent/50 text-left",
                        !n.read && "bg-primary/5",
                      )}
                      onClick={() => markRead(n.id)}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-[9px] text-primary">
                        {AGENT_ICONS[n.agent as AgentType] || "?"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-[11px]">{n.message}</span>
                        <span className="block text-[9px] text-muted-foreground">
                          {new Date(n.timestamp * 1000).toLocaleTimeString()}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </ScrollArea>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}

function AddProjectPopover() {
  const uid = useId();
  const pathId = `${uid}-path`;
  const labelId = `${uid}-label`;
  const [path, setPath] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { open, setOpen, refs, context, getReferenceProps, getFloatingProps } =
    usePopover();
  const { addProject } = useProjectStore();

  const handleBrowse = async () => {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: "Select Project Folder",
    });
    if (selected) {
      setPath(selected);
    }
  };

  const handleSubmit = async () => {
    if (!path.trim()) {
      return;
    }
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
      <Button
        ref={refs.setReference}
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        {...getReferenceProps()}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              className={cn(POPOVER_CLASS, "w-64 p-0")}
              {...getFloatingProps()}
            >
              <div className="flex items-center justify-between border-border border-b px-3 py-2">
                <span className="font-semibold text-xs">Add Project</span>
                <button type="button" onClick={close} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-2.5 p-3">
                <div>
                  <label htmlFor="add-project-path" className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                    Path
                  </label>
                  <div className="mt-1 flex gap-1.5">
                    <Input
                      id="add-project-path"
                      value={path}
                      onChange={(e) => setPath(e.target.value)}
                      placeholder="/path/to/repo"
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      className="h-7 text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBrowse}
                      className="h-7 shrink-0 text-xs"
                    >
                      <FolderOpen className="mr-1 h-3 w-3" />
                      Browse
                    </Button>
                  </div>
                </div>
                <div>
                  <label htmlFor="add-project-label" className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                    Label (optional)
                  </label>
                  <Input
                    id="add-project-label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="My Project"
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    className="mt-1 h-7 text-xs"
                  />
                </div>
                {error && <p className="text-[10px] text-destructive">{error}</p>}
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !path.trim()}
                  className="h-7 w-full text-xs"
                >
                  {loading ? "Adding..." : "Add Project"}
                </Button>
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}

function NewWorktreePopover({ projectId }: { projectId: string }) {
  const [selectedBranch, setSelectedBranch] = useState("");
  const [label, setLabel] = useState("");
  const { open, setOpen, refs, context, getReferenceProps, getFloatingProps } =
    usePopover();
  const { createWorktree, projects } = useProjectStore();

  const project = projects.find((p) => p.id === projectId);
  const branches = project?.branches ?? [];
  const remoteBranches = project?.remote_branches ?? [];
  const worktreeCount = project?.worktrees.length ?? 0;
  const hasBranches = branches.length > 0 || remoteBranches.length > 0;

  const handleSubmit = () => {
    if (!selectedBranch.trim()) {
      return;
    }
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
        className="h-5 w-5 shrink-0 text-primary opacity-0 group-hover:opacity-100"
        {...getReferenceProps()}
      >
        <Plus className="h-3 w-3" />
      </Button>
      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              className={cn(POPOVER_CLASS, "w-60 p-0")}
              {...getFloatingProps()}
            >
              <div className="flex items-center justify-between border-border border-b px-3 py-2">
                <span className="font-semibold text-xs">New Worktree</span>
                <button type="button" onClick={close} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-2.5 p-3">
                <div>
                  <label htmlFor="new-worktree-branch" className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                    Branch
                  </label>
                  <Select
                    value={selectedBranch}
                    onValueChange={setSelectedBranch}
                    disabled={!hasBranches}
                  >
                    <SelectTrigger id="new-worktree-branch" className="mt-1 h-7 text-xs">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.length > 0 && (
                        <>
                          <div className="px-2 py-1 font-semibold text-[9px] text-muted-foreground uppercase tracking-wider">
                            Local
                          </div>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.name} className="text-xs">
                              {branch.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {remoteBranches.length > 0 && (
                        <>
                          <div className="mt-1 border-border border-t px-2 py-1 font-semibold text-[9px] text-muted-foreground uppercase tracking-wider">
                            Remote
                          </div>
                          {remoteBranches.map((rb) => (
                            <SelectItem key={rb} value={rb} className="text-xs">
                              {rb}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="new-worktree-label" className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                    Label
                  </label>
                  <Input
                    id="new-worktree-label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={`${selectedBranch || "branch"}-agentree-${worktreeCount + 1}`}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    className="mt-1 h-7 text-xs"
                  />
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedBranch.trim()}
                  className="h-7 w-full text-xs"
                >
                  Create Worktree
                </Button>
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
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
  onWorktreeClick,
}: {
  worktree: Worktree;
  isActive: boolean;
  loading: boolean;
  onDelete: () => void;
  onRename: (label: string) => void;
  activeTerminalId: string | null;
  onTerminalClick: (terminalId: string) => void;
  onWorktreeClick: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(worktree.label || "");
  const {
    open: menuOpen,
    setOpen: setMenuOpen,
    refs: menuRefs,
    context: menuContext,
    getReferenceProps: getMenuRefProps,
    getFloatingProps: getMenuFloatProps,
  } = usePopover();

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

  const menuRefProps = getMenuRefProps();
  const handleMenuButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (editing) {
    return (
      <AccordionItem value={worktree.id} className="border-none">
        <div
          className={cn(
            "flex w-full items-center gap-2 px-3 py-2",
            "border-border border-b bg-card",
          )}
        >
          <span className={cn("h-2 w-2 shrink-0 rounded-full", statusColor)} />
          <GitFork className="h-3.5 w-3.5 shrink-0 text-primary" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (draft.trim()) {
                onRename(draft.trim());
              }
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (draft.trim()) {
                  onRename(draft.trim());
                }
                setEditing(false);
              }
              if (e.key === "Escape") {
                setDraft(worktree.label || "");
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 bg-secondary px-1.5 py-0.5 text-foreground text-xs outline-none"
          />
        </div>
      </AccordionItem>
    );
  }

  return (
    <AccordionItem value={worktree.id} className="border-none">
      <AccordionTrigger
        className={cn(
          "group flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:no-underline",
          isActive
            ? "border-border border-b bg-primary/10"
            : "border-transparent border-b hover:bg-accent/50",
          loading && "pointer-events-none opacity-60",
          "[&>svg]:hidden",
        )}
        onClick={() => {
          onWorktreeClick();
        }}
      >
        <span className={cn("h-2 w-2 shrink-0 rounded-full", statusColor)} />
        <GitFork
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            isActive ? "text-primary" : "text-muted-foreground",
          )}
        />
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate font-medium text-xs",
              isActive ? "text-primary" : "text-foreground",
            )}
          >
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
            type="button"
            ref={menuRefs.setReference}
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground",
              !menuOpen && "opacity-0 group-hover:opacity-100",
            )}
            onClick={handleMenuButtonClick}
            {...menuRefProps}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        )}
      </AccordionTrigger>
      <AccordionContent>
        <div className={cn(isActive && "bg-primary/5")}>
          {terminals.map((t) => (
            <button
              type="button"
              key={t.id}
              className={cn(
                "group flex w-full cursor-pointer items-center px-3 py-1.5 text-xs text-left",
                t.id === activeTerminalId
                  ? "bg-primary/15 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onTerminalClick(t.id);
              }}
            >
              <span className="min-w-0 flex-1 truncate">{t.name}</span>
            </button>
          ))}
        </div>
      </AccordionContent>
      {menuOpen && (
        <FloatingPortal>
          <FloatingFocusManager context={menuContext} modal={false}>
            <div
              ref={menuRefs.setFloating}
              className={cn(POPOVER_CLASS, "w-36 py-1")}
              {...getMenuFloatProps()}
            >
              <button
                type="button"
                onClick={startEdit}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-foreground text-xs hover:bg-accent"
              >
                <Pencil className="h-3 w-3" />
                Edit Label
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-destructive text-xs hover:bg-accent"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </AccordionItem>
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

  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const worktrees = project.worktrees;

  const activeWorktree = useMemo(() => {
    if (!activeTerminalId) {
      return null;
    }
    for (const w of worktrees) {
      const terminals = (w as Worktree & { terminals?: TerminalType[] }).terminals ?? [];
      if (terminals.some((t) => t.id === activeTerminalId)) {
        return w;
      }
    }
    return null;
  }, [activeTerminalId, worktrees]);

  const handleWorktreeClick = useCallback(
    (worktree: Worktree) => {
      if (worktree.id.startsWith("temp-") || deletingIds.has(worktree.id)) {
        return;
      }
      const terminals = (worktree as Worktree & { terminals?: TerminalType[] }).terminals ?? [];
      const first = terminals[0];
      if (first) {
        if (!(activeTerminalId && terminals.some((t) => t.id === activeTerminalId))) {
          setActiveTerminal(first.id);
        }
      } else {
        addTerminal(project.id, worktree.id, "worktree");
      }
    },
    [project.id, activeTerminalId, setActiveTerminal, addTerminal, deletingIds],
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
    [project.id, removeWorktree],
  );

  const handleRename = useCallback(
    (worktreeId: string, label: string) => {
      setLabel("worktree", worktreeId, label);
    },
    [setLabel],
  );

  return (
    <div className="border-border border-b pb-2">
      <div className="group flex items-center gap-1.5 px-3 py-1.5">
        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate font-semibold text-foreground text-xs">
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
              onWorktreeClick={() => handleWorktreeClick(w)}
            />
          );
        })}
      </Accordion>
    </div>
  );
}

export function Sidebar() {
  const { projects } = useProjectStore();

  return (
    <TooltipProvider>
      <div className="flex h-full w-full flex-col border-sidebar-border border-r bg-sidebar">
        <div className="flex shrink-0 items-center justify-between border-sidebar-border border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <TerminalIcon className="h-4 w-4 text-primary" />
            <span className="font-bold text-sidebar-foreground text-sm tracking-tight">
              Agentree
            </span>
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
              <p className="text-muted-foreground text-xs">
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
      </div>
    </TooltipProvider>
  );
}
