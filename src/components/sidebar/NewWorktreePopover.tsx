import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import { Plus, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/useProjectStore";
import type { Branch, Project } from "@/types/project";
import { POPOVER_CLASS, usePopover } from "./usePopover";

export function NewWorktreePopover({ projectId }: { projectId: string }) {
  const uid = useId();
  const [selectedBranch, setSelectedBranch] = useState("");
  const [label, setLabel] = useState("");
  const { open, setOpen, refs, context, getReferenceProps, getFloatingProps } = usePopover();
  const { createWorktree, projects } = useProjectStore();

  const projectData = useProjectData(projects, projectId);
  const handleSubmit = useWorktreeSubmit(
    projectId,
    selectedBranch,
    label,
    createWorktree,
    setSelectedBranch,
    setLabel,
    setOpen,
  );
  const close = useCloseHandler(setSelectedBranch, setLabel, setOpen);

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
              <PopoverHeader title="New Worktree" onClose={close} />
              <NewWorktreeForm
                branchId={`${uid}-branch`}
                labelId={`${uid}-label`}
                selectedBranch={selectedBranch}
                label={label}
                branches={projectData.branches}
                remoteBranches={projectData.remoteBranches}
                hasBranches={projectData.hasBranches}
                worktreeCount={projectData.worktreeCount}
                onBranchChange={setSelectedBranch}
                onLabelChange={setLabel}
                onSubmit={handleSubmit}
              />
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}

function useProjectData(projects: Project[], projectId: string) {
  const project = projects.find((p) => p.id === projectId);
  return {
    branches: project?.branches ?? [],
    remoteBranches: project?.remote_branches ?? [],
    worktreeCount: project?.worktrees.length ?? 0,
    hasBranches: (project?.branches.length ?? 0) > 0 || (project?.remote_branches?.length ?? 0) > 0,
  };
}

function useWorktreeSubmit(
  projectId: string,
  selectedBranch: string,
  label: string,
  createWorktree: (pId: string, branch: string, label?: string) => void,
  setSelectedBranch: (v: string) => void,
  setLabel: (v: string) => void,
  setOpen: (v: boolean) => void,
) {
  return () => {
    if (!selectedBranch.trim()) return;
    createWorktree(projectId, selectedBranch.trim(), label.trim() || undefined);
    setSelectedBranch("");
    setLabel("");
    setOpen(false);
  };
}

function useCloseHandler(
  setSelectedBranch: (v: string) => void,
  setLabel: (v: string) => void,
  setOpen: (v: boolean) => void,
) {
  return () => {
    setSelectedBranch("");
    setLabel("");
    setOpen(false);
  };
}

function PopoverHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-border border-b px-3 py-2">
      <span className="font-semibold text-xs">{title}</span>
      <button
        type="button"
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function NewWorktreeForm({
  branchId,
  labelId,
  selectedBranch,
  label,
  branches,
  remoteBranches,
  hasBranches,
  worktreeCount,
  onBranchChange,
  onLabelChange,
  onSubmit,
}: {
  branchId: string;
  labelId: string;
  selectedBranch: string;
  label: string;
  branches: Branch[];
  remoteBranches: string[];
  hasBranches: boolean;
  worktreeCount: number;
  onBranchChange: (v: string) => void;
  onLabelChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-2.5 p-3">
      <BranchSelect
        id={branchId}
        selected={selectedBranch}
        branches={branches}
        remoteBranches={remoteBranches}
        disabled={!hasBranches}
        onChange={onBranchChange}
      />
      <LabelInput
        id={labelId}
        value={label}
        placeholder={`${selectedBranch || "branch"}-agentree-${worktreeCount + 1}`}
        onChange={onLabelChange}
        onSubmit={onSubmit}
      />
      <Button onClick={onSubmit} disabled={!selectedBranch.trim()} className="h-7 w-full text-xs">
        Create Worktree
      </Button>
    </div>
  );
}

function BranchSelect({
  id,
  selected,
  branches,
  remoteBranches,
  disabled,
  onChange,
}: {
  id: string;
  selected: string;
  branches: Branch[];
  remoteBranches: string[];
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide"
      >
        Branch
      </label>
      <Select value={selected} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="mt-1 h-7 text-xs">
          <SelectValue placeholder="Select branch" />
        </SelectTrigger>
        <SelectContent>
          {branches.length > 0 && <LocalBranchItems branches={branches} />}
          {remoteBranches.length > 0 && <RemoteBranchItems branches={remoteBranches} />}
        </SelectContent>
      </Select>
    </div>
  );
}

function LabelInput({
  id,
  value,
  placeholder,
  onChange,
  onSubmit,
}: {
  id: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide"
      >
        Label
      </label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        className="mt-1 h-7 text-xs"
      />
    </div>
  );
}

function LocalBranchItems({ branches }: { branches: Branch[] }) {
  return (
    <>
      <div className="px-2 py-1 font-semibold text-[9px] text-muted-foreground uppercase tracking-wider">
        Local
      </div>
      {branches.map((b) => (
        <SelectItem key={b.id} value={b.name} className="text-xs">
          {b.name}
        </SelectItem>
      ))}
    </>
  );
}

function RemoteBranchItems({ branches }: { branches: string[] }) {
  return (
    <>
      <div className="mt-1 border-border border-t px-2 py-1 font-semibold text-[9px] text-muted-foreground uppercase tracking-wider">
        Remote
      </div>
      {branches.map((rb) => (
        <SelectItem key={rb} value={rb} className="text-xs">
          {rb}
        </SelectItem>
      ))}
    </>
  );
}
