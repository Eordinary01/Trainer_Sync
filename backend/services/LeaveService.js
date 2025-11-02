import { Leave } from '../models/Leave.model.js';

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
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      throw new NotFoundError('Leave request not found');
    }

    if (leave.status !== 'PENDING') {
      throw new ValidationError('Can only approve pending leave requests');
    }

    const trainer = await User.findById(leave.trainerId);
    if (!trainer) {
      throw new NotFoundError('Trainer not found');
    }

    // Deduct leave balance
    const balanceKey = leave.leaveType.toLowerCase();
    trainer.leaveBalance[balanceKey] -= leave.numberOfDays;
    await trainer.save();

    // Update leave
    leave.status = 'APPROVED';
    leave.approvedBy = adminId;
    leave.approvalDate = new Date();
    leave.comments = comments;
    await leave.save();

    return leave;
  }

  async rejectLeave(leaveId, adminId, comments = '') {
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      throw new NotFoundError('Leave request not found');
    }

    if (leave.status !== 'PENDING') {
      throw new ValidationError('Can only reject pending leave requests');
    }

    leave.status = 'REJECTED';
    leave.approvedBy = adminId;
    leave.approvalDate = new Date();
    leave.comments = comments;
    await leave.save();

    return leave;
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

  async getLeaveHistory(trainerId, filters = {}) {
    const query = { trainerId };

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