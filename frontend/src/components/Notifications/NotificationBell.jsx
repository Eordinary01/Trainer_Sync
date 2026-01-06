import React, { useState, useEffect } from 'react';
import { useNotificationStore } from '../../store/notificationStore.js';
import { Bell, Trash2, User, RefreshCw, Crown } from 'lucide-react';
import { formatDate } from '../../utils/dateFormat.js';
import { useAuthStore } from '../../store/authStore.js';
import { useSocket } from '../../hooks/useSocket.js';

export const NotificationBell = () => {
  const { user: currentUser } = useAuthStore();
  const {
    notifications,
    unreadCount,
    getNotifications,
    getUnreadCount,
    markAsRead,
    deleteNotification,
    addNotification,
    updateNotification,
    removeNotification,
    markAllAsRead,
  } = useNotificationStore();

  const { socket, isConnected } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(false);
  const [notificationTypeFilter, setNotificationTypeFilter] = useState('ALL'); // 'ALL', 'PERSONAL', 'UNIVERSAL'

  // ✅ Only allow HR, ADMIN, TRAINER to see notification bell
  const allowedRoles = ['ADMIN', 'HR', 'TRAINER'];
  if (!allowedRoles.includes(currentUser?.role)) return null;

  // ✅ Real-time socket listeners - UPDATED for universal notifications
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('🔔 Setting up notification listeners for user:', currentUser?.username, 'Role:', currentUser?.role);

    // Listen for PERSONAL notifications (for current user only)
    const handleNewNotification = (notification) => {
      console.log('🔔 Personal notification received:', notification);
      // Only add if it's for the current user OR if it's universal
      if (notification.userId === currentUser?._id || notification.isUniversal) {
        addNotification(notification);
      }
    };

    // Listen for UNIVERSAL admin notifications (admin/HR only)
    const handleUniversalAdminNotification = (notification) => {
      console.log('👑 Universal admin notification received:', notification);
      // Only add if user is admin/HR and notification is universal
      if ((currentUser?.role === 'ADMIN' || currentUser?.role === 'HR') && 
          notification.isUniversal) {
        addNotification(notification);
      }
    };

    // Listen for notification updates from backend
    const handleNotificationUpdated = (data) => {
      console.log('🔔 Notification updated:', data);
      updateNotification(data.id, { isRead: true, readAt: data.readAt });
    };

    const handleNotificationDeleted = (data) => {
      console.log('🔔 Notification deleted:', data);
      removeNotification(data.id);
    };

    const handleAllNotificationsRead = (data) => {
      console.log('🔔 All notifications marked as read:', data);
      // Update all notifications in store to be read
      notifications.forEach(notif => {
        updateNotification(notif._id, { 
          isRead: true, 
          readAt: data.timestamp 
        });
      });
    };

    // Register event listeners
    socket.on('new_notification', handleNewNotification);
    socket.on('universal_admin_notification', handleUniversalAdminNotification);
    socket.on('notification_updated', handleNotificationUpdated);
    socket.on('notification_deleted', handleNotificationDeleted);
    socket.on('all_notifications_read', handleAllNotificationsRead);

    // Join rooms based on role
    if (currentUser?._id) {
      // Everyone joins their personal room
      socket.emit('join_notification_room', currentUser._id);
      
      // Admin/HR also join admin room for universal notifications
      if (currentUser?.role === 'ADMIN' || currentUser?.role === 'HR') {
        socket.emit('join_admin_room', 'admin_dashboard');
        console.log('✅ Joined admin room for universal notifications');
      }
    }

    // Cleanup listeners on unmount
    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('universal_admin_notification', handleUniversalAdminNotification);
      socket.off('notification_updated', handleNotificationUpdated);
      socket.off('notification_deleted', handleNotificationDeleted);
      socket.off('all_notifications_read', handleAllNotificationsRead);
      
      if (currentUser?._id) {
        socket.emit('leave_notification_room', currentUser._id);
        if (currentUser?.role === 'ADMIN' || currentUser?.role === 'HR') {
          socket.emit('leave_admin_room', 'admin_dashboard');
        }
      }
    };
  }, [socket, isConnected, currentUser?._id, currentUser?.role, addNotification, updateNotification, removeNotification]);

  // ✅ Polling for updates
  useEffect(() => {
    let interval;

    const loadNotifications = async () => {
      try {
        await getUnreadCount();
        if (isOpen) {
          await getNotifications();
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };

    const startPolling = () => {
      // Initial load
      loadNotifications();

      // Set up interval
      const pollInterval = (currentUser?.role === 'ADMIN' || currentUser?.role === 'HR') ? 15000 : 30000;
      
      interval = setInterval(() => {
        console.log('🔄 Polling notifications for:', currentUser?.username);
        loadNotifications();
      }, pollInterval);
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    if (document.visibilityState === 'visible') {
      startPolling();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startPolling();
      } else {
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen, getUnreadCount, getNotifications, currentUser?.role]);

  // ✅ Initial load
  useEffect(() => {
    getUnreadCount();
  }, [getUnreadCount]);

  const handleBellClick = async () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    if (newIsOpen) {
      await getNotifications();
      setLastUpdate(Date.now());
    }
  };

  // ✅ Mark as read
  const handleMarkAsRead = async (notifId) => {
    try {
      setIsLoading(true);
      console.log(`📝 Marking notification ${notifId} as read by ${currentUser?.username}`);
      
      await markAsRead(notifId);
      setLastUpdate(Date.now());
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Delete notification
  const handleDelete = async (notifId) => {
    try {
      setIsLoading(true);
      console.log(`🗑️ Deleting notification ${notifId} for ${currentUser?.username}`);
      
      await deleteNotification(notifId);
      setLastUpdate(Date.now());
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      setIsLoading(true);
      console.log(`✅ Marking all notifications as read by ${currentUser?.username}`);
      
      await markAllAsRead();
      setLastUpdate(Date.now());
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Enhanced notification display
  const getNotificationDisplay = (notif) => {
    let displayMessage = notif.message || '';
    
    // For universal notifications, show who triggered it
    if (notif.isUniversal && notif.data?.sourceUser) {
      displayMessage += ` (By: ${notif.data.sourceUser})`;
    }
    
    return displayMessage;
  };

  // ✅ Get user badge for notifications
  const getUserBadge = (notif) => {
    // For universal notifications, show source user with crown icon
    if (notif.isUniversal && notif.data?.sourceUser) {
      return (
        <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
          <Crown size={10} />
          {notif.data.sourceUser}
        </span>
      );
    }
    
    // For regular notifications with userName (Admin/HR view)
    if ((currentUser?.role === 'ADMIN' || currentUser?.role === 'HR') && 
        notif.userName && notif.userName !== "System") {
      return (
        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
          <User size={10} />
          {notif.userName}
        </span>
      );
    }
    
    return null;
  };

  // ✅ Get notification title with context
  const getNotificationTitle = (notif) => {
    let title = notif.title || 'Notification';
    
    // Add universal badge for admin/HR
    if (notif.isUniversal && (currentUser?.role === 'ADMIN' || currentUser?.role === 'HR')) {
      title = `👑 ${title}`;
    }
    
    return title;
  };

  // ✅ Filter notifications based on type
  const getFilteredNotifications = () => {
    if (notificationTypeFilter === 'ALL') return notifications;
    
    if (notificationTypeFilter === 'PERSONAL') {
      return notifications.filter(notif => !notif.isUniversal && notif.userId === currentUser?._id);
    }
    
    if (notificationTypeFilter === 'UNIVERSAL') {
      return notifications.filter(notif => notif.isUniversal);
    }
    
    return notifications;
  };

  // ✅ Get notification type badge
  const getNotificationTypeBadge = (notif) => {
    if (notif.isUniversal) {
      return (
        <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded capitalize">
          <Crown size={10} />
          Universal
        </span>
      );
    }
    
    return (
      <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded capitalize">
        {notif.type ? notif.type.replace(/_/g, ' ').toLowerCase() : 'notification'}
      </span>
    );
  };

  // ✅ Get notification icon based on type
  const getNotificationIcon = (notif) => {
    if (notif.isUniversal) {
      return <Crown size={14} className="text-purple-600" />;
    }
    
    if (!notif.isRead) {
      return <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" title="Unread" />;
    }
    
    return null;
  };

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.notification-bell-container')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredNotifications = getFilteredNotifications();
  const hasUniversalNotifications = notifications.some(n => n.isUniversal);
  const hasPersonalNotifications = notifications.some(n => !n.isUniversal && n.userId === currentUser?._id);

  return (
    <div className="relative notification-bell-container">
      <button
        onClick={handleBellClick}
        disabled={isLoading}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold transform scale-100 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {!isConnected && (
          <span 
            className="absolute -bottom-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full border border-white" 
            title="Disconnected from real-time updates" 
          />
        )}
        {isLoading && (
          <span 
            className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full border border-white animate-pulse" 
            title="Updating..." 
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50 border border-gray-200 animate-in fade-in-0 zoom-in-95">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
            <div>
              <h3 className="font-bold text-gray-800">Notifications</h3>
              <p className="text-xs text-gray-500 mt-1">
                {currentUser?.role === 'TRAINER' ? 'Your notifications' : 'System notifications'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={isLoading}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mark all read
                </button>
              )}
              <span 
                className={`text-xs px-2 py-1 rounded-full ${
                  isConnected 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                }`}
                title={isConnected ? 'Connected to real-time updates' : 'Using fallback polling'}
              >
                {isConnected ? 'Live' : 'Polling'}
              </span>
              <button
                onClick={async () => {
                  await getNotifications();
                  await getUnreadCount();
                  setLastUpdate(Date.now());
                }}
                disabled={isLoading}
                className="text-gray-600 hover:text-gray-800 text-sm p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                title="Refresh notifications"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          
          {/* Filter buttons for Admin/HR */}
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'HR') && 
           (hasUniversalNotifications || hasPersonalNotifications) && (
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
              <div className="flex gap-2">
                <button
                  onClick={() => setNotificationTypeFilter('ALL')}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${
                    notificationTypeFilter === 'ALL' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All
                </button>
                {hasPersonalNotifications && (
                  <button
                    onClick={() => setNotificationTypeFilter('PERSONAL')}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${
                      notificationTypeFilter === 'PERSONAL' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Personal
                  </button>
                )}
                {hasUniversalNotifications && (
                  <button
                    onClick={() => setNotificationTypeFilter('UNIVERSAL')}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${
                      notificationTypeFilter === 'UNIVERSAL' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Universal
                  </button>
                )}
              </div>
            </div>
          )}
          
          <div className="max-h-96 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs mt-1 text-gray-400">
                  {notificationTypeFilter !== 'ALL' 
                    ? `No ${notificationTypeFilter.toLowerCase()} notifications` 
                    : "You're all caught up!"}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 group ${
                    !notif.isRead 
                      ? notif.isUniversal
                        ? 'bg-purple-50 border-l-4 border-l-purple-500'
                        : 'bg-blue-50 border-l-4 border-l-blue-500'
                      : 'border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notif)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-semibold text-gray-800 text-sm line-clamp-1">
                              {getNotificationTitle(notif)}
                            </p>
                            {getUserBadge(notif)}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 break-words">
                            {getNotificationDisplay(notif)}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <p className="text-xs text-gray-400">
                              {formatDate(notif.createdAt, 'DD/MM/YYYY HH:MM')}
                            </p>
                            {getNotificationTypeBadge(notif)}
                            {notif.isRead && (
                              <span className="inline-block bg-green-100 text-green-600 text-xs px-2 py-1 rounded">
                                Read
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notif._id)}
                          disabled={isLoading}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors disabled:opacity-50"
                          title="Mark as read"
                        >
                          Read
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notif._id)}
                        disabled={isLoading}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Delete notification"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Footer with stats */}
          {filteredNotifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={isLoading || unreadCount === 0}
                    className="text-center text-sm text-gray-600 hover:text-gray-800 py-1 px-3 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Mark all as read
                  </button>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                    {isConnected ? 'Real-time' : 'Polling'}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  Last updated: {formatDate(lastUpdate, 'HH:MM:SS')}
                </span>
              </div>
              {(currentUser?.role === 'ADMIN' || currentUser?.role === 'HR') && (
                <div className="mt-2 flex gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Universal: {notifications.filter(n => n.isUniversal).length}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Personal: {notifications.filter(n => !n.isUniversal).length}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Unread: {unreadCount}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};