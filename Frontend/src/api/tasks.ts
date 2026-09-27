import api from "./axios";

export async function getTasks(params?: Record<string, string>) {
  const res = await api.get("/tasks", { params });
  return res.data.tasks;
}

export async function updateTaskStatus(taskId: string, status: string) {
  const res = await api.patch(`/tasks/${taskId}/status`, { status });
  return res.data.task;
}

export async function createTask(data: {
  title: string;
  description?: string;
  projectId: string;
  assigneeId: string;
  status?: string;
  priority?: string;
  dueDate: string;
}) {
  const res = await api.post("/tasks", data);
  return res.data.task;
}