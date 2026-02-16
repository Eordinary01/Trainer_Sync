import { Leave } from "../models/Leave.model.js";
import { Attendance } from "../models/Attendance.model.js";
import ExcelJS from "exceljs";
import User from "../models/User.model.js";
import mongoose from "mongoose";

import { Validators } from "../utils/validators.js";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../utils/errorHandler.js";
import {
  LEAVE_CONFIG,
  LEAVE_STATUS,
  TRAINER_CATEGORY,
  LEAVE_TYPES,
} from "../config/constant.js";

export class LeaveService {
  // ============================================
  // ✅ CALCULATE LEAVE BALANCE (Get stored balance)
  // ============================================
  async calculateLeaveBalance(userId) {
    try {
      const user = await User.findById(userId).select(
        "leaveBalance trainerCategory role",
      );
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Handle HR users
      if (user.role === "HR") {
        return {
          category: "HR",
          balance: {
            sick: { available: "Unlimited", used: 0, carryForward: 0 },
            casual: { available: "Unlimited", used: 0, carryForward: 0 },
            paid: { available: "Unlimited", used: 0, carryForward: 0 },
            lastUpdated: user.leaveBalance?.lastUpdated || new Date(),
            isUnlimited: true,
          },
          allowedLeaveTypes: ["SICK", "CASUAL", "PAID"],
        };
      }

      return {
        category: user.trainerCategory,
        balance: user.leaveBalance,
        allowedLeaveTypes:
          LEAVE_CONFIG[user.trainerCategory]?.allowedLeaveTypes || [],
      };
    } catch (error) {
      console.error("Error calculating leave balance:", error);
      throw error;
    }
  }

  // ============================================
  // ✅ INITIALIZE LEAVE BALANCE (New trainer)
  // ============================================
  async initializeLeaveBalance(userId, trainerCategory) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      const config = LEAVE_CONFIG[trainerCategory];
      if (!config) {
        throw new ValidationError(
          `Invalid trainer category: ${trainerCategory}`,
        );
      }

      // Set initial balances based on category
      user.leaveBalance = {
        sick: {
          available: config.initial.sick,
          used: 0,
          carryForward: 0,
        },
        casual: {
          available: config.initial.casual,
          used: 0,
          carryForward: 0,
        },
        paid: {
          available: config.initial.paid,
          used: 0,
          carryForward: 0,
        },
        lastUpdated: new Date(),
        lastIncrementDate: new Date(),
        lastRolloverDate: null,
      };

      if (!user.leaveHistory) user.leaveHistory = [];

      user.leaveHistory.push({
        type: "SYSTEM_INIT",
        leaveType: "ALL",
        date: new Date(),
        reason: `Leave balance initialized for ${trainerCategory} trainer`,
      });

      await user.save();
      console.log(
        `✅ Leave balance initialized for trainer ${userId} (${trainerCategory})`,
      );
      return user.leaveBalance;
    } catch (error) {
      console.error("Error initializing leave balance:", error);
      throw error;
    }
  }

  // ============================================
  // ✅ AUTOMATED: Check and Increment Monthly Leaves (CRON)
  // ============================================
  async autoIncrementMonthlyLeaves(testMode = false, testDays = 30) {
    try {
      console.log("🔄 Starting automated monthly leave increment...");

      if (testMode) {
        console.log(
          `🧪 TEST MODE: Simulating ${testDays} days since last increment`,
        );
      }

      // Get all PERMANENT trainers
      const permanentTrainers = await User.find({
        role: "TRAINER",
        trainerCategory: "PERMANENT",
        status: "ACTIVE",
      }).select("_id username leaveBalance");

      let updatedCount = 0;
      let skippedCount = 0;
      const results = [];

      for (const trainer of permanentTrainers) {
        try {
          console.log(`\n📋 Processing trainer: ${trainer.username}`);

          // Ensure leave balance structure exists
          if (!trainer.leaveBalance) {
            console.log(`⚠️ No leave balance structure, creating one...`);
            trainer.leaveBalance = {
              sick: { available: 0, used: 0, carryForward: 0 },
              casual: { available: 0, used: 0, carryForward: 0 },
              paid: { available: 9999, used: 0, carryForward: 0 },
              lastIncrementDate: new Date(),
              lastUpdated: new Date(),
            };
          }

          const now = new Date();
          let referenceDate;

          // Check if trainer has a lastIncrementDate
          if (trainer.leaveBalance.lastIncrementDate) {
            referenceDate = new Date(trainer.leaveBalance.lastIncrementDate);
          } else {
            // No lastIncrementDate, use creation date
            referenceDate = new Date();
          }

          // In test mode, always consider trainer eligible
          let isEligible;
          let daysSinceLastIncrement;

          if (testMode) {
            daysSinceLastIncrement = testDays; // Use the test days parameter
            isEligible = true; // Always eligible in test mode
            console.log(
              `🧪 TEST: Forcing eligibility for ${trainer.username} (${testDays} days)`,
            );
          } else {
            daysSinceLastIncrement = Math.floor(
              (now - referenceDate) / (1000 * 60 * 60 * 24),
            );
            isEligible = daysSinceLastIncrement >= 30;
          }

          console.log(
            `📆 Days since last increment: ${daysSinceLastIncrement}`,
          );

          if (isEligible) {
            console.log(`✅ Eligible for increment`);

            const currentCasual =
              Number(trainer.leaveBalance.casual?.available) || 0;
            const currentSick =
              Number(trainer.leaveBalance.sick?.available) || 0;

            // Calculate new balances (1 casual leaves + 1 sick leave per month)
            const newCasualBalance = currentCasual + 1;
            const newSickBalance = currentSick + 1;

            console.log(
              `📊 Current - Casual: ${currentCasual}, Sick: ${currentSick}`,
            );
            console.log(
              `📈 New - Casual: ${newCasualBalance}, Sick: ${newSickBalance}`,
            );

            // Update trainer's leave balance
            await User.findByIdAndUpdate(
              trainer._id,
              {
                "leaveBalance.casual.available": newCasualBalance,
                "leaveBalance.sick.available": newSickBalance,
                "leaveBalance.lastIncrementDate": new Date(),
                "leaveBalance.lastUpdated": new Date(),
              },
              {
                new: true,
                runValidators: true,
              },
            );

            // Add to leave history
            await User.findByIdAndUpdate(trainer._id, {
              $push: {
                leaveHistory: {
                  type: testMode ? "TEST_AUTO_INCREMENT" : "AUTO_INCREMENT",
                  leaveType: "ALL",
                  previousBalance: { casual: currentCasual, sick: currentSick },
                  newBalance: {
                    casual: newCasualBalance,
                    sick: newSickBalance,
                  },
                  daysAffected: 0,
                  date: new Date(),
                  reason: testMode
                    ? `Test mode: Monthly auto-increment (simulated ${testDays} days)`
                    : "Monthly auto-increment",
                },
              },
            });

            updatedCount++;
            results.push({
              trainerId: trainer._id,
              username: trainer.username,
              status: "UPDATED",
              daysSinceLastIncrement,
              newBalance: {
                casual: newCasualBalance,
                sick: newSickBalance,
              },
              testMode: testMode,
            });
            console.log(
              `🎉 ${testMode ? "TEST: " : ""}Incremented leaves for: ${trainer.username}`,
            );
          } else {
            skippedCount++;
            results.push({
              trainerId: trainer._id,
              username: trainer.username,
              status: "SKIPPED",
              daysSinceLastIncrement,
              message: `Next increment in ${30 - daysSinceLastIncrement} days`,
            });
            console.log(
              `⏳ Skipping - Next increment in ${30 - daysSinceLastIncrement} days`,
            );
          }
        } catch (error) {
          console.error(
            `❌ Error auto-incrementing for trainer ${trainer._id}:`,
            error.message,
          );
          results.push({
            trainerId: trainer._id,
            username: trainer.username,
            status: "FAILED",
            error: error.message,
          });
        }
      }

      console.log(
        `📊 ${testMode ? "TEST " : ""}Auto-increment completed: ${updatedCount} updated, ${skippedCount} skipped`,
      );
      return {
        updated: updatedCount,
        skipped: skippedCount,
        total: permanentTrainers.length,
        results,
        testMode,
      };
    } catch (error) {
      console.error("❌ Error in autoIncrementMonthlyLeaves:", error);
      throw error;
    }
  }

  // ============================================
  // ✅ INCREMENT MONTHLY LEAVES (PERMANENT only)
  // ============================================
  async incrementMonthlyLeaves(trainerId) {
    try {
      console.log(`➕ Incrementing leaves for trainer: ${trainerId}`);

      const trainer = await User.findById(trainerId);
      if (!trainer) {
        throw new Error("Trainer not found");
      }

      // Ensure leave balance structure exists
      if (!trainer.leaveBalance) {
        trainer.leaveBalance = {
          sick: { available: 0, used: 0, carryForward: 0 },
          casual: { available: 0, used: 0, carryForward: 0 },
          paid: { available: 9999, used: 0, carryForward: 0 },
          lastIncrementDate: new Date(),
          lastUpdated: new Date(),
        };
      }

      // Ensure all fields are properly initialized as numbers
      const currentCasual = Number(trainer.leaveBalance.casual?.available) || 0;
      const currentSick = Number(trainer.leaveBalance.sick?.available) || 0;

      // Calculate new balances (2 casual leaves + 1 sick leave per month)
      const newCasualBalance = currentCasual + 2;
      const newSickBalance = currentSick + 1;

      console.log(
        `📊 Current balance - Casual: ${currentCasual}, Sick: ${currentSick}`,
      );
      console.log(
        `📈 New balance - Casual: ${newCasualBalance}, Sick: ${newSickBalance}`,
      );

      // Update trainer's leave balance
      const updatedTrainer = await User.findByIdAndUpdate(
        trainerId,
        {
          "leaveBalance.casual.available": newCasualBalance,
          "leaveBalance.sick.available": newSickBalance,
          "leaveBalance.lastIncrementDate": new Date(),
          "leaveBalance.lastUpdated": new Date(),
        },
        {
          new: true,
          runValidators: true,
        },
      ).select("leaveBalance username");

      // Add to leave history
      await User.findByIdAndUpdate(trainerId, {
        $push: {
          leaveHistory: {
            type: "AUTO_INCREMENT",
            leaveType: "ALL",
            previousBalance: { casual: currentCasual, sick: currentSick },
            newBalance: {
              casual: newCasualBalance,
              sick: newSickBalance,
            },
            daysAffected: 0,
            date: new Date(),
            reason: "Monthly auto-increment",
          },
        },
      });

      console.log(
        `✅ Successfully updated leave balance for trainer: ${trainer.username}`,
      );

      return {
        casual: newCasualBalance,
        sick: newSickBalance,
        paid: updatedTrainer.leaveBalance.paid?.available || 9999,
      };
    } catch (error) {
      console.error(
        `❌ Error in incrementMonthlyLeaves for trainer ${trainerId}:`,
        error,
      );
      throw error;
    }
  }

  // ============================================
  // ✅ AUTOMATED: Year-End Rollover (CRON)
  // ============================================
  async autoYearEndRollover() {
    try {
      console.log("🔄 Starting automated year-end rollover...");

      // Get current date
      const now = new Date();
      const currentMonth = now.getMonth(); // 0-11 (January=0)
      const currentDate = now.getDate();
      const currentYear = now.getFullYear();

      // Run rollover at year-end (December)
      if (currentMonth === 11) {
        // December
        const permanentTrainers = await User.find({
          trainerCategory: "PERMANENT",
          status: "ACTIVE",
        }).select("_id leaveBalance username profile");

        let updatedCount = 0;
        const results = [];

        for (const trainer of permanentTrainers) {
          try {
            // Check last rollover date
            const lastRollover = trainer.leaveBalance?.lastRolloverDate;

            // Skip if already rolled over this year
            if (
              lastRollover &&
              new Date(lastRollover).getFullYear() === currentYear
            ) {
              results.push({
                trainerId: trainer._id,
                username: trainer.username,
                status: "SKIPPED",
                message: "Already rolled over this year",
              });
              continue;
            }

            const updatedBalance = await this.rolloverUnusedLeaves(trainer._id);

            // Update rollover date
            await User.findByIdAndUpdate(trainer._id, {
              "leaveBalance.lastRolloverDate": now,
            });

            updatedCount++;
            results.push({
              trainerId: trainer._id,
              username: trainer.username,
              status: "UPDATED",
              newBalance: updatedBalance,
            });
            console.log(
              `✅ Auto-rollover completed for trainer: ${trainer._id}`,
            );
          } catch (error) {
            console.error(
              `❌ Error auto-rollover for trainer ${trainer._id}:`,
              error.message,
            );
            results.push({
              trainerId: trainer._id,
              username: trainer.username,
              status: "FAILED",
              error: error.message,
            });
          }
        }

        console.log(
          `📊 Auto-rollover completed: ${updatedCount} trainers updated`,
        );
        return {
          updated: updatedCount,
          total: permanentTrainers.length,
          results,
        };
      } else {
        console.log("⏭️ Not December yet, skipping auto-rollover");
        return {
          updated: 0,
          message: "Rollover only runs in December",
          currentMonth: currentMonth + 1, // Convert to 1-12
        };
      }
    } catch (error) {
      console.error("❌ Error in autoYearEndRollover:", error);
      throw error;
    }
  }

  // ============================================
  // ✅ ROLLOVER UNUSED LEAVES (PERMANENT only)
  // ============================================
  async rolloverUnusedLeaves(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      if (user.trainerCategory !== TRAINER_CATEGORY.PERMANENT) {
        return null; // Contracted trainers don't have rollover
      }

      const config = LEAVE_CONFIG[TRAINER_CATEGORY.PERMANENT];

      if (!config.rolloverUnused) {
        return null; // Rollover not allowed
      }

      const now = new Date();
      const unusedSick = user.leaveBalance.sick.available;
      const unusedCasual = user.leaveBalance.casual.available;

      // Move unused to carryForward
      user.leaveBalance.sick.carryForward += unusedSick;
      user.leaveBalance.casual.carryForward += unusedCasual;

      // Reset available for new year
      user.leaveBalance.sick.available = 0;
      user.leaveBalance.casual.available = 0;
      user.leaveBalance.sick.used = 0;
      user.leaveBalance.casual.used = 0;

      user.leaveBalance.lastRolloverDate = now;
      user.leaveBalance.lastUpdated = now;

      // Add to history
      if (!user.leaveHistory) user.leaveHistory = [];
      user.leaveHistory.push({
        type: "ROLLOVER",
        leaveType: "SICK",
        previousBalance: 0,
        newBalance: user.leaveBalance.sick.carryForward,
        daysAffected: unusedSick,
        date: now,
        reason: "Year-end rollover of unused leaves",
      });

      user.leaveHistory.push({
        type: "ROLLOVER",
        leaveType: "CASUAL",
        previousBalance: 0,
        newBalance: user.leaveBalance.casual.carryForward,
        daysAffected: unusedCasual,
        date: now,
        reason: "Year-end rollover of unused leaves",
      });

      await user.save();
      console.log(`✅ Leaves rolled over for trainer ${userId}`);
      return user.leaveBalance;
    } catch (error) {
      console.error("Error rolling over leaves:", error);
      throw error;
    }
  }

  // ============================================
  // ✅ DEDUCT LEAVE BALANCE (On approval)
  // ============================================
  async deductLeaveBalance(userId, leaveType, numberOfDays, leaveApprovalId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      const leaveConfig = LEAVE_CONFIG[user.trainerCategory];

      // Check if leave type is allowed for this category
      if (!leaveConfig.allowedLeaveTypes.includes(leaveType)) {
        throw new ValidationError(
          `${leaveType} leaves are not available for ${user.trainerCategory} trainers`,
        );
      }

      // Check available balance
      const availableBalance =
        user.leaveBalance[leaveType.toLowerCase()].available;

      if (availableBalance !== Infinity && availableBalance < numberOfDays) {
        throw new ValidationError(
          `Insufficient ${leaveType} leave balance. Available: ${availableBalance}, Requested: ${numberOfDays}`,
        );
      }

      const leaveTypeKey = leaveType.toLowerCase();
      const previousBalance = user.leaveBalance[leaveTypeKey].available;

      // Deduct from available
      if (availableBalance !== Infinity) {
        user.leaveBalance[leaveTypeKey].available -= numberOfDays;
      }

      // Add to used
      user.leaveBalance[leaveTypeKey].used += numberOfDays;
      user.leaveBalance.lastUpdated = new Date();

      // Add to history
      if (!user.leaveHistory) user.leaveHistory = [];
      user.leaveHistory.push({
        type: "USED",
        leaveType,
        previousBalance,
        newBalance: user.leaveBalance[leaveTypeKey].available,
        daysAffected: numberOfDays,
        date: new Date(),
        reason: `Leave approved (ID: ${leaveApprovalId})`,
      });

      await user.save();
      console.log(
        `✅ Leave balance deducted for trainer ${userId}: ${numberOfDays} ${leaveType} days`,
      );
      return user.leaveBalance;
    } catch (error) {
      console.error("Error deducting leave balance:", error);
      throw error;
    }
  }

  // ============================================
  // ✅ RESTORE LEAVE BALANCE (On cancel/reject)
  // ============================================
  async restoreLeaveBalance(userId, leaveType, numberOfDays, reason) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      const leaveTypeKey = leaveType.toLowerCase();
      const previousBalance = user.leaveBalance[leaveTypeKey].available;
      const previousUsed = user.leaveBalance[leaveTypeKey].used;

      // Restore available balance
      if (user.leaveBalance[leaveTypeKey].available !== Infinity) {
        user.leaveBalance[leaveTypeKey].available += numberOfDays;
      }

      // Reduce used count
      user.leaveBalance[leaveTypeKey].used = Math.max(
        0,
        previousUsed - numberOfDays,
      );
      user.leaveBalance.lastUpdated = new Date();

      // Add to history
      if (!user.leaveHistory) user.leaveHistory = [];
      user.leaveHistory.push({
        type: "RESTORED",
        leaveType,
        previousBalance,
        newBalance: user.leaveBalance[leaveTypeKey].available,
        daysAffected: numberOfDays,
        date: new Date(),
        reason,
      });

      await user.save();
      console.log(
        `✅ Leave balance restored for trainer ${userId}: ${numberOfDays} ${leaveType} days`,
      );
      return user.leaveBalance;
    } catch (error) {
      console.error("Error restoring leave balance:", error);
      throw error;
    }
  }

  // ============================================
  // ✅ EDIT LEAVE BALANCE (Admin/HR anytime)
  // ============================================
  async editLeaveBalance(userId, leaveType, newBalance, adminId, reason) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      const leaveTypeKey = leaveType.toLowerCase();
      const previousBalance = user.leaveBalance[leaveTypeKey].available;

      // For paid leaves, only allow Infinity or specific numbers
      if (leaveType === "PAID" && newBalance !== Infinity && newBalance < 0) {
        throw new ValidationError("Paid leave balance cannot be negative");
      }

      user.leaveBalance[leaveTypeKey].available = newBalance;
      user.leaveBalance.lastUpdated = new Date();

      // Add to history with admin details
      if (!user.leaveHistory) user.leaveHistory = [];
      user.leaveHistory.push({
        type: "ADMIN_EDIT",
        leaveType,
        previousBalance,
        newBalance,
        daysAffected: newBalance - previousBalance,
        modifiedBy: adminId,
        date: new Date(),
        reason: reason || "Admin adjustment",
      });

      await user.save();
      console.log(
        `✅ Admin ${adminId} edited leave balance for trainer ${userId}: ${leaveType} = ${newBalance}`,
      );
      return user.leaveBalance;
    } catch (error) {
      console.error("Error editing leave balance:", error);
      throw error;
    }
  }

  // ============================================
  // ✅ APPLY LEAVE (Backward compatible)
  // ============================================
 async applyLeave(userId, leaveData, userRole) {
  try {
    const {
      leaveType,
      fromDate,
      toDate,
      numberOfDays,
      reason,
      emergencyContact,
    } = leaveData;

    // Validate dates
    if (!Validators.validateDateRange(fromDate, toDate)) {
      throw new ValidationError("Invalid date range");
    }

    // Check user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Role-specific validations
    if (userRole === "HR") {
      console.log(`✅ HR user ${user.username} applying for ${leaveType} leave (unlimited)`);
    } else if (userRole === "TRAINER") {
      // Check if leave type is allowed for this trainer category
      const leaveConfig = LEAVE_CONFIG[user.trainerCategory];
      if (!leaveConfig.allowedLeaveTypes.includes(leaveType)) {
        throw new ValidationError(
          `${leaveType} leaves are not available for ${user.trainerCategory} trainers`,
        );
      }

      // Check leave balance
      const leaveTypeKey = leaveType.toLowerCase();
      const availableBalance = user.leaveBalance?.[leaveTypeKey]?.available || 0;

      if (availableBalance !== Infinity && availableBalance < numberOfDays) {
        throw new ValidationError(
          `Insufficient ${leaveType} leave balance. Available: ${availableBalance}, Requested: ${numberOfDays}`
        );
      }
    }

    // ✅ FIXED: Check for overlapping leave
    const overlapping = await Leave.findOne({
      $or: [
        { applicantId: userId },
        { trainerId: userId },
        { "appliedBy.userId": userId }
      ],
      status: { $in: ["PENDING", "APPROVED"] },
      // ✅ CORRECT: Direct date overlap condition
      fromDate: { $lte: new Date(toDate) },
      toDate: { $gte: new Date(fromDate) }
    });

    if (overlapping) {
      throw new ConflictError(
        `You already have a ${overlapping.status.toLowerCase()} leave request for overlapping dates`,
      );
    }

    // Create leave request with FULL backward compatibility
    const leave = new Leave({
      // NEW SCHEMA fields
      applicantId: userId,
      applicantRole: userRole,
      applicantName: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim(),
      
      // OLD SCHEMA fields for backward compatibility
      trainerId: userId, // Always set for all users (backward compatibility)
      appliedBy: {
        userId: userId,
        role: userRole,
        name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim()
      },
      
      leaveType,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      numberOfDays,
      reason,
      emergencyContact,
      status: "PENDING",
      appliedOn: new Date()
    });

    await leave.save();

    // Add to user's leave history
    user.leaveHistory = user.leaveHistory || [];
    user.leaveHistory.push({
      type: "APPLIED",
      leaveType,
      daysAffected: numberOfDays,
      date: new Date(),
      reason: `Leave application submitted`
    });

    await user.save();

    console.log(`✅ Leave request created for ${userRole} ${userId}: ${leaveType} from ${fromDate} to ${toDate}`);
    return leave;
  } catch (error) {
    console.error("Error applying for leave:", error);
    throw error;
  }
}

  // ============================================
  // ✅ APPROVE LEAVE (Backward compatible)
  // ============================================
  async approveLeave(leaveId, approverId, approverRole, comments = "") {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const leave = await Leave.findById(leaveId).session(session);
      if (!leave) {
        throw new NotFoundError("Leave request not found");
      }

      if (leave.status !== "PENDING") {
        throw new ValidationError(
          `Can only approve pending leave requests. Current status: ${leave.status}`,
        );
      }

      // 🔐 ROLE-BASED APPROVAL RULES
      const applicantRole = leave.applicantRole || leave.appliedBy?.role || "TRAINER";
      const applicantId = leave.applicantId || leave.trainerId || leave.appliedBy?.userId;

      if (approverRole === "HR") {
        // HR can ONLY approve TRAINER leaves
        if (applicantRole !== "TRAINER") {
          throw new ValidationError("HR can only approve trainer leave requests");
        }
      } else if (approverRole !== "ADMIN") {
        throw new ValidationError("You are not authorized to approve leave requests");
      }

      // Get user - Try all possible paths
      const user = await User.findById(applicantId).session(session);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Deduct leave balance ONLY for TRAINERs
      if (applicantRole === "TRAINER") {
        const leaveTypeKey = leave.leaveType.toLowerCase();
        const availableBalance = user.leaveBalance?.[leaveTypeKey]?.available || 0;

        if (availableBalance !== Infinity && availableBalance < leave.numberOfDays) {
          await session.abortTransaction();
          throw new ValidationError(
            `Insufficient ${leave.leaveType} leave balance. Available: ${availableBalance}, Required: ${leave.numberOfDays}`,
          );
        }

        if (availableBalance !== Infinity) {
          user.leaveBalance[leaveTypeKey].available -= leave.numberOfDays;
        }

        user.leaveBalance[leaveTypeKey].used += leave.numberOfDays;
        user.leaveBalance.lastUpdated = new Date();

        if (!user.leaveHistory) user.leaveHistory = [];
        user.leaveHistory.push({
          type: "APPROVED",
          leaveType: leave.leaveType,
          previousBalance: availableBalance,
          newBalance: user.leaveBalance[leaveTypeKey].available,
          daysAffected: leave.numberOfDays,
          date: new Date(),
          reason: `Leave approved (ID: ${leaveId})`,
          modifiedBy: approverId
        });

        await user.save({ session });
      } else if (applicantRole === "HR") {
        console.log(`✅ HR leave approved - no balance deduction`);
        user.leaveHistory = user.leaveHistory || [];
        user.leaveHistory.push({
          type: "APPROVED",
          leaveType: leave.leaveType,
          daysAffected: leave.numberOfDays,
          date: new Date(),
          reason: `HR leave approved by ${approverRole}`,
          modifiedBy: approverId
        });
        await user.save({ session });
      }

      // Update leave record
      leave.status = "APPROVED";
      leave.approvedBy = approverId;
      leave.approvedAt = new Date();
      leave.adminRemarks = comments || "";
      await leave.save({ session });

      await session.commitTransaction();

      console.log(`✅ Leave ${leaveId} approved by ${approverRole}. Applicant: ${applicantRole}`);

      // Return populated leave
      return await Leave.findById(leaveId)
        .populate("applicantId", "email username profile role trainerCategory leaveBalance isUnlimited")
        .populate("trainerId", "email username profile role")
        .populate("appliedBy.userId", "username profile role")
        .populate("approvedBy", "username profile role")
        .populate("rejectedBy", "username profile role");
    } catch (error) {
      await session.abortTransaction();
      console.error("Error in approveLeave:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ============================================
  // ✅ REJECT LEAVE (Backward compatible)
  // ============================================
  async rejectLeave(leaveId, rejectorId, rejectorRole, comments = "") {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const leave = await Leave.findById(leaveId).session(session);
      if (!leave) {
        throw new NotFoundError("Leave request not found");
      }

      if (leave.status !== "PENDING") {
        throw new ValidationError(
          `Can only reject pending leave requests. Current status: ${leave.status}`,
        );
      }

      // 🔐 ROLE-BASED REJECTION RULES
      const applicantRole = leave.applicantRole || leave.appliedBy?.role || "TRAINER";
      const applicantId = leave.applicantId || leave.trainerId || leave.appliedBy?.userId;

      if (rejectorRole === "HR") {
        if (applicantRole !== "TRAINER") {
          throw new ValidationError("HR can only reject trainer leave requests");
        }
      } else if (rejectorRole !== "ADMIN") {
        throw new ValidationError("You are not authorized to reject leave requests");
      }

      // Update leave record
      leave.status = "REJECTED";
      leave.rejectedBy = rejectorId;
      leave.rejectedAt = new Date();
      leave.adminRemarks = comments || "";
      await leave.save({ session });

      // Add to user's leave history
      if (applicantRole === "TRAINER" || applicantRole === "HR") {
        const user = await User.findById(applicantId).session(session);
        if (user) {
          user.leaveHistory = user.leaveHistory || [];
          user.leaveHistory.push({
            type: "REJECTED",
            leaveType: leave.leaveType,
            daysAffected: leave.numberOfDays,
            date: new Date(),
            reason: `Leave rejected by ${rejectorRole}${comments ? `: ${comments}` : ''}`,
            modifiedBy: rejectorId
          });
          await user.save({ session });
        }
      }

      await session.commitTransaction();

      console.log(`❌ Leave ${leaveId} rejected by ${rejectorRole}. Applicant: ${applicantRole}`);

      return await Leave.findById(leaveId)
        .populate("applicantId", "email username profile role")
        .populate("trainerId", "username profile role")
        .populate("appliedBy.userId", "username profile role")
        .populate("rejectedBy", "username profile role")
        .populate("approvedBy", "username profile role");
    } catch (error) {
      await session.abortTransaction();
      console.error("Error in rejectLeave:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ============================================
  // ✅ CANCEL LEAVE (Backward compatible)
  // ============================================
  async cancelLeave(leaveId, cancelledBy, userRole, comments = "") {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const leave = await Leave.findById(leaveId).session(session);
      if (!leave) {
        throw new NotFoundError("Leave request not found");
      }

      if (leave.status !== "APPROVED") {
        throw new ValidationError(
          `Can only cancel approved leaves. Current status: ${leave.status}`,
        );
      }

      const applicantId = leave.applicantId || leave.trainerId || leave.appliedBy?.userId;
      const applicantRole = leave.applicantRole || leave.appliedBy?.role || "TRAINER";

      const user = await User.findById(applicantId).session(session);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Restore the balance for TRAINERs
      if (applicantRole === "TRAINER") {
        const leaveTypeKey = leave.leaveType.toLowerCase();
        const previousBalance = user.leaveBalance[leaveTypeKey].available;

        if (user.leaveBalance[leaveTypeKey].available !== Infinity) {
          user.leaveBalance[leaveTypeKey].available += leave.numberOfDays;
        }

        user.leaveBalance[leaveTypeKey].used = Math.max(
          0,
          user.leaveBalance[leaveTypeKey].used - leave.numberOfDays,
        );
        user.leaveBalance.lastUpdated = new Date();

        if (!user.leaveHistory) user.leaveHistory = [];
        user.leaveHistory.push({
          type: "CANCELLED",
          leaveType: leave.leaveType,
          previousBalance,
          newBalance: user.leaveBalance[leaveTypeKey].available,
          daysAffected: leave.numberOfDays,
          date: new Date(),
          reason: `Leave cancelled by ${userRole}`,
          modifiedBy: cancelledBy
        });

        await user.save({ session });
      }

      // Update leave record
      leave.status = "CANCELLED";
      leave.cancelledBy = cancelledBy;
      leave.cancelledAt = new Date();
      leave.adminRemarks = comments || "";
      await leave.save({ session });

      await session.commitTransaction();

      console.log(
        `🔄 Leave ${leaveId} cancelled. Balance restored: ${leave.numberOfDays} ${leave.leaveType} days`,
      );

      return await Leave.findById(leaveId)
        .populate("applicantId", "username email profile")
        .populate("trainerId", "username email profile")
        .populate("appliedBy.userId", "username profile")
        .populate("cancelledBy", "username profile");
    } catch (error) {
      await session.abortTransaction();
      console.error("Error in cancelLeave:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ============================================
  // ✅ GET LEAVE BALANCE
  // ============================================
  async getLeaveBalance(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user.leaveBalance;
  }

  // ============================================
  // ✅ GET PENDING LEAVES (Backward compatible)
  // ============================================
  async getPendingLeaves(userRole, userId) {
    try {
      let query = { status: "PENDING" };

      // Role-based filtering
      if (userRole === "HR") {
        // HR can only see TRAINER pending leaves - support both schemas
        query.$or = [
          { applicantRole: "TRAINER" },
          { "appliedBy.role": "TRAINER" },
          {
            $and: [
              { trainerId: { $exists: true } },
              { applicantRole: { $exists: false } }
            ]
          }
        ];
      }

      const pendingLeaves = await Leave.find(query)
        .populate({
          path: 'applicantId',
          select: 'username email profile role trainerCategory leaveBalance isUnlimited'
        })
        .populate({
          path: 'trainerId',
          select: 'username email profile role trainerCategory leaveBalance'
        })
        .populate({
          path: 'appliedBy.userId',
          select: 'username profile role'
        })
        .populate({
          path: 'approvedBy',
          select: 'username profile role'
        })
        .populate({
          path: 'rejectedBy',
          select: 'username profile role'
        })
        .sort({ appliedOn: -1, createdAt: -1 });

      return pendingLeaves;
    } catch (error) {
      console.error("Error in getPendingLeaves:", error);
      throw error;
    }
  }

  
  // ✅ GET LEAVE HISTORY (Backward compatible) - FIXED
 
async getLeaveHistory(userId, filters = {}, isAdminOrHR = false) {
  try {
    const query = {};

    if (!isAdminOrHR || filters.trainerId) {
      query.$or = [
        { applicantId: filters.trainerId || userId },
        { trainerId: filters.trainerId || userId },
        { "appliedBy.userId": filters.trainerId || userId }
      ];
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.leaveType) {
      query.leaveType = filters.leaveType;
    }

    if (filters.fromDate && filters.toDate) {
      query.fromDate = {
        $gte: new Date(filters.fromDate),
        $lte: new Date(filters.toDate),
      };
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // ✅ IMPORTANT: Get Mongoose documents, NOT lean()
    const leaves = await Leave.find(query)
      .populate({
        path: 'applicantId',
        select: 'username profile.firstName profile.lastName email profile.employeeId role trainerCategory'
      })
      .populate({
        path: 'trainerId',
        select: 'username profile.firstName profile.lastName email profile.employeeId trainerCategory'
      })
      .populate({
        path: 'appliedBy.userId',
        select: 'username profile role'
      })
      .populate('approvedBy', 'username profile.firstName profile.lastName')
      .populate('rejectedBy', 'username profile.firstName profile.lastName')
      .populate('cancelledBy', 'username profile.firstName profile.lastName')
      .skip(skip)
      .limit(limit)
      .sort({ appliedOn: -1 });

    const total = await Leave.countDocuments(query);

    // ✅ FIX: Create a separate formatted array for display
    // BUT keep the original leaves array for populate
    const formattedForDisplay = leaves.map((leave) => {
      // Create a plain object for the response
      const leaveObj = {
        ...leave.toObject(),
        // Add formatted names
        approvedByName: leave.approvedBy?.profile?.firstName && leave.approvedBy?.profile?.lastName
          ? `${leave.approvedBy.profile.firstName} ${leave.approvedBy.profile.lastName}`
          : leave.approvedBy?.username || null,
        rejectedByName: leave.rejectedBy?.profile?.firstName && leave.rejectedBy?.profile?.lastName
          ? `${leave.rejectedBy.profile.firstName} ${leave.rejectedBy.profile.lastName}`
          : leave.rejectedBy?.username || null,
        cancelledByName: leave.cancelledBy?.profile?.firstName && leave.cancelledBy?.profile?.lastName
          ? `${leave.cancelledBy.profile.firstName} ${leave.cancelledBy.profile.lastName}`
          : leave.cancelledBy?.username || null,
        applicantName: leave.applicantName || 
          (leave.applicantId?.profile?.firstName && leave.applicantId?.profile?.lastName
            ? `${leave.applicantId.profile.firstName} ${leave.applicantId.profile.lastName}`
            : leave.applicantId?.username || 
              leave.trainerId?.username || 
              leave.appliedBy?.userId?.username || 'User'),
        applicantRole: leave.applicantRole || leave.appliedBy?.role || 'TRAINER',
      };

      // Remove populated objects to keep response clean
      delete leaveObj.applicantId;
      delete leaveObj.trainerId;
      delete leaveObj.appliedBy;
      delete leaveObj.approvedBy;
      delete leaveObj.rejectedBy;
      delete leaveObj.cancelledBy;

      return leaveObj;
    });

    return {
      leaves: leaves, // ✅ Return Mongoose documents for controller populate
      formattedLeaves: formattedForDisplay, // ✅ Return formatted for display
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Error getting leave history:", error);
    throw error;
  }
}

  // ============================================
  // ✅ GET HR LEAVE BALANCE
  // ============================================
  async getHRLeaveBalance(userId) {
    try {
      const user = await User.findById(userId).select('role leaveBalance isUnlimited profile');

      if (!user) {
        throw new NotFoundError("User not found");
      }

      if (user.role !== "HR") {
        throw new ValidationError("User is not HR");
      }

      return {
        sick: { available: "Unlimited", used: 0, carryForward: 0 },
        casual: { available: "Unlimited", used: 0, carryForward: 0 },
        paid: { available: "Unlimited", used: 0, carryForward: 0 },
        lastUpdated: user.leaveBalance?.lastUpdated || new Date(),
        isUnlimited: true
      };
    } catch (error) {
      console.error("Error in getHRLeaveBalance:", error);
      throw error;
    }
  }

  // ============================================
  // ✅ GET HR LEAVE HISTORY
  // ============================================
  async getHRLeaveHistory(userId) {
    try {
      const leaves = await Leave.find({
        $or: [
          { applicantId: userId, applicantRole: "HR" },
          { trainerId: userId, "appliedBy.role": "HR" },
          { "appliedBy.userId": userId, "appliedBy.role": "HR" }
        ]
      })
        .populate({
          path: 'applicantId',
          select: 'username email profile role isUnlimited'
        })
        .populate({
          path: 'trainerId',
          select: 'username email profile role'
        })
        .populate({
          path: 'appliedBy.userId',
          select: 'username profile role'
        })
        .populate({
          path: 'approvedBy',
          select: 'username profile role'
        })
        .populate({
          path: 'rejectedBy',
          select: 'username profile role'
        })
        .sort({ appliedOn: -1, createdAt: -1 });

      return leaves;
    } catch (error) {
      console.error("Error in getHRLeaveHistory:", error);
      throw error;
    }
  }

  // ============================================
  // ✅ UPDATE LEAVE BALANCE (Legacy method)
  // ============================================
  async updateLeaveBalance(trainerId, leaveType, newBalance, reason, adminId) {
    try {
      const trainer = await User.findById(trainerId);
      if (!trainer) {
        throw new NotFoundError("Trainer not found");
      }

      if (trainer.trainerCategory === "CONTRACTED") {
        throw new Error("Cannot update leave balance for CONTRACTED trainers");
      }

      const previousBalance = trainer.leaveBalance[leaveType.toLowerCase()];
      
      const update = {};
      update[`leaveBalance.${leaveType.toLowerCase()}.available`] = newBalance;

      const updatedTrainer = await User.findByIdAndUpdate(trainerId, update, {
        new: true,
      });

      // Add to history
      trainer.leaveHistory = trainer.leaveHistory || [];
      trainer.leaveHistory.push({
        type: "ADMIN_EDIT",
        leaveType,
        previousBalance,
        newBalance,
        daysAffected: newBalance - previousBalance,
        modifiedBy: adminId,
        date: new Date(),
        reason: reason || "Admin adjustment",
      });
      await trainer.save();

      return {
        trainerId,
        leaveType,
        newBalance,
        previousBalance,
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error("Error updating leave balance:", error);
      throw error;
    }
  }

  // ============================================
  // ✅ GET LEAVE STATISTICS
  // ============================================
  async getLeaveStatistics(userId) {
    try {
      const user = await User.findById(userId).select(
        "leaveBalance trainerCategory leaveHistory role",
      );
      if (!user) {
        throw new NotFoundError("User not found");
      }

      const currentYear = new Date().getFullYear();
      
      // Support both schema versions
      const approvedLeaves = await Leave.countDocuments({
        $or: [
          { applicantId: userId, status: "APPROVED" },
          { trainerId: userId, status: "APPROVED" },
          { "appliedBy.userId": userId, status: "APPROVED" }
        ],
        fromDate: {
          $gte: new Date(`${currentYear}-01-01`),
          $lte: new Date(`${currentYear}-12-31`),
        },
      });

      const pendingLeaves = await Leave.countDocuments({
        $or: [
          { applicantId: userId, status: "PENDING" },
          { trainerId: userId, status: "PENDING" },
          { "appliedBy.userId": userId, status: "PENDING" }
        ],
      });

      const rejectedLeaves = await Leave.countDocuments({
        $or: [
          { applicantId: userId, status: "REJECTED" },
          { trainerId: userId, status: "REJECTED" },
          { "appliedBy.userId": userId, status: "REJECTED" }
        ],
      });

      // Handle HR users
      if (user.role === "HR") {
        return {
          category: "HR",
          balance: {
            sick: { available: "Unlimited", used: 0, carryForward: 0 },
            casual: { available: "Unlimited", used: 0, carryForward: 0 },
            paid: { available: "Unlimited", used: 0, carryForward: 0 },
          },
          statistics: {
            approvedThisYear: approvedLeaves,
            pendingRequests: pendingLeaves,
            rejectedRequests: rejectedLeaves,
          },
          allowedLeaveTypes: ["SICK", "CASUAL", "PAID"],
        };
      }

      return {
        category: user.trainerCategory,
        balance: user.leaveBalance,
        statistics: {
          approvedThisYear: approvedLeaves,
          pendingRequests: pendingLeaves,
          rejectedRequests: rejectedLeaves,
        },
        allowedLeaveTypes:
          LEAVE_CONFIG[user.trainerCategory]?.allowedLeaveTypes || [],
      };
    } catch (error) {
      console.error("Error getting leave statistics:", error);
      throw error;
    }
  }

  // ============================================
  // ✅ GET LEAVE AUDIT HISTORY
  // ============================================
  async getLeaveAuditHistory(userId, limit = 50) {
    try {
      const user = await User.findById(userId).select("leaveHistory");
      if (!user) {
        throw new NotFoundError("User not found");
      }

      return user.leaveHistory?.slice(-limit) || [];
    } catch (error) {
      console.error("Error getting leave audit history:", error);
      throw error;
    }
  }

  // ============================================
  // ✅ GENERATE BALANCE REPORT
  // ============================================
  async generateBalanceReport(month, year, trainerCategory, trainerId) {
    try {
      console.log(`📊 Generating balance report for ${month}/${year}`);

      const query = {
        role: "TRAINER",
        status: { $in: ["ACTIVE", "ON_LEAVE"] },
      };

      if (trainerCategory) {
        query.trainerCategory = trainerCategory;
      }

      if (trainerId) {
        query._id = trainerId;
      }

      const reportStartDate = new Date(year, month - 1, 1);
      const reportEndDate = new Date(year, month, 0);

      console.log(`Report period: ${reportStartDate.toISOString()} to ${reportEndDate.toISOString()}`);

      query["profile.joiningDate"] = { 
        $lte: reportEndDate
      };

      const trainers = await User.find(query)
        .select(
          "_id username email trainerCategory status profile.employeeId profile.firstName profile.lastName profile.joiningDate leaveBalance"
        )
        .lean();

      console.log(`Found ${trainers.length} trainers meeting criteria`);

      if (trainers.length === 0) {
        console.log("No trainers found with the given filters");
        return [];
      }

      const trainerIds = trainers.map((t) => t._id);

      const attendanceData = await Attendance.find({
        date: {
          $gte: reportStartDate,
          $lte: reportEndDate,
        },
        trainerId: { $in: trainerIds },
      }).lean();

      console.log(`Found ${attendanceData.length} attendance records`);

      const leaveData = await Leave.find({
        $or: [
          { applicantId: { $in: trainerIds } },
          { trainerId: { $in: trainerIds } }
        ],
        status: "APPROVED",
        $or: [
          { fromDate: { $gte: reportStartDate, $lte: reportEndDate } },
          { toDate: { $gte: reportStartDate, $lte: reportEndDate } },
          { fromDate: { $lte: reportStartDate }, toDate: { $gte: reportStartDate } }
        ]
      })
        .select("applicantId trainerId leaveType fromDate toDate numberOfDays status")
        .lean();

      console.log(`Found ${leaveData.length} approved leave records`);

      const getWorkingDays = (startDate, endDate) => {
        let workingDays = 0;
        const current = new Date(startDate);

        while (current <= endDate) {
          const day = current.getDay();
          if (day !== 0 && day !== 6) {
            workingDays++;
          }
          current.setDate(current.getDate() + 1);
        }
        return workingDays;
      };

      const totalWorkingDays = getWorkingDays(reportStartDate, reportEndDate);
      console.log(`Total working days in ${month}/${year}: ${totalWorkingDays}`);

      const report = trainers.map((trainer) => {
        const trainerJoiningDate = new Date(trainer.profile?.joiningDate || trainer.createdAt);

        let effectiveStartDate = reportStartDate;
        if (trainerJoiningDate > reportStartDate) {
          effectiveStartDate = trainerJoiningDate;
        }

        const trainerWorkingDays = getWorkingDays(effectiveStartDate, reportEndDate);

        const trainerAttendance = attendanceData.filter(
          (a) => a.trainerId.toString() === trainer._id.toString(),
        );

        const trainerLeaves = leaveData.filter(
          (l) => (l.applicantId?.toString() === trainer._id.toString()) || 
                 (l.trainerId?.toString() === trainer._id.toString())
        );

        const getAttendanceStatus = (attendance) => {
          if (!attendance) return "ABSENT";
          if (attendance.status === "CLOCKED_OUT") return "PRESENT";
          if (attendance.status === "CLOCKED_IN") return "HALF_DAY";
          return "ABSENT";
        };

        const attendanceByDate = {};
        trainerAttendance.forEach(att => {
          const dateStr = new Date(att.date).toISOString().split('T')[0];
          attendanceByDate[dateStr] = att;
        });

        let presentDays = 0;
        let halfDays = 0;
        let absentDays = 0;

        const current = new Date(effectiveStartDate);
        while (current <= reportEndDate) {
          const day = current.getDay();

          if (day !== 0 && day !== 6) {
            const dateStr = current.toISOString().split('T')[0];
            const attendance = attendanceByDate[dateStr];
            const status = getAttendanceStatus(attendance);

            if (status === "PRESENT") presentDays++;
            else if (status === "HALF_DAY") halfDays++;
            else absentDays++;
          }

          current.setDate(current.getDate() + 1);
        }

        const effectivePresentDays = presentDays + (halfDays * 0.5);
        const attendancePercentage = trainerWorkingDays > 0
          ? Math.round((effectivePresentDays / trainerWorkingDays) * 100)
          : 0;

        const leaveBreakdown = {
          sick: 0,
          casual: 0,
          paid: 0,
        };

        trainerLeaves.forEach((leave) => {
          const days = leave.numberOfDays || 0;
          if (leave.leaveType === "SICK") leaveBreakdown.sick += days;
          else if (leave.leaveType === "CASUAL") leaveBreakdown.casual += days;
          else if (leave.leaveType === "PAID") leaveBreakdown.paid += days;
        });

        const totalLeavesTaken = leaveBreakdown.sick + leaveBreakdown.casual + leaveBreakdown.paid;

        const balance = trainer.leaveBalance || {
          sick: { available: 0, used: 0, carryForward: 0 },
          casual: { available: 0, used: 0, carryForward: 0 },
          paid: { available: 9999, used: 0, carryForward: 0 },
        };

        const getAvailable = (leaveType) => {
          const bal = balance[leaveType];
          if (!bal) return 0;
          if (typeof bal === 'object' && bal.available !== undefined) {
            return bal.available;
          } else if (typeof bal === 'number') {
            return bal;
          }
          return 0;
        };

        const availableSick = getAvailable('sick');
        const availableCasual = getAvailable('casual');
        const availablePaid = getAvailable('paid');

        return {
          trainer: {
            id: trainer._id,
            name: `${trainer.profile?.firstName || ""} ${trainer.profile?.lastName || ""}`.trim(),
            email: trainer.email,
            employeeId: trainer.profile?.employeeId || 'N/A',
            category: trainer.trainerCategory,
            username: trainer.username,
            joiningDate: trainer.profile?.joiningDate || trainer.createdAt,
            joinedInMonth: trainerJoiningDate.getMonth() + 1,
            joinedInYear: trainerJoiningDate.getFullYear(),
          },
          attendance: {
            present: presentDays,
            absent: absentDays,
            halfDays: halfDays,
            percentage: attendancePercentage,
            totalWorkingDays: trainerWorkingDays,
            effectiveStartDate: effectiveStartDate,
            daysAccountedFor: presentDays + halfDays + absentDays,
            joinedDuringMonth: trainerJoiningDate > reportStartDate,
            daysInMonth: totalWorkingDays,
          },
          leaves: {
            balance: {
              sick: availableSick,
              casual: availableCasual,
              paid: availablePaid >= 9999 ? "Unlimited" : availablePaid,
            },
            taken: leaveBreakdown,
            totalTaken: totalLeavesTaken,
            remaining: {
              sick: Math.max(0, availableSick - leaveBreakdown.sick),
              casual: Math.max(0, availableCasual - leaveBreakdown.casual),
              paid: availablePaid >= 9999 ? "Unlimited" : Math.max(0, availablePaid - leaveBreakdown.paid),
            },
          },
          status: trainer.status,
          lastIncrementDate: trainer.leaveBalance?.lastIncrementDate,
          reportPeriod: {
            month,
            year,
            monthName: new Date(year, month - 1).toLocaleString("default", {
              month: "long",
            }),
            startDate: reportStartDate,
            endDate: reportEndDate
          },
          metrics: {
            joiningDate: trainerJoiningDate,
            reportStartDate: reportStartDate,
            isEligibleForReport: trainerJoiningDate <= reportEndDate,
            daysSinceJoining: Math.floor((reportEndDate - trainerJoiningDate) / (1000 * 60 * 60 * 24)) + 1,
          },
          debugInfo: {
            attendanceRecords: trainerAttendance.length,
            leaveRecords: trainerLeaves.length,
          }
        };
      });

      report.sort((a, b) => a.trainer.name.localeCompare(b.trainer.name));

      console.log(`✅ Generated report for ${report.length} trainers`);

      return report;
    } catch (error) {
      console.error("❌ Error generating balance report:", error);
      console.error("Stack trace:", error.stack);
      throw error;
    }
  }

  // ============================================
  // ✅ DOWNLOAD EXCEL REPORT
  // ============================================
  async downloadExcelReport(month, year, trainerCategory, trainerId) {
    try {
      const reportData = await this.generateBalanceReport(
        month, year, trainerCategory, trainerId
      );

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance Report');

      worksheet.columns = [
        { header: 'Employee ID', key: 'employeeId', width: 15 },
        { header: 'Trainer Name', key: 'name', width: 25 },
        { header: 'Category', key: 'category', width: 12 },
        { header: 'Present Days', key: 'present', width: 12 },
        { header: 'Absent Days', key: 'absent', width: 12 },
        { header: 'Half Days', key: 'halfDays', width: 12 },
        { header: 'Attendance %', key: 'attendancePercentage', width: 15 },
        { header: 'Sick Leave (Avail)', key: 'sickAvailable', width: 15 },
        { header: 'Sick Leave (Taken)', key: 'sickTaken', width: 15 },
        { header: 'Casual Leave (Avail)', key: 'casualAvailable', width: 15 },
        { header: 'Casual Leave (Taken)', key: 'casualTaken', width: 15 },
        { header: 'Paid Leave (Avail)', key: 'paidAvailable', width: 15 },
        { header: 'Paid Leave (Taken)', key: 'paidTaken', width: 15 },
        { header: 'Total Leaves Taken', key: 'totalLeaves', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
      ];

      reportData.forEach(item => {
        worksheet.addRow({
          employeeId: item.trainer.employeeId,
          name: item.trainer.name,
          category: item.trainer.category,
          present: item.attendance.present,
          absent: item.attendance.absent,
          halfDays: item.attendance.halfDays,
          attendancePercentage: `${item.attendance.percentage}%`,
          sickAvailable: item.leaves.balance.sick,
          sickTaken: item.leaves.taken.sick,
          casualAvailable: item.leaves.balance.casual,
          casualTaken: item.leaves.taken.casual,
          paidAvailable: item.leaves.balance.paid,
          paidTaken: item.leaves.taken.paid,
          totalLeaves: item.leaves.totalTaken,
          status: item.status
        });
      });

      const totalRow = worksheet.addRow({});
      totalRow.getCell(1).value = 'TOTALS / AVERAGE';
      totalRow.getCell(4).value = reportData.reduce((sum, item) => sum + item.attendance.present, 0);
      totalRow.getCell(5).value = reportData.reduce((sum, item) => sum + item.attendance.absent, 0);
      totalRow.getCell(7).value = `${Math.round(reportData.reduce((sum, item) => sum + item.attendance.percentage, 0) / reportData.length)}%`;
      totalRow.getCell(14).value = reportData.reduce((sum, item) => sum + item.leaves.totalTaken, 0);
      totalRow.font = { bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      console.error("Error generating Excel report:", error);
      throw error;
    }
  }
}