import { Leave } from '../models/Leave.model.js';
import User from '../models/User.model.js';
import mongoose from 'mongoose';

import { Validators } from '../utils/validators.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../utils/errorHandler.js';



export class LeaveService {
  // In LeaveService.js
async calculateLeaveBalance(userId) {
  try {
    // Get current year
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(`${currentYear}-01-01`);
    const yearEnd = new Date(`${currentYear}-12-31`);
    
    // Get all leaves for current year
    const leaves = await Leave.find({
      trainerId: userId,
      fromDate: { $gte: yearStart },
      status: 'APPROVED'
    });
    
    // Default yearly allocations
    const yearlyAllocation = {
      casual: 12,
      sick: 12,
      paid: 15
    };
    
    // Calculate used leaves
    const usedLeaves = {
      casual: 0,
      sick: 0,
      paid: 0
    };
    
    leaves.forEach(leave => {
      const timeDiff = new Date(leave.toDate).getTime() - new Date(leave.fromDate).getTime();
      const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
      
      if (usedLeaves[leave.leaveType.toLowerCase()] !== undefined) {
        usedLeaves[leave.leaveType.toLowerCase()] += days;
      }
    });
    
    // Calculate balance
    const balance = {};
    Object.keys(yearlyAllocation).forEach(type => {
      balance[type] = yearlyAllocation[type] - usedLeaves[type];
    });
    
    return balance;
    
  } catch (error) {
    console.error('Error calculating leave balance:', error);
    throw error;
  }
}
  async applyLeave(trainerId, leaveData) {
    const { leaveType, fromDate, toDate, reason } = leaveData;

    // Validate dates
    if (!Validators.validateDateRange(fromDate, toDate)) {
      throw new ValidationError('Invalid date range');
    }

    // Check trainer exists
    const trainer = await User.findById(trainerId);
    if (!trainer) {
      throw new NotFoundError('Trainer not found');
    }

    // Calculate number of days
    const numberOfDays = Validators.calculateDaysBetween(fromDate, toDate);

    // Check leave balance
    const balanceKey = leaveType.toLowerCase();
    if (trainer.leaveBalance[balanceKey] < numberOfDays) {
      throw new ValidationError(
        `Insufficient ${leaveType} leave balance. Available: ${trainer.leaveBalance[balanceKey]} days`
      );
    }

    // Check for overlapping leave
    const overlapping = await Leave.findOne({
      trainerId,
      status: { $in: ['PENDING', 'APPROVED'] },
      $or: [
        { fromDate: { $lte: new Date(toDate) }, toDate: { $gte: new Date(fromDate) } },
      ],
    });

    if (overlapping) {
      throw new ConflictError('Leave already exists for this date range');
    }

    // Create leave request
    const leave = new Leave({
      trainerId,
      leaveType,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      numberOfDays,
      reason,
      status: 'PENDING',
      appliedOn: new Date(),
    });

    await leave.save();
    return leave;
  }

  async approveLeave(leaveId, adminId, comments = '') {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const leave = await Leave.findById(leaveId).session(session);
    if (!leave) {
      throw new NotFoundError('Leave request not found');
    }

    if (leave.status !== 'PENDING') {
      throw new ValidationError(`Can only approve pending leave requests. Current status: ${leave.status}`);
    }

    const trainer = await User.findById(leave.trainerId).session(session);
    if (!trainer) {
      throw new NotFoundError('Trainer not found');
    }

    const balanceKey = leave.leaveType.toLowerCase();
    const currentBalance = trainer.leaveBalance[balanceKey] || 0;
    
    if (currentBalance < leave.numberOfDays) {
      throw new ValidationError(`Insufficient ${leave.leaveType} leave balance. Available: ${currentBalance}, Required: ${leave.numberOfDays}`);
    }

    trainer.leaveBalance[balanceKey] = currentBalance - leave.numberOfDays;
    await trainer.save({ session });

    leave.status = 'APPROVED';
    leave.approvedBy = adminId;
    leave.approvedAt = new Date();
    leave.adminRemarks = comments || '';
    await leave.save({ session });

    await session.commitTransaction();
    
    console.log(`✅ Leave ${leaveId} approved by admin ${adminId}. Balance deducted: ${leave.numberOfDays} ${leave.leaveType} days from trainer ${leave.trainerId}`);
    
    // ✅ IMPORTANT: Return populated leave
    return await Leave.findById(leaveId)
      .populate('trainerId', 'email username profile.firstName profile.lastName profile.employeeId')
      .populate('approvedBy', 'username profile.firstName profile.lastName');
      
  } catch (error) {
    await session.abortTransaction();
    console.error('Error in approveLeave:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

async rejectLeave(leaveId, adminId, comments = '') {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const leave = await Leave.findById(leaveId).session(session);
    if (!leave) {
      throw new NotFoundError('Leave request not found');
    }

    if (leave.status !== 'PENDING') {
      throw new ValidationError(`Can only reject pending leave requests. Current status: ${leave.status}`);
    }

    leave.status = 'REJECTED';
    leave.rejectedBy = adminId;
    leave.rejectedAt = new Date();
    leave.adminRemarks = comments || '';
    await leave.save({ session });

    await session.commitTransaction();
    
    console.log(`❌ Leave ${leaveId} rejected by admin ${adminId}`);
    
    // ✅ IMPORTANT: Return populated leave
    return await Leave.findById(leaveId)
      .populate('trainerId', 'email username profile.firstName profile.lastName profile.employeeId')
      .populate('rejectedBy', 'username profile.firstName profile.lastName');
      
  } catch (error) {
    await session.abortTransaction();
    console.error('Error in rejectLeave:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

  async getLeaveBalance(trainerId) {
    const trainer = await User.findById(trainerId);
    if (!trainer) {
      throw new NotFoundError('Trainer not found');
    }

    return trainer.leaveBalance;
  }

  async getPendingLeaves(filters = {}) {
    const query = { status: 'PENDING' };

    if (filters.trainerId) {
      query.trainerId = filters.trainerId;
    }

    const leaves = await Leave.find(query)
      .populate('trainerId', 'username profile.firstName profile.lastName email')
      .sort({ appliedOn: -1 });

    return leaves;
  }

  async getLeaveHistory(userId, filters = {}, isAdminOrHR = false) {
    const query = {};
    
    // For regular trainers, only show their own leaves
    // For admin/HR, show all leaves unless a specific trainer is filtered
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
      .populate('trainerId', 'username profile.firstName profile.lastName email profile.employeeId')
      .populate('approvedBy', 'username profile.firstName profile.lastName')
      .skip(skip)
      .limit(limit)
      .sort({ appliedOn: -1 });

    const total = await Leave.countDocuments(query);

    return {
      leaves,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateLeaveBalance(trainerId, leaveType, daysToAdd) {
    const trainer = await User.findById(trainerId);
    if (!trainer) {
      throw new NotFoundError('Trainer not found');
    }

    const balanceKey = leaveType.toLowerCase();
    trainer.leaveBalance[balanceKey] += daysToAdd;
    trainer.leaveBalance.lastUpdated = new Date();
    await trainer.save();

    return trainer.leaveBalance;
  }
}