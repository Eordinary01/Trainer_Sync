import { Validators } from '../utils/validators.js';
import { DateUtils } from '../utils/dateUtils.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../utils/errorHandler.js';
import { DEFAULT_LEAVE_BALANCE } from '../config/constant.js';
import User from '../models/User.model.js'; 

export class UserService {
  async createTrainer(trainerData) {
    const { username, email, profile, reportingManager } = trainerData;

    // Validate email
    if (!Validators.validateEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      throw new ConflictError('Email or username already exists');
    }

    // Check if employee ID is unique
    if (profile.employeeId) {
      const existingTrainer = await User.findOne({
        'profile.employeeId': profile.employeeId,
      });
      if (existingTrainer) {
        throw new ConflictError('Employee ID already exists');
      }
    }

    // Validate reporting manager if provided
    if (reportingManager) {
      const manager = await User.findById(reportingManager);
      if (!manager) {
        throw new NotFoundError('Reporting manager not found');
      }
    }

    // Generate temporary password
    const tempPassword = this.generateTempPassword(); // Changed from Encryption.generateOTP()

    const trainer = new User({
      ...trainerData,
      password: tempPassword,
      role: 'TRAINER',
      leaveBalance: DEFAULT_LEAVE_BALANCE,
    });

    if (reportingManager) {
      trainer.reportingManager = reportingManager;
      // Add to manager's subordinates
      await User.findByIdAndUpdate(reportingManager, {
        $addToSet: { subordinates: trainer._id },
      });
    }

    await trainer.save();
    return trainer.toJSON();
  }

  async getTrainerProfile(trainerId) {
    const trainer = await User.findById(trainerId)
      .populate('reportingManager', 'username profile.firstName profile.lastName')
      .populate('subordinates', 'username profile.firstName profile.lastName');

    if (!trainer) {
      throw new NotFoundError('Trainer not found');
    }

    return trainer.toJSON();
  }

  async updateTrainerProfile(trainerId, updateData) {
    const trainer = await User.findById(trainerId);
    if (!trainer) {
      throw new NotFoundError('Trainer not found');
    }

    // Validate email if changed
    if (updateData.email && updateData.email !== trainer.email) {
      if (!Validators.validateEmail(updateData.email)) {
        throw new ValidationError('Invalid email format');
      }
      const existing = await User.findOne({ email: updateData.email });
      if (existing) {
        throw new ConflictError('Email already in use');
      }
    }

    // Update allowed fields
    const allowedFields = ['profile', 'email', 'reportingManager'];
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        trainer[key] = updateData[key];
      }
    });

    await trainer.save();
    return trainer.toJSON();
  }

  async getAllTrainers(filters = {}, page = 1, limit = 10) {
    const query = { role: 'TRAINER' };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.search) {
      query.$or = [
        { username: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { 'profile.firstName': { $regex: filters.search, $options: 'i' } },
        { 'profile.lastName': { $regex: filters.search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const trainers = await User.find(query)
      .populate('reportingManager', 'username profile.firstName profile.lastName')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    return {
      trainers: trainers.map(t => t.toJSON()),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async deactivateTrainer(trainerId) {
    const trainer = await User.findById(trainerId);
    if (!trainer) {
      throw new NotFoundError('Trainer not found');
    }

    trainer.status = 'INACTIVE';
    trainer.deletedAt = new Date();
    await trainer.save();

    return trainer.toJSON();
  }

  async activateTrainer(trainerId) {
    const trainer = await User.findById(trainerId);
    if (!trainer) {
      throw new NotFoundError('Trainer not found');
    }

    trainer.status = 'ACTIVE';
    trainer.deletedAt = undefined;
    await trainer.save();

    return trainer.toJSON();
  }

  async bulkImportTrainers(trainersData) {
    const results = {
      success: [],
      failed: [],
    };

    for (const data of trainersData) {
      try {
        const trainer = await this.createTrainer(data);
        results.success.push(trainer);
      } catch (error) {
        results.failed.push({
          data,
          error: error.message,
        });
      }
    }

    return results;
  }

  async searchTrainers(searchTerm, fields = ['username', 'email']) {
    const query = {
      $or: fields.map(field => ({
        [field]: { $regex: searchTerm, $options: 'i' },
      })),
    };

    const trainers = await User.find(query)
      .limit(10)
      .select('username email profile.firstName profile.lastName');

    return trainers.map(t => t.toJSON());
  }

  async getTrainersByManager(managerId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const trainers = await User.find({ reportingManager: managerId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments({ reportingManager: managerId });

    return {
      trainers: trainers.map(t => t.toJSON()),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Add missing method for password generation
  generateTempPassword() {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}