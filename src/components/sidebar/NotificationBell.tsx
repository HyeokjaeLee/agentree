import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AGENT_ICONS, useNotificationStore } from "@/stores/useNotificationStore";
import type { AgentType } from "@/types/notification";
import { POPOVER_CLASS, usePopover } from "./usePopover";

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, markRead } = useNotificationStore();
  const { open, refs, context, getReferenceProps, getFloatingProps } = usePopover();

  return (
    <>
      <Button
        ref={refs.setReference}
        variant="ghost"
        size="icon"
        className="relative h-7 w-7"
        {...getReferenceProps()}
      >
        <Bell className="h-3.5 w-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive font-bold text-[8px] text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>
      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              className={cn(POPOVER_CLASS, "w-72 py-0")}
              {...getFloatingProps()}
            >
              <NotificationHeader unreadCount={unreadCount} onMarkAllRead={markAllRead} />
              <NotificationList notifications={notifications} onMarkRead={markRead} />
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}

function NotificationHeader({
  unreadCount,
  onMarkAllRead,
}: {
  unreadCount: number;
  onMarkAllRead: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-border border-b px-3 py-2">
      <span className="font-semibold text-xs">Notifications</span>
      {unreadCount > 0 && (
        <button
          type="button"
          onClick={onMarkAllRead}
          className="text-[10px] text-primary hover:text-primary/80"
        >
          Mark all read
        </button>
      )}
    </div>
  );
}

function NotificationList({
  notifications,
  onMarkRead,
}: {
  notifications: Array<{
    id: string;
    message: string;
    timestamp: number;
    read: boolean;
    agent: string;
  }>;
  onMarkRead: (id: string) => void;
}) {
  if (notifications.length === 0) {
    return (
      <p className="px-3 py-4 text-center text-muted-foreground text-xs">No notifications yet</p>
    );
  }

  return (
    <ScrollArea className="max-h-56">
      {notifications.slice(0, 20).map((n) => (
        <NotificationItem key={n.id} notification={n} onMarkRead={onMarkRead} />
      ))}
    </ScrollArea>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: { id: string; message: string; timestamp: number; read: boolean; agent: string };
  onMarkRead: (id: string) => void;
}) {
  const n = notification;
  return (
    <button
      type="button"
      className={cn(
        "flex w-full cursor-pointer items-start gap-2 border-border border-b px-3 py-2 last:border-0 hover:bg-accent/50 text-left",
        !n.read && "bg-primary/5",
      )}
      onClick={() => onMarkRead(n.id)}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-[9px] text-primary">
        {AGENT_ICONS[n.agent as AgentType] || "?"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-[11px]">{n.message}</span>
        <span className="block text-[9px] text-muted-foreground">
          {new Date(n.timestamp * 1000).toLocaleTimeString()}
        </span>
      </span>
    </button>
  );
}
