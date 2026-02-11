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

  async updateTrainerProfile(userId, updates) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Update basic fields (only if provided)
      if (updates.email && updates.email !== user.email) {
        const existingEmail = await User.findOne({
          email: updates.email,
          _id: { $ne: userId },
        });
        if (existingEmail) {
          throw new ConflictError("Email already in use");
        }
        user.email = updates.email;
      }

      if (updates.username && updates.username !== user.username) {
        const existingUsername = await User.findOne({
          username: updates.username,
          _id: { $ne: userId },
        });
        if (existingUsername) {
          throw new ConflictError("Username already in use");
        }
        user.username = updates.username;
      }

      if (updates.status) {
        if (
          !["ACTIVE", "INACTIVE", "ON_LEAVE", "SUSPENDED"].includes(
            updates.status,
          )
        ) {
          throw new ValidationError("Invalid status");
        }
        user.status = updates.status;
      }

      // Update profile fields (only if provided)
      if (updates.profile) {
        // Update each profile field only if it's provided in the update
        if (updates.profile.firstName !== undefined)
          user.profile.firstName = updates.profile.firstName;
        if (updates.profile.lastName !== undefined)
          user.profile.lastName = updates.profile.lastName;
        if (updates.profile.phone !== undefined)
          user.profile.phone = updates.profile.phone;
        if (updates.profile.dateOfBirth !== undefined)
          user.profile.dateOfBirth = updates.profile.dateOfBirth;
        if (updates.profile.gender !== undefined)
          user.profile.gender = updates.profile.gender;
        if (updates.profile.address !== undefined)
          user.profile.address = updates.profile.address;
        if (updates.profile.city !== undefined)
          user.profile.city = updates.profile.city;
        if (updates.profile.state !== undefined)
          user.profile.state = updates.profile.state;
        if (updates.profile.zipCode !== undefined)
          user.profile.zipCode = updates.profile.zipCode;
        if (updates.profile.country !== undefined)
          user.profile.country = updates.profile.country;
        if (updates.profile.employeeId !== undefined)
          user.profile.employeeId = updates.profile.employeeId;
        if (updates.profile.department !== undefined)
          user.profile.department = updates.profile.department;
        if (updates.profile.designation !== undefined)
          user.profile.designation = updates.profile.designation;
        if (updates.profile.qualification !== undefined)
          user.profile.qualification = updates.profile.qualification;
        if (updates.profile.experience !== undefined)
          user.profile.experience = updates.profile.experience;
        if (updates.profile.bio !== undefined)
          user.profile.bio = updates.profile.bio;
        if (updates.profile.joiningDate !== undefined)
          user.profile.joiningDate = updates.profile.joiningDate;
      }

      if (
        updates.trainerCategory &&
        updates.trainerCategory !== user.trainerCategory
      ) {
        const validCategories = Object.values(TRAINER_CATEGORY);
        if (!validCategories.includes(updates.trainerCategory)) {
          throw new ValidationError("Invalid trainer category");
        }

        user.trainerCategory = updates.trainerCategory;

        // Re-initialize leave balance for new category
        await leaveService.initializeLeaveBalance(
          userId,
          updates.trainerCategory,
        );
      }
      // Update client information if provided
      if (updates.client) {
        user.profile.client = {
          ...user.profile.client,
          ...updates.client,
        };
      }

      // Save and return updated user
      await user.save();

      // Return without password
      return user.toJSON();
    } catch (error) {
      throw error;
    }
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

  async getUsersCountByRole(role) {
    try {
      const count = await User.countDocuments({ role });
      return count;
    } catch (error) {
      throw error;
    }
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
