import api from "./axios";

export async function getDashboardStats() {
  const res = await api.get("/dashboard/stats");
  return res.data;
}

export async function getOnlineCount() {
  const res = await api.get("/users/online-count");
  return res.data.count;
}