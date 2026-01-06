// controllers/NotificationController.js
import { NotificationService } from '../services/NotificationService.js';

export class NotificationController {
  constructor() {
    this.notificationService = new NotificationService();
  }

  // ✅ Get notifications
  async getNotifications(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await this.notificationService.getNotifications(
        req.user, 
        Number(page), 
        Number(limit)
      );

      res.status(200).json({ 
        success: true, 
        data: result 
      });
    } catch (error) {
      next(error);
    }
  }

  // ✅ Mark as read
  async markAsRead(req, res, next) {
    try {
      const notification = await this.notificationService.markAsRead(
        req.user, 
        req.params.id
      );
      
      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  // ✅ Mark all as read
  async markAllAsRead(req, res, next) {
    try {
      const result = await this.notificationService.markAllAsRead(req.user);
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: { count: result.count }
      });
    } catch (error) {
      next(error);
    }
  }

  // ✅ Delete notification
  async deleteNotification(req, res, next) {
    try {
      const result = await this.notificationService.deleteNotification(
        req.user, 
        req.params.id
      );
      
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // ✅ Get unread count
  async getUnreadCount(req, res, next) {
    try {
      const result = await this.notificationService.getUnreadCount(req.user);
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ✅ Create universal admin notification (Admin/HR only)
  async createUniversalAdminNotification(req, res, next) {
    try {
      const { type, title, message, data } = req.body;
      
      // Authorization check
      if (!(req.user.role === "ADMIN" || req.user.role === "HR")) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can create universal notifications"
        });
      }

      const notification = await this.notificationService.createUniversalAdminNotification(
        type || 'SYSTEM',
        title,
        message,
        data || {}
      );

      res.status(201).json({
        success: true,
        message: 'Universal notification created successfully',
        data: notification
      });
    } catch (error) {
      next(error);
    }
  }
}