import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import { GitFork, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { Terminal as TerminalType, Worktree } from "@/types/project";
import { POPOVER_CLASS, usePopover } from "./usePopover";

interface WorktreeCardProps {
  worktree: Worktree;
  isActive: boolean;
  loading: boolean;
  onDelete: () => void;
  onRename: (label: string) => void;
  activeTerminalId: string | null;
  onTerminalClick: (terminalId: string) => void;
  onWorktreeClick: () => void;
}

export function WorktreeCard(props: WorktreeCardProps) {
  const { worktree, isActive, onRename } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(worktree.label || "");
  const menuState = usePopover();
  const statusColor = getStatusColor(worktree.status);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    menuState.setOpen(false);
    setDraft(worktree.label || "");
    setEditing(true);
  };

  if (editing) {
    return (
      <WorktreeEditLabel
        worktree={worktree}
        draft={draft}
        statusColor={statusColor}
        onDraftChange={setDraft}
        onRename={onRename}
        onFinish={() => setEditing(false)}
      />
    );
  }

  return (
    <AccordionItem value={worktree.id} className="border-none">
      <WorktreeTrigger
        {...props}
        statusColor={statusColor}
        menuOpen={menuState.open}
        menuRefs={menuState.refs}
        getMenuRefProps={menuState.getReferenceProps}
        onStartEdit={startEdit}
      />
      <AccordionContent>
        <TerminalList
          worktree={worktree}
          isActive={isActive}
          activeTerminalId={props.activeTerminalId}
          onTerminalClick={props.onTerminalClick}
        />
      </AccordionContent>
      {menuState.open && (
        <WorktreeMenu
          menuRefs={menuState.refs}
          menuContext={menuState.context}
          getMenuFloatProps={menuState.getFloatingProps}
          onStartEdit={startEdit}
          onDelete={() => {
            menuState.setOpen(false);
            props.onDelete();
          }}
        />
      )}
    </AccordionItem>
  );
}

function getStatusColor(status: string | undefined) {
  if (status === "Dirty") return "bg-primary";
  if (status === "Detached") return "bg-muted-foreground";
  return "bg-[var(--trading-up)]";
}

function WorktreeEditLabel({
  worktree,
  draft,
  statusColor,
  onDraftChange,
  onRename,
  onFinish,
}: {
  worktree: Worktree;
  draft: string;
  statusColor: string;
  onDraftChange: (v: string) => void;
  onRename: (label: string) => void;
  onFinish: () => void;
}) {
  const commit = () => {
    if (draft.trim()) onRename(draft.trim());
    onFinish();
  };

  return (
    <AccordionItem value={worktree.id} className="border-none">
      <div
        className={cn("flex w-full items-center gap-2 px-3 py-2", "border-border border-b bg-card")}
      >
        <span className={cn("h-2 w-2 shrink-0 rounded-full", statusColor)} />
        <GitFork className="h-3.5 w-3.5 shrink-0 text-primary" />
        <input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              onDraftChange(worktree.label || "");
              onFinish();
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 bg-secondary px-1.5 py-0.5 text-foreground text-xs outline-none"
        />
      </div>
    </AccordionItem>
  );
}

function WorktreeTrigger({
  worktree,
  isActive,
  loading,
  statusColor,
  menuOpen,
  menuRefs,
  getMenuRefProps,
  onWorktreeClick,
}: WorktreeCardProps & {
  statusColor: string;
  menuOpen: boolean;
  menuRefs: { setReference: (node: HTMLElement | null) => void };
  getMenuRefProps: () => Record<string, unknown>;
  onStartEdit: (e: React.MouseEvent) => void;
}) {
  const menuRefProps = getMenuRefProps();
  const handleMenuClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <AccordionTrigger
      className={cn(
        "group flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:no-underline",
        isActive
          ? "border-border border-b bg-primary/10"
          : "border-transparent border-b hover:bg-accent/50",
        loading && "pointer-events-none opacity-60",
        "[&>svg]:hidden",
      )}
      onClick={onWorktreeClick}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", statusColor)} />
      <GitFork
        className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")}
      />
      <WorktreeLabel worktree={worktree} isActive={isActive} />
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
          onClick={handleMenuClick}
          {...menuRefProps}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      )}
    </AccordionTrigger>
  );
}

function WorktreeLabel({ worktree, isActive }: { worktree: Worktree; isActive: boolean }) {
  return (
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
  );
}

function TerminalList({
  worktree,
  isActive,
  activeTerminalId,
  onTerminalClick,
}: {
  worktree: Worktree;
  isActive: boolean;
  activeTerminalId: string | null;
  onTerminalClick: (id: string) => void;
}) {
  const terminals = (worktree as Worktree & { terminals?: TerminalType[] }).terminals ?? [];

  return (
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
  );
}

function WorktreeMenu({
  menuRefs,
  menuContext,
  getMenuFloatProps,
  onStartEdit,
  onDelete,
}: {
  menuRefs: { setFloating: (node: HTMLElement | null) => void };
  menuContext: ReturnType<typeof usePopover>["context"];
  getMenuFloatProps: () => Record<string, unknown>;
  onStartEdit: (e: React.MouseEvent) => void;
  onDelete: () => void;
}) {
  return (
    <FloatingPortal>
      <FloatingFocusManager context={menuContext} modal={false}>
        <div
          ref={menuRefs.setFloating}
          className={cn(POPOVER_CLASS, "w-36 py-1")}
          {...getMenuFloatProps()}
        >
          <button
            type="button"
            onClick={onStartEdit}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-foreground text-xs hover:bg-accent"
          >
            <Pencil className="h-3 w-3" />
            Edit Label
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
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
  );
}
