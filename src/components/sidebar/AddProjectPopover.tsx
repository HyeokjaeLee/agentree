import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Plus, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/useProjectStore";
import { POPOVER_CLASS, usePopover } from "./usePopover";

export function AddProjectPopover() {
  const uid = useId();
  const pathId = `${uid}-path`;
  const labelId = `${uid}-label`;
  const [path, setPath] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { open, setOpen, refs, context, getReferenceProps, getFloatingProps } = usePopover();
  const { addProject } = useProjectStore();

  const handleBrowse = useBrowse(setPath);
  const handleSubmit = useSubmit(
    path,
    label,
    addProject,
    setPath,
    setLabel,
    setError,
    setLoading,
    setOpen,
  );
  const close = useClose(setPath, setLabel, setError, setOpen);

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
              <PopoverHeader title="Add Project" onClose={close} />
              <AddProjectForm
                pathId={pathId}
                labelId={labelId}
                path={path}
                label={label}
                error={error}
                loading={loading}
                onPathChange={setPath}
                onLabelChange={setLabel}
                onBrowse={handleBrowse}
                onSubmit={handleSubmit}
              />
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
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

function AddProjectForm({
  pathId,
  labelId,
  path,
  label,
  error,
  loading,
  onPathChange,
  onLabelChange,
  onBrowse,
  onSubmit,
}: {
  pathId: string;
  labelId: string;
  path: string;
  label: string;
  error: string;
  loading: boolean;
  onPathChange: (v: string) => void;
  onLabelChange: (v: string) => void;
  onBrowse: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-2.5 p-3">
      <FormField label="Path" inputId={pathId}>
        <div className="mt-1 flex gap-1.5">
          <Input
            id={pathId}
            value={path}
            onChange={(e) => onPathChange(e.target.value)}
            placeholder="/path/to/repo"
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            className="h-7 text-xs"
          />
          <Button variant="outline" size="sm" onClick={onBrowse} className="h-7 shrink-0 text-xs">
            <FolderOpen className="mr-1 h-3 w-3" />
            Browse
          </Button>
        </div>
      </FormField>
      <FormField label="Label (optional)" inputId={labelId}>
        <Input
          id={labelId}
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="My Project"
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          className="mt-1 h-7 text-xs"
        />
      </FormField>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      <Button onClick={onSubmit} disabled={loading || !path.trim()} className="h-7 w-full text-xs">
        {loading ? "Adding..." : "Add Project"}
      </Button>
    </div>
  );
}

function FormField({
  label,
  inputId,
  children,
}: {
  label: string;
  inputId: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={inputId}
        className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function useBrowse(setPath: (v: string) => void) {
  return async () => {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: "Select Project Folder",
    });
    if (selected) setPath(selected);
  };
}

function useSubmit(
  path: string,
  label: string,
  addProject: (p: string, l?: string) => Promise<void>,
  setPath: (v: string) => void,
  setLabel: (v: string) => void,
  setError: (v: string) => void,
  setLoading: (v: boolean) => void,
  setOpen: (v: boolean) => void,
) {
  return async () => {
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
}

function useClose(
  setPath: (v: string) => void,
  setLabel: (v: string) => void,
  setError: (v: string) => void,
  setOpen: (v: boolean) => void,
) {
  return () => {
    setPath("");
    setLabel("");
    setError("");
    setOpen(false);
  };
}
