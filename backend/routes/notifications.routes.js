// routes/notifications.routes.js
import express from 'express';
import { NotificationController } from '../controllers/NotificationController.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();
const notificationController = new NotificationController();

// ✅ Get notifications with pagination
router.get('/', authenticate, (req, res, next) =>
  notificationController.getNotifications(req, res, next)
);

// ✅ Mark single notification as read
router.put('/:id/read', authenticate, (req, res, next) =>
  notificationController.markAsRead(req, res, next)
);

// ✅ Mark all notifications as read
router.put('/read-all', authenticate, (req, res, next) =>
  notificationController.markAllAsRead(req, res, next)
);

// ✅ Delete notification
router.delete('/:id', authenticate, (req, res, next) =>
  notificationController.deleteNotification(req, res, next)
);

// ✅ Get unread count
router.get('/unread-count', authenticate, (req, res, next) =>
  notificationController.getUnreadCount(req, res, next)
);

// ✅ Create universal admin notification (Admin/HR only)
router.post('/universal', authenticate, (req, res, next) =>
  notificationController.createUniversalAdminNotification(req, res, next)
);

export default router;