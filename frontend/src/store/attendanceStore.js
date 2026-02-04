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

      console.log('📍 Clock-in response:', data);

      set({
        todayStatus: {
          hasClockedIn: true,
          clockInTime: data.clockInTime,
          clockOutTime: null,
          status: 'CLOCKED_IN',
          // ✅ Use location from backend (includes address + coordinates)
          location: data.location, // {latitude, longitude, address}
        },
        loading: false,
        error: null,
      });

      return { success: true, data };
    } catch (error) {
      const errorMsg = error.response?.data?.message || 
                       error.response?.data?.error?.message || 
                       'Clock-in failed. Please try again.';
      console.error('❌ Clock-in error:', errorMsg);
      set({ error: errorMsg, loading: false });
      throw new Error(errorMsg); // Throw so component can handle it
    }
  },

  // ✅ Clock Out Function
  clockOut: async (latitude, longitude) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/attendance/clock-out', { latitude, longitude });
      const data = response.data.data;

      console.log('📍 Clock-out response:', data);

      set({
        todayStatus: {
          // Preserve all response data
          hasClockedIn: false,
          clockInTime: data.clockInTime,
          clockOutTime: data.clockOutTime,
          totalWorkingHours: data.totalWorkingHours,
          status: 'CLOCKED_OUT',
          // ✅ Use location from backend (includes address + coordinates)
          location: data.location, // {latitude, longitude, address}
        },
        loading: false,
        error: null,
      });

      return { success: true, data };
    } catch (error) {
      const errorMsg = error.response?.data?.message || 
                       error.response?.data?.error?.message || 
                       'Clock-out failed. Please try again.';
      console.error('❌ Clock-out error:', errorMsg);
      set({ error: errorMsg, loading: false });
      throw new Error(errorMsg); // Throw so component can handle it
    }
  },

  // ✅ Refresh Today's Status (used on page reload)
  getTodayStatus: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/attendance/today');
      const statusData = response.data.data;

      console.log('📍 Today status:', statusData);

      set({ 
        todayStatus: statusData,
        loading: false,
        error: null,
      });
      return statusData;
    } catch (error) {
      const errorMsg = 'Failed to fetch today status';
      console.error('❌ getTodayStatus error:', errorMsg);
      set({ loading: false, error: errorMsg });
      return null;
    }
  },

  // ✅ Get Attendance History
  getHistory: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/attendance/history?${params}`);
      
      console.log('📍 History response:', response.data.data);

      set({ 
        history: response.data.data.attendance, 
        loading: false,
        error: null,
      });
      return response.data.data;
    } catch (error) {
      const errorMsg = 'Failed to fetch attendance history';
      console.error('❌ getHistory error:', errorMsg);
      set({ loading: false, error: errorMsg });
      return null;
    }
  },

  // ✅ Get Weekly Report
  getWeeklyReport: async () => {
    set({ error: null });
    try {
      const response = await api.get('/attendance/report/weekly');
      
      console.log('📍 Weekly report:', response.data.data);

      return response.data.data;
    } catch (error) {
      const errorMsg = 'Failed to fetch weekly report';
      console.error('❌ getWeeklyReport error:', errorMsg);
      set({ error: errorMsg });
      return null;
    }
  },

  // ✅ Clear Error (helper function)
  clearError: () => set({ error: null }),
}));