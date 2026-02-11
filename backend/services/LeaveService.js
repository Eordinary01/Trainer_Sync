import { Leave } from "../models/Leave.model.js";
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
        "leaveBalance trainerCategory"
      );
      if (!user) {
        throw new NotFoundError("User not found");
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
    console.log('🔄 Starting automated monthly leave increment...');
    
    if (testMode) {
      console.log(`🧪 TEST MODE: Simulating ${testDays} days since last increment`);
    }
    
    // Get all PERMANENT trainers
    const permanentTrainers = await User.find({
      role: 'TRAINER',
      trainerCategory: 'PERMANENT',
      status: 'ACTIVE'
    }).select('_id username leaveBalance');

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
            lastUpdated: new Date()
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
          console.log(`🧪 TEST: Forcing eligibility for ${trainer.username} (${testDays} days)`);
        } else {
          daysSinceLastIncrement = Math.floor(
            (now - referenceDate) / (1000 * 60 * 60 * 24)
          );
          isEligible = daysSinceLastIncrement >= 30;
        }

        console.log(`📆 Days since last increment: ${daysSinceLastIncrement}`);

        if (isEligible) {
          console.log(`✅ Eligible for increment`);
          
          const currentCasual = Number(trainer.leaveBalance.casual?.available) || 0;
          const currentSick = Number(trainer.leaveBalance.sick?.available) || 0;
          
          // Calculate new balances (1 casual leaves + 1 sick leave per month)
          const newCasualBalance = currentCasual + 1;
          const newSickBalance = currentSick + 1;
          
          console.log(`📊 Current - Casual: ${currentCasual}, Sick: ${currentSick}`);
          console.log(`📈 New - Casual: ${newCasualBalance}, Sick: ${newSickBalance}`);

          // Update trainer's leave balance
          await User.findByIdAndUpdate(
            trainer._id,
            {
              'leaveBalance.casual.available': newCasualBalance,
              'leaveBalance.sick.available': newSickBalance,
              'leaveBalance.lastIncrementDate': new Date(), 
              'leaveBalance.lastUpdated': new Date()
            },
            { 
              new: true,
              runValidators: true
            }
          );

          // Add to leave history
          await User.findByIdAndUpdate(trainer._id, {
            $push: {
              leaveHistory: {
                type: testMode ? "TEST_AUTO_INCREMENT" : "AUTO_INCREMENT",
                leaveType: "ALL",
                previousBalance: { casual: currentCasual, sick: currentSick },
                newBalance: { casual: newCasualBalance, sick: newSickBalance },
                daysAffected: 0,
                date: new Date(),
                reason: testMode 
                  ? `Test mode: Monthly auto-increment (simulated ${testDays} days)`
                  : "Monthly auto-increment"
              }
            }
          });

          updatedCount++;
          results.push({
            trainerId: trainer._id,
            username: trainer.username,
            status: 'UPDATED',
            daysSinceLastIncrement,
            newBalance: {
              casual: newCasualBalance,
              sick: newSickBalance
            },
            testMode: testMode
          });
          console.log(`🎉 ${testMode ? 'TEST: ' : ''}Incremented leaves for: ${trainer.username}`);
        } else {
          skippedCount++;
          results.push({
            trainerId: trainer._id,
            username: trainer.username,
            status: 'SKIPPED',
            daysSinceLastIncrement,
            message: `Next increment in ${30 - daysSinceLastIncrement} days`
          });
          console.log(`⏳ Skipping - Next increment in ${30 - daysSinceLastIncrement} days`);
        }
      } catch (error) {
        console.error(`❌ Error auto-incrementing for trainer ${trainer._id}:`, error.message);
        results.push({
          trainerId: trainer._id,
          username: trainer.username,
          status: 'FAILED',
          error: error.message
        });
      }
    }

    console.log(`📊 ${testMode ? 'TEST ' : ''}Auto-increment completed: ${updatedCount} updated, ${skippedCount} skipped`);
    return { 
      updated: updatedCount, 
      skipped: skippedCount,
      total: permanentTrainers.length,
      results,
      testMode
    };
  } catch (error) {
    console.error('❌ Error in autoIncrementMonthlyLeaves:', error);
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
      throw new Error('Trainer not found');
    }

    // Ensure leave balance structure exists
    if (!trainer.leaveBalance) {
      trainer.leaveBalance = {
        sick: { available: 0, used: 0, carryForward: 0 },
        casual: { available: 0, used: 0, carryForward: 0 },
        paid: { available: 9999, used: 0, carryForward: 0 },
        lastIncrementDate: new Date(), // This is wrong! Should be 30 days ago
        lastUpdated: new Date()
      };
    }

    // Ensure all fields are properly initialized as numbers
    const currentCasual = Number(trainer.leaveBalance.casual?.available) || 0;
    const currentSick = Number(trainer.leaveBalance.sick?.available) || 0;
    
    // Calculate new balances (2 casual leaves + 1 sick leave per month)
    const newCasualBalance = currentCasual + 2;
    const newSickBalance = currentSick + 1;
    
    console.log(`📊 Current balance - Casual: ${currentCasual}, Sick: ${currentSick}`);
    console.log(`📈 New balance - Casual: ${newCasualBalance}, Sick: ${newSickBalance}`);

    // Update trainer's leave balance
    const updatedTrainer = await User.findByIdAndUpdate(
      trainerId,
      {
        'leaveBalance.casual.available': newCasualBalance,
        'leaveBalance.sick.available': newSickBalance,
        'leaveBalance.lastIncrementDate': new Date() // Update to now
      },
      { 
        new: true,
        runValidators: true
      }
    ).select('leaveBalance username');

    // Create audit log
    await LeaveAudit.create({
      trainerId,
      action: 'MONTHLY_AUTO_INCREMENT',
      details: {
        casualIncrement: 2,
        sickIncrement: 1,
        previousCasual: currentCasual,
        previousSick: currentSick,
        newCasual: newCasualBalance,
        newSick: newSickBalance
      },
      performedBy: 'SYSTEM',
      performedAt: new Date()
    });

    console.log(`✅ Successfully updated leave balance for trainer: ${trainer.username}`);
    
    return {
      casual: newCasualBalance,
      sick: newSickBalance,
      paid: updatedTrainer.leaveBalance.paid?.available || 9999
    };
  } catch (error) {
    console.error(`❌ Error in incrementMonthlyLeaves for trainer ${trainerId}:`, error);
    throw error;
  }
}

  // ============================================
  // ✅ AUTOMATED: Year-End Rollover (CRON)
  // ============================================
  async autoYearEndRollover() {
    try {
      console.log('🔄 Starting automated year-end rollover...');
      
      // Get current date
      const now = new Date();
      const currentMonth = now.getMonth(); // 0-11 (January=0)
      const currentDate = now.getDate();
      const currentYear = now.getFullYear();
      
      // Run rollover at year-end (December)
      if (currentMonth === 11) { // December
        const permanentTrainers = await User.find({
          trainerCategory: 'PERMANENT',
          status: 'ACTIVE'
        }).select('_id leaveBalance username profile');

        let updatedCount = 0;
        const results = [];

        for (const trainer of permanentTrainers) {
          try {
            // Check last rollover date
            const lastRollover = trainer.leaveBalance?.lastRolloverDate;
            
            // Skip if already rolled over this year
            if (lastRollover && new Date(lastRollover).getFullYear() === currentYear) {
              results.push({
                trainerId: trainer._id,
                username: trainer.username,
                status: 'SKIPPED',
                message: 'Already rolled over this year'
              });
              continue;
            }

            const updatedBalance = await this.rolloverUnusedLeaves(trainer._id);
            
            // Update rollover date
            await User.findByIdAndUpdate(trainer._id, {
              'leaveBalance.lastRolloverDate': now
            });
            
            updatedCount++;
            results.push({
              trainerId: trainer._id,
              username: trainer.username,
              status: 'UPDATED',
              newBalance: updatedBalance
            });
            console.log(`✅ Auto-rollover completed for trainer: ${trainer._id}`);
          } catch (error) {
            console.error(`❌ Error auto-rollover for trainer ${trainer._id}:`, error.message);
            results.push({
              trainerId: trainer._id,
              username: trainer.username,
              status: 'FAILED',
              error: error.message
            });
          }
        }

        console.log(`📊 Auto-rollover completed: ${updatedCount} trainers updated`);
        return { 
          updated: updatedCount, 
          total: permanentTrainers.length,
          results 
        };
      } else {
        console.log('⏭️ Not December yet, skipping auto-rollover');
        return { 
          updated: 0, 
          message: 'Rollover only runs in December',
          currentMonth: currentMonth + 1 // Convert to 1-12
        };
      }
    } catch (error) {
      console.error('❌ Error in autoYearEndRollover:', error);
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
  // ✅ APPLY LEAVE (Trainer requests)
  // ============================================
  async applyLeave(trainerId, leaveData) {
    try {
      const { leaveType, fromDate, toDate, numberOfDays, reason, emergencyContact } =
        leaveData;

      // Validate dates
      if (!Validators.validateDateRange(fromDate, toDate)) {
        throw new ValidationError("Invalid date range");
      }

      // Check trainer exists and get their category
      const trainer = await User.findById(trainerId);
      if (!trainer) {
        throw new NotFoundError("Trainer not found");
      }

      // Check if leave type is allowed for this category
      const leaveConfig = LEAVE_CONFIG[trainer.trainerCategory];
      if (!leaveConfig.allowedLeaveTypes.includes(leaveType)) {
        throw new ValidationError(
          `${leaveType} leaves are not available for ${trainer.trainerCategory} trainers`
        );
      }

      // Check for overlapping leave
      const overlapping = await Leave.findOne({
        trainerId,
        status: { $in: ["PENDING", "APPROVED"] },
        $or: [
          {
            fromDate: { $lte: new Date(toDate) },
            toDate: { $gte: new Date(fromDate) },
          },
        ],
      });

      if (overlapping) {
        throw new ConflictError(
          `You already have a ${overlapping.status.toLowerCase()} leave request for the overlapping dates`
        );
      }

      // Create leave request
      const leave = new Leave({
        trainerId,
        leaveType,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        numberOfDays,
        reason,
        emergencyContact,
        status: "PENDING",
        appliedOn: new Date(),
      });

      await leave.save();
      console.log(
        `✅ Leave request created for trainer ${trainerId}: ${leaveType} from ${fromDate} to ${toDate}`
      );
      return leave;
    } catch (error) {
      console.error("Error applying for leave:", error);
      throw error;
    }
  }

  // ============================================
  // ✅ APPROVE LEAVE (Auto deducts balance)
  // ============================================
  async approveLeave(leaveId, adminId, comments = "") {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const leave = await Leave.findById(leaveId).session(session);
      if (!leave) {
        throw new NotFoundError("Leave request not found");
      }

      if (leave.status !== "PENDING") {
        throw new ValidationError(
          `Can only approve pending leave requests. Current status: ${leave.status}`
        );
      }

      const trainer = await User.findById(leave.trainerId).session(session);
      if (!trainer) {
        throw new NotFoundError("Trainer not found");
      }

      const leaveTypeKey = leave.leaveType.toLowerCase();
      const availableBalance = trainer.leaveBalance[leaveTypeKey].available;

      // Check balance before deducting
      if (
        availableBalance !== Infinity &&
        availableBalance < leave.numberOfDays
      ) {
        await session.abortTransaction();
        throw new ValidationError(
          `Insufficient ${leave.leaveType} leave balance. Available: ${availableBalance}, Required: ${leave.numberOfDays}`
        );
      }

      // Deduct from available balance
      if (availableBalance !== Infinity) {
        trainer.leaveBalance[leaveTypeKey].available -= leave.numberOfDays;
      }

      // Add to used
      trainer.leaveBalance[leaveTypeKey].used += leave.numberOfDays;
      trainer.leaveBalance.lastUpdated = new Date();

      // Add to history
      if (!trainer.leaveHistory) trainer.leaveHistory = [];
      trainer.leaveHistory.push({
        type: "APPROVED",
        leaveType: leave.leaveType,
        previousBalance: availableBalance,
        newBalance: trainer.leaveBalance[leaveTypeKey].available,
        daysAffected: leave.numberOfDays,
        date: new Date(),
        reason: `Leave approved (ID: ${leaveId})`,
      });

      await trainer.save({ session });

      // Update leave record
      leave.status = "APPROVED";
      leave.approvedBy = adminId;
      leave.approvedAt = new Date();
      leave.adminRemarks = comments || "";
      await leave.save({ session });

      await session.commitTransaction();

      console.log(
        `✅ Leave ${leaveId} approved by admin ${adminId}. Balance deducted: ${leave.numberOfDays} ${leave.leaveType} days`
      );

      // Return populated leave
      return await Leave.findById(leaveId)
        .populate(
          "trainerId",
          "email username profile.firstName profile.lastName profile.employeeId trainerCategory"
        )
        .populate(
          "approvedBy",
          "username profile.firstName profile.lastName"
        );
    } catch (error) {
      await session.abortTransaction();
      console.error("Error in approveLeave:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ============================================
  // ✅ REJECT LEAVE (No balance changes)
  // ============================================
  async rejectLeave(leaveId, adminId, comments = "") {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const leave = await Leave.findById(leaveId).session(session);
      if (!leave) {
        throw new NotFoundError("Leave request not found");
      }

      if (leave.status !== "PENDING") {
        throw new ValidationError(
          `Can only reject pending leave requests. Current status: ${leave.status}`
        );
      }

      leave.status = "REJECTED";
      leave.rejectedBy = adminId;
      leave.rejectedAt = new Date();
      leave.adminRemarks = comments || "";
      await leave.save({ session });

      await session.commitTransaction();

      console.log(`❌ Leave ${leaveId} rejected by admin ${adminId}`);

      // Return populated leave
      return await Leave.findById(leaveId)
        .populate(
          "trainerId",
          "email username profile.firstName profile.lastName profile.employeeId"
        )
        .populate(
          "rejectedBy",
          "username profile.firstName profile.lastName"
        );
    } catch (error) {
      await session.abortTransaction();
      console.error("Error in rejectLeave:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ============================================
  // ✅ CANCEL LEAVE (Restores balance)
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
          `Can only cancel approved leaves. Current status: ${leave.status}`
        );
      }

      const trainer = await User.findById(leave.trainerId).session(session);
      if (!trainer) {
        throw new NotFoundError("Trainer not found");
      }

      // Restore the balance
      const leaveTypeKey = leave.leaveType.toLowerCase();
      const previousBalance = trainer.leaveBalance[leaveTypeKey].available;

      if (trainer.leaveBalance[leaveTypeKey].available !== Infinity) {
        trainer.leaveBalance[leaveTypeKey].available += leave.numberOfDays;
      }

      trainer.leaveBalance[leaveTypeKey].used = Math.max(
        0,
        trainer.leaveBalance[leaveTypeKey].used - leave.numberOfDays
      );
      trainer.leaveBalance.lastUpdated = new Date();

      // Add to history
      if (!trainer.leaveHistory) trainer.leaveHistory = [];
      trainer.leaveHistory.push({
        type: "CANCELLED",
        leaveType: leave.leaveType,
        previousBalance,
        newBalance: trainer.leaveBalance[leaveTypeKey].available,
        daysAffected: leave.numberOfDays,
        date: new Date(),
        reason: `Leave cancelled by ${userRole}`,
      });

      await trainer.save({ session });

      // Update leave record
      leave.status = "CANCELLED";
      leave.cancelledBy = cancelledBy;
      leave.cancelledAt = new Date();
      leave.adminRemarks = comments || "";
      await leave.save({ session });

      await session.commitTransaction();

      console.log(
        `🔄 Leave ${leaveId} cancelled. Balance restored: ${leave.numberOfDays} ${leave.leaveType} days`
      );

      return await Leave.findById(leaveId)
        .populate("trainerId")
        .populate("cancelledBy");
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
  async getLeaveBalance(trainerId) {
    const trainer = await User.findById(trainerId);
    if (!trainer) {
      throw new NotFoundError("Trainer not found");
    }

    return trainer.leaveBalance;
  }

  // ============================================
  // ✅ GET PENDING LEAVES
  // ============================================
  async getPendingLeaves(filters = {}) {
    try {
      const query = { status: "PENDING" };

      if (filters.trainerId) {
        query.trainerId = filters.trainerId;
      }

      const leaves = await Leave.find(query)
        .populate(
          "trainerId",
          "username profile.firstName profile.lastName email trainerCategory"
        )
        .sort({ appliedOn: -1 });

      return leaves;
    } catch (error) {
      console.error("Error getting pending leaves:", error);
      throw error;
    }
  }

  // ============================================
  // ✅ GET LEAVE HISTORY (With pagination & filters)
  // ============================================
  async getLeaveHistory(userId, filters = {}, isAdminOrHR = false) {
    try {
      const query = {};

      if (!isAdminOrHR || filters.trainerId) {
        query.trainerId = filters.trainerId || userId;
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

      const leaves = await Leave.find(query)
        .populate(
          "trainerId",
          "username profile.firstName profile.lastName email profile.employeeId trainerCategory"
        )
        .populate("approvedBy", "username profile.firstName profile.lastName")
        .populate("rejectedBy", "username profile.firstName profile.lastName")
        .populate(
          "cancelledBy",
          "username profile.firstName profile.lastName"
        )
        .skip(skip)
        .limit(limit)
        .sort({ appliedOn: -1 });

      // ✅ Format with names
      const formattedLeaves = leaves.map((leave) => {
        const leaveObj = leave.toObject();

        // Approved By Name
        leaveObj.approvedByName =
          leave.approvedBy?.profile?.firstName &&
          leave.approvedBy?.profile?.lastName
            ? `${leave.approvedBy.profile.firstName} ${leave.approvedBy.profile.lastName}`
            : leave.approvedBy?.username || null;

        // Rejected By Name
        leaveObj.rejectedBy =
          leave.rejectedBy?.profile?.firstName &&
          leave.rejectedBy?.profile?.lastName
            ? `${leave.rejectedBy.profile.firstName} ${leave.rejectedBy.profile.lastName}`
            : leave.rejectedBy?.username || null;

        // Cancelled By Name
        leaveObj.cancelledByName =
          leave.cancelledBy?.profile?.firstName &&
          leave.cancelledBy?.profile?.lastName
            ? `${leave.cancelledBy.profile.firstName} ${leave.cancelledBy.profile.lastName}`
            : leave.cancelledBy?.username || null;

        return leaveObj;
      });

      const total = await Leave.countDocuments(query);

      return {
        leaves: formattedLeaves,
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
  // ✅ UPDATE LEAVE BALANCE (Legacy method)
  // ============================================
  async updateLeaveBalance(trainerId, leaveType, newBalance, reason, adminId) {
  try {
    // Check trainer category
    const trainer = await User.findById(trainerId);
    if (!trainer) {
      throw new NotFoundError("Trainer not found");
    }

    if (trainer.trainerCategory === "CONTRACTED") {
      throw new Error("Cannot update leave balance for CONTRACTED trainers");
    }

    // Rest of your update logic...
    const update = {};
    update[`leaveBalance.${leaveType.toLowerCase()}`] = newBalance;

    const updatedTrainer = await User.findByIdAndUpdate(
      trainerId,
      update,
      { new: true }
    );

    // Create balance update log
    await BalanceUpdateLog.create({
      trainerId,
      adminId,
      leaveType,
      previousBalance: trainer.leaveBalance[leaveType.toLowerCase()],
      newBalance,
      reason,
      date: new Date()
    });

    return {
      trainerId,
      leaveType,
      newBalance,
      previousBalance: trainer.leaveBalance[leaveType.toLowerCase()],
      updatedAt: new Date()
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
        "leaveBalance trainerCategory leaveHistory"
      );
      if (!user) {
        throw new NotFoundError("Trainer not found");
      }

      const currentYear = new Date().getFullYear();
      const approvedLeaves = await Leave.countDocuments({
        trainerId: userId,
        status: "APPROVED",
        fromDate: {
          $gte: new Date(`${currentYear}-01-01`),
          $lte: new Date(`${currentYear}-12-31`),
        },
      });

      const pendingLeaves = await Leave.countDocuments({
        trainerId: userId,
        status: "PENDING",
      });

      const rejectedLeaves = await Leave.countDocuments({
        trainerId: userId,
        status: "REJECTED",
      });

      return {
        category: user.trainerCategory,
        balance: user.leaveBalance,
        statistics: {
          approvedThisYear: approvedLeaves,
          pendingRequests: pendingLeaves,
          rejectedRequests: rejectedLeaves,
        },
        allowedLeaveTypes: LEAVE_CONFIG[user.trainerCategory]?.allowedLeaveTypes || [],
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
        throw new NotFoundError("Trainer not found");
      }

      return user.leaveHistory?.slice(-limit) || [];
    } catch (error) {
      console.error("Error getting leave audit history:", error);
      throw error;
    }
  }
}