import { Plus } from "lucide-react";
import { useEffect } from "react";
import { BranchSwitcher } from "@/components/layout/BranchSwitcher";
import { Button } from "@/components/ui/button";
import { useGhosttyTheme } from "@/hooks/useGhosttyTheme";
import { hasPtySession, usePty } from "@/hooks/usePty";
import { useXterm } from "@/hooks/useXterm";
import { useProjectStore } from "@/stores/useProjectStore";
import type { Branch, Terminal as TerminalType, Worktree } from "@/types/project";

interface TerminalEntry {
  terminal: TerminalType;
  cwd: string;
  projectId: string;
  parentId: string;
  parentType: "branch" | "worktree";
}

function collectTerminals(
  projects: ReturnType<typeof useProjectStore.getState>["projects"],
): TerminalEntry[] {
  const result: TerminalEntry[] = [];
  for (const p of projects) {
    for (const w of p.worktrees) {
      const terms = (w as Worktree & { terminals?: TerminalType[] }).terminals ?? [];
      for (const t of terms) {
        result.push({
          terminal: t,
          cwd: w.path,
          projectId: p.id,
          parentId: w.id,
          parentType: "worktree",
        });
      }
    }
    for (const b of p.branches) {
      const terms = (b as Branch & { terminals?: TerminalType[] }).terminals ?? [];
      for (const t of terms) {
        result.push({
          terminal: t,
          cwd: p.path,
          projectId: p.id,
          parentId: b.id,
          parentType: "branch",
        });
      }
    }
  }
  return result;
}

function TerminalCanvas({
  terminal,
  cwd,
  visible,
}: {
  terminal: TerminalType;
  cwd: string;
  visible: boolean;
}) {
  const { theme, fontFamily, fontSize } = useGhosttyTheme();
  const { containerRef, terminal: xtermRef, fit } = useXterm({ theme, fontFamily, fontSize });
  const { spawnPty } = usePty(terminal.id, { cwd });

  useEffect(() => {
    const term = xtermRef.current;
    if (!term || hasPtySession(terminal.id)) {
      return;
    }
    spawnPty(term, term.cols, term.rows);
  }, [xtermRef.current, terminal.id, spawnPty]);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(fit, 50);
      return () => clearTimeout(timer);
    }
  }, [visible, fit]);

  return <div ref={containerRef} className="absolute inset-0 bg-background" />;
}

function TerminalToolbar({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex shrink-0 items-center justify-between border-border border-b bg-muted/30 px-2 py-1">
      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={onAdd}>
        <Plus className="h-3.5 w-3.5" /> Terminal
      </Button>
      <BranchSwitcher />
    </div>
  );
}

export function TerminalView() {
  const { activeTerminalId, getActiveTerminalParent, addTerminal, projects } = useProjectStore();
  const terminalParent = getActiveTerminalParent();
  const activeWorktree = useProjectStore((s) => s.getActiveWorktree());

  const allTerminals = collectTerminals(projects);
  const visibleTerminals = activeWorktree
    ? allTerminals.filter((t) => t.parentId === activeWorktree.id)
    : [];

  if (!activeWorktree) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Select a worktree</p>
          <p className="mt-1 text-xs">Choose a worktree from the sidebar to get started</p>
        </div>
      </div>
    );
  }

  const addNewTerminal = () =>
    addTerminal(terminalParent?.projectId ?? "", activeWorktree.id, "worktree");

  if (visibleTerminals.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <TerminalToolbar onAdd={addNewTerminal} />
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <p className="text-sm">No terminals open</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <TerminalToolbar onAdd={addNewTerminal} />
      <div className="relative min-h-0 flex-1">
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
