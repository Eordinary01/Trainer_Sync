import { LeaveService } from "../services/LeaveService.js";
import { EmailService } from "../services/EmailService.js";
import { Attendance } from "../models/Attendance.model.js";
import { CronService } from "../services/CronServices.js";
import { Leave } from "../models/Leave.model.js";
import User from "../models/User.model.js";
import {
  LEAVE_CONFIG,
  ADMIN_ROLES,
  TRAINER_CATEGORY,
} from "../config/constant.js";

export class LeaveController {
  constructor() {
    this.leaveService = new LeaveService();
    this.emailService = new EmailService();
    this.cronService = new CronService();
  }

  // ✅ HELPER: Get applicant info with backward compatibility
  getApplicantInfo(leave) {
    // Try new schema first
    const applicantId =
      leave.applicantId || leave.trainerId || leave.appliedBy?.userId || null;
    const applicantRole =
      leave.applicantRole || leave.appliedBy?.role || "TRAINER";
    const applicantName =
      leave.applicantName ||
      leave.appliedBy?.name ||
      this.getUserFullName(leave.applicantId || leave.trainerId) ||
      "User";

    return {
      id: applicantId,
      role: applicantRole,
      name: applicantName,
      email: leave.applicantId?.email || leave.trainerId?.email || null,
    };
  }

  // ✅ Helper function to get user's full name
  getUserFullName(user) {
    if (!user) return "User";

    if (typeof user === "object") {
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
        return user.email.split("@")[0];
      }
    }

    return "User";
  }

  // ============================================
  // ✅ HELPER: Validate leave application input
  // ============================================
  validateLeaveApplication(fromDate, toDate, leaveType, reason) {
    const errors = [];

    if (!fromDate) errors.push("From date is required");
    if (!toDate) errors.push("To date is required");
    if (!leaveType) errors.push("Leave type is required");
    if (!reason || reason.trim().length < 5)
      errors.push("Valid reason is required (minimum 5 characters)");

    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (isNaN(from.getTime())) errors.push("Invalid from date format");
    if (isNaN(to.getTime())) errors.push("Invalid to date format");

    if (from > to) errors.push("From date cannot be after to date");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (from < today) errors.push("Cannot apply for leave in the past");

    return errors;
  }

  // ============================================
  // ✅ APPLY LEAVE - Backward compatible
  // ============================================
  async applyLeave(req, res, next) {
    try {
      const { fromDate, toDate, leaveType, reason, emergencyContact } =
        req.body;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // ADMIN cannot apply for leave
      if (userRole === "ADMIN") {
        return res.status(403).json({
          success: false,
          message: "Admin cannot apply for leave",
          code: "ADMIN_CANNOT_APPLY_LEAVE",
        });
      }

      const validationErrors = this.validateLeaveApplication(
        fromDate,
        toDate,
        leaveType,
        reason,
      );
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationErrors,
          code: "VALIDATION_ERROR",
        });
      }

      const newFromDate = new Date(fromDate);
      const newToDate = new Date(toDate);

      const timeDiff = newToDate.getTime() - newFromDate.getTime();
      const numberOfDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

      const MAX_DAYS_PER_APPLICATION = 30;
      if (numberOfDays > MAX_DAYS_PER_APPLICATION) {
        return res.status(400).json({
          success: false,
          message: `Cannot apply for more than ${MAX_DAYS_PER_APPLICATION} days at once`,
          code: "MAX_DAYS_EXCEEDED",
        });
      }

      const leave = await this.leaveService.applyLeave(
        userId,
        {
          leaveType,
          fromDate: newFromDate,
          toDate: newToDate,
          numberOfDays,
          reason: reason.trim(),
          emergencyContact: emergencyContact?.trim(),
        },
        userRole,
      );

      // ✅ Backward compatible population
      await leave.populate([
        {
          path: "applicantId",
          select:
            "username profile.firstName profile.lastName email profile.employeeId role",
        },
        {
          path: "trainerId", // For backward compatibility
          select:
            "username profile.firstName profile.lastName email profile.employeeId role",
        },
        {
          path: "appliedBy.userId", // For backward compatibility
          select: "username profile role",
        },
      ]);

      const applicantInfo = this.getApplicantInfo(leave);
      const userName = applicantInfo.name;

      await this.sendLeaveApplicationNotifications(userName, leave, userRole);

      res.status(201).json({
        success: true,
        message: "Leave application submitted successfully",
        data: leave,
        code: "LEAVE_APPLIED",
      });
    } catch (error) {
      console.error("❌ Error in applyLeave:", error);
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ HELPER: Send leave application notifications - Backward compatible
  // ============================================
  async sendLeaveApplicationNotifications(applicantName, leave, userRole) {
    try {
      const applicantInfo = this.getApplicantInfo(leave);
      const applicantRole = applicantInfo.role;

      // ✅ For HR leave requests - only notify ADMINS
      if (applicantRole === "HR") {
        const adminEmails = await this.emailService.getAdminEmails();

        for (const adminEmail of adminEmails) {
          await this.emailService.sendHRLeaveNotification(
            adminEmail,
            applicantName,
            {
              leaveType: leave.leaveType,
              fromDate: leave.fromDate,
              toDate: leave.toDate,
              numberOfDays: leave.numberOfDays,
              reason: leave.reason,
            },
          );
        }
        console.log(
          `📧 HR leave notification sent to ${adminEmails.length} admins`,
        );
      }
      // ✅ For trainer leave requests - notify HR and ADMINS
      else if (applicantRole === "TRAINER") {
        const hrAdminEmails = await this.emailService.getHRAndAdminEmails();

        for (const email of hrAdminEmails) {
          await this.emailService.sendLeaveNotification(
            email,
            applicantName,
            {
              leaveType: leave.leaveType,
              fromDate: leave.fromDate,
              toDate: leave.toDate,
              numberOfDays: leave.numberOfDays,
              reason: leave.reason,
            },
            applicantRole,
          );
        }
        console.log(
          `📧 Trainer leave notification sent to ${hrAdminEmails.length} HR/Admin users`,
        );
      }
    } catch (emailError) {
      console.error("❌ Failed to send email notifications:", emailError);
    }
  }

  // ============================================
  // ✅ APPROVE LEAVE - Backward compatible
  // ============================================
  async approveLeave(req, res, next) {
    try {
      const { id } = req.params;
      const { comments, remarks } = req.body;
      const adminComments = comments || remarks || "";

      const approverId = req.user.userId;
      const approverRole = req.user.role;

      const leave = await this.leaveService.approveLeave(
        id,
        approverId,
        approverRole,
        adminComments,
      );

      // ✅ Backward compatible population
      await leave.populate([
        {
          path: "applicantId",
          select: "username email profile role",
        },
        {
          path: "trainerId",
          select: "username email profile role",
        },
        {
          path: "approvedBy",
          select: "username profile role",
        },
        {
          path: "rejectedBy",
          select: "username profile role",
        },
        {
          path: "appliedBy.userId",
          select: "username profile role",
        },
      ]);

      const applicantInfo = this.getApplicantInfo(leave);
      const applicantName = applicantInfo.name;
      const approvedByName = this.getUserFullName(leave.approvedBy);
      const applicantRole = applicantInfo.role;

      // Send approval email to applicant
      try {
        const applicantEmail =
          applicantInfo.email ||
          leave.applicantId?.email ||
          leave.trainerId?.email;
        if (applicantEmail) {
          await this.emailService.sendLeaveApprovalEmail(
            applicantEmail,
            applicantName,
            {
              leaveType: leave.leaveType,
              fromDate: leave.fromDate,
              toDate: leave.toDate,
              numberOfDays: leave.numberOfDays,
              comments: adminComments,
              approvedBy: approvedByName,
            },
            true,
          );
        }
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
      }

      await this.sendLeaveApprovalNotifications(
        leave,
        adminComments,
        true,
        approverId,
      );

      res.status(200).json({
        success: true,
        message: "Leave approved successfully",
        data: {
          ...leave.toObject(),
          approvedByName,
          applicantRole,
        },
        code: "LEAVE_APPROVED",
      });
    } catch (error) {
      console.error("❌ Error in approveLeave:", error);
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ REJECT LEAVE - Backward compatible
  // ============================================
  async rejectLeave(req, res, next) {
    try {
      const { id } = req.params;
      const { comments, remarks } = req.body;
      const adminComments = comments || remarks || "";

      const rejectorId = req.user.userId;
      const rejectorRole = req.user.role;

      const leave = await this.leaveService.rejectLeave(
        id,
        rejectorId,
        rejectorRole,
        adminComments,
      );

      // ✅ Backward compatible population
      await leave.populate([
        {
          path: "applicantId",
          select: "username email profile role",
        },
        {
          path: "trainerId",
          select: "username email profile role",
        },
        {
          path: "rejectedBy",
          select: "username profile role",
        },
        {
          path: "approvedBy",
          select: "username profile role",
        },
        {
          path: "appliedBy.userId",
          select: "username profile role",
        },
      ]);

      const applicantInfo = this.getApplicantInfo(leave);
      const applicantName = applicantInfo.name;
      const rejectorName = this.getUserFullName(leave.rejectedBy);
      const applicantRole = applicantInfo.role;

      // Send rejection email to applicant
      try {
        const applicantEmail =
          applicantInfo.email ||
          leave.applicantId?.email ||
          leave.trainerId?.email;
        if (applicantEmail) {
          await this.emailService.sendLeaveApprovalEmail(
            applicantEmail,
            applicantName,
            {
              leaveType: leave.leaveType,
              fromDate: leave.fromDate,
              toDate: leave.toDate,
              numberOfDays: leave.numberOfDays,
              comments: adminComments,
              rejectedBy: rejectorName,
            },
            false,
          );
        }
      } catch (emailError) {
        console.error("Failed to send rejection email:", emailError);
      }

      await this.sendLeaveApprovalNotifications(
        leave,
        adminComments,
        false,
        rejectorId,
      );

      res.status(200).json({
        success: true,
        message: "Leave rejected successfully",
        data: {
          ...leave.toObject(),
          rejectorName,
          applicantRole,
        },
        code: "LEAVE_REJECTED",
      });
    } catch (error) {
      console.error("❌ Error in rejectLeave:", error);
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ SEND LEAVE APPROVAL NOTIFICATIONS - Backward compatible
  // ============================================
  async sendLeaveApprovalNotifications(leave, comments, isApproved, excludeUserId = null) {
  try {
    const applicantInfo = this.getApplicantInfo(leave);
    const applicantRole = applicantInfo.role;
    const applicantEmail = applicantInfo.email;

    // ✅ Always send to the applicant first
    if (applicantEmail) {
      await this.emailService.sendLeaveApprovalEmail(
        applicantEmail,
        applicantInfo.name,
        {
          leaveType: leave.leaveType,
          fromDate: leave.fromDate,
          toDate: leave.toDate,
          numberOfDays: leave.numberOfDays,
          comments,
          approvedBy: isApproved ? this.getUserFullName(leave.approvedBy) : null,
          rejectedBy: !isApproved ? this.getUserFullName(leave.rejectedBy) : null,
        },
        isApproved
      );
    }

    // ✅ Then send to other approvers based on role
    const query = { role: { $in: ["ADMIN"] }, status: "ACTIVE" };
    
    // If it's a trainer leave, also notify HR
    if (applicantRole === "TRAINER") {
      query.role.$in.push("HR");
    }

    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    const approvers = await User.find(query).select("email");
    
    for (const approver of approvers) {
      if (approver.email && approver.email !== applicantEmail) {
        await this.emailService.sendLeaveApprovalEmail(
          approver.email,
          applicantInfo.name,
          {
            leaveType: leave.leaveType,
            fromDate: leave.fromDate,
            toDate: leave.toDate,
            numberOfDays: leave.numberOfDays,
            comments,
            approvedBy: isApproved ? this.getUserFullName(leave.approvedBy) : null,
            rejectedBy: !isApproved ? this.getUserFullName(leave.rejectedBy) : null,
          },
          isApproved
        );
      }
    }
  } catch (emailError) {
    console.error("Failed to send admin notification:", emailError);
  }
}

  // ============================================
  // ✅ CANCEL LEAVE - Backward compatible
  // ============================================
  async cancelLeave(req, res, next) {
    try {
      const { id } = req.params;
      const { comments, remarks } = req.body;
      const adminComments = comments || remarks || "";

      const leave = await this.leaveService.cancelLeave(
        id,
        req.user.userId,
        req.user.role,
        adminComments,
      );

      // ✅ Backward compatible population
      await leave.populate([
        {
          path: "applicantId",
          select: "username email profile",
        },
        {
          path: "trainerId",
          select: "username email profile",
        },
        {
          path: "appliedBy.userId",
          select: "username email profile",
        },
      ]);

      const applicantInfo = this.getApplicantInfo(leave);
      const applicantName = applicantInfo.name;
      const applicantEmail =
        applicantInfo.email ||
        leave.applicantId?.email ||
        leave.trainerId?.email;

      if (applicantEmail) {
        try {
          await this.emailService.sendEmail(
            applicantEmail,
            `Leave Cancelled: ${leave.leaveType}`,
            `
              <h2>Leave Application Cancelled</h2>
              <p>Your leave application has been cancelled:</p>
              <ul>
                <li><strong>Leave Type:</strong> ${leave.leaveType}</li>
                <li><strong>Dates:</strong> ${new Date(leave.fromDate).toLocaleDateString()} to ${new Date(leave.toDate).toLocaleDateString()}</li>
                <li><strong>Duration:</strong> ${leave.numberOfDays} days</li>
                <li><strong>Cancelled By:</strong> ${this.getUserFullName(req.user)}</li>
                ${adminComments ? `<li><strong>Comments:</strong> ${adminComments}</li>` : ""}
              </ul>
              <p>Your leave balance has been restored.</p>
            `,
          );
        } catch (emailError) {
          console.error("Failed to send cancellation email:", emailError);
        }
      }

      res.status(200).json({
        success: true,
        message: "Leave application cancelled",
        data: leave,
        code: "LEAVE_CANCELLED",
      });
    } catch (error) {
      console.error("❌ Error in cancelLeave:", error);
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ GET LEAVE BALANCE
  // ============================================
  async getLeaveBalance(req, res, next) {
    try {
      const userId = req.params.trainerId || req.user.userId;
      const userRole = req.user.role;

      if (userRole === "HR" && userId === req.user.userId) {
        const hrBalance = await this.leaveService.getHRLeaveBalance(userId);

        return res.status(200).json({
          success: true,
          data: hrBalance,
          meta: {
            role: "HR",
            isUnlimited: true,
          },
          code: "HR_LEAVE_BALANCE_FETCHED",
        });
      }

      const balance = await this.leaveService.getLeaveBalance(userId);
      const trainer = await User.findById(userId).select(
        "trainerCategory role",
      );

      if (trainer?.role !== "TRAINER") {
        return res.status(403).json({
          success: false,
          message: "Only trainers have leave balance",
          code: "NOT_TRAINER",
        });
      }

      const sanitizeInfinity = (obj) => {
        return JSON.parse(
          JSON.stringify(obj, (key, value) =>
            value === Infinity ? "Infinity" : value,
          ),
        );
      };

      res.status(200).json({
        success: true,
        data: {
          ...sanitizeInfinity(balance),
          trainerCategory: trainer?.trainerCategory,
          canUpdateBalance: trainer?.trainerCategory !== "CONTRACTED",
        },
        code: "LEAVE_BALANCE_FETCHED",
      });
    } catch (error) {
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ EDIT LEAVE BALANCE
  // ============================================
  async editLeaveBalance(req, res, next) {
    try {
      const { trainerId } = req.params;
      const { leaveType, newBalance, reason } = req.body;

      if (!ADMIN_ROLES.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can edit leave balance",
          code: "UNAUTHORIZED",
        });
      }

      if (!leaveType || newBalance === undefined) {
        return res.status(400).json({
          success: false,
          message: "leaveType and newBalance are required",
          code: "MISSING_FIELDS",
        });
      }

      const updatedBalance = await this.leaveService.editLeaveBalance(
        trainerId,
        leaveType,
        newBalance,
        req.user.userId,
        reason || "Admin adjustment",
      );

      const user = await User.findById(trainerId).select(
        "profile.firstName profile.lastName email username",
      );
      const userName = this.getUserFullName(user);

      if (user.email) {
        try {
          await this.emailService.sendLeaveBalanceUpdate(user.email, userName, {
            leaveType,
            newBalance,
            updatedBy: this.getUserFullName(req.user),
            reason: reason || "Admin adjustment",
            updatedAt: new Date(),
          });
        } catch (emailError) {
          console.error("Failed to send balance update email:", emailError);
        }
      }

      res.status(200).json({
        success: true,
        message: "Leave balance updated successfully",
        data: updatedBalance,
        code: "LEAVE_BALANCE_UPDATED",
      });
    } catch (error) {
      console.error("❌ Error in editLeaveBalance:", error);
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ UPDATE LEAVE BALANCE (Legacy method)
  // ============================================
  async updateLeaveBalance(req, res, next) {
    try {
      const { trainerId } = req.params;
      const { leaveType, newBalance, reason } = req.body;
      const adminId = req.user.userId;

      const trainer = await User.findById(trainerId);
      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: "Trainer not found",
          code: "TRAINER_NOT_FOUND",
        });
      }

      if (trainer.trainerCategory === "CONTRACTED") {
        return res.status(400).json({
          success: false,
          message: "Cannot update leave balance for CONTRACTED trainers",
          code: "CONTRACTED_TRAINER_NO_BALANCE",
        });
      }

      const result = await this.leaveService.updateLeaveBalance(
        trainerId,
        leaveType,
        newBalance,
        reason,
        adminId,
      );

      res.status(200).json({
        success: true,
        data: result,
        message: "Leave balance updated successfully",
        code: "LEAVE_BALANCE_UPDATED",
      });
    } catch (error) {
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ GET PENDING LEAVES - Backward compatible
  // ============================================
  async getPendingLeaves(req, res, next) {
    try {
      const userRole = req.user.role;
      const userId = req.user.userId;

      const leaves = await this.leaveService.getPendingLeaves(userRole, userId);

      // ✅ Backward compatible population
      for (const leave of leaves) {
        await leave.populate([
          {
            path: "applicantId",
            select:
              "username email profile role trainerCategory leaveBalance isUnlimited",
          },
          {
            path: "trainerId",
            select: "username email profile role trainerCategory leaveBalance",
          },
          {
            path: "approvedBy",
            select: "username profile role",
          },
          {
            path: "rejectedBy",
            select: "username profile role",
          },
          {
            path: "appliedBy.userId",
            select: "username profile role",
          },
        ]);
      }

      const canApproveAny = userRole === "ADMIN";
      const canApproveTrainerLeaves = userRole === "HR" || userRole === "ADMIN";

      const leavesWithPermissions = leaves.map((leave) => {
        const leaveObj = leave.toObject();
        const applicantInfo = this.getApplicantInfo(leave);
        const applicantRole = applicantInfo.role;
        const applicantId = applicantInfo.id;

        leaveObj.permissions = {
          canApprove:
            userRole === "ADMIN" ||
            (userRole === "HR" && applicantRole === "TRAINER"),
          canReject:
            userRole === "ADMIN" ||
            (userRole === "HR" && applicantRole === "TRAINER"),
          isOwnLeave: applicantId?.toString() === userId,
        };

        return leaveObj;
      });

      res.status(200).json({
        success: true,
        data: leavesWithPermissions,
        meta: {
          total: leaves.length,
          role: userRole,
          canApproveAny,
          canApproveTrainerLeaves,
        },
        code: "PENDING_LEAVES_FETCHED",
      });
    } catch (error) {
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ GET LEAVE HISTORY - Backward compatible
  // ============================================
  // In LeaveController.js - getLeaveHistory
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
        trainerCategory: req.query.category,
        page: Math.max(1, parseInt(req.query.page) || 1),
        limit: Math.min(100, Math.max(1, parseInt(req.query.limit) || 10)),
      };

      const isAdminOrHR = ADMIN_ROLES.includes(userRole);

      const result = await this.leaveService.getLeaveHistory(
        userId,
        filters,
        isAdminOrHR,
      );

      // ✅ Only populate if you need additional fields
      // But since service already populated, you might not need this
      if (result.leaves && result.leaves.length > 0) {
        // Optional: Add any additional population here
      }

      res.status(200).json({
        success: true,
        data: {
          leaves: result.formattedLeaves || result.leaves, // Use formatted version
          pagination: result.pagination,
        },
        meta: {
          page: filters.page,
          limit: filters.limit,
          total: result.pagination?.total || 0,
          pages: result.pagination?.pages || 1,
        },
        code: "LEAVE_HISTORY_FETCHED",
      });
    } catch (error) {
      console.error("❌ Error in getLeaveHistory:", error);
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ GET HR LEAVE HISTORY - Backward compatible
  // ============================================
  async getHRLeaveHistory(req, res, next) {
    try {
      const userId = req.user.userId;

      if (req.user.role !== "HR") {
        return res.status(403).json({
          success: false,
          message: "Only HR users can access this endpoint",
          code: "UNAUTHORIZED",
        });
      }

      const leaves = await this.leaveService.getHRLeaveHistory(userId);

      // ✅ Backward compatible population
      for (const leave of leaves) {
        await leave.populate([
          {
            path: "applicantId",
            select: "username email profile role isUnlimited",
          },
          {
            path: "trainerId",
            select: "username email profile role",
          },
          {
            path: "approvedBy",
            select: "username profile role",
          },
          {
            path: "rejectedBy",
            select: "username profile role",
          },
          {
            path: "appliedBy.userId",
            select: "username profile role",
          },
        ]);
      }

      res.status(200).json({
        success: true,
        data: leaves,
        meta: {
          total: leaves.length,
          role: "HR",
        },
        code: "HR_LEAVE_HISTORY_FETCHED",
      });
    } catch (error) {
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ GET ALL PENDING HR LEAVES (Admin only) - Backward compatible
  // ============================================
  async getPendingHRLeaves(req, res, next) {
    try {
      if (req.user.role !== "ADMIN") {
        return res.status(403).json({
          success: false,
          message: "Only Admin can view all pending HR leaves",
          code: "UNAUTHORIZED",
        });
      }

      // Support both old and new schema
      const leaves = await Leave.find({
        status: "PENDING",
        $or: [{ applicantRole: "HR" }, { "appliedBy.role": "HR" }],
      })
        .populate("applicantId", "username profile role isUnlimited")
        .populate("trainerId", "username profile role")
        .populate("appliedBy.userId", "username profile role")
        .populate("approvedBy", "username profile role")
        .populate("rejectedBy", "username profile role")
        .sort({ appliedOn: -1 });

      res.status(200).json({
        success: true,
        data: leaves,
        meta: {
          total: leaves.length,
        },
        code: "PENDING_HR_LEAVES_FETCHED",
      });
    } catch (error) {
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ UPDATE LEAVE - Backward compatible
  // ============================================
  async updateLeave(req, res, next) {
    try {
      const { id } = req.params;

      const leave = await Leave.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      })
        .populate(
          "applicantId",
          "username email profile.firstName profile.lastName",
        )
        .populate(
          "trainerId",
          "username email profile.firstName profile.lastName",
        )
        .populate("appliedBy.userId", "username email profile")
        .populate("approvedBy", "username profile.firstName profile.lastName")
        .populate("rejectedBy", "username profile.firstName profile.lastName");

      if (!leave) {
        return res.status(404).json({
          success: false,
          message: "Leave not found",
          code: "LEAVE_NOT_FOUND",
        });
      }

      const applicantInfo = this.getApplicantInfo(leave);

      if (req.body.status && applicantInfo.email) {
        try {
          const applicantName = applicantInfo.name;
          await this.emailService.sendEmail(
            applicantInfo.email,
            `Leave Status Updated: ${leave.leaveType}`,
            `
              <h2>Leave Application Status Updated</h2>
              <p>Your leave application status has been updated to <strong>${req.body.status}</strong>:</p>
              <ul>
                <li><strong>Leave Type:</strong> ${leave.leaveType}</li>
                <li><strong>Dates:</strong> ${new Date(leave.fromDate).toLocaleDateString()} to ${new Date(leave.toDate).toLocaleDateString()}</li>
                <li><strong>Duration:</strong> ${leave.numberOfDays} days</li>
                <li><strong>Updated By:</strong> ${this.getUserFullName(req.user)}</li>
                <li><strong>Updated At:</strong> ${new Date().toLocaleString()}</li>
              </ul>
            `,
          );
        } catch (emailError) {
          console.error("Failed to send update email:", emailError);
        }
      }

      res.status(200).json({
        success: true,
        message: "Leave application updated",
        data: leave,
        code: "LEAVE_UPDATED",
      });
    } catch (error) {
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ GET LEAVE STATISTICS
  // ============================================
  async getLeaveStatistics(req, res, next) {
    try {
      const userId = req.params.trainerId || req.user.userId;
      const stats = await this.leaveService.getLeaveStatistics(userId);

      res.status(200).json({
        success: true,
        data: stats,
        code: "LEAVE_STATS_FETCHED",
      });
    } catch (error) {
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ INCREMENT MONTHLY LEAVES
  // ============================================
  async incrementMonthlyLeaves(req, res, next) {
    try {
      const { trainerId } = req.params;

      if (!ADMIN_ROLES.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can increment leaves",
          code: "UNAUTHORIZED",
        });
      }

      const result = await this.leaveService.incrementMonthlyLeaves(trainerId);

      if (!result) {
        return res.status(400).json({
          success: false,
          message:
            "Monthly increment not available (either not a PERMANENT trainer or not yet 30 days)",
          code: "INCREMENT_NOT_AVAILABLE",
        });
      }

      if (result) {
        try {
          const user = await User.findById(trainerId).select(
            "email profile.firstName profile.lastName username",
          );
          if (user.email) {
            await this.emailService.sendMonthlyIncrementNotification(
              user.email,
              this.getUserFullName(user),
              {
                sickDays: result.sick?.available || 0,
                casualDays: result.casual?.available || 0,
                totalSick: result.sick?.available || 0,
                totalCasual: result.casual?.available || 0,
              },
            );
          }
        } catch (emailError) {
          console.error("Failed to send increment notification:", emailError);
        }
      }

      res.status(200).json({
        success: true,
        message: "Monthly leaves incremented successfully",
        data: result,
        code: "LEAVES_INCREMENTED",
      });
    } catch (error) {
      console.error("❌ Error in incrementMonthlyLeaves:", error);
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ ROLLOVER UNUSED LEAVES
  // ============================================
  async rolloverUnusedLeaves(req, res, next) {
    try {
      const { trainerId } = req.params;

      if (!ADMIN_ROLES.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can perform rollover",
          code: "UNAUTHORIZED",
        });
      }

      const result = await this.leaveService.rolloverUnusedLeaves(trainerId);

      if (!result) {
        return res.status(400).json({
          success: false,
          message:
            "Rollover not available (not a PERMANENT trainer or rollover disabled)",
          code: "ROLLOVER_NOT_AVAILABLE",
        });
      }

      res.status(200).json({
        success: true,
        message: "Leaves rolled over successfully",
        data: result,
        code: "LEAVES_ROLLED_OVER",
      });
    } catch (error) {
      console.error("❌ Error in rolloverUnusedLeaves:", error);
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ GET LEAVE AUDIT HISTORY
  // ============================================
  async getLeaveAuditHistory(req, res, next) {
    try {
      const { trainerId } = req.params;
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));

      const history = await this.leaveService.getLeaveAuditHistory(
        trainerId,
        limit,
      );

      res.status(200).json({
        success: true,
        data: history,
        meta: { limit },
        code: "LEAVE_AUDIT_FETCHED",
      });
    } catch (error) {
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ TRIGGER AUTOMATED INCREMENT
  // ============================================
  async triggerAutoIncrement(req, res, next) {
    try {
      if (!ADMIN_ROLES.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can trigger automated processes",
          code: "UNAUTHORIZED",
        });
      }

      const { testMode = false, testDays = 30 } = req.body;

      console.log(`🎯 Manual trigger initiated by: ${req.user.username}`);
      if (testMode) {
        console.log(
          `🧪 TEST MODE: Simulating ${testDays} days since last increment`,
        );
      }

      const result = await this.leaveService.autoIncrementMonthlyLeaves(
        testMode,
        testDays,
      );

      const sanitizedResult = JSON.parse(
        JSON.stringify(result, (key, value) => {
          return value === Infinity ? "Infinity" : value;
        }),
      );

      res.status(200).json({
        success: true,
        message: testMode
          ? `Test mode: Auto-increment simulated (${testDays} days ago)`
          : "Automated leave increment triggered successfully",
        data: sanitizedResult,
        code: testMode ? "TEST_AUTO_INCREMENT" : "AUTO_INCREMENT_TRIGGERED",
      });
    } catch (error) {
      console.error("❌ Error in triggerAutoIncrement:", error);
      res.status(500).json({
        success: false,
        message: "Failed to trigger auto increment",
        error: error.message,
        code: "AUTO_INCREMENT_FAILED",
      });
    }
  }

  // ============================================
  // ✅ TRIGGER AUTOMATED ROLLOVER
  // ============================================
  async triggerAutoRollover(req, res, next) {
    try {
      if (!ADMIN_ROLES.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can trigger automated processes",
          code: "UNAUTHORIZED",
        });
      }

      const result = await this.leaveService.autoYearEndRollover();

      res.status(200).json({
        success: true,
        message: "Automated rollover triggered successfully",
        data: result,
        code: "AUTO_ROLLOVER_TRIGGERED",
      });
    } catch (error) {
      console.error("❌ Error in triggerAutoRollover:", error);
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ GET AUTOMATION STATUS
  // ============================================
  async getAutomationStatus(req, res, next) {
    try {
      const permanentTrainers = await User.countDocuments({
        role: "TRAINER",
        trainerCategory: TRAINER_CATEGORY.PERMANENT,
        status: "ACTIVE",
      });

      const contractedTrainers = await User.countDocuments({
        role: "TRAINER",
        trainerCategory: TRAINER_CATEGORY.CONTRACTED,
        status: "ACTIVE",
      });

      const recentUpdates = await User.aggregate([
        { $match: { role: "TRAINER", status: "ACTIVE" } },
        {
          $project: {
            username: 1,
            email: 1,
            "profile.firstName": 1,
            "profile.lastName": 1,
            trainerCategory: 1,
            "leaveBalance.lastUpdated": 1,
            "leaveBalance.lastIncrementDate": 1,
            "leaveBalance.lastRolloverDate": 1,
          },
        },
        { $sort: { "leaveBalance.lastUpdated": -1 } },
        { $limit: 10 },
      ]);

      const now = new Date();
      const currentMonth = now.getMonth() + 1;

      res.status(200).json({
        success: true,
        data: {
          stats: {
            permanentTrainers,
            contractedTrainers,
            totalTrainers: permanentTrainers + contractedTrainers,
          },
          automation: {
            monthlyIncrement: {
              schedule: "Daily at 2:00 AM",
              description:
                "Checks and increments leaves for PERMANENT trainers every 30 days",
              nextRun: "Tomorrow 02:00 AM",
            },
            yearEndRollover: {
              schedule: "1st of every month at 3:00 AM",
              description:
                "Rolls over unused leaves for PERMANENT trainers at year-end (December only)",
              currentMonth,
              isDecember: currentMonth === 12,
              nextRun:
                currentMonth === 12 ? "Today 03:00 AM" : `Next December 1st`,
            },
          },
          recentUpdates,
          lastCheck: now.toISOString(),
        },
        code: "AUTOMATION_STATUS_FETCHED",
      });
    } catch (error) {
      console.error("❌ Error in getAutomationStatus:", error);
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ HELPER: Handle controller errors
  // ============================================
  handleControllerError(error, res, next) {
    console.error("Controller Error:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: "VALIDATION_ERROR",
      });
    }

    if (error.name === "ConflictError") {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: "CONFLICT_ERROR",
      });
    }

    if (error.name === "NotFoundError") {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: "NOT_FOUND_ERROR",
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field} already exists`,
        code: "DUPLICATE_KEY_ERROR",
        field,
      });
    }

    if (error.name === "CastError" && error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
        code: "INVALID_ID_FORMAT",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  }

  // ============================================
  // ✅ GET ALL TRAINERS' LEAVE SUMMARY
  // ============================================
  async getAllTrainersLeaveSummary(req, res, next) {
    try {
      if (!ADMIN_ROLES.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can view all trainers' leave summary",
          code: "UNAUTHORIZED",
        });
      }

      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
      const category = req.query.category;

      const query = { role: "TRAINER", status: "ACTIVE" };
      if (
        category &&
        Object.values(TRAINER_CATEGORY).includes(category.toUpperCase())
      ) {
        query.trainerCategory = category.toUpperCase();
      }

      const skip = (page - 1) * limit;

      const trainers = await User.find(query)
        .select(
          "username email profile.firstName profile.lastName trainerCategory leaveBalance",
        )
        .skip(skip)
        .limit(limit)
        .sort({ "profile.lastName": 1 });

      const total = await User.countDocuments(query);

      const summary = trainers.map((trainer) => ({
        id: trainer._id,
        name:
          `${trainer.profile?.firstName || ""} ${trainer.profile?.lastName || ""}`.trim() ||
          trainer.username,
        username: trainer.username,
        email: trainer.email,
        category: trainer.trainerCategory,
        balance: {
          sick: {
            available: trainer.leaveBalance?.sick?.available || 0,
            used: trainer.leaveBalance?.sick?.used || 0,
            carryForward: trainer.leaveBalance?.sick?.carryForward || 0,
          },
          casual: {
            available: trainer.leaveBalance?.casual?.available || 0,
            used: trainer.leaveBalance?.casual?.used || 0,
            carryForward: trainer.leaveBalance?.casual?.carryForward || 0,
          },
          paid: {
            available:
              trainer.leaveBalance?.paid?.available === Infinity
                ? "Unlimited"
                : trainer.leaveBalance?.paid?.available || 0,
            used: trainer.leaveBalance?.paid?.used || 0,
            carryForward: trainer.leaveBalance?.paid?.carryForward || 0,
          },
          lastUpdated: trainer.leaveBalance?.lastUpdated,
          lastIncrementDate: trainer.leaveBalance?.lastIncrementDate,
          lastRolloverDate: trainer.leaveBalance?.lastRolloverDate,
        },
      }));

      const totals = {
        sick: summary.reduce(
          (sum, trainer) => sum + (trainer.balance.sick.available || 0),
          0,
        ),
        casual: summary.reduce(
          (sum, trainer) => sum + (trainer.balance.casual.available || 0),
          0,
        ),
        paid: summary.reduce(
          (sum, trainer) =>
            sum +
            (trainer.balance.paid.available === "Unlimited"
              ? 0
              : trainer.balance.paid.available || 0),
          0,
        ),
      };

      res.status(200).json({
        success: true,
        data: {
          summary,
          totals,
          filters: { category },
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        },
        code: "TRAINERS_LEAVE_SUMMARY_FETCHED",
      });
    } catch (error) {
      console.error("❌ Error in getAllTrainersLeaveSummary:", error);
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ GENERATE BALANCE REPORT
  // ============================================
  async generateBalanceReport(req, res, next) {
    try {
      const { month, year, trainerCategory, trainerId } = req.query;

      const reportMonth = parseInt(month) || new Date().getMonth() + 1;
      const reportYear = parseInt(year) || new Date().getFullYear();

      if (reportMonth < 1 || reportMonth > 12) {
        return res.status(400).json({
          success: false,
          message: "Invalid month. Must be between 1 and 12",
          code: "INVALID_MONTH",
        });
      }

      if (reportYear < 2000 || reportYear > 2100) {
        return res.status(400).json({
          success: false,
          message: "Invalid year",
          code: "INVALID_YEAR",
        });
      }

      const report = await this.leaveService.generateBalanceReport(
        reportMonth,
        reportYear,
        trainerCategory,
        trainerId,
      );

      res.status(200).json({
        success: true,
        data: report,
        meta: {
          month: reportMonth,
          year: reportYear,
          monthName: new Date(reportYear, reportMonth - 1).toLocaleString(
            "default",
            { month: "long" },
          ),
          totalTrainers: report.length,
          generatedAt: new Date(),
        },
        code: "BALANCE_REPORT_GENERATED",
      });
    } catch (error) {
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ DOWNLOAD BALANCE REPORT
  // ============================================
  async downloadBalanceReport(req, res, next) {
    try {
      const { month, year, trainerCategory, trainerId } = req.query;

      const reportMonth = parseInt(month) || new Date().getMonth() + 1;
      const reportYear = parseInt(year) || new Date().getFullYear();

      const buffer = await this.leaveService.downloadExcelReport(
        reportMonth,
        reportYear,
        trainerCategory,
        trainerId,
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=leave-balance-report-${reportMonth}-${reportYear}.xlsx`,
      );

      res.send(buffer);
    } catch (error) {
      this.handleControllerError(error, res, next);
    }
  }
}
