import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectStore } from "@/stores/useProjectStore";
import { useUIStore } from "@/stores/useUIStore";
import { open } from "@tauri-apps/plugin-dialog";

export function AddProjectDialog() {
  const { addProjectDialogOpen, setAddProjectDialogOpen } = useUIStore();
  const { addProject } = useProjectStore();
  const [path, setPath] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBrowse = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Project Folder",
    });
    if (selected) {
      setPath(selected);
    }
  };

  const handleSubmit = async () => {
    if (!path.trim()) return;
    setLoading(true);
    setError("");
    try {
      await addProject(path.trim(), label.trim() || undefined);
      setPath("");
      setLabel("");
      setAddProjectDialogOpen(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={addProjectDialogOpen} onOpenChange={setAddProjectDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Project</DialogTitle>
          <DialogDescription>
            Enter the path to a git repository to add it as a project.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Repository Path</label>
            <div className="mt-1 flex gap-2">
              <Input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/path/to/repo"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <Button variant="outline" onClick={handleBrowse} type="button">
                Browse...
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Label (optional)
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="My Project"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="mt-1"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddProjectDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !path.trim()}>
              {loading ? "Adding..." : "Add Project"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function NewBranchDialog() {
  const { newBranchDialogProjectId, closeNewBranchDialog } = useUIStore();
  const { createBranch } = useProjectStore();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !newBranchDialogProjectId) return;
    setLoading(true);
    setError("");
    try {
      await createBranch(newBranchDialogProjectId, name.trim());
      setName("");
      closeNewBranchDialog();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!newBranchDialogProjectId} onOpenChange={() => closeNewBranchDialog()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Branch</DialogTitle>
          <DialogDescription>Create a new branch in this project.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Branch Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="feature/my-feature"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="mt-1"
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeNewBranchDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
              {loading ? "Creating..." : "Create Branch"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function NewWorktreeDialog() {
  const { newWorktreeDialogProjectId, newWorktreeDialogBranch, closeNewWorktreeDialog } =
    useUIStore();
  const { createWorktree, projects } = useProjectStore();
  const [selectedBranch, setSelectedBranch] = useState("");
  const [label, setLabel] = useState("");

  const project = projects.find((p) => p.id === newWorktreeDialogProjectId);
  const branches = project?.branches ?? [];

  useEffect(() => {
    if (newWorktreeDialogProjectId) {
      setSelectedBranch(newWorktreeDialogBranch || "");
      setLabel("");
    }
  }, [newWorktreeDialogProjectId, newWorktreeDialogBranch]);

  const handleSubmit = () => {
    if (!newWorktreeDialogProjectId || !selectedBranch.trim()) return;

    createWorktree(
      newWorktreeDialogProjectId,
      selectedBranch.trim(),
      label.trim() || undefined,
    );
    setSelectedBranch("");
    setLabel("");
    closeNewWorktreeDialog();
  };

  return (
    <Dialog
      open={!!newWorktreeDialogProjectId}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedBranch("");
          setLabel("");
          closeNewWorktreeDialog();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Worktree</DialogTitle>
          <DialogDescription>Create a new worktree from a branch.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Base Branch</label>
            <Select
              value={selectedBranch}
              onValueChange={setSelectedBranch}
              disabled={branches.length === 0}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.name}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Label
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`${selectedBranch || 'branch'}-agentree-${(project?.worktrees.length ?? 0) + 1}`}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Leave empty to auto-generate
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedBranch("");
                setLabel("");
                closeNewWorktreeDialog();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedBranch.trim()}
            >
              Create Worktree
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
