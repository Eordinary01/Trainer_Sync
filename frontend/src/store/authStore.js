import { create } from 'zustand';
import api from '../config/api.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null,

  initialize: () => {
    // console.log("🔄 Auth Store: Initializing...");
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
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
      set({ loading: false });
    }
  },

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/login', { username, password });
      const responseData = response.data;

      if (responseData.success) {
        const { user, token, isFirstLogin } = responseData.data;

        // Ensure isFirstLogin exists in user object
        const updatedUser = { ...user, isFirstLogin };

        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('token', token);

        set({ user: updatedUser, token, isAuthenticated: true, loading: false });

        // Return isFirstLogin explicitly for the component
        return { success: true, user: updatedUser, isFirstLogin };
      } else {
        const errorMsg = responseData.message || 'Login failed';
        set({ error: errorMsg, loading: false });
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Login failed';
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
