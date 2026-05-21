import { create } from "zustand";
import { getNotifications, markNotificationRead } from "@/lib/invoke";
import type { AgentNotification, AgentType } from "@/types/notification";

interface NotificationState {
  notifications: AgentNotification[];
  unreadCount: number;
  pollInterval: ReturnType<typeof setInterval> | null;

  startPolling: () => void;
  stopPolling: () => void;
  fetchNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  getUnreadCount: () => number;
}

const AGENT_ICONS: Record<AgentType, string> = {
  claude: "C",
  opencode: "OC",
  codex: "CX",
  gemini: "G",
  pi: "Pi",
};

export { AGENT_ICONS };

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  pollInterval: null,

  startPolling: () => {
    if (get().pollInterval) {
      return;
    }
    const interval = setInterval(() => {
      get().fetchNotifications();
    }, 5000);
    set({ pollInterval: interval });
    get().fetchNotifications();
  },

  stopPolling: () => {
    const { pollInterval } = get();
    if (pollInterval) {
      clearInterval(pollInterval);
      set({ pollInterval: null });
    }
  },

  fetchNotifications: async () => {
    try {
      const newNotifications = await getNotifications();
      if (newNotifications.length > 0) {
        set((s) => ({
          notifications: [...newNotifications, ...s.notifications],
          unreadCount: s.unreadCount + newNotifications.filter((n) => !n.read).length,
        }));
      }
    } catch (_e) {
      void _e;
    }
  },

  markRead: async (id) => {
    await markNotificationRead(id);
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    const { notifications } = get();
    const unread = notifications.filter((item) => !item.read);
    await Promise.all(unread.map((item) => markNotificationRead(item.id)));
    set({
      notifications: notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    });
  },

  getUnreadCount: () => get().unreadCount,
}));
