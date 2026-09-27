import api from "./axios";

export async function getNotifications() {
  const res = await api.get("/notifications");
  return res.data.notifications;
}

export async function markAsRead(id: string) {
  const res = await api.patch(`/notifications/${id}/read`);
  return res.data.notification;
}

export async function markAllAsRead() {
  const res = await api.patch("/notifications/read-all");
  return res.data;
}