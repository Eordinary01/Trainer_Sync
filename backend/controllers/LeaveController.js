// controllers/LeaveController.js
import { LeaveService } from "../services/LeaveService.js";
import { EmailService } from "../services/EmailService.js"; // Import EmailService
import { Leave } from "../models/Leave.model.js";
import  User  from "../models/User.model.js";

export class LeaveController {
  constructor() {
    this.leaveService = new LeaveService();
    this.emailService = new EmailService(); // Initialize EmailService
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
      return user.email.split("@")[0];
    }

    return "User";
  }

  async applyLeave(req, res, next) {
    try {
      const { fromDate, toDate, leaveType, reason } = req.body;
      const trainerId = req.user.userId;

      // Validate required fields
      if (!fromDate || !toDate || !leaveType || !reason) {
        return res.status(400).json({
          success: false,
          message:
            "All fields are required: fromDate, toDate, leaveType, reason",
        });
      }

      // Parse dates
      const newFromDate = new Date(fromDate);
      const newToDate = new Date(toDate);

      // Validate dates
      if (newFromDate > newToDate) {
        return res.status(400).json({
          success: false,
          message: "From date cannot be after to date",
        });
      }

      // Check if date is in past
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (newFromDate < today) {
        return res.status(400).json({
          success: false,
          message: "Cannot apply for leave in the past",
        });
      }

      // Check for overlapping leaves (PENDING or APPROVED only)
      const overlappingLeaves = await Leave.find({
        trainerId,
        status: { $in: ["PENDING", "APPROVED"] },
        $or: [{ fromDate: { $lte: newToDate }, toDate: { $gte: newFromDate } }],
      });

      if (overlappingLeaves.length > 0) {
        const overlappingLeave = overlappingLeaves[0];
        const statusText =
          overlappingLeave.status === "PENDING" ? "pending" : "approved";
        const leaveTypeText = overlappingLeave.leaveType.toLowerCase();

        return res.status(409).json({
          success: false,
          message: `You already have a ${statusText} ${leaveTypeText} leave from ${new Date(overlappingLeave.fromDate).toLocaleDateString()} to ${new Date(overlappingLeave.toDate).toLocaleDateString()}. Please select different dates.`,
          data: {
            overlappingLeave: {
              fromDate: overlappingLeave.fromDate,
              toDate: overlappingLeave.toDate,
              status: overlappingLeave.status,
              leaveType: overlappingLeave.leaveType,
              reason: overlappingLeave.reason,
            },
          },
        });
      }

      // Check leave balance
      const balance = await this.leaveService.calculateLeaveBalance(trainerId);
      const leaveTypeKey = leaveType.toLowerCase();
      const availableBalance = balance[leaveTypeKey] || 0;

      // Calculate total days requested
      const timeDiff = newToDate.getTime() - newFromDate.getTime();
      const numberOfDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

      if (numberOfDays > availableBalance) {
        return res.status(400).json({
          success: false,
          message: `Insufficient ${leaveType} leave balance. Available: ${availableBalance} days, Requested: ${numberOfDays} days`,
        });
      }

      // Check maximum days per application (optional)
      const MAX_DAYS_PER_APPLICATION = 30;
      if (numberOfDays > MAX_DAYS_PER_APPLICATION) {
        return res.status(400).json({
          success: false,
          message: `Cannot apply for more than ${MAX_DAYS_PER_APPLICATION} days at once`,
        });
      }

      // All validations passed - create leave WITH numberOfDays field
      const leave = new Leave({
        trainerId,
        fromDate: newFromDate,
        toDate: newToDate,
        leaveType,
        reason,
        numberOfDays, // 🟢 ADD THIS - REQUIRED FIELD
        status: "PENDING",
        appliedOn: new Date(),
      });

      await leave.save();

      // Populate trainer details for response
      await leave.populate(
        "trainerId",
        "username profile.firstName profile.lastName email profile.employeeId",
      );

      // 📧 SEND EMAIL TO HR/ADMIN ABOUT NEW LEAVE APPLICATION
      try {
        // console.log("🔍 [DEBUG] Looking for HR/Admin users...");
        // Get all HR and Admin emails
        const hrAdmins = await User.find({
          role: { $in: ["HR", "ADMIN"] },
          status: "ACTIVE", 
        }).select("email profile.firstName profile.lastName role username");

        // console.log("🔍 [DEBUG] Found HR/Admin users:", hrAdmins.length);
        
         

        const trainerName = `${leave.trainerId.profile.firstName} ${leave.trainerId.profile.lastName}`;

        // Send email to each HR/Admin using existing method
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
              },
            );
            console.log(`📧 Leave application email sent to ${admin.email}`);
          }
        }

        console.log(
          `📧 Leave application emails sent to ${hrAdmins.length} HR/Admin users`,
        );
      } catch (emailError) {
        console.error("Failed to send email notifications:", emailError);
        // Don't fail the request if email fails
      }

      res.status(201).json({
        success: true,
        message: "Leave application submitted successfully",
        data: leave,
      });
    } catch (error) {
      console.error("Error in applyLeave:", error);

      // Handle validation errors specifically
      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: `Validation failed: ${error.message}`,
          errors: error.errors,
        });
      }

      next(error);
    }
  }

  async approveLeave(req, res, next) {
    try {
      const { id } = req.params;
      const { comments, remarks } = req.body;

      const adminComments = comments || remarks || "";
      const leave = await this.leaveService.approveLeave(
        id,
        req.user.userId,
        adminComments,
      );

      const userName = this.getUserFullName(req.user);

      const trainerName =
        leave.trainerId?.profile?.firstName &&
        leave.trainerId?.profile?.lastName
          ? `${leave.trainerId.profile.firstName} ${leave.trainerId.profile.lastName}`
          : leave.trainerId?.username
            ? leave.trainerId.username
            : "Trainer";

      const trainerEmployeeId = leave.trainerId?.profile?.employeeId || "N/A";
      const leaveType = leave.leaveType;
      const fromDate = new Date(leave.fromDate).toLocaleDateString("en-US");
      const toDate = new Date(leave.toDate).toLocaleDateString("en-US");
      const totalDays =
        leave.numberOfDays ||
        leave.totalDays ||
        Math.ceil(
          (new Date(leave.toDate) - new Date(leave.fromDate)) /
            (1000 * 60 * 60 * 24),
        ) + 1;

      // 📧 SEND APPROVAL EMAIL TO TRAINER using existing method
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
              numberOfDays: totalDays,
              comments: adminComments,
            },
            true, // approved
          );
          console.log(`📧 Leave approval email sent to ${trainerEmail}`);
        }
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
      }

      // 📧 SEND EMAIL TO HR/ADMIN ABOUT APPROVAL
      try {
        // Get all HR and Admin emails (excluding the approver)
        const hrAdmins = await User.find({
          role: { $in: ["HR", "ADMIN"] },
          _id: { $ne: req.user.userId }, // Exclude the approver
          status: "ACTIVE",
        }).select("email profile.firstName profile.lastName");

        for (const admin of hrAdmins) {
          if (admin.email) {
            // Using the generic sendEmail method since we don't have a specific method for admin notifications
            await this.emailService.sendEmail(
              admin.email,
              `Leave Approved: ${trainerName}`,
              `
                <h2>Leave Application Approved</h2>
                <p>A leave application has been approved:</p>
                <ul>
                  <li><strong>Trainer:</strong> ${trainerName} (ID: ${trainerEmployeeId})</li>
                  <li><strong>Leave Type:</strong> ${leaveType}</li>
                  <li><strong>Dates:</strong> ${fromDate} to ${toDate}</li>
                  <li><strong>Duration:</strong> ${totalDays} days</li>
                  <li><strong>Approved By:</strong> ${userName}</li>
                  ${adminComments ? `<li><strong>Comments:</strong> ${adminComments}</li>` : ""}
                </ul>
                <p>This action was performed by ${userName}.</p>
              `,
            );
            console.log(
              `📧 Leave approval notification sent to ${admin.email}`,
            );
          }
        }
      } catch (emailError) {
        console.error(
          "Failed to send admin approval notification:",
          emailError,
        );
      }

      res.status(200).json({
        success: true,
        message: "Leave approved successfully",
        data: leave,
      });
    } catch (error) {
      console.error("Error in approveLeave:", error);
      next(error);
    }
  }

  async rejectLeave(req, res, next) {
    try {
      const { id } = req.params;
      const { comments, remarks } = req.body;

      const adminComments = comments || remarks || "";
      const leave = await this.leaveService.rejectLeave(
        id,
        req.user.userId,
        adminComments,
      );

      const userName = this.getUserFullName(req.user);

      // Get trainer name properly
      const trainerName =
        leave.trainerId?.profile?.firstName &&
        leave.trainerId?.profile?.lastName
          ? `${leave.trainerId.profile.firstName} ${leave.trainerId.profile.lastName}`
          : leave.trainerId?.username
            ? leave.trainerId.username
            : "Trainer";

      const trainerEmployeeId = leave.trainerId?.profile?.employeeId || "N/A";
      const leaveType = leave.leaveType;
      const fromDate = new Date(leave.fromDate).toLocaleDateString("en-US");
      const toDate = new Date(leave.toDate).toLocaleDateString("en-US");
      const totalDays =
        leave.numberOfDays ||
        leave.totalDays ||
        Math.ceil(
          (new Date(leave.toDate) - new Date(leave.fromDate)) /
            (1000 * 60 * 60 * 24),
        ) + 1;

      // 📧 SEND REJECTION EMAIL TO TRAINER using existing method
      try {
        const trainerEmail = leave.trainerId?.email;
        // console.log(trainerEmail);
        
        if (trainerEmail) {
          await this.emailService.sendLeaveApprovalEmail(
            trainerEmail,
            trainerName,
            {
              leaveType: leave.leaveType,
              fromDate: leave.fromDate,
              toDate: leave.toDate,
              numberOfDays: totalDays,
              comments: adminComments,
            },
            false, // rejected
          );
          console.log(`📧 Leave rejection email sent to ${trainerEmail}`);
        }
      } catch (emailError) {
        console.error("Failed to send rejection email:", emailError);
      }

      // 📧 SEND EMAIL TO HR/ADMIN ABOUT REJECTION
      try {
        // Get all HR and Admin emails (excluding the rejector)
        const hrAdmins = await User.find({
          role: { $in: ["HR", "ADMIN"] },
          _id: { $ne: req.user.userId }, // Exclude the rejector
          status: "ACTIVE",
        }).select("email profile.firstName profile.lastName");

        for (const admin of hrAdmins) {
          if (admin.email) {
            // Using the generic sendEmail method
            await this.emailService.sendEmail(
              admin.email,
              `Leave Rejected: ${trainerName}`,
              `
                <h2>Leave Application Rejected</h2>
                <p>A leave application has been rejected:</p>
                <ul>
                  <li><strong>Trainer:</strong> ${trainerName} (ID: ${trainerEmployeeId})</li>
                  <li><strong>Leave Type:</strong> ${leaveType}</li>
                  <li><strong>Dates:</strong> ${fromDate} to ${toDate}</li>
                  <li><strong>Duration:</strong> ${totalDays} days</li>
                  <li><strong>Rejected By:</strong> ${userName}</li>
                  ${adminComments ? `<li><strong>Reason:</strong> ${adminComments}</li>` : ""}
                </ul>
                <p>This action was performed by ${userName}.</p>
              `,
            );
            console.log(
              `📧 Leave rejection notification sent to ${admin.email}`,
            );
          }
        }
      } catch (emailError) {
        console.error(
          "Failed to send admin rejection notification:",
          emailError,
        );
      }

      res.status(200).json({
        success: true,
        message: "Leave rejected successfully",
        data: leave,
      });
    } catch (error) {
      console.error("Error in rejectLeave:", error);
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

      const isAdminOrHR = userRole === "ADMIN" || userRole === "HR";

      const result = await this.leaveService.getLeaveHistory(
        userId,
        filters,
        isAdminOrHR,
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

      const adminComments = comments || remarks || "";
      const leave = await this.leaveService.cancelLeave(
        id,
        req.user.userId,
        adminComments,
      );

      const userName = this.getUserFullName(req.user);

      const trainerName =
        leave.trainerId?.profile?.firstName &&
        leave.trainerId?.profile?.lastName
          ? `${leave.trainerId.profile.firstName} ${leave.trainerId.profile.lastName}`
          : leave.trainerId?.username
            ? leave.trainerId.username
            : "Trainer";

      const trainerEmail = leave.trainerId?.email;
      const leaveType = leave.leaveType;
      const fromDate = new Date(leave.fromDate).toLocaleDateString("en-US");
      const toDate = new Date(leave.toDate).toLocaleDateString("en-US");
      const totalDays =
        leave.numberOfDays ||
        leave.totalDays ||
        Math.ceil(
          (new Date(leave.toDate) - new Date(leave.fromDate)) /
            (1000 * 60 * 60 * 24),
        ) + 1;

      // 📧 SEND CANCELLATION EMAIL TO TRAINER
      try {
        if (trainerEmail) {
          // Using generic sendEmail since we don't have a specific cancellation method
          await this.emailService.sendEmail(
            trainerEmail,
            `Leave Cancelled: ${leaveType}`,
            `
              <h2>Leave Application Cancelled</h2>
              <p>Your leave application has been cancelled:</p>
              <ul>
                <li><strong>Leave Type:</strong> ${leaveType}</li>
                <li><strong>Dates:</strong> ${fromDate} to ${toDate}</li>
                <li><strong>Duration:</strong> ${totalDays} days</li>
                <li><strong>Cancelled By:</strong> ${userName}</li>
                ${adminComments ? `<li><strong>Comments:</strong> ${adminComments}</li>` : ""}
              </ul>
            `,
          );
          console.log(`📧 Leave cancellation email sent to ${trainerEmail}`);
        }
      } catch (emailError) {
        console.error("Failed to send cancellation email:", emailError);
      }

      // 📧 SEND EMAIL TO HR/ADMIN ABOUT CANCELLATION
      try {
        // Get all HR and Admin emails
        const hrAdmins = await User.find({
          role: { $in: ["HR", "ADMIN"] },
          status: 'ACTIVE',
        }).select("email profile.firstName profile.lastName");

        for (const admin of hrAdmins) {
          if (admin.email) {
            await this.emailService.sendEmail(
              admin.email,
              `Leave Cancelled: ${trainerName}`,
              `
                <h2>Leave Application Cancelled</h2>
                <p>A leave application has been cancelled:</p>
                <ul>
                  <li><strong>Trainer:</strong> ${trainerName}</li>
                  <li><strong>Leave Type:</strong> ${leaveType}</li>
                  <li><strong>Dates:</strong> ${fromDate} to ${toDate}</li>
                  <li><strong>Duration:</strong> ${totalDays} days</li>
                  <li><strong>Cancelled By:</strong> ${userName}</li>
                  ${adminComments ? `<li><strong>Comments:</strong> ${adminComments}</li>` : ""}
                </ul>
                <p>This action was performed by ${userName}.</p>
              `,
            );
            console.log(
              `📧 Leave cancellation notification sent to ${admin.email}`,
            );
          }
        }
      } catch (emailError) {
        console.error(
          "Failed to send admin cancellation notification:",
          emailError,
        );
      }

      res.status(200).json({
        success: true,
        message: "Leave application cancelled",
        data: leave,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateLeave(req, res, next) {
    try {
      const { id } = req.params;
      const leave = await this.leaveService.updateLeave(
        id,
        req.user.userId,
        req.body,
      );

      const userName = this.getUserFullName(req.user);

      // 📧 SEND UPDATE EMAIL TO TRAINER IF STATUS CHANGED
      try {
        const trainerEmail = leave.trainerId?.email;
        const trainerName =
          leave.trainerId?.profile?.firstName &&
          leave.trainerId?.profile?.lastName
            ? `${leave.trainerId.profile.firstName} ${leave.trainerId.profile.lastName}`
            : leave.trainerId?.username
              ? leave.trainerId.username
              : "Trainer";

        if (trainerEmail && req.body.status) {
          const fromDate = new Date(leave.fromDate).toLocaleDateString("en-US");
          const toDate = new Date(leave.toDate).toLocaleDateString("en-US");
          const totalDays =
            leave.numberOfDays ||
            leave.totalDays ||
            Math.ceil(
              (new Date(leave.toDate) - new Date(leave.fromDate)) /
                (1000 * 60 * 60 * 24),
            ) + 1;

          await this.emailService.sendEmail(
            trainerEmail,
            `Leave Status Updated: ${leave.leaveType}`,
            `
              <h2>Leave Application Status Updated</h2>
              <p>Your leave application status has been updated to <strong>${req.body.status}</strong>:</p>
              <ul>
                <li><strong>Leave Type:</strong> ${leave.leaveType}</li>
                <li><strong>Dates:</strong> ${fromDate} to ${toDate}</li>
                <li><strong>Duration:</strong> ${totalDays} days</li>
                <li><strong>Updated By:</strong> ${userName}</li>
                <li><strong>Updated At:</strong> ${new Date().toLocaleString()}</li>
              </ul>
            `,
          );
          console.log(`📧 Leave update email sent to ${trainerEmail}`);
        }
      } catch (emailError) {
        console.error("Failed to send update email:", emailError);
      }

      res.status(200).json({
        success: true,
        message: "Leave application updated",
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

      const stats = await this.leaveService.getLeaveStatistics(
        userId,
        userRole,
      );

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
