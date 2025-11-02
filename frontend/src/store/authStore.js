import { create } from 'zustand';
import api from '../config/api.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true, // Start with loading true
  error: null,

  // Initialize auth state from localStorage - CALL THIS IMMEDIATELY
  initialize: () => {
    console.log("🔄 Auth Store: Initializing...");
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log("📦 LocalStorage check:", { token, user });
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        console.log("✅ Auth Store: User data loaded:", userData);
        set({ 
          user: userData, 
          token, 
          isAuthenticated: true,
          loading: false 
        });
      } catch (error) {
        console.error('❌ Error parsing stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ loading: false });
      }
    } else {
      console.log("❌ Auth Store: No token or user in localStorage");
      set({ loading: false });
    }
  },

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      console.log("🔐 Attempting login with:", { username });
      const response = await api.post('/auth/login', { username, password });
      
      const responseData = response.data;
      console.log("📨 Login response:", responseData);
      
      if (responseData.success) {
        const { user, token } = responseData.data;
        console.log("✅ Login successful, user role:", user.role);
        
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
        set({ user, token, isAuthenticated: true, loading: false });
        return { success: true, user };
      } else {
        const errorMsg = responseData.message || 'Login failed';
        console.log("❌ Login failed:", errorMsg);
        set({ error: errorMsg, loading: false });
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Login failed';
      console.log("❌ Login error:", errorMsg);
      set({ error: errorMsg, loading: false });
      return { success: false, error: errorMsg };
    }
  },

  register: async (userData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/register', userData);
      const responseData = response.data;
      
      if (responseData.success) {
        set({ loading: false });
        return { success: true, data: responseData.data };
      } else {
        const errorMsg = responseData.message || 'Registration failed';
        set({ error: errorMsg, loading: false });
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Registration failed';
      set({ error: errorMsg, loading: false });
      return { success: false, error: errorMsg };
    }
  },

  logout: () => {
    console.log("🚪 Logging out...");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false, loading: false });
  },

  setUser: (user) => {
    set({ user });
    localStorage.setItem('user', JSON.stringify(user));
  },

  clearError: () => set({ error: null }),
}));