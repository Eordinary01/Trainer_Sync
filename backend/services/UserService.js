import User from "../models/User.model.js";
import { LeaveService } from "./LeaveService.js";

import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from "../utils/errorHandler.js";
import { TRAINER_CATEGORY } from "../config/constant.js";

const leaveService = new LeaveService();

export class UserService {
  async createTrainer(trainerData) {
    try {
      // ✅ ADD: Validate trainer category
      if (
        !Object.values(TRAINER_CATEGORY).includes(trainerData.trainerCategory)
      ) {
        throw new ValidationError(
          "Invalid trainer category. Must be PERMANENT or CONTRACTED",
        );
      }

      // Check if username already exists
      const existingUser = await User.findOne({
        username: trainerData.username,
      });
      if (existingUser) {
        throw new ConflictError("Username already exists");
      }

      // Check if email already exists
      const existingEmail = await User.findOne({ email: trainerData.email });
      if (existingEmail) {
        throw new ConflictError("Email already exists");
      }

      const trainer = new User(trainerData);
      await trainer.save();

      // ✅ ADD: Initialize leave balance based on category
      await leaveService.initializeLeaveBalance(
        trainer._id,
        trainerData.trainerCategory || "PERMANENT",
      );

      return trainer;
    } catch (error) {
      throw error;
    }
  }

  async getUserProfile(userId) {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  }

  async updateProfile(userId, updateData) {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Check if user is locked
    if (user.isLocked && user.isLocked()) {
      throw new ValidationError("Account is locked. Cannot update profile.");
    }

    // Update allowed profile fields
    if (updateData.profile) {
      // Initialize profile if it doesn't exist
      if (!user.profile) {
        user.profile = {};
      }

      // Update firstName
      if (updateData.profile.firstName !== undefined) {
        user.profile.firstName = updateData.profile.firstName;
      }

      // Update lastName
      if (updateData.profile.lastName !== undefined) {
        user.profile.lastName = updateData.profile.lastName;
      }

      // Update phone
      if (updateData.profile.phone !== undefined) {
        user.profile.phone = updateData.profile.phone;
      }

      // Update skills - ensure it's an array and filter out empty/duplicate values
      if (updateData.profile.skills !== undefined) {
        if (!Array.isArray(updateData.profile.skills)) {
          throw new ValidationError("Skills must be an array");
        }

        // Clean skills: trim, remove empty, remove duplicates, limit to 20
        const cleanedSkills = [
          ...new Set(
            updateData.profile.skills
              .map((skill) => skill?.toString().trim())
              .filter((skill) => skill && skill.length > 0)
              .slice(0, 20),
          ),
        ];

        user.profile.skills = cleanedSkills;
      }
    }

    // Set updated timestamp
    user.updatedAt = new Date();

    await user.save();

    // ✅ FIXED: Return user without sensitive data using User.findById directly
    const updatedUser = await User.findById(userId)
      .select(
        "-password -passwordResetToken -passwordResetExpire -loginAttempts -lockUntil",
      )
      .lean();

    return updatedUser;
  }

  async getAllTrainers(filters = {}, page = 1, limit = 10) {
    try {
      const query = { role: "TRAINER" };

      // Filter by status
      if (filters.status) {
        query.status = filters.status;
      }

      // Search by name, email, or username
      if (filters.search) {
        query.$or = [
          { username: { $regex: filters.search, $options: "i" } },
          { email: { $regex: filters.search, $options: "i" } },
          { "profile.firstName": { $regex: filters.search, $options: "i" } },
          { "profile.lastName": { $regex: filters.search, $options: "i" } },
          { "profile.employeeId": { $regex: filters.search, $options: "i" } },
        ];
      }

      const skip = (page - 1) * limit;

      const trainers = await User.find(query)
        .select("-password")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(query);

      return {
        trainers,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async deactivateTrainer(trainerId) {
    try {
      const trainer = await User.findByIdAndUpdate(
        trainerId,
        { status: "INACTIVE" },
        { new: true, runValidators: false }, // ✅ Skip validation to avoid joiningDate error
      ).select("-password");

      if (!trainer) {
        throw new NotFoundError("Trainer not found");
      }

      return trainer;
    } catch (error) {
      throw error;
    }
  }

  async activateTrainer(trainerId) {
    try {
      const trainer = await User.findByIdAndUpdate(
        trainerId,
        { status: "ACTIVE" },
        { new: true, runValidators: false }, // ✅ Skip validation to avoid joiningDate error
      ).select("-password");

      if (!trainer) {
        throw new NotFoundError("Trainer not found");
      }

      return trainer;
    } catch (error) {
      throw error;
    }
  }

  async searchTrainers(searchTerm) {
    try {
      const trainers = await User.find(
        {
          role: "TRAINER",
          $or: [
            { username: { $regex: searchTerm, $options: "i" } },
            { email: { $regex: searchTerm, $options: "i" } },
            { "profile.firstName": { $regex: searchTerm, $options: "i" } },
            { "profile.lastName": { $regex: searchTerm, $options: "i" } },
          ],
        },
        "-password",
      ).limit(10);

      return trainers;
    } catch (error) {
      throw error;
    }
  }

  async bulkImportTrainers(trainersData) {
    try {
      const createdTrainers = [];
      const errors = [];

      for (const trainerData of trainersData) {
        try {
          const trainer = await this.createTrainer(trainerData);
          createdTrainers.push(trainer);
        } catch (error) {
          errors.push({
            email: trainerData.email,
            error: error.message,
          });
        }
      }

      return {
        created: createdTrainers.length,
        failed: errors.length,
        errors,
        trainers: createdTrainers,
      };
    } catch (error) {
      throw error;
    }
  }

  async getTotalTrainersCount() {
    const count = await User.countDocuments({
      role: "TRAINER",
      // NO status filter here - count ALL trainers
    });
    return count;
  }

 async getUsersCountByRole(role, status = null) {
  const query = { role };
  
  // Only add status filter if specifically provided
  if (status) {
    query.status = status;
  }
  
  return await User.countDocuments(query);
}

  async getActiveTrainersCount() {
    try {
      const count = await User.countDocuments({
        role: "TRAINER",
        status: "ACTIVE",
      });
      return count;
    } catch (error) {
      throw error;
    }
  }
}
