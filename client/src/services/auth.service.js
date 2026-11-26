import { api, setAuthToken } from "./api";
import { disconnectSocket } from "./socket";

export const signup = async (email, password, name) => {
  const { data } = await api.post("/auth/signup", { email, password, name });
  if (data.token) setAuthToken(data.token);
  return data.user;
};

export const login = async (email, password) => {
  const { data } = await api.post("/auth/login", { email, password });
  if (data.token) setAuthToken(data.token);
  return data.user;
};

export const logout = async () => {
  try {
    await api.post("/auth/logout");
  } catch {
    // Ignore logout network errors
  } finally {
    setAuthToken(null);
    disconnectSocket();
  }
  return true;
};

export const getCurrentUser = async () => {
  try {
    const { data } = await api.get("/auth/me");
    return data.user;
  } catch {
    return null;
  }
};

export const forgotPassword = async (email) => {
  const { data } = await api.post("/auth/forgot-password", { email });
  return data;
};

export const resetPassword = async (token, password) => {
  const { data } = await api.post("/auth/reset-password", { token, password });
  return data;
};
