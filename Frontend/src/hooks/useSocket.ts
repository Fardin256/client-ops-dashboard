import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export interface ActivityEvent {
  taskId: string;
  taskTitle: string;
  projectId: string;
  userName: string;
  oldStatus: string | null;
  newStatus: string;
  timestamp: string;
}

export interface NotificationEvent {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  taskId: string | null;
}

export function useSocket(accessToken: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [liveNotifications, setLiveNotifications] = useState<NotificationEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    const socket = io(API_URL, {
      auth: { token: accessToken },
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("missed-events", (events: any[]) => {
      const normalized = events.map((e) => ({
        taskId: e.taskId,
        taskTitle: e.task?.title || "Unknown task",
        projectId: e.projectId,
        userName: e.user?.name || "Unknown user",
        oldStatus: e.oldStatus,
        newStatus: e.newStatus,
        timestamp: e.createdAt,
      }));
      setActivities(normalized);
    });

    socket.on("activity", (event: ActivityEvent) => {
      setActivities((prev) => [event, ...prev].slice(0, 50));
    });

    socket.on("notification", (notification: NotificationEvent) => {
      setLiveNotifications((prev) => [notification, ...prev]);
    });
    socket.on("presence-count", (count: number) => {
      setOnlineCount(count);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

  return { activities, connected, liveNotifications, onlineCount };
}