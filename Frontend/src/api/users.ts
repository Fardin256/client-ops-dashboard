import api from "./axios";

export async function getDevelopers() {
  const res = await api.get("/users/developers");
  return res.data.developers;
}