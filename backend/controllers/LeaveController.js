// controllers/LeaveController.js
import { LeaveService } from '../services/LeaveService.js';
import { NotificationService } from '../services/NotificationService.js';

export class LeaveController {
  constructor() {
    this.leaveService = new LeaveService();
    this.notificationService = new NotificationService();
  }

  // Helper function to get user's full name from different possible locations
  getUserFullName(user) {
    if (!user) return "User";
    
    // Check different possible locations for name
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }
    
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    
    if (user.username) {
      return user.username;
    }
    
    if (user.email) {
      return user.email.split('@')[0];
    }
    
    return "User";
  }

  async applyLeave(req, res, next) {
    try {
      const leave = await this.leaveService.applyLeave(req.user.userId, req.body);
      
      const userName = this.getUserFullName(req.user);
      
      // 🔔 Create PERSONAL notification for the user
      await this.notificationService.createNotification(
        req.user.userId,
        "LEAVE_REQUEST",
        "Leave Application Submitted",
        `Your ${leave.leaveType} leave has been submitted for approval`,
        {
          leaveId: leave._id,
          leaveType: leave.leaveType,
          startDate: leave.fromDate,
          endDate: leave.toDate,
          totalDays: leave.numberOfDays || leave.totalDays,
          submittedAt: new Date().toISOString()
        }
      );

      // 🔔 Create UNIVERSAL admin notification (one for all admins/HR)
      await this.notificationService.createUniversalAdminNotification(
        "LEAVE_REQUEST",
        "New Leave Application",
        `${userName} has applied for ${leave.leaveType} leave`,
        {
          leaveId: leave._id,
          userId: req.user.userId,
          userName: userName,
          userEmail: req.user.email,
          leaveType: leave.leaveType,
          startDate: leave.fromDate,
          endDate: leave.toDate,
          totalDays: leave.numberOfDays || leave.totalDays,
          reason: leave.reason,
          submittedAt: new Date().toISOString(),
          sourceUser: userName
        }
      );

      res.status(201).json({
        success: true,
        message: 'Leave application submitted',
        data: leave,
      });
    } catch (error) {
      next(error);
    }
  }

  async approveLeave(req, res, next) {
    try {
      const { id } = req.params;
      const { comments, remarks } = req.body;
      
      const adminComments = comments || remarks || '';
      const leave = await this.leaveService.approveLeave(id, req.user.userId, adminComments);
      
      const userName = this.getUserFullName(req.user);
      
      // 🔔 Create PERSONAL notification for the trainer
      await this.notificationService.createNotification(
        leave.trainerId,
        "LEAVE_APPROVED",
        "Leave Application Approved",
        `Your ${leave.leaveType} leave has been approved`,
        {
          leaveId: leave._id,
          leaveType: leave.leaveType,
          startDate: leave.fromDate,
          endDate: leave.toDate,
          approvedBy: userName,
          approvedByRole: req.user.role,
          approvedAt: new Date().toISOString(),
          comments: adminComments,
          totalDays: leave.numberOfDays || leave.totalDays
        }
      );

      // 🔔 Create UNIVERSAL admin notification about the approval
      await this.notificationService.createUniversalAdminNotification(
        "LEAVE_APPROVED",
        "Leave Application Approved",
        `${userName} approved a ${leave.leaveType} leave application`,
        {
          leaveId: leave._id,
          approvedBy: req.user.userId,
          approvedByName: userName,
          trainerId: leave.trainerId,
          leaveType: leave.leaveType,
          startDate: leave.fromDate,
          endDate: leave.toDate,
          approvedAt: new Date().toISOString(),
          comments: adminComments,
          sourceUser: userName
        }
      );

      res.status(200).json({
        success: true,
        message: 'Leave approved successfully',
        data: leave,
      });
    } catch (error) {
      next(error);
    }
  }

  async rejectLeave(req, res, next) {
    try {
      const { id } = req.params;
      const { comments, remarks } = req.body;
      
      const adminComments = comments || remarks || '';
      const leave = await this.leaveService.rejectLeave(id, req.user.userId, adminComments);
      
      const userName = this.getUserFullName(req.user);
      
      // 🔔 Create PERSONAL notification for the trainer
      await this.notificationService.createNotification(
        leave.trainerId,
        "LEAVE_REJECTED", // Fixed: Changed from LEAVE_CANCELLED to LEAVE_REJECTED
        "Leave Application Rejected",
        `Your ${leave.leaveType} leave has been rejected`,
        {
          leaveId: leave._id,
          leaveType: leave.leaveType,
          startDate: leave.fromDate,
          endDate: leave.toDate,
          rejectedBy: userName,
          rejectedByRole: req.user.role,
          rejectedAt: new Date().toISOString(),
          comments: adminComments,
          reason: adminComments,
          totalDays: leave.numberOfDays || leave.totalDays
        }
      );

      // 🔔 Create UNIVERSAL admin notification
      await this.notificationService.createUniversalAdminNotification(
        "LEAVE_REJECTED", // Fixed: Changed from LEAVE_CANCELLED to LEAVE_REJECTED
        "Leave Application Rejected",
        `${userName} rejected a ${leave.leaveType} leave application`,
        {
          leaveId: leave._id,
          rejectedBy: req.user.userId,
          rejectedByName: userName,
          trainerId: leave.trainerId,
          leaveType: leave.leaveType,
          startDate: leave.fromDate,
          endDate: leave.toDate,
          rejectedAt: new Date().toISOString(),
          comments: adminComments,
          reason: adminComments,
          sourceUser: userName
        }
      );

      res.status(200).json({
        success: true,
        message: 'Leave rejected successfully',
        data: leave,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLeaveBalance(req, res, next) {
    try {
      const userId = req.params.trainerId || req.user.userId;
      const balance = await this.leaveService.getLeaveBalance(userId);
      res.status(200).json({
        success: true,
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPendingLeaves(req, res, next) {
    try {
      const leaves = await this.leaveService.getPendingLeaves();
      res.status(200).json({
        success: true,
        data: leaves,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLeaveHistory(req, res, next) {
    try {
      const userId = req.params.trainerId || req.user.userId;
      const userRole = req.user.role;
      
      const filters = {
        status: req.query.status,
        leaveType: req.query.leaveType,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
        trainerId: req.query.trainerId,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
      };

      const isAdminOrHR = userRole === 'ADMIN' || userRole === 'HR';
      
      const result = await this.leaveService.getLeaveHistory(
        userId, 
        filters, 
        isAdminOrHR
      );
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelLeave(req, res, next) {
    try {
      const { id } = req.params;
      const { comments, remarks } = req.body;
      
      const adminComments = comments || remarks || '';
      const leave = await this.leaveService.cancelLeave(id, req.user.userId, adminComments);
      
      const userName = this.getUserFullName(req.user);
      
      // 🔔 Create PERSONAL notification for the trainer
      await this.notificationService.createNotification(
        leave.trainerId, // Fixed: Changed from leave.userId to leave.trainerId
        "LEAVE_CANCELLED",
        "Leave Application Cancelled",
        `You have cancelled your ${leave.leaveType} leave`,
        {
          leaveId: leave._id,
          leaveType: leave.leaveType,
          startDate: leave.fromDate, // Fixed: Changed from startDate to fromDate
          endDate: leave.toDate, // Fixed: Changed from endDate to toDate
          cancelledBy: userName,
          cancelledAt: new Date().toISOString(),
          comments: adminComments,
          totalDays: leave.numberOfDays || leave.totalDays
        }
      );

      // 🔔 Create UNIVERSAL admin notification
      await this.notificationService.createUniversalAdminNotification(
        "LEAVE_CANCELLED",
        "Leave Application Cancelled",
        `${userName} cancelled their ${leave.leaveType} leave`,
        {
          leaveId: leave._id,
          cancelledBy: req.user.userId,
          cancelledByName: userName,
          trainerId: leave.trainerId,
          leaveType: leave.leaveType,
          startDate: leave.fromDate,
          endDate: leave.toDate,
          cancelledAt: new Date().toISOString(),
          comments: adminComments,
          sourceUser: userName
        }
      );

      res.status(200).json({
        success: true,
        message: 'Leave application cancelled',
        data: leave,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateLeave(req, res, next) {
    try {
      const { id } = req.params;
      const leave = await this.leaveService.updateLeave(id, req.user.userId, req.body);
      
      const userName = this.getUserFullName(req.user);
      
      // 🔔 Create PERSONAL notification for the trainer
      await this.notificationService.createNotification(
        leave.trainerId, // Fixed: Changed from leave.userId to leave.trainerId
        "LEAVE_UPDATED",
        "Leave Application Updated",
        `Your ${leave.leaveType} leave application has been updated`,
        {
          leaveId: leave._id,
          leaveType: leave.leaveType,
          startDate: leave.fromDate, // Fixed: Changed from startDate to fromDate
          endDate: leave.toDate, // Fixed: Changed from endDate to toDate
          status: leave.status,
          totalDays: leave.numberOfDays || leave.totalDays,
          updatedAt: new Date().toISOString()
        }
      );

      // 🔔 Create UNIVERSAL admin notification if status changed to pending
      if (leave.status === 'PENDING') {
        await this.notificationService.createUniversalAdminNotification(
          "LEAVE_UPDATED",
          "Leave Application Updated",
          `${userName} updated a ${leave.leaveType} leave application`,
          {
            leaveId: leave._id,
            userId: req.user.userId,
            userName: userName,
            leaveType: leave.leaveType,
            startDate: leave.fromDate,
            endDate: leave.toDate,
            updatedAt: new Date().toISOString(),
            sourceUser: userName
          }
        );
      }

      res.status(200).json({
        success: true,
        message: 'Leave application updated',
        data: leave,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLeaveStatistics(req, res, next) {
    try {
      const userId = req.params.trainerId || req.user.userId;
      const userRole = req.user.role;
      
      const stats = await this.leaveService.getLeaveStatistics(userId, userRole);
      
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}