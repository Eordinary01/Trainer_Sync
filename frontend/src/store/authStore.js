import { create } from "zustand";
import api from "../config/api.js";

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  // 🔄 Restore session on refresh
  initialize: () => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token && user) {
      try {
        set({
          token,
          user: JSON.parse(user),
          isAuthenticated: true,
          loading: false,
        });
      } catch {
        localStorage.clear();
        set({ loading: false });
      }
    } else {
      set({ loading: false });
    }
  },

  // 🔐 LOGIN
  login: async (username, password) => {
    set({ loading: true, error: null });

    try {
      const res = await api.post("/auth/login", { username, password });
      const { success, message, data } = res.data;

      if (!success) {
        set({ error: message, loading: false });
        return { success: false, error: message };
      }

      const { user, token, isFirstLogin } = data;

      const finalUser = { ...user, isFirstLogin };

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(finalUser));

      set({
        user: finalUser,
        token,
        isAuthenticated: true,
        loading: false,
      });

      return {
        success: true,
        user: finalUser,
        isFirstLogin,
      };
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Unable to login. Please try again.";

      set({ error: msg, loading: false });
      return { success: false, error: msg };
    }
  },

  // 📝 REGISTER (KEPT)
  register: async (payload) => {
    set({ loading: true, error: null });

    try {
      const res = await api.post("/auth/register", payload);
      const { success, message, data } = res.data;

      if (!success) {
        set({ error: message, loading: false });
        return { success: false, error: message };
      }

      set({ loading: false });
      return { success: true, data };
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Registration failed. Try again.";

      set({ error: msg, loading: false });
      return { success: false, error: msg };
    }
  },

  // 👤 UPDATE USER (KEPT)
  setUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user });
  },

  logout: () => {
    localStorage.clear();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
