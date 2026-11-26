import axios from "axios";

const rawApiUrl = (
  import.meta.env.VITE_API_URL || "http://localhost:5001/api"
).replace(/\/+$/, "");

export const API_URL = rawApiUrl.endsWith("/api")
  ? rawApiUrl
  : `${rawApiUrl}/api`;

export const SERVER_URL = (
  import.meta.env.VITE_SOCKET_URL || API_URL.replace(/\/api\/?$/, "")
).replace(/\/+$/, "");

const TOKEN_KEY = "roomie_auth_token";

export const getAuthToken = () => localStorage.getItem(TOKEN_KEY);

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const serverMessage = error?.response?.data?.error;
    if (serverMessage) {
      error.message = serverMessage;
    }
    return Promise.reject(error);
  }
);
