import { AttendanceService } from "../services/AttendanceService.js";
import { NotificationService } from "../services/NotificationService.js";

export class AttendanceController {
  constructor() {
    this.attendanceService = new AttendanceService();
    this.notificationService = new NotificationService();
  }

  async clockIn(req, res, next) {
    try {
      // ✅ ADDED: Input validation
      const { latitude, longitude } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: "Latitude and longitude are required"
        });
      }

      const result = await this.attendanceService.clockIn(req.user.userId, {
        latitude,
        longitude,
      });

      // 🔔 Create notification (which handles real-time updates internally)
      try {
        await this.notificationService.createNotification(
          req.user.userId,
          "CLOCK_IN",
          "Clocked In",
          `You have successfully clocked in at ${result.location?.address || 'your location'}`,
          {
            clockInTime: result.clockInTime,
            location: result.location,
            attendanceId: result._id
          }
        );
      } catch (notifError) {
        // ✅ ADDED: Don't fail clock-in if notification fails
        console.error('Notification creation failed:', notifError.message);
        // Continue with clock-in response
      }

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async clockOut(req, res, next) {
    try {
      // ✅ ADDED: Input validation
      const { latitude, longitude } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: "Latitude and longitude are required"
        });
      }

      const result = await this.attendanceService.clockOut(req.user.userId, {
        latitude,
        longitude,
      });

      // 🔔 Create notification (which handles real-time updates internally)
      try {
        await this.notificationService.createNotification(
          req.user.userId,
          "CLOCK_OUT",
          "Clocked Out",
          `You have successfully clocked out. Total working hours: ${result.totalWorkingHours || 0}`,
          {
            clockOutTime: result.clockOutTime,
            totalWorkingHours: result.totalWorkingHours,
            attendanceId: result._id
          }
        );
      } catch (notifError) {
        // ✅ ADDED: Don't fail clock-out if notification fails
        console.error('Notification creation failed:', notifError.message);
        // Continue with clock-out response
      }

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTodayClockedInList(req, res, next) {
    try {
      // ✅ ADDED: Authorization check for admin/HR only
      if (!(req.user.role === "ADMIN" || req.user.role === "HR")) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can access clocked-in list"
        });
      }

      const clockedInList = await this.attendanceService.getTodayClockedInList();
      
      res.status(200).json({
        success: true,
        data: clockedInList,
        message: 'Today\'s clocked-in list fetched successfully'
      });
    } catch (error) {
      console.error('Error fetching today\'s clocked-in list:', error);
      next(error);
    }
  }

  async getTodayStatus(req, res, next) {
    try {
      const userId = req.params.trainerId || req.user.userId;
      
      // ✅ ADDED: Authorization check - users can only access their own data unless admin/HR
      if (userId !== req.user.userId && !(req.user.role === "ADMIN" || req.user.role === "HR")) {
        return res.status(403).json({
          success: false,
          message: "You can only access your own attendance status"
        });
      }

      const status = await this.attendanceService.getTodayStatus(userId);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAttendanceHistory(req, res, next) {
    try {
      const userId = req.params.trainerId || req.user.userId;
      
      // ✅ ADDED: Authorization check
      if (userId !== req.user.userId && !(req.user.role === "ADMIN" || req.user.role === "HR")) {
        return res.status(403).json({
          success: false,
          message: "You can only access your own attendance history"
        });
      }

      const filters = {
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
        status: req.query.status,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
      };

      // ✅ ADDED: Validate date format
      if (filters.fromDate && isNaN(new Date(filters.fromDate))) {
        return res.status(400).json({
          success: false,
          message: "Invalid fromDate format"
        });
      }

      if (filters.toDate && isNaN(new Date(filters.toDate))) {
        return res.status(400).json({
          success: false,
          message: "Invalid toDate format"
        });
      }

      const result = await this.attendanceService.getAttendanceHistory(
        userId,
        filters
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getWorkingHours(req, res, next) {
    try {
      const userId = req.params.trainerId || req.user.userId;
      
      // ✅ ADDED: Authorization check
      if (userId !== req.user.userId && !(req.user.role === "ADMIN" || req.user.role === "HR")) {
        return res.status(403).json({
          success: false,
          message: "You can only access your own working hours"
        });
      }

      const filters = {
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
      };

      // ✅ ADDED: Validate date format
      if (filters.fromDate && isNaN(new Date(filters.fromDate))) {
        return res.status(400).json({
          success: false,
          message: "Invalid fromDate format"
        });
      }

      if (filters.toDate && isNaN(new Date(filters.toDate))) {
        return res.status(400).json({
          success: false,
          message: "Invalid toDate format"
        });
      }

      const result = await this.attendanceService.calculateWorkingHours(
        userId,
        filters
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getDailyReport(req, res, next) {
    try {
      // ✅ ADDED: Authorization check for admin/HR only
      if (!(req.user.role === "ADMIN" || req.user.role === "HR")) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can access daily reports"
        });
      }

      const date = req.query.date || new Date();
      
      // ✅ ADDED: Validate date format
      if (isNaN(new Date(date))) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format"
        });
      }

      const report = await this.attendanceService.getDailyReport(new Date(date));

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  async getWeeklyReport(req, res, next) {
    try {
      const userId = req.params.trainerId || req.user.userId;
      
      // ✅ ADDED: Authorization check
      if (userId !== req.user.userId && !(req.user.role === "ADMIN" || req.user.role === "HR")) {
        return res.status(403).json({
          success: false,
          message: "You can only access your own weekly report"
        });
      }

      const report = await this.attendanceService.getWeeklyReport(userId);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMonthlyReport(req, res, next) {
    try {
      const userId = req.params.trainerId || req.user.userId;
      
      // ✅ ADDED: Authorization check
      if (userId !== req.user.userId && !(req.user.role === "ADMIN" || req.user.role === "HR")) {
        return res.status(403).json({
          success: false,
          message: "You can only access your own monthly report"
        });
      }

      const report = await this.attendanceService.getMonthlyReport(userId);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTodayClockedInCount(req, res, next) {
    try {
      // ✅ ADDED: Authorization check for admin/HR only
      if (!(req.user.role === "ADMIN" || req.user.role === "HR")) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can access clocked-in count"
        });
      }

      const clockedInList = await this.attendanceService.getTodayClockedInList();
      const count = clockedInList.length;

      res.json({
        success: true,
        data: { count },
        message: "Today's clocked-in count fetched successfully",
      });
    } catch (error) {
      console.error("Error fetching today's clocked-in count:", error);
      next(error);
    }
  }

  async getAttendanceRate(req, res, next) {
    try {
      // ✅ ADDED: Authorization check for admin/HR only
      if (!(req.user.role === "ADMIN" || req.user.role === "HR")) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can access attendance rate"
        });
      }

      const stats = await this.attendanceService.getAttendanceRate();

      res.json({
        success: true,
        data: stats,
        message: "Attendance rate fetched successfully",
      });
    } catch (error) {
      console.error("Error fetching attendance rate:", error);
      next(error);
    }
  }
}