import { create } from 'zustand';
import api from '../config/api.js';

export const useAttendanceStore = create((set) => ({
  todayStatus: null,
  history: [],
  loading: false,
  error: null,

  // ✅ Clock In Function
  clockIn: async (latitude, longitude) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/attendance/clock-in', { latitude, longitude });
      const data = response.data.data;

      
      set({
        todayStatus: {
          hasClockedIn: true,
          clockInTime: data.clockInTime,
          clockOutTime: null,
          status: 'CLOCKED_IN',
          location: data.location,
        },
        loading: false,
      });

      return { success: true, data };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || 'Clock-in failed';
      set({ error: errorMsg, loading: false });
      return { success: false, error: errorMsg };
    }
  },

  // ✅ Clock Out Function
  clockOut: async (latitude, longitude) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/attendance/clock-out', { latitude, longitude });
      const data = response.data.data;

      set({
        todayStatus: {
          ...data,
          hasClockedIn: false,
          status: 'CLOCKED_OUT',
        },
        loading: false,
      });

      return { success: true, data };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || 'Clock-out failed';
      set({ error: errorMsg, loading: false });
      return { success: false, error: errorMsg };
    }
  },

  // ✅ Refresh Today's Status (used on page reload)
  getTodayStatus: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/attendance/today');
      set({ todayStatus: response.data.data, loading: false });
      return response.data.data;
    } catch (error) {
      set({ loading: false, error: 'Failed to fetch today status' });
      return null;
    }
  },

  // ✅ History
  getHistory: async (filters = {}) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/attendance/history?${params}`);
      set({ history: response.data.data.attendance, loading: false });
      return response.data.data;
    } catch (error) {
      set({ loading: false });
      return null;
    }
  },

  // ✅ Weekly Report
  getWeeklyReport: async () => {
    try {
      const response = await api.get('/attendance/report/weekly');
      return response.data.data;
    } catch {
      return null;
    }
  },
}));
