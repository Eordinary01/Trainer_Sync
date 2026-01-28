import { AttendanceService } from "../services/AttendanceService.js";
import { EmailService } from "../services/EmailService.js";
import User from "../models/User.model.js";

const emailService = new EmailService();

export class AttendanceController {
  constructor() {
    this.attendanceService = new AttendanceService();
  }

  async clockIn(req, res, next) {
    try {
      const { latitude, longitude } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: "Latitude and longitude are required",
        });
      }

      const result = await this.attendanceService.clockIn(req.user.userId, {
        latitude,
        longitude,
      });

      this.sendClockInEmails(result, req, latitude, longitude);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async sendClockInEmails(result, req, latitude, longitude) {
    setImmediate(async () => {
      try {
        const trainer = await User.findById(req.user.userId).select(
          "email username profile.firstName profile.lastName profile.employeeId",
        );

        const trainerName =
          trainer?.profile?.firstName && trainer?.profile?.lastName
            ? `${trainer.profile.firstName} ${trainer.profile.lastName}`
            : trainer?.username || "Trainer";

        const trainerEmployeeId = trainer?.profile?.employeeId || "N/A";

        const hrAdmins = await User.find({
          role: { $in: ["HR", "ADMIN"] },
          status: "ACTIVE",
        }).select("email");

        console.log(
          `📧 Sending clock-in notification to ${hrAdmins.length} HR/Admin users`,
        );

        const clockInTime = new Date(result.clockInTime).toLocaleString(
          "en-US",
          {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZoneName: "short",
          },
        );

        const locationInfo = result.location?.address
          ? result.location.address
          : `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`;

        for (const admin of hrAdmins) {
          if (admin.email) {
            await emailService.sendEmail(
              admin.email,
              `Clock-In: ${trainerName}`,
              `
                <h2>Trainer Clocked In</h2>
                <p>A trainer has clocked in for work:</p>
                <ul>
                  <li><strong>Trainer:</strong> ${trainerName} (ID: ${trainerEmployeeId})</li>
                  <li><strong>Clock-In Time:</strong> ${clockInTime}</li>
                  <li><strong>Location:</strong> ${locationInfo}</li>
                  <li><strong>Status:</strong> Started working</li>
                </ul>
                <p>You can view real-time attendance on the admin dashboard.</p>
              `,
            );
          }
        }

        if (trainer?.email) {
          await emailService.sendEmail(
            trainer.email,
            `Clock-In Confirmation`,
            `
              <h2>Clock-In Successful</h2>
              <p>You have successfully clocked in:</p>
              <ul>
                <li><strong>Time:</strong> ${clockInTime}</li>
                <li><strong>Location:</strong> ${locationInfo}</li>
                <li><strong>Status:</strong> Active - Remember to clock out when you finish work</li>
              </ul>
              <p>Have a productive day!</p>
            `,
          );
        }
      } catch (error) {
        console.error("Error sending clock-in emails:", error.message);
      }
    });
  }

  async clockOut(req, res, next) {
    try {
      const { latitude, longitude } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: "Latitude and longitude are required",
        });
      }

      const result = await this.attendanceService.clockOut(req.user.userId, {
        latitude,
        longitude,
      });

      this.sendClockOutEmails(result, req, latitude, longitude);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async sendClockOutEmails(result, req, latitude, longitude) {
    setImmediate(async () => {
      try {
        const trainer = await User.findById(req.user.userId).select(
          "email username profile.firstName profile.lastName profile.employeeId",
        );

        const trainerName =
          trainer?.profile?.firstName && trainer?.profile?.lastName
            ? `${trainer.profile.firstName} ${trainer.profile.lastName}`
            : trainer?.username || "Trainer";

        const trainerEmployeeId = trainer?.profile?.employeeId || "N/A";

        const hrAdmins = await User.find({
          role: { $in: ["HR", "ADMIN"] },
          status: "ACTIVE",
        }).select("email");

        console.log(
          `📧 Sending clock-out notification to ${hrAdmins.length} HR/Admin users`,
        );

        const clockInTime = new Date(result.clockInTime).toLocaleString(
          "en-US",
          {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          },
        );

        const clockOutTime = new Date(result.clockOutTime).toLocaleString(
          "en-US",
          {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          },
        );

        const clockOutDate = new Date(result.clockOutTime).toLocaleDateString(
          "en-US",
          {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          },
        );

        const locationInfo = result.location?.address
          ? result.location.address
          : `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`;

        const totalHours = result.totalWorkingHours || 0;
        const hours = Math.floor(totalHours);
        const minutes = Math.round((totalHours - hours) * 60);

        for (const admin of hrAdmins) {
          if (admin.email) {
            await emailService.sendEmail(
              admin.email,
              `Clock-Out: ${trainerName}`,
              `
                <h2>Trainer Clocked Out</h2>
                <p>A trainer has clocked out:</p>
                <ul>
                  <li><strong>Trainer:</strong> ${trainerName} (ID: ${trainerEmployeeId})</li>
                  <li><strong>Date:</strong> ${clockOutDate}</li>
                  <li><strong>Clock-In Time:</strong> ${clockInTime}</li>
                  <li><strong>Clock-Out Time:</strong> ${clockOutTime}</li>
                  <li><strong>Total Hours:</strong> ${hours}h ${minutes}m</li>
                  <li><strong>Location:</strong> ${locationInfo}</li>
                  <li><strong>Status:</strong> Completed for the day</li>
                </ul>
                <p>Daily attendance summary has been updated.</p>
              `,
            );
          }
        }

        if (trainer?.email) {
          await emailService.sendEmail(
            trainer.email,
            `Clock-Out Confirmation`,
            `
              <h2>Clock-Out Successful</h2>
              <p>You have successfully clocked out:</p>
              <ul>
                <li><strong>Date:</strong> ${clockOutDate}</li>
                <li><strong>Clock-In:</strong> ${clockInTime}</li>
                <li><strong>Clock-Out:</strong> ${clockOutTime}</li>
                <li><strong>Total Hours:</strong> ${hours}h ${minutes}m</li>
                <li><strong>Location:</strong> ${locationInfo}</li>
              </ul>
              <p>Thank you for your work today!</p>
            `,
          );
        }
      } catch (error) {
        console.error("Error sending clock-out emails:", error.message);
      }
    });
  }

  async getTodayClockedInList(req, res, next) {
    try {
      if (!(req.user.role === "ADMIN" || req.user.role === "HR")) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can access clocked-in list",
        });
      }

      const clockedInList =
        await this.attendanceService.getTodayClockedInList();

      res.status(200).json({
        success: true,
        data: clockedInList,
        message: "Today's clocked-in list fetched successfully",
      });
    } catch (error) {
      console.error("Error fetching today's clocked-in list:", error);
      next(error);
    }
  }

  async getTodayStatus(req, res, next) {
    try {
      const userId = req.params.trainerId || req.user.userId;

      if (
        userId.toString() !== req.user.userId.toString() &&
        !(req.user.role === "ADMIN" || req.user.role === "HR")
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only access your own attendance status",
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

      if (
        userId !== req.user.userId &&
        !(req.user.role === "ADMIN" || req.user.role === "HR")
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only access your own attendance history",
        });
      }

      const filters = {
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
        status: req.query.status,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
      };

      if (filters.fromDate && isNaN(new Date(filters.fromDate))) {
        return res.status(400).json({
          success: false,
          message: "Invalid fromDate format",
        });
      }

      if (filters.toDate && isNaN(new Date(filters.toDate))) {
        return res.status(400).json({
          success: false,
          message: "Invalid toDate format",
        });
      }

      const result = await this.attendanceService.getAttendanceHistory(
        userId,
        filters,
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

      if (
        userId !== req.user.userId &&
        !(req.user.role === "ADMIN" || req.user.role === "HR")
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only access your own working hours",
        });
      }

      const filters = {
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
      };

      if (filters.fromDate && isNaN(new Date(filters.fromDate))) {
        return res.status(400).json({
          success: false,
          message: "Invalid fromDate format",
        });
      }

      if (filters.toDate && isNaN(new Date(filters.toDate))) {
        return res.status(400).json({
          success: false,
          message: "Invalid toDate format",
        });
      }

      const result = await this.attendanceService.calculateWorkingHours(
        userId,
        filters,
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
      if (!(req.user.role === "ADMIN" || req.user.role === "HR")) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can access daily reports",
        });
      }

      const date = req.query.date || new Date();

      if (isNaN(new Date(date))) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format",
        });
      }

      const report = await this.attendanceService.getDailyReport(
        new Date(date),
      );

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

      if (
        userId !== req.user.userId &&
        !(req.user.role === "ADMIN" || req.user.role === "HR")
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only access your own weekly report",
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

      if (
        userId !== req.user.userId &&
        !(req.user.role === "ADMIN" || req.user.role === "HR")
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only access your own monthly report",
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
      if (!(req.user.role === "ADMIN" || req.user.role === "HR")) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can access clocked-in count",
        });
      }

      const clockedInList =
        await this.attendanceService.getTodayClockedInList();
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
      if (!(req.user.role === "ADMIN" || req.user.role === "HR")) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can access attendance rate",
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