import api from "./axios";

export async function getProjects() {
  const res = await api.get("/projects");
  return res.data.projects;
}

export async function createProject(data: { name: string; description?: string; clientId: string }) {
  const res = await api.post("/projects", data);
  return res.data.project;
}