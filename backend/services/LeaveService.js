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

    const trainer = await User.findById(leave.trainerId).session(session); // ✅ trainerId
    if (!trainer) {
      throw new NotFoundError('Trainer not found');
    }

    // ✅ Use lowercase leaveType for balance key
    const balanceKey = leave.leaveType.toLowerCase();
    const currentBalance = trainer.leaveBalance[balanceKey] || 0;
    
    if (currentBalance < leave.numberOfDays) {
      throw new ValidationError(`Insufficient ${leave.leaveType} leave balance. Available: ${currentBalance}, Required: ${leave.numberOfDays}`);
    }

    // ✅ Deduct leave balance
    trainer.leaveBalance[balanceKey] = currentBalance - leave.numberOfDays;
    await trainer.save({ session });

    // ✅ Update leave
    leave.status = 'APPROVED';
    leave.approvedBy = adminId;
    leave.approvedAt = new Date();
    leave.adminRemarks = comments || '';
    await leave.save({ session });

    await session.commitTransaction();
    
    console.log(`✅ Leave ${leaveId} approved by admin ${adminId}. Balance deducted: ${leave.numberOfDays} ${leave.leaveType} days from trainer ${leave.trainerId}`);
    
    return leave;
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

    // ✅ Update leave
    leave.status = 'REJECTED';
    leave.rejectedBy = adminId;
    leave.rejectedAt = new Date();
    leave.adminRemarks = comments || '';
    await leave.save({ session });

    await session.commitTransaction();
    
    console.log(`❌ Leave ${leaveId} rejected by admin ${adminId}`);
    
    return leave;
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