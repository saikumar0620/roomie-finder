import { create } from "zustand";
import { getCurrentUser, login, logout, signup } from "../services/auth.service";

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  checkAuth: async () => {
    try {
      const user = await getCurrentUser();
      set({ user, loading: false });
    } catch {
      // Not logged in — this is expected
      set({ user: null, loading: false });
    }
  },

  loginUser: async (email, password) => {
    await login(email, password);
    const user = await getCurrentUser();
    set({ user });
  },

  signupUser: async (email, password, name) => {
    await signup(email, password, name);
    const user = await getCurrentUser();
    set({ user });
  },

  logoutUser: async () => {
    await logout();
    set({ user: null });
  },
}));