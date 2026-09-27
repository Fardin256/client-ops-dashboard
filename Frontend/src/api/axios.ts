import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});
let accessToken: string | null = null;
let onTokenRefreshed: ((token: string) => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function registerRefreshHandler(handler: (token: string) => void) {
  onTokenRefreshed = handler;
}

api.interceptors.request.use((config) => {
  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const res = await axios.post(
  `${API_URL}/api/auth/refresh`,
  {},
  { withCredentials: true }
);
        const newToken = res.data.accessToken;
        setAccessToken(newToken);
        if (onTokenRefreshed) onTokenRefreshed(newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;