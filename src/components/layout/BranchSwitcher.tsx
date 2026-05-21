import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjectStore } from "@/stores/useProjectStore";

export function BranchSwitcher() {
  const {
    activeTerminalId,
    getActiveTerminal,
    getActiveWorktree,
    getActiveTerminalParent,
    getProjectById,
    switchBranch,
  } = useProjectStore();

  const activeTerminal = getActiveTerminal();
  const activeWorktree = getActiveWorktree();
  const terminalParent = getActiveTerminalParent();

  if (!activeTerminalId || !activeTerminal || !terminalParent) {
    return (
      <Select disabled>
        <SelectTrigger className="h-7 w-40 text-xs bg-transparent border-0">
          <SelectValue placeholder="No terminal" />
        </SelectTrigger>
        <SelectContent />
      </Select>
    );
  }

  const project = getProjectById(activeTerminal.project_id);
  if (!project) {
    return (
      <Select disabled>
        <SelectTrigger className="h-7 w-40 text-xs bg-transparent border-0">
          <SelectValue placeholder="No terminal" />
        </SelectTrigger>
        <SelectContent />
      </Select>
    );
  }

  const currentBranch = activeWorktree
    ? activeWorktree.branch
    : project.branches.find((b) => b.id === terminalParent.parentId)?.name ?? "";

  const handleBranchChange = async (newBranch: string) => {
    if (newBranch === currentBranch) return;
    await switchBranch(
      terminalParent.projectId,
      newBranch,
      activeWorktree?.path
    );
  };

  return (
    <Select value={currentBranch} onValueChange={handleBranchChange}>
      <SelectTrigger className="h-7 w-40 text-xs bg-transparent border-0 hover:bg-accent/50">
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
  );
}
