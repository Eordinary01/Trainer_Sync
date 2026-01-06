import { create } from 'zustand';
import api from '../config/api';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  getNotifications: async (page = 1, limit = 20) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/notifications?page=${page}&limit=${limit}`);
      const { notifications, pagination } = response.data.data;
      
      set((state) => ({
        notifications:
          page === 1
            ? notifications
            : [...state.notifications, ...notifications],
        loading: false,
      }));
      
      return { notifications, pagination };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message || 'Failed to fetch notifications' });
      console.error('Error fetching notifications', error);
      throw error;
    }
  },

  getUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      const { unreadCount } = response.data.data;
      set({ unreadCount });
      return unreadCount;
    } catch (error) {
      console.error('Error fetching unread count', error);
      set({ unreadCount: 0 });
      return 0;
    }
  },

  markAsRead: async (notificationId) => {
    try {
      // ✅ FIXED: Check if already read to avoid unnecessary API calls
      const state = get();
      const notification = state.notifications.find(n => n._id === notificationId);
      
      if (notification?.isRead) {
        console.log('Notification already marked as read');
        return true;
      }

      await api.put(`/notifications/${notificationId}/read`);
      
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n._id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
      
      return true;
    } catch (error) {
      console.error('Error marking notification as read', error);
      set({ error: error.response?.data?.message || 'Failed to mark as read' });
      return false;
    }
  },

  markAllAsRead: async () => {
    try {
      const state = get();
      
      // ✅ FIXED: Check if all are already read
      if (state.unreadCount === 0) {
        console.log('All notifications already read');
        return true;
      }

      await api.put('/notifications/mark-all-read');
      
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date(),
        })),
        unreadCount: 0,
      }));
      
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read', error);
      set({ error: error.response?.data?.message || 'Failed to mark all as read' });
      return false;
    }
  },

  deleteNotification: async (notificationId) => {
    try {
      const state = get();
      const notificationToDelete = state.notifications.find(n => n._id === notificationId);
      
      if (!notificationToDelete) {
        console.log('Notification not found in store');
        return false;
      }

      await api.delete(`/notifications/${notificationId}`);
      
      set((state) => {
        const wasUnread = notificationToDelete?.isRead === false;
        
        return {
          notifications: state.notifications.filter(
            (n) => n._id !== notificationId
          ),
          unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        };
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting notification', error);
      set({ error: error.response?.data?.message || 'Failed to delete notification' });
      return false;
    }
  },

  // ✅ NEW: Enhanced add notification with duplicate check
  addNotification: (notification) => {
    set((state) => {
      // Check for duplicates
      const isDuplicate = state.notifications.some(n => n._id === notification._id);
      if (isDuplicate) {
        console.log('Duplicate notification detected, skipping');
        return state;
      }

      return {
        notifications: [notification, ...state.notifications],
        unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1,
      };
    });
  },

  // ✅ NEW: Enhanced update notification
  updateNotification: (notificationId, updates) => {
    set((state) => {
      const updatedNotifications = state.notifications.map((n) =>
        n._id === notificationId ? { ...n, ...updates } : n
      );
      
      // Recalculate unread count if isRead status changed
      const oldNotification = state.notifications.find(n => n._id === notificationId);
      const newNotification = updatedNotifications.find(n => n._id === notificationId);
      
      let newUnreadCount = state.unreadCount;
      
      if (oldNotification && newNotification) {
        if (!oldNotification.isRead && newNotification.isRead) {
          // Changed from unread to read
          newUnreadCount = Math.max(0, state.unreadCount - 1);
        } else if (oldNotification.isRead && !newNotification.isRead) {
          // Changed from read to unread
          newUnreadCount = state.unreadCount + 1;
        }
      }
      
      return {
        notifications: updatedNotifications,
        unreadCount: newUnreadCount,
      };
    });
  },

  // ✅ NEW: Enhanced remove notification
  removeNotification: (notificationId) => {
    set((state) => {
      const notificationToRemove = state.notifications.find(n => n._id === notificationId);
      
      if (!notificationToRemove) {
        console.log('Notification not found for removal');
        return state;
      }
      
      const wasUnread = notificationToRemove?.isRead === false;
      
      return {
        notifications: state.notifications.filter(
          (n) => n._id !== notificationId
        ),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    });
  },

  // ✅ NEW: Enhanced bulk read for real-time
  markAllAsReadRealtime: (timestamp = new Date()) => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        isRead: true,
        readAt: timestamp,
      })),
      unreadCount: 0,
    }));
  },

  // ✅ NEW: Refresh both notifications and count
  refreshAll: async () => {
    try {
      await Promise.all([
        get().getUnreadCount(),
        get().getNotifications(1) // Always refresh first page
      ]);
      return true;
    } catch (error) {
      console.error('Error refreshing notifications', error);
      return false;
    }
  },

  // ✅ NEW: Clear all notifications (useful for logout)
  clearNotifications: () => {
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
    });
  },

  // ✅ NEW: Get notification by ID
  getNotification: (notificationId) => {
    const state = get();
    return state.notifications.find(n => n._id === notificationId);
  },

  // ✅ NEW: Check if notification exists
  hasNotification: (notificationId) => {
    const state = get();
    return state.notifications.some(n => n._id === notificationId);
  },

  // ✅ NEW: Get unread notifications
  getUnreadNotifications: () => {
    const state = get();
    return state.notifications.filter(n => !n.isRead);
  },

  // ✅ NEW: Get read notifications
  getReadNotifications: () => {
    const state = get();
    return state.notifications.filter(n => n.isRead);
  },

  // ✅ NEW: Clear error
  clearError: () => {
    set({ error: null });
  },
}));