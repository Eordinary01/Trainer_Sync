import { Validators } from "../utils/validators.js";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../utils/errorHandler.js";
import { DEFAULT_LEAVE_BALANCE } from "../config/constant.js";
import User from "../models/User.model.js";

export class UserService {
  async createTrainer(trainerData) {
    const { username, email, profile, reportingManager, password } = trainerData;

    console.log('🔍 Validating trainer data...');

    // ✅ Validate email
    if (!Validators.validateEmail(email)) {
      throw new ValidationError("Invalid email format");
    }

    // ✅ Validate required profile fields
    if (!profile?.firstName || !profile?.lastName || !profile?.phone) {
      throw new ValidationError("First name, last name, and phone are required in profile");
    }

    // ✅ Check if email/username already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      throw new ConflictError("Email or username already exists");
    }

    // ✅ Check if employee ID is unique
    if (profile?.employeeId) {
      const existingTrainer = await User.findOne({
        "profile.employeeId": profile.employeeId,
      });
      if (existingTrainer) {
        throw new ConflictError("Employee ID already exists");
      }
    }

    // ✅ Validate reporting manager
    if (reportingManager) {
      const manager = await User.findById(reportingManager);
      if (!manager) throw new NotFoundError("Reporting manager not found");
    }

    console.log('👤 Creating trainer user object...');
    // ✅ Create trainer with all required fields
    const trainer = new User({
      username,
      email,
      password, // This will be hashed by the pre-save hook
      role: "TRAINER",
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        joiningDate: profile.joiningDate || new Date(),
        employeeId: profile.employeeId, // Will be auto-generated if not provided
        ...profile // Include any other profile fields
      },
      leaveBalance: DEFAULT_LEAVE_BALANCE,
      reportingManager: reportingManager || null,
      status: 'ACTIVE'
    });

    console.log('💾 Saving trainer to database...');
    try {
      await trainer.save();
      console.log('✅ Trainer saved successfully, password hashed:', trainer.password?.substring(0, 20) + '...');
    } catch (saveError) {
      console.error('❌ Save error details:', saveError);
      throw saveError;
    }

    if (reportingManager) {
      await User.findByIdAndUpdate(reportingManager, {
        $addToSet: { subordinates: trainer._id },
      });
    }

    return trainer.toJSON();
  }


  async getUserProfile(userId) {
    const user = await User.findById(userId)
      .populate(
        "reportingManager",
        "username profile.firstName profile.lastName email"
      )
      .populate(
        "subordinates",
        "username profile.firstName profile.lastName email role"
      )
      .select("-password");

    if (!user) throw new NotFoundError("User not found");
    return user.toJSON();
  }

  async updateTrainerProfile(trainerId, updateData) {
    const trainer = await User.findById(trainerId);
    if (!trainer) throw new NotFoundError("Trainer not found");

    if (updateData.email && updateData.email !== trainer.email) {
      if (!Validators.validateEmail(updateData.email)) {
        throw new ValidationError("Invalid email format");
      }
      const existing = await User.findOne({ email: updateData.email });
      if (existing) throw new ConflictError("Email already in use");
    }

    const allowedFields = ["profile", "email", "reportingManager"];
    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key)) trainer[key] = updateData[key];
    });

    await trainer.save();
    return trainer.toJSON();
  }

  async getAllTrainers(filters = {}, page = 1, limit = 10) {
    const query = { role: "TRAINER" };
    
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { username: new RegExp(filters.search, "i") },
        { email: new RegExp(filters.search, "i") },
        { "profile.firstName": new RegExp(filters.search, "i") },
        { "profile.lastName": new RegExp(filters.search, "i") },
      ];
    }

    const skip = (page - 1) * limit;
    const trainers = await User.find(query)
      .populate(
        "reportingManager",
        "username profile.firstName profile.lastName"
      )
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);
    
    return {
      trainers: trainers.map((t) => t.toJSON()),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async deactivateTrainer(trainerId) {
    const trainer = await User.findById(trainerId);
    if (!trainer) throw new NotFoundError("Trainer not found");
    
    trainer.status = "INACTIVE";
    trainer.deletedAt = new Date();
    await trainer.save();
    
    return trainer.toJSON();
  }

  async activateTrainer(trainerId) {
    const trainer = await User.findById(trainerId);
    if (!trainer) throw new NotFoundError("Trainer not found");
    
    trainer.status = "ACTIVE";
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

  async getUsersCountByRole(role = null) {
    const query = {};
    if (role) {
      query.role = role;
    }

    const count = await User.countDocuments(query);
    return count;
  }

  async getActiveTrainersCount() {
    const count = await User.countDocuments({
      role: "TRAINER",
      status: "ACTIVE",
    });
    return count;
  }

  async getAllUsers(filters = {}, page = 1, limit = 10) {
    const query = {};

    if (filters.role) {
      query.role = filters.role;
    }
    if (filters.status) {
      query.status = filters.status;
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    return {
      users: users.map((u) => u.toJSON()),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

 }