import { useEffect, useCallback, useRef } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { TerminalView } from "@/components/terminal/TerminalView";
import { useProjectStore } from "@/stores/useProjectStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useUIStore } from "@/stores/useUIStore";

const MIN_SIDEBAR = 180;
const MAX_SIDEBAR = 500;

export function AppShell() {
  const { sidebarOpen, sidebarWidth, setSidebarWidth } = useUIStore();
  const loadFromStorage = useProjectStore((s) => s.loadFromStorage);
  const saveToStorage = useProjectStore((s) => s.saveToStorage);
  const startPolling = useNotificationStore((s) => s.startPolling);
  const stopPolling = useNotificationStore((s) => s.stopPolling);
  const dragging = useRef(false);

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

  const onHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
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
  }, [sidebarWidth, setSidebarWidth]);

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      {sidebarOpen && (
        <>
          <div style={{ width: sidebarWidth }} className="shrink-0 overflow-hidden">
            <Sidebar />
          </div>
          <div
            className="w-1 shrink-0 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors"
            onMouseDown={onHandleMouseDown}
          />
        </>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <TerminalView />
      </div>
    </div>
  );
}
