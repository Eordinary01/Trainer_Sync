import { Notification } from '../models/Notification.model.js';
import { NotFoundError, ValidationError } from '../utils/errorHandler.js';

export class NotificationService {
  async createNotification(userId, type, title, message, data = {}) {
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      data,
      isRead: false,
    });

    await notification.save();
    return notification;
  }

  async getNotifications(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ userId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Notification.countDocuments({ userId });

    return {
      notifications,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(notificationId) {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    );

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return notification;
  }

  async markAllAsRead(userId) {
    await Notification.updateMany(
      { userId, isRead: false },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    return { message: 'All notifications marked as read' };
  }

  async deleteNotification(notificationId) {
    const notification = await Notification.findByIdAndDelete(notificationId);

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return { message: 'Notification deleted' };
  }

  async getUnreadCount(userId) {
    const count = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    return { unreadCount: count };
  }

  async sendBulkNotifications(userIds, type, title, message, data = {}) {
    const notifications = userIds.map(userId => ({
      userId,
      type,
      title,
      message,
      data,
      isRead: false,
    }));

    const result = await Notification.insertMany(notifications);
    return result;
  }

  async pruneExpiredNotifications() {
    const result = await Notification.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    return {
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} expired notifications deleted`,
    };
  }
}