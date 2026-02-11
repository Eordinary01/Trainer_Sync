import { LeaveService } from "../services/LeaveService.js";
import { EmailService } from "../services/EmailService.js";
import { CronService } from "../services/CronServices.js"; // ✅ Fixed import
import { Leave } from "../models/Leave.model.js";
import User from "../models/User.model.js";
import { LEAVE_CONFIG, ADMIN_ROLES, TRAINER_CATEGORY } from "../config/constant.js";

export class LeaveController {
  constructor() {
    this.leaveService = new LeaveService();
    this.emailService = new EmailService();
    this.cronService = new CronService(); // ✅ Add CronService
  }

  // ✅ Helper function to get user's full name
  getUserFullName(user) {
    if (!user) return "User";

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
    if (!reason || reason.trim().length < 5) errors.push("Valid reason is required (minimum 5 characters)");

    // Validate date format
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (isNaN(from.getTime())) errors.push("Invalid from date format");
    if (isNaN(to.getTime())) errors.push("Invalid to date format");
    
    if (from > to) errors.push("From date cannot be after to date");

    // Check if date is in past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (from < today) errors.push("Cannot apply for leave in the past");

    return errors;
  }

  // ============================================
  // ✅ APPLY LEAVE - Optimized with better validation
  // ============================================
  async applyLeave(req, res, next) {
    try {
      const { fromDate, toDate, leaveType, reason, emergencyContact } = req.body;
      const trainerId = req.user.userId;

      // ✅ Validate input
      const validationErrors = this.validateLeaveApplication(fromDate, toDate, leaveType, reason);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationErrors
        });
      }

      const newFromDate = new Date(fromDate);
      const newToDate = new Date(toDate);

      // ✅ Get trainer to check category
      const trainer = await User.findById(trainerId);
      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: "Trainer not found",
          code: "TRAINER_NOT_FOUND"
        });
      }

      // ✅ Check if leave type is allowed for this category
      const leaveConfig = LEAVE_CONFIG[trainer.trainerCategory];
      if (!leaveConfig?.allowedLeaveTypes?.includes(leaveType)) {
        return res.status(400).json({
          success: false,
          message: `${leaveType} leaves are not available for ${trainer.trainerCategory} trainers`,
          code: "LEAVE_TYPE_NOT_ALLOWED"
        });
      }

      // ✅ Check for overlapping leaves
      const overlappingLeaves = await Leave.find({
        trainerId,
        status: { $in: ["PENDING", "APPROVED"] },
        $or: [
          {
            fromDate: { $lte: newToDate },
            toDate: { $gte: newFromDate },
          },
        ],
      });

      if (overlappingLeaves.length > 0) {
        const overlappingLeave = overlappingLeaves[0];
        return res.status(409).json({
          success: false,
          message: `You already have a ${overlappingLeave.status.toLowerCase()} leave request for overlapping dates`,
          data: {
            overlappingLeave: {
              fromDate: overlappingLeave.fromDate,
              toDate: overlappingLeave.toDate,
              status: overlappingLeave.status,
              leaveType: overlappingLeave.leaveType,
            },
          },
          code: "LEAVE_OVERLAP"
        });
      }

      // ✅ Check leave balance
      const balanceData = await this.leaveService.calculateLeaveBalance(trainerId);
      const leaveTypeKey = leaveType.toLowerCase();
      const availableBalance = balanceData.balance?.[leaveTypeKey]?.available || 0;

      // ✅ Calculate total days requested
      const timeDiff = newToDate.getTime() - newFromDate.getTime();
      const numberOfDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

      // ✅ Check if balance is sufficient
      if (availableBalance !== Infinity && numberOfDays > availableBalance) {
        return res.status(400).json({
          success: false,
          message: `Insufficient ${leaveType} leave balance. Available: ${availableBalance} days, Requested: ${numberOfDays} days`,
          code: "INSUFFICIENT_BALANCE"
        });
      }

      // ✅ Check maximum days per application
      const MAX_DAYS_PER_APPLICATION = 30;
      if (numberOfDays > MAX_DAYS_PER_APPLICATION) {
        return res.status(400).json({
          success: false,
          message: `Cannot apply for more than ${MAX_DAYS_PER_APPLICATION} days at once`,
          code: "MAX_DAYS_EXCEEDED"
        });
      }

      // ✅ All validations passed - create leave
      const leave = await this.leaveService.applyLeave(trainerId, {
        leaveType,
        fromDate: newFromDate,
        toDate: newToDate,
        numberOfDays,
        reason: reason.trim(),
        emergencyContact: emergencyContact?.trim(),
      });

      // ✅ Populate trainer details
      await leave.populate(
        "trainerId",
        "username profile.firstName profile.lastName email profile.employeeId trainerCategory"
      );

      const trainerName = this.getUserFullName(leave.trainerId);

      // ✅ Send email notifications asynchronously
      this.sendLeaveApplicationNotifications(trainerName, leave);

      res.status(201).json({
        success: true,
        message: "Leave application submitted successfully",
        data: leave,
        code: "LEAVE_APPLIED"
      });
    } catch (error) {
      console.error("❌ Error in applyLeave:", error);
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ HELPER: Send leave application notifications
  // ============================================
  async sendLeaveApplicationNotifications(trainerName, leave) {
    try {
      // Get all HR and Admin emails
      const hrAdmins = await User.find({
        role: { $in: ["HR", "ADMIN"] },
        status: "ACTIVE"
      }).select("email profile.firstName profile.lastName");

      // Send email to each HR/Admin
      for (const admin of hrAdmins) {
        if (admin.email) {
          await this.emailService.sendLeaveNotification(
            admin.email,
            trainerName,
            {
              leaveType: leave.leaveType,
              fromDate: leave.fromDate,
              toDate: leave.toDate,
              numberOfDays: leave.numberOfDays,
              reason: leave.reason,
              trainerName,
              employeeId: leave.trainerId?.profile?.employeeId
            }
          );
        }
      }
      
      console.log(`📧 Leave application emails sent to ${hrAdmins.length} HR/Admin users`);
    } catch (emailError) {
      console.error("❌ Failed to send email notifications:", emailError);
    }
  }

  // ============================================
  // ✅ APPROVE LEAVE - Optimized
  // ============================================
  async approveLeave(req, res, next) {
    try {
      const { id } = req.params;
      const { comments, remarks } = req.body;
      const adminComments = comments || remarks || "";

      // ✅ Call service which handles balance deduction
      const leave = await this.leaveService.approveLeave(
        id,
        req.user.userId,
        adminComments,
      );

      const trainerName = this.getUserFullName(leave.trainerId);
      const approvedByName = this.getUserFullName(leave.approvedBy);

      // ✅ Send approval email to trainer
      try {
        const trainerEmail = leave.trainerId?.email;
        if (trainerEmail) {
          await this.emailService.sendLeaveApprovalEmail(
            trainerEmail,
            trainerName,
            {
              leaveType: leave.leaveType,
              fromDate: leave.fromDate,
              toDate: leave.toDate,
              numberOfDays: leave.numberOfDays,
              comments: adminComments,
              approvedBy: approvedByName,
            },
            true // approved
          );
        }
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
      }

      // ✅ Send notification to other HR/Admin
      this.sendLeaveApprovalNotifications(leave, adminComments, true);

      res.status(200).json({
        success: true,
        message: "Leave approved successfully",
        data: {
          ...leave.toObject(),
          approvedByName,
        },
        code: "LEAVE_APPROVED"
      });
    } catch (error) {
      console.error("❌ Error in approveLeave:", error);
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ REJECT LEAVE - Optimized
  // ============================================
  async rejectLeave(req, res, next) {
    try {
      const { id } = req.params;
      const { comments, remarks } = req.body;
      const adminComments = comments || remarks || "";

      // ✅ Call service to reject leave
      const leave = await this.leaveService.rejectLeave(
        id,
        req.user.userId,
        adminComments,
      );

      const trainerName = this.getUserFullName(leave.trainerId);
      const rejectorName = this.getUserFullName(leave.rejectedBy);

      // ✅ Send rejection email to trainer
      try {
        const trainerEmail = leave.trainerId?.email;
        if (trainerEmail) {
          await this.emailService.sendLeaveApprovalEmail(
            trainerEmail,
            trainerName,
            {
              leaveType: leave.leaveType,
              fromDate: leave.fromDate,
              toDate: leave.toDate,
              numberOfDays: leave.numberOfDays,
              comments: adminComments,
              rejectedBy: rejectorName,
            },
            false // rejected
          );
        }
      } catch (emailError) {
        console.error("Failed to send rejection email:", emailError);
      }

      // ✅ Send notification to other HR/Admin
      this.sendLeaveApprovalNotifications(leave, adminComments, false);

      res.status(200).json({
        success: true,
        message: "Leave rejected successfully",
        data: {
          ...leave.toObject(),
          rejectorName,
        },
        code: "LEAVE_REJECTED"
      });
    } catch (error) {
      console.error("❌ Error in rejectLeave:", error);
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ HELPER: Send leave approval/rejection notifications
  // ============================================
  async sendLeaveApprovalNotifications(leave, comments, isApproved) {
    try {
      // Get all HR and Admin emails (excluding the approver/rejector)
      const hrAdmins = await User.find({
        role: { $in: ["HR", "ADMIN"] },
        _id: { $ne: isApproved ? leave.approvedBy?._id : leave.rejectedBy?._id },
        status: "ACTIVE"
      }).select("email profile.firstName profile.lastName");

      const trainerName = this.getUserFullName(leave.trainerId);
      const action = isApproved ? "Approved" : "Rejected";
      const actionBy = isApproved ? leave.approvedBy : leave.rejectedBy;
      const actionByName = this.getUserFullName(actionBy);

      for (const admin of hrAdmins) {
        if (admin.email) {
          await this.emailService.sendEmail(
            admin.email,
            `Leave ${action}: ${trainerName}`,
            `
              <h2>Leave Application ${action}</h2>
              <p>A leave application has been ${action.toLowerCase()}:</p>
              <ul>
                <li><strong>Trainer:</strong> ${trainerName}</li>
                <li><strong>Leave Type:</strong> ${leave.leaveType}</li>
                <li><strong>Dates:</strong> ${new Date(leave.fromDate).toLocaleDateString()} to ${new Date(leave.toDate).toLocaleDateString()}</li>
                <li><strong>Duration:</strong> ${leave.numberOfDays} days</li>
                <li><strong>${action} By:</strong> ${actionByName}</li>
                ${comments ? `<li><strong>Comments:</strong> ${comments}</li>` : ""}
              </ul>
              ${isApproved ? "<p>The trainer's leave balance has been updated automatically.</p>" : ""}
            `
          );
        }
      }
    } catch (emailError) {
      console.error("Failed to send admin notification:", emailError);
    }
  }

  // ============================================
  // ✅ CANCEL LEAVE - Optimized
  // ============================================
  async cancelLeave(req, res, next) {
    try {
      const { id } = req.params;
      const { comments, remarks } = req.body;
      const adminComments = comments || remarks || "";

      // ✅ Call service to cancel leave (restores balance)
      const leave = await this.leaveService.cancelLeave(
        id,
        req.user.userId,
        req.user.role,
        adminComments,
      );

      const trainerName = this.getUserFullName(leave.trainerId);
      const trainerEmail = leave.trainerId?.email;

      // ✅ Send cancellation email to trainer
      if (trainerEmail) {
        try {
          await this.emailService.sendEmail(
            trainerEmail,
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
            `
          );
        } catch (emailError) {
          console.error("Failed to send cancellation email:", emailError);
        }
      }

      res.status(200).json({
        success: true,
        message: "Leave application cancelled",
        data: leave,
        code: "LEAVE_CANCELLED"
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
    const balance = await this.leaveService.getLeaveBalance(userId);

    // Get trainer info to check category
    const trainer = await User.findById(userId).select('trainerCategory');
    
    // ✅ Convert Infinity before sending response
    const sanitizeInfinity = (obj) => {
      return JSON.parse(
        JSON.stringify(obj, (key, value) =>
          value === Infinity ? "Infinity" : value
        )
      );
    };

    res.status(200).json({
      success: true,
      data: {
        ...sanitizeInfinity(balance),
        trainerCategory: trainer?.trainerCategory,
        canUpdateBalance: trainer?.trainerCategory !== "CONTRACTED"
      },
      code: "LEAVE_BALANCE_FETCHED"
    });

  } catch (error) {
    this.handleControllerError(error, res, next);
  }
}


  // ============================================
  // ✅ EDIT LEAVE BALANCE (Admin/HR only) - UPDATED
  // ============================================
  async editLeaveBalance(req, res, next) {
    try {
      const { trainerId } = req.params;
      const { leaveType, newBalance, reason } = req.body;

      // ✅ Check authorization
      if (!ADMIN_ROLES.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can edit leave balance",
          code: "UNAUTHORIZED"
        });
      }

      // ✅ Validate input
      if (!leaveType || newBalance === undefined) {
        return res.status(400).json({
          success: false,
          message: "leaveType and newBalance are required",
          code: "MISSING_FIELDS"
        });
      }

      // ✅ Call service to edit balance
      const updatedBalance = await this.leaveService.editLeaveBalance(
        trainerId,
        leaveType,
        newBalance,
        req.user.userId,
        reason || "Admin adjustment",
      );

      const user = await User.findById(trainerId).select("profile.firstName profile.lastName email username");
      const userName = this.getUserFullName(user);

      // ✅ Send notification email using new method
      if (user.email) {
        try {
          await this.emailService.sendLeaveBalanceUpdate(
            user.email,
            userName,
            {
              leaveType,
              newBalance,
              updatedBy: this.getUserFullName(req.user),
              reason: reason || "Admin adjustment",
              updatedAt: new Date()
            }
          );
        } catch (emailError) {
          console.error("Failed to send balance update email:", emailError);
        }
      }

      res.status(200).json({
        success: true,
        message: "Leave balance updated successfully",
        data: updatedBalance,
        code: "LEAVE_BALANCE_UPDATED"
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

    // First, get the trainer to check category
    const trainer = await User.findById(trainerId);
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found",
        code: "TRAINER_NOT_FOUND"
      });
    }

    // Check if trainer is CONTRACTED
    if (trainer.trainerCategory === "CONTRACTED") {
      return res.status(400).json({
        success: false,
        message: "Cannot update leave balance for CONTRACTED trainers",
        code: "CONTRACTED_TRAINER_NO_BALANCE"
      });
    }

    // Proceed with balance update
    const result = await this.leaveService.updateLeaveBalance(
      trainerId,
      leaveType,
      newBalance,
      reason,
      adminId
    );

    res.status(200).json({
      success: true,
      data: result,
      message: "Leave balance updated successfully",
      code: "LEAVE_BALANCE_UPDATED"
    });
  } catch (error) {
    this.handleControllerError(error, res, next);
  }
}

  // ============================================
  // ✅ GET PENDING LEAVES
  // ============================================
  async getPendingLeaves(req, res, next) {
    try {
      const filters = {
        trainerId: req.query.trainerId,
        trainerCategory: req.query.category,
      };

      const leaves = await this.leaveService.getPendingLeaves(filters);

      res.status(200).json({
        success: true,
        data: leaves,
        code: "PENDING_LEAVES_FETCHED"
      });
    } catch (error) {
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ GET LEAVE HISTORY
  // ============================================
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

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          page: filters.page,
          limit: filters.limit,
          total: result.pagination?.total || 0,
          pages: result.pagination?.pages || 1
        },
        code: "LEAVE_HISTORY_FETCHED"
      });
    } catch (error) {
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ UPDATE LEAVE (Generic update)
  // ============================================
  async updateLeave(req, res, next) {
    try {
      const { id } = req.params;

      const leave = await Leave.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
      )
      .populate("trainerId", "username email profile.firstName profile.lastName")
      .populate("approvedBy", "username profile.firstName profile.lastName")
      .populate("rejectedBy", "username profile.firstName profile.lastName");

      if (!leave) {
        return res.status(404).json({
          success: false,
          message: "Leave not found",
          code: "LEAVE_NOT_FOUND"
        });
      }

      // ✅ Send update email to trainer if status changed
      if (req.body.status && leave.trainerId?.email) {
        try {
          const trainerName = this.getUserFullName(leave.trainerId);
          await this.emailService.sendEmail(
            leave.trainerId.email,
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
            `
          );
        } catch (emailError) {
          console.error("Failed to send update email:", emailError);
        }
      }

      res.status(200).json({
        success: true,
        message: "Leave application updated",
        data: leave,
        code: "LEAVE_UPDATED"
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
        code: "LEAVE_STATS_FETCHED"
      });
    } catch (error) {
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ INCREMENT MONTHLY LEAVES (Admin/HR only)
  // ============================================
  async incrementMonthlyLeaves(req, res, next) {
    try {
      const { trainerId } = req.params;

      // ✅ Check authorization
      if (!ADMIN_ROLES.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can increment leaves",
          code: "UNAUTHORIZED"
        });
      }

      const result = await this.leaveService.incrementMonthlyLeaves(trainerId);

      if (!result) {
        return res.status(400).json({
          success: false,
          message: "Monthly increment not available (either not a PERMANENT trainer or not yet 30 days)",
          code: "INCREMENT_NOT_AVAILABLE"
        });
      }

      // ✅ Send notification email if increment was successful
      if (result) {
        try {
          const user = await User.findById(trainerId).select("email profile.firstName profile.lastName username");
          if (user.email) {
            await this.emailService.sendMonthlyIncrementNotification(
              user.email,
              this.getUserFullName(user),
              {
                sickDays: result.sick?.available || 0,
                casualDays: result.casual?.available || 0,
                totalSick: result.sick?.available || 0,
                totalCasual: result.casual?.available || 0
              }
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
        code: "LEAVES_INCREMENTED"
      });
    } catch (error) {
      console.error("❌ Error in incrementMonthlyLeaves:", error);
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ ROLLOVER UNUSED LEAVES (Admin/HR only)
  // ============================================
  async rolloverUnusedLeaves(req, res, next) {
    try {
      const { trainerId } = req.params;

      // ✅ Check authorization
      if (!ADMIN_ROLES.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can perform rollover",
          code: "UNAUTHORIZED"
        });
      }

      const result = await this.leaveService.rolloverUnusedLeaves(trainerId);

      if (!result) {
        return res.status(400).json({
          success: false,
          message: "Rollover not available (not a PERMANENT trainer or rollover disabled)",
          code: "ROLLOVER_NOT_AVAILABLE"
        });
      }

      res.status(200).json({
        success: true,
        message: "Leaves rolled over successfully",
        data: result,
        code: "LEAVES_ROLLED_OVER"
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

      const history = await this.leaveService.getLeaveAuditHistory(trainerId, limit);

      res.status(200).json({
        success: true,
        data: history,
        meta: { limit },
        code: "LEAVE_AUDIT_FETCHED"
      });
    } catch (error) {
      this.handleControllerError(error, res, next);
    }
  }

  // ============================================
  // ✅ TRIGGER AUTOMATED INCREMENT (Admin/HR only)
  // ============================================
  async triggerAutoIncrement(req, res, next) {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin and HR can trigger automated processes",
        code: "UNAUTHORIZED"
      });
    }

    const { testMode = false, testDays = 30 } = req.body;
    
    console.log(`🎯 Manual trigger initiated by: ${req.user.username}`);
    if (testMode) {
      console.log(`🧪 TEST MODE: Simulating ${testDays} days since last increment`);
    }
    
    const result = await this.leaveService.autoIncrementMonthlyLeaves(testMode, testDays);

    const sanitizedResult = JSON.parse(JSON.stringify(result, (key, value) => {
      return value === Infinity ? "Infinity" : value;
    }));

    res.status(200).json({
      success: true,
      message: testMode 
        ? `Test mode: Auto-increment simulated (${testDays} days ago)`
        : "Automated leave increment triggered successfully",
      data: sanitizedResult,
      code: testMode ? "TEST_AUTO_INCREMENT" : "AUTO_INCREMENT_TRIGGERED"
    });
  } catch (error) {
    console.error("❌ Error in triggerAutoIncrement:", error);
    res.status(500).json({
      success: false,
      message: "Failed to trigger auto increment",
      error: error.message,
      code: "AUTO_INCREMENT_FAILED"
    });
  }
}

  // ============================================
  // ✅ TRIGGER AUTOMATED ROLLOVER (Admin/HR only)
  // ============================================
  async triggerAutoRollover(req, res, next) {
    try {
      // ✅ Check authorization
      if (!ADMIN_ROLES.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can trigger automated processes",
          code: "UNAUTHORIZED"
        });
      }

      const result = await this.leaveService.autoYearEndRollover();

      res.status(200).json({
        success: true,
        message: "Automated rollover triggered successfully",
        data: result,
        code: "AUTO_ROLLOVER_TRIGGERED"
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
    // Get counts - ADD role: 'TRAINER' to both queries
    const permanentTrainers = await User.countDocuments({
      role: 'TRAINER', 
      trainerCategory: TRAINER_CATEGORY.PERMANENT,
      status: 'ACTIVE'
    });

    const contractedTrainers = await User.countDocuments({
      role: 'TRAINER', 
      trainerCategory: TRAINER_CATEGORY.CONTRACTED,
      status: 'ACTIVE'
    });

    // Get last 10 leave balance updates
    const recentUpdates = await User.aggregate([
      { $match: { role: 'TRAINER', status: 'ACTIVE' } },
      { $project: {
        username: 1,
        email: 1,
        'profile.firstName': 1,
        'profile.lastName': 1,
        trainerCategory: 1,
        'leaveBalance.lastUpdated': 1,
        'leaveBalance.lastIncrementDate': 1,
        'leaveBalance.lastRolloverDate': 1
      }},
      { $sort: { 'leaveBalance.lastUpdated': -1 } },
      { $limit: 10 }
    ]);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    
    res.status(200).json({
      success: true,
      data: {
        stats: {
          permanentTrainers,
          contractedTrainers,
          totalTrainers: permanentTrainers + contractedTrainers
        },
        automation: {
          monthlyIncrement: {
            schedule: 'Daily at 2:00 AM',
            description: 'Checks and increments leaves for PERMANENT trainers every 30 days',
            nextRun: 'Tomorrow 02:00 AM'
          },
          yearEndRollover: {
            schedule: '1st of every month at 3:00 AM',
            description: 'Rolls over unused leaves for PERMANENT trainers at year-end (December only)',
            currentMonth,
            isDecember: currentMonth === 12,
            nextRun: currentMonth === 12 ? 'Today 03:00 AM' : `Next December 1st`
          }
        },
        recentUpdates,
        lastCheck: now.toISOString()
      },
      code: "AUTOMATION_STATUS_FETCHED"
    });
  } catch (error) {
    console.error("❌ Error in getAutomationStatus:", error);
    this.handleControllerError(error, res, next);
  }
}

  // ============================================
  // ✅ HELPER: Handle controller errors consistently
  // ============================================
  handleControllerError(error, res, next) {
    console.error('Controller Error:', error.message);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: "VALIDATION_ERROR"
      });
    }
    
    if (error.name === 'ConflictError') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: "CONFLICT_ERROR"
      });
    }
    
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: "NOT_FOUND_ERROR"
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field} already exists`,
        code: "DUPLICATE_KEY_ERROR",
        field
      });
    }

    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
        code: "INVALID_ID_FORMAT"
      });
    }

    // Default error handling
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR"
    });
  }

  // ============================================
  // ✅ NEW: Get all trainers' leave summary (Admin/HR only)
  // ============================================
  async getAllTrainersLeaveSummary(req, res, next) {
    try {
      // ✅ Check authorization
      if (!ADMIN_ROLES.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only Admin and HR can view all trainers' leave summary",
          code: "UNAUTHORIZED"
        });
      }

      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
      const category = req.query.category;

      // Build query
      const query = { role: 'TRAINER', status: 'ACTIVE' };
      if (category && Object.values(TRAINER_CATEGORY).includes(category.toUpperCase())) {
        query.trainerCategory = category.toUpperCase();
      }

      const skip = (page - 1) * limit;

      // Get trainers with pagination
      const trainers = await User.find(query)
        .select('username email profile.firstName profile.lastName trainerCategory leaveBalance')
        .skip(skip)
        .limit(limit)
        .sort({ 'profile.lastName': 1 });

      const total = await User.countDocuments(query);

      // Format response
      const summary = trainers.map(trainer => ({
        id: trainer._id,
        name: `${trainer.profile?.firstName || ''} ${trainer.profile?.lastName || ''}`.trim() || trainer.username,
        username: trainer.username,
        email: trainer.email,
        category: trainer.trainerCategory,
        balance: {
          sick: {
            available: trainer.leaveBalance?.sick?.available || 0,
            used: trainer.leaveBalance?.sick?.used || 0,
            carryForward: trainer.leaveBalance?.sick?.carryForward || 0
          },
          casual: {
            available: trainer.leaveBalance?.casual?.available || 0,
            used: trainer.leaveBalance?.casual?.used || 0,
            carryForward: trainer.leaveBalance?.casual?.carryForward || 0
          },
          paid: {
            available: trainer.leaveBalance?.paid?.available === Infinity ? 'Unlimited' : trainer.leaveBalance?.paid?.available || 0,
            used: trainer.leaveBalance?.paid?.used || 0,
            carryForward: trainer.leaveBalance?.paid?.carryForward || 0
          },
          lastUpdated: trainer.leaveBalance?.lastUpdated,
          lastIncrementDate: trainer.leaveBalance?.lastIncrementDate,
          lastRolloverDate: trainer.leaveBalance?.lastRolloverDate
        }
      }));

      // Calculate totals
      const totals = {
        sick: summary.reduce((sum, trainer) => sum + (trainer.balance.sick.available || 0), 0),
        casual: summary.reduce((sum, trainer) => sum + (trainer.balance.casual.available || 0), 0),
        paid: summary.reduce((sum, trainer) => sum + (trainer.balance.paid.available === 'Unlimited' ? 0 : trainer.balance.paid.available || 0), 0)
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
            pages: Math.ceil(total / limit)
          }
        },
        code: "TRAINERS_LEAVE_SUMMARY_FETCHED"
      });
    } catch (error) {
      console.error("❌ Error in getAllTrainersLeaveSummary:", error);
      this.handleControllerError(error, res, next);
    }
  }
}