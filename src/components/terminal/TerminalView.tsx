import { useEffect, useRef, useState, useCallback } from "react";
import { useProjectStore } from "@/stores/useProjectStore";
import { usePty, useXterm, hasPtySession } from "@/hooks/usePty";
import { useGhosttyTheme } from "@/hooks/useGhosttyTheme";
import { cn } from "@/lib/utils";
import { X, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
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

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  if (isEditing) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-border cursor-pointer group",
          "max-w-[180px] min-w-[80px]",
          isActive
            ? "bg-background text-foreground border-b-2 border-b-primary"
            : "bg-muted/50 text-muted-foreground"
        )}
        onClick={onClick}
      >
        <input
          autoFocus
          className="bg-transparent text-foreground outline-none border-b border-primary w-full"
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
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-border cursor-pointer group",
        "max-w-[180px] min-w-[80px] shrink-0",
        isActive
          ? "bg-background text-foreground border-b-2 border-b-primary"
          : "bg-muted/50 text-muted-foreground hover:bg-accent/50"
      )}
      onClick={onClick}
      onContextMenu={handleContextMenu}
    >
      <span className="truncate flex-1 min-w-0">
        {terminal.name}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div
            className="fixed z-50 w-32 rounded-md border border-border bg-popover shadow-md py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent"
              onClick={(e) => { e.stopPropagation(); setContextMenu(null); onStartEdit(); }}
            >
              <Pencil className="h-3 w-3" />
              Rename
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-accent"
              onClick={(e) => { e.stopPropagation(); setContextMenu(null); onClose(); }}
            >
              <X className="h-3 w-3" />
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TerminalCanvas({ terminal, cwd, visible }: { terminal: TerminalType; cwd: string; visible: boolean }) {
  const { theme, fontFamily, fontSize } = useGhosttyTheme();
  const { containerRef, terminal: xtermRef, fit } = useXterm({ theme, fontFamily, fontSize });
  const { spawnPty } = usePty(terminal.id, { cwd });

  useEffect(() => {
    const term = xtermRef.current;
    if (!term || hasPtySession(terminal.id)) return;
    spawnPty(term, term.cols, term.rows);
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
      className="absolute inset-0 bg-background"
      style={{ visibility: visible ? "visible" : "hidden" }}
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

  const handleClose = useCallback(
    (projectId: string, parentId: string, parentType: "branch" | "worktree", terminalId: string) => {
      removeTerminal(projectId, parentId, parentType, terminalId);
    },
    [removeTerminal]
  );

  const handleCommitEdit = useCallback(
    (terminalId: string, newName: string) => {
      renameTerminal(terminalId, newName);
      setEditingTerminalId(null);
    },
    [renameTerminal]
  );

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
            onClick={() => addTerminal(terminalParent?.projectId ?? "", activeWorktree.id, "worktree")}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Open Terminal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-border bg-muted/30 overflow-x-auto shrink-0">
        {visibleTerminals.map(({ terminal, projectId, parentId, parentType }) => (
          <TerminalTab
            key={terminal.id}
            terminal={terminal}
            isActive={terminal.id === activeTerminalId}
            isEditing={terminal.id === editingTerminalId}
            onClick={() => setActiveTerminal(terminal.id)}
            onClose={() => handleClose(projectId, parentId, parentType, terminal.id)}
            onStartEdit={() => setEditingTerminalId(terminal.id)}
            onCommitEdit={(newName) => handleCommitEdit(terminal.id, newName)}
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
