// services/NotificationService.js
import { Notification } from "../models/Notification.model.js";
import User from "../models/User.model.js";
import { NotFoundError, ValidationError } from "../utils/errorHandler.js";
import { socketService } from "./SocketService.js";

export class NotificationService {
  // ✅ Create Personal Notification (for specific user)
  async createNotification(userId, type, title, message, data = {}) {
    try {
      // Validate userId
      if (!userId) {
        throw new ValidationError('User ID is required for notification');
      }

      // Fetch user details
      const user = await User.findById(userId).select("username profile.firstName profile.lastName email");
      
      let userName = "User";
      if (user) {
        if (user.profile?.firstName && user.profile?.lastName) {
          userName = `${user.profile.firstName} ${user.profile.lastName}`;
        } else if (user.username) {
          userName = user.username;
        } else if (user.email) {
          userName = user.email.split('@')[0];
        }
      }

      // Create notification
      const notification = await Notification.create({
        userId,
        userName,
        type,
        title,
        message,
        data,
        isRead: false,
        isUniversal: false
      });

      // Send real-time notification to the user
      try {
        socketService.sendToUser(userId.toString(), 'new_notification', {
          id: notification._id,
          type,
          title,
          message,
          data,
          userName,
          isUniversal: false,
          createdAt: notification.createdAt,
          isRead: false
        });
      } catch (socketError) {
        console.error('Socket notification error:', socketError);
      }

      return notification;
    } catch (error) {
      console.error('Notification creation error:', error);
      throw error;
    }
  }

  // ✅ Create Universal Admin Notification (for all admins/HR)
  async createUniversalAdminNotification(type, title, message, data = {}) {
    try {
      // Create universal notification (no specific userId)
      const notification = await Notification.create({
        userId: null,
        userName: "System",
        type,
        title,
        message,
        data: {
          ...data,
          isUniversalAdminNotification: true,
          visibleToRoles: ['ADMIN', 'HR']
        },
        isRead: false,
        isUniversal: true,
        visibleToRoles: ['ADMIN', 'HR']
      });

      // Get all admin/HR users and send real-time notification to each
      try {
        const adminUsers = await User.find({ 
          role: { $in: ['ADMIN', 'HR'] } 
        }).select('_id');
        
        adminUsers.forEach(admin => {
          socketService.sendToUser(admin._id.toString(), 'universal_admin_notification', {
            id: notification._id,
            type,
            title,
            message,
            data: notification.data,
            isUniversal: true,
            createdAt: notification.createdAt,
            isRead: false
          });
        });
      } catch (socketError) {
        console.error('Universal admin notification socket error:', socketError);
      }

      return notification;
    } catch (error) {
      console.error('Universal admin notification creation error:', error);
      throw error;
    }
  }

  // ✅ Get Notifications (with role-based filtering)
  async getNotifications(user, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const userId = user.userId || user._id;

      // Build filter based on role
      let filter = {};
      
      if (user.role === "ADMIN" || user.role === "HR") {
        // Admin/HR can see universal notifications + their own
        filter = {
          $or: [
            { isUniversal: true }, // Universal notifications
            { userId: userId } // Their own notifications
          ]
        };
      } else {
        // Regular users only see their own notifications
        filter = { userId: userId, isUniversal: false };
      }

      // Get notifications
      const [notifications, total] = await Promise.all([
        Notification.find(filter)
          .select('_id userId userName type title message data isRead isUniversal createdAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Notification.countDocuments(filter)
      ]);

      // Calculate pagination
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return {
        notifications,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNext,
          hasPrev,
          ...(hasNext && { nextPage: page + 1 }),
          ...(hasPrev && { prevPage: page - 1 })
        }
      };
    } catch (error) {
      console.error('Error in getNotifications:', error);
      throw error;
    }
  }

  // ✅ Mark as Read
  async markAsRead(user, notificationId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) throw new NotFoundError("Notification not found");

      const userId = user.userId || user._id;
      
      // Check authorization (can mark universal or own notifications as read)
      if (
        notification.userId && 
        notification.userId.toString() !== userId.toString() &&
        !notification.isUniversal
      ) {
        throw new ValidationError("Not authorized to modify this notification");
      }

      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();

      // Send real-time update
      try {
        if (notification.userId) {
          socketService.sendToUser(notification.userId.toString(), 'notification_updated', {
            id: notification._id,
            isRead: true,
            readAt: notification.readAt
          });
        }
      } catch (socketError) {
        console.error('Socket update error:', socketError);
      }

      return notification;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      throw error;
    }
  }

  // ✅ Mark All as Read
  async markAllAsRead(user) {
    try {
      const userId = user.userId || user._id;
      
      let filter = { isRead: false };
      
      // Non-admin users can only mark their own notifications as read
      if (!(user.role === "ADMIN" || user.role === "HR")) {
        filter.userId = userId;
        filter.isUniversal = false;
      } else {
        // Admin/HR can mark both universal and their own notifications as read
        filter = {
          $or: [
            { userId: userId, isRead: false },
            { isUniversal: true, isRead: false }
          ]
        };
      }

      const result = await Notification.updateMany(filter, {
        $set: { 
          isRead: true,
          readAt: new Date()
        }
      });

      return { 
        message: `${result.modifiedCount} notifications marked as read`,
        count: result.modifiedCount 
      };
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      throw error;
    }
  }

  // ✅ Delete Notification
  async deleteNotification(user, notificationId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) throw new NotFoundError("Notification not found");

      const userId = user.userId || user._id;
      
      // Check authorization (can delete own or universal notifications if admin/HR)
      if (
        notification.userId && 
        notification.userId.toString() !== userId.toString() &&
        !(notification.isUniversal && (user.role === "ADMIN" || user.role === "HR"))
      ) {
        throw new ValidationError("Not authorized to delete this notification");
      }

      await notification.deleteOne();

      // Send real-time deletion event
      try {
        if (notification.userId) {
          socketService.sendToUser(notification.userId.toString(), 'notification_deleted', {
            id: notification._id
          });
        }
      } catch (socketError) {
        console.error('Socket deletion error:', socketError);
      }

      return { message: "Notification deleted successfully" };
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      throw error;
    }
  }

  // ✅ Get Unread Count
  async getUnreadCount(user) {
    const userId = user.userId || user._id;
    
    let filter = { isRead: false };
    
    if (user.role === "ADMIN" || user.role === "HR") {
      // Admin/HR can see unread universal + their own notifications
      filter = {
        $or: [
          { userId: userId, isRead: false },
          { isUniversal: true, isRead: false }
        ]
      };
    } else {
      // Regular users only see their own unread notifications
      filter = { userId: userId, isRead: false, isUniversal: false };
    }

    const count = await Notification.countDocuments(filter);
    return { unreadCount: count };
  }
}