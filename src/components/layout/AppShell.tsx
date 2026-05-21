import { useCallback, useEffect, useRef } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { TerminalView } from "@/components/terminal/TerminalView";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useUIStore } from "@/stores/useUIStore";

const MIN_SIDEBAR = 180;
const MAX_SIDEBAR = 500;

function useResizeHandle() {
  const { sidebarWidth, setSidebarWidth } = useUIStore();
  const dragging = useRef(false);

  return useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      const startX = e.clientX;
      const startWidth = sidebarWidth;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) {
          return;
        }
        const delta = ev.clientX - startX;
        const next = Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, startWidth + delta));
        setSidebarWidth(next);
      };

      const onMouseUp = () => {
        dragging.current = false;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [sidebarWidth, setSidebarWidth],
  );
}

export function AppShell() {
  const { sidebarOpen } = useUIStore();
  const loadFromStorage = useProjectStore((s) => s.loadFromStorage);
  const saveToStorage = useProjectStore((s) => s.saveToStorage);
  const startPolling = useNotificationStore((s) => s.startPolling);
  const stopPolling = useNotificationStore((s) => s.stopPolling);
  const onHandleMouseDown = useResizeHandle();

  useEffect(() => {
    loadFromStorage();
    startPolling();

    const handleBeforeUnload = () => {
      saveToStorage();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      stopPolling();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [loadFromStorage, saveToStorage, startPolling, stopPolling]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {sidebarOpen && (
        <>
          <div className="shrink-0 overflow-hidden">
            <Sidebar />
          </div>
          <button
            type="button"
            className="w-1 shrink-0 cursor-col-resize border-none bg-transparent p-0 transition-colors hover:bg-primary/20 active:bg-primary/30"
            onMouseDown={onHandleMouseDown}
          />
        </>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <TerminalView />
      </div>
    </div>
  );
}
