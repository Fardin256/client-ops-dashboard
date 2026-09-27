import api from "./axios";

export async function getClients() {
  const res = await api.get("/clients");
  return res.data.clients;
}

export async function createClient(name: string) {
  const res = await api.post("/clients", { name });
  return res.data.client;
}