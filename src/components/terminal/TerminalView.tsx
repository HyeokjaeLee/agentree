import { useEffect, useRef, useState, useCallback } from "react";
import { useProjectStore } from "@/stores/useProjectStore";
import { usePty, useXterm, killPtySession, hasPtySession } from "@/hooks/usePty";
import { useGhosttyTheme } from "@/hooks/useGhosttyTheme";
import { cn } from "@/lib/utils";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Branch, Worktree, Terminal as TerminalType } from "@/types/project";

function TerminalTab({
  terminal,
  isActive,
  isEditing,
  onClick,
  onClose,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
}: {
  terminal: TerminalType;
  isActive: boolean;
  isEditing: boolean;
  onClick: () => void;
  onClose: () => void;
  onStartEdit: () => void;
  onCommitEdit: (newName: string) => void;
  onCancelEdit: () => void;
}) {
  const [draft, setDraft] = useState(terminal.name);
  const committedRef = useRef(false);

  useEffect(() => {
    if (isEditing) {
      setDraft(terminal.name);
      committedRef.current = false;
    }
  }, [isEditing, terminal.name]);

  const commit = useCallback(() => {
    if (committedRef.current) return;
    committedRef.current = true;
    const trimmed = draft.trim();
    if (trimmed && trimmed !== terminal.name) {
      onCommitEdit(trimmed);
    } else {
      onCancelEdit();
    }
  }, [draft, terminal.name, onCommitEdit, onCancelEdit]);

  if (isEditing) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-border cursor-pointer group min-w-0",
          isActive
            ? "bg-background text-foreground border-b-2 border-b-primary"
            : "bg-muted/50 text-muted-foreground hover:bg-accent/50"
        )}
        onClick={onClick}
      >
        <input
          autoFocus
          className="bg-transparent text-foreground outline-none border-b border-primary w-full min-w-[60px]"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit();
            } else if (e.key === "Escape") {
              committedRef.current = true;
              onCancelEdit();
            }
          }}
          onBlur={commit}
          onClick={(e) => e.stopPropagation()}
        />
        {terminal.label && terminal.label !== terminal.name && (
          <Badge variant="secondary" className="h-4 px-1 text-[9px]">
            {terminal.label}
          </Badge>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-border cursor-pointer group min-w-0",
        isActive
          ? "bg-background text-foreground border-b-2 border-b-primary"
          : "bg-muted/50 text-muted-foreground hover:bg-accent/50"
      )}
      onClick={onClick}
    >
      <span className="truncate" onDoubleClick={onStartEdit}>
        {terminal.name}
      </span>
      {terminal.label && terminal.label !== terminal.name && (
        <Badge variant="secondary" className="h-4 px-1 text-[9px]">
          {terminal.label}
        </Badge>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function TerminalCanvas({ terminal, cwd, visible }: { terminal: TerminalType; cwd: string; visible: boolean }) {
  const { theme, fontFamily, fontSize } = useGhosttyTheme();
  const { containerRef, terminal: xtermRef, fit } = useXterm({ theme, fontFamily, fontSize });
  const { spawnPty } = usePty(terminal.id, { cwd });

  useEffect(() => {
    if (xtermRef.current && !hasPtySession(terminal.id)) {
      const term = xtermRef.current;
      spawnPty(term, term.cols, term.rows);
    }
  }, [xtermRef.current, terminal.id, spawnPty]);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(fit, 50);
      return () => clearTimeout(timer);
    }
  }, [visible, fit]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-background"
      style={{ display: visible ? "block" : "none" }}
    />
  );
}

export function TerminalView() {
  const {
    activeTerminalId,
    setActiveTerminal,
    getActiveTerminalParent,
    addTerminal,
    removeTerminal,
    projects,
    renameTerminal,
  } = useProjectStore();

  const [editingTerminalId, setEditingTerminalId] = useState<string | null>(null);

  const terminalParent = getActiveTerminalParent();

  const activeWorktree = useProjectStore((s) => s.getActiveWorktree());

  const allTerminals: { terminal: TerminalType; cwd: string; projectId: string; parentId: string; parentType: "branch" | "worktree" }[] = [];
  for (const p of projects) {
    for (const w of p.worktrees) {
      const terms = (w as Worktree & { terminals?: TerminalType[] }).terminals ?? [];
      for (const t of terms) {
        allTerminals.push({ terminal: t, cwd: w.path, projectId: p.id, parentId: w.id, parentType: "worktree" });
      }
    }
    for (const b of p.branches) {
      const terms = (b as Branch & { terminals?: TerminalType[] }).terminals ?? [];
      for (const t of terms) {
        allTerminals.push({ terminal: t, cwd: p.path, projectId: p.id, parentId: b.id, parentType: "branch" });
      }
    }
  }

  const visibleTerminals = activeWorktree
    ? allTerminals.filter((t) => t.parentId === activeWorktree.id)
    : [];

  if (!activeWorktree) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Select a worktree</p>
          <p className="text-xs mt-1">Choose a worktree from the sidebar to get started</p>
        </div>
      </div>
    );
  }

  if (visibleTerminals.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">No terminals open</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => addTerminal(terminalParent!.projectId, activeWorktree.id, "worktree")}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Open Terminal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-border bg-muted/30 overflow-x-auto">
        {visibleTerminals.map(({ terminal, projectId, parentId, parentType }) => (
          <TerminalTab
            key={terminal.id}
            terminal={terminal}
            isActive={terminal.id === activeTerminalId}
            isEditing={terminal.id === editingTerminalId}
            onClick={() => setActiveTerminal(terminal.id)}
            onClose={() => {
              killPtySession(terminal.id);
              removeTerminal(projectId, parentId, parentType, terminal.id);
            }}
            onStartEdit={() => setEditingTerminalId(terminal.id)}
            onCommitEdit={(newName) => {
              renameTerminal(terminal.id, newName);
              setEditingTerminalId(null);
            }}
            onCancelEdit={() => setEditingTerminalId(null)}
          />
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 mx-1"
          onClick={() => addTerminal(terminalParent?.projectId ?? "", activeWorktree.id, "worktree")}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 min-h-0 relative">
        {allTerminals.map(({ terminal, cwd }) => (
          <TerminalCanvas
            key={terminal.id}
            terminal={terminal}
            cwd={cwd}
            visible={terminal.id === activeTerminalId}
          />
        ))}
      </div>
    </div>
  );
}
