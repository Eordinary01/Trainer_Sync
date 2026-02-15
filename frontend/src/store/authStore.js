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

  // 🔐 LOGIN - FIXED FOR YOUR BACKEND STRUCTURE
  login: async (username, password) => {
    set({ loading: true, error: null });

    try {
      const res = await api.post("/auth/login", { username, password });
      
      // ✅ SUCCESS CASE
      const { success, message, data } = res.data;

      if (!success) {
        set({ 
          error: message || "Login failed", 
          loading: false 
        });
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
        error: null,
      });

      return {
        success: true,
        user: finalUser,
        isFirstLogin,
      };
      
    } catch (err) {
      console.error("🔐 Login error:", err);
      
      let errorMessage = "Unable to login. Please try again.";
      
      // ✅ FIXED: Extract error message from your backend structure
      if (err.response) {
        console.log("Error response status:", err.response.status);
        console.log("Error response data:", err.response.data);
        
        // ✅ YOUR BACKEND STRUCTURE:
        // {
        //   success: false,
        //   statusCode: 401,
        //   error: {
        //     code: "AUTHENTICATION_ERROR",
        //     message: "Invalid credentials"  // <-- HERE IT IS!
        //   },
        //   timestamp: "...",
        //   path: "..."
        // }
        
        // ✅ Extract from error.error.message
        if (err.response.data?.error?.message) {
          errorMessage = err.response.data.error.message;
        }
        // ✅ Fallback to error.message
        else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        }
        // ✅ Fallback to error.error
        else if (err.response.data?.error) {
          errorMessage = typeof err.response.data.error === 'string' 
            ? err.response.data.error 
            : JSON.stringify(err.response.data.error);
        }
        
        // ✅ Handle account locked message
        if (errorMessage && errorMessage.includes && errorMessage.includes("locked")) {
          errorMessage = "Account is locked. Please contact administrator.";
        }
        
        // ✅ Handle rate limiting
        if (err.response.status === 429) {
          errorMessage = "Too many login attempts. Please try again later.";
        }
      } else if (err.request) {
        errorMessage = "No response from server. Please check your connection.";
      }
      
      console.log("✅ Final error message:", errorMessage);
      
      // ✅ Set the error message and loading to false
      set({ 
        error: errorMessage, 
        loading: false 
      });
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  },

  // 📝 REGISTER
  register: async (payload) => {
    set({ loading: true, error: null });

    try {
      const res = await api.post("/auth/register", payload);
      const { success, message, data } = res.data;

      if (!success) {
        set({ 
          error: message, 
          loading: false
        });
        return { success: false, error: message };
      }

      set({ loading: false });
      return { success: true, data };
      
    } catch (err) {
      console.error("📝 Registration error:", err);
      
      let errorMessage = "Registration failed. Try again.";
      
      // ✅ Same extraction pattern for registration errors
      if (err.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      set({ 
        error: errorMessage, 
        loading: false
      });
      return { success: false, error: errorMessage };
    }
  },

  // 👤 UPDATE USER
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