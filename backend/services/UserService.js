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
    // ✅ Validate trainer category
    if (!Object.values(TRAINER_CATEGORY).includes(trainerData.trainerCategory)) {
      throw new ValidationError("Invalid trainer category. Must be PERMANENT or CONTRACTED");
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username: trainerData.username });
    if (existingUser) {
      throw new ConflictError("Username already exists");
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: trainerData.email });
    if (existingEmail) {
      throw new ConflictError("Email already exists");
    }

    // ✅ FIXED: Preserve the arrays from frontend, only initialize if not present
    const trainer = new User({
      ...trainerData,
      profile: {
        ...trainerData.profile,
        // ✅ Only initialize missing fields, don't overwrite existing ones
        university: trainerData.profile?.university || {},
        subjects: trainerData.profile?.subjects || [],
        semesterActivities: trainerData.profile?.semesterActivities || [],
        projects: trainerData.profile?.projects || [],
        qualifications: trainerData.profile?.qualifications || [],
        experience: trainerData.profile?.experience || [],
        certifications: trainerData.profile?.certifications || [],
        placementRecord: trainerData.profile?.placementRecord || {},
        // Ensure client exists
        client: trainerData.profile?.client || { name: '', address: '', city: '' }
      }
    });

    await trainer.save();

    // Initialize leave balance
    await leaveService.initializeLeaveBalance(
      trainer._id,
      trainerData.trainerCategory || "PERMANENT"
    );

    // ✅ Add portfolio initialization to leave history
    trainer.leaveHistory.push({
      type: "SYSTEM_INIT",
      leaveType: "ALL",
      date: new Date(),
      reason: "Trainer profile created with portfolio structure",
    });
    await trainer.save();

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

  // In UserService.js - Updated updateProfile method
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

    // Basic fields (existing)
    if (updateData.profile.firstName !== undefined) {
      user.profile.firstName = updateData.profile.firstName;
    }
    if (updateData.profile.lastName !== undefined) {
      user.profile.lastName = updateData.profile.lastName;
    }
    if (updateData.profile.phone !== undefined) {
      user.profile.phone = updateData.profile.phone;
    }
    if (updateData.profile.dateOfBirth !== undefined) {
      user.profile.dateOfBirth = updateData.profile.dateOfBirth;
    }
    if (updateData.profile.gender !== undefined) {
      user.profile.gender = updateData.profile.gender;
    }
    if (updateData.profile.address !== undefined) {
      user.profile.address = updateData.profile.address;
    }
    if (updateData.profile.city !== undefined) {
      user.profile.city = updateData.profile.city;
    }
    if (updateData.profile.state !== undefined) {
      user.profile.state = updateData.profile.state;
    }
    if (updateData.profile.zipCode !== undefined) {
      user.profile.zipCode = updateData.profile.zipCode;
    }
    if (updateData.profile.country !== undefined) {
      user.profile.country = updateData.profile.country;
    }
    if (updateData.profile.bio !== undefined) {
      user.profile.bio = updateData.profile.bio;
    }
    if (updateData.profile.avatar !== undefined) {
      user.profile.avatar = updateData.profile.avatar;
    }
    if (updateData.profile.skills !== undefined) {
      if (!Array.isArray(updateData.profile.skills)) {
        throw new ValidationError("Skills must be an array");
      }
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

    // Professional fields (should only be updated by Admin/HR)
    if (updateData.profile.department !== undefined) {
      user.profile.department = updateData.profile.department;
    }
    if (updateData.profile.designation !== undefined) {
      user.profile.designation = updateData.profile.designation;
    }
    if (updateData.profile.reportingManager !== undefined) {
      user.profile.reportingManager = updateData.profile.reportingManager;
    }
    if (updateData.profile.joiningDate !== undefined) {
      user.profile.joiningDate = updateData.profile.joiningDate;
    }

    // ✅ University info
    if (updateData.profile.university !== undefined) {
      user.profile.university = {
        ...user.profile.university,
        ...updateData.profile.university,
      };
    }

    // ✅ Subjects (full array replacement)
    if (updateData.profile.subjects !== undefined) {
      if (!Array.isArray(updateData.profile.subjects)) {
        throw new ValidationError("Subjects must be an array");
      }
      user.profile.subjects = updateData.profile.subjects;
    }

    // ✅ Semester activities
    if (updateData.profile.semesterActivities !== undefined) {
      if (!Array.isArray(updateData.profile.semesterActivities)) {
        throw new ValidationError("Semester activities must be an array");
      }
      user.profile.semesterActivities = updateData.profile.semesterActivities;
    }

    // ✅ Projects
    if (updateData.profile.projects !== undefined) {
      if (!Array.isArray(updateData.profile.projects)) {
        throw new ValidationError("Projects must be an array");
      }
      user.profile.projects = updateData.profile.projects;
    }

    // ✅ Qualifications
    if (updateData.profile.qualifications !== undefined) {
      if (!Array.isArray(updateData.profile.qualifications)) {
        throw new ValidationError("Qualifications must be an array");
      }
      user.profile.qualifications = updateData.profile.qualifications;
    }

    // ✅ Experience
    if (updateData.profile.experience !== undefined) {
      if (!Array.isArray(updateData.profile.experience)) {
        throw new ValidationError("Experience must be an array");
      }
      user.profile.experience = updateData.profile.experience;
    }

    // ✅ Certifications
    if (updateData.profile.certifications !== undefined) {
      if (!Array.isArray(updateData.profile.certifications)) {
        throw new ValidationError("Certifications must be an array");
      }
      user.profile.certifications = updateData.profile.certifications;
    }

    // ✅ Placement record
    if (updateData.profile.placementRecord !== undefined) {
      user.profile.placementRecord = {
        ...user.profile.placementRecord,
        ...updateData.profile.placementRecord,
        lastUpdated: new Date(),
      };
    }

    // ✅ Client info
    if (updateData.profile.client !== undefined) {
      user.profile.client = {
        ...user.profile.client,
        ...updateData.profile.client,
      };
    }
  }

  // Set updated timestamp
  user.updatedAt = new Date();

  await user.save();

  // Return updated user without sensitive data
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

  // ✅ Get trainer's portfolio summary
  async getPortfolioSummary(userId) {
    const user = await User.findById(userId)
      .select("profile role trainerCategory")
      .lean();

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.role !== "TRAINER") {
      throw new ValidationError("Only trainers have portfolios");
    }

    return {
      userId: user._id,
      name: `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim(),
      category: user.trainerCategory,
      ...user.getPortfolioSummary(),
    };
  }

  // ✅ Add a subject with syllabus
  async addSubject(userId, subjectData) {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (!user.profile.subjects) {
      user.profile.subjects = [];
    }

    // Add syllabus upload info if provided
    if (subjectData.syllabus) {
      subjectData.syllabus.uploadedAt = new Date();
    }

    user.profile.subjects.push(subjectData);
    await user.save();

    return subjectData;
  }

  // ✅ Add a project
  async addProject(userId, projectData) {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (!user.profile.projects) {
      user.profile.projects = [];
    }

    user.profile.projects.push(projectData);
    await user.save();

    return projectData;
  }

  // ✅ Add qualification
  async addQualification(userId, qualificationData) {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (!user.profile.qualifications) {
      user.profile.qualifications = [];
    }

    user.profile.qualifications.push(qualificationData);
    await user.save();

    return qualificationData;
  }

  // ✅ Update placement record
  async updatePlacementRecord(userId, placementData) {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (!user.profile.placementRecord) {
      user.profile.placementRecord = {};
    }

    // Merge with existing data
    user.profile.placementRecord = {
      ...user.profile.placementRecord,
      ...placementData,
      lastUpdated: new Date(),
    };

    await user.save();
    return user.profile.placementRecord;
  }

  // ✅ Get trainers by skill
  async getTrainersBySkill(skill, limit = 10) {
    return await User.find({
      role: "TRAINER",
      status: "ACTIVE",
      "profile.skills": { $in: [new RegExp(skill, "i")] },
    })
      .select(
        "username email profile.firstName profile.lastName profile.skills",
      )
      .limit(limit)
      .lean();
  }

  // ✅ Get placement statistics for dashboard
  async getPlacementStatistics(year = null) {
    const match = { role: "TRAINER" };
    if (year) {
      match["profile.placementRecord.stats.year"] = year;
    }

    const trainers = await User.find(match)
      .select(
        "profile.placementRecord profile.firstName profile.lastName username",
      )
      .lean();

    const stats = {
      totalTrainers: trainers.length,
      trainersWithPlacement: trainers.filter(
        (t) => t.profile?.placementRecord?.stats?.length > 0,
      ).length,
      averagePlacement: 0,
      totalCompanies: 0,
      yearWiseData: {},
    };

    // Calculate aggregates
    let totalPlacement = 0;
    let placementCount = 0;

    trainers.forEach((trainer) => {
      const placement = trainer.profile?.placementRecord;
      if (placement?.stats) {
        placement.stats.forEach((s) => {
          if (!stats.yearWiseData[s.year]) {
            stats.yearWiseData[s.year] = {
              totalStudents: 0,
              placedStudents: 0,
              companies: [],
            };
          }
          stats.yearWiseData[s.year].totalStudents += s.totalStudents || 0;
          stats.yearWiseData[s.year].placedStudents += s.placedStudents || 0;

          totalPlacement += (s.placedStudents / s.totalStudents) * 100 || 0;
          placementCount++;
        });
      }

      if (placement?.companies) {
        stats.totalCompanies += placement.companies.length;
      }
    });

    stats.averagePlacement =
      placementCount > 0 ? totalPlacement / placementCount : 0;

    return stats;
  }


  
}
