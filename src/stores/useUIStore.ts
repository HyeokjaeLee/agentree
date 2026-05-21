import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarOpen: boolean;
  sidebarWidth: number;
  addProjectDialogOpen: boolean;
  newBranchDialogProjectId: string | null;
  newWorktreeDialogProjectId: string | null;
  newWorktreeDialogBranch: string | null;

  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setAddProjectDialogOpen: (open: boolean) => void;
  openNewBranchDialog: (projectId: string) => void;
  closeNewBranchDialog: () => void;
  openNewWorktreeDialog: (projectId: string, branch: string) => void;
  closeNewWorktreeDialog: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarWidth: 260,
      addProjectDialogOpen: false,
      newBranchDialogProjectId: null,
      newWorktreeDialogProjectId: null,
      newWorktreeDialogBranch: null,

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setAddProjectDialogOpen: (open) => set({ addProjectDialogOpen: open }),
      openNewBranchDialog: (projectId) =>
        set({ newBranchDialogProjectId: projectId }),
      closeNewBranchDialog: () => set({ newBranchDialogProjectId: null }),
      openNewWorktreeDialog: (projectId, branch) =>
        set({ newWorktreeDialogProjectId: projectId, newWorktreeDialogBranch: branch }),
      closeNewWorktreeDialog: () =>
        set({ newWorktreeDialogProjectId: null, newWorktreeDialogBranch: null }),
    }),
    { name: "ui-store" }
  )
);
