// routes/admin.routes.js
import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import {
  validateRequest,
  createAdminValidation,
} from "../middleware/validator.middleware.js";
import User from "../models/User.model.js";
import { EmailService } from "../services/EmailService.js";
import {
  ConflictError,
  ValidationError,
  NotFoundError,
  // UnauthorizedError,
} from "../utils/errorHandler.js";
import { body } from "express-validator";

const router = express.Router();
const emailService = new EmailService();

// ============================================
// ✅ CREATE ADMIN/HR USER
// ============================================
router.post(
  "/create-admin",
  authenticate,
  authorize("ADMIN"),
  createAdminValidation,
  validateRequest,
  async (req, res, next) => {
    try {
      const { username, email, password, role, profile } = req.body;

      // Validate role (only ADMIN or HR)
      if (!["ADMIN", "HR"].includes(role)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_ROLE",
            message: "Role must be ADMIN or HR",
          },
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        throw new ConflictError("Email or username already exists");
      }

      // Create new admin/hr user
      const newUser = new User({
        username,
        email,
        password,
        role,
        profile: {
          firstName: profile?.firstName || "",
          lastName: profile?.lastName || "",
          phone: profile?.phone || "",
          employeeId: profile?.employeeId || "",
          joiningDate: new Date(),
        },
        status: "ACTIVE",
      });

      await newUser.save();

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(email, username, password);
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }

      res.status(201).json({
        success: true,
        message: `${role} user created successfully`,
        data: {
          _id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          profile: newUser.profile,
          status: newUser.status,
          leaveBalance: newUser.leaveBalance,
          isUnlimited: newUser.role === "HR",
          createdAt: newUser.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// ✅ GET ALL ADMIN/HR USERS
// ============================================
router.get(
  "/users",
  authenticate,
  authorize("ADMIN"),
  async (req, res, next) => {
    try {
      const { role, status, search } = req.query;
      
      // Build query
      let query = { role: { $in: ["ADMIN", "HR"] } };
      
      if (role && ["ADMIN", "HR"].includes(role)) {
        query.role = role;
      }
      
      if (status && ["ACTIVE", "INACTIVE"].includes(status)) {
        query.status = status;
      }
      
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { "profile.firstName": { $regex: search, $options: "i" } },
          { "profile.lastName": { $regex: search, $options: "i" } },
          { "profile.employeeId": { $regex: search, $options: "i" } },
        ];
      }
      
      const users = await User.find(query)
        .select("-password -passwordResetToken -passwordResetExpire -loginAttempts -lockUntil")
        .sort({ createdAt: -1 });
      
      res.status(200).json({
        success: true,
        data: users,
        count: users.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// ✅ GET SINGLE ADMIN/HR USER
// ============================================
router.get(
  "/users/:userId",
  authenticate,
  authorize("ADMIN"),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      
      const user = await User.findOne({
        _id: userId,
        role: { $in: ["ADMIN", "HR"] },
      }).select("-password -passwordResetToken -passwordResetExpire -loginAttempts -lockUntil");
      
      if (!user) {
        throw new NotFoundError("Admin/HR user not found");
      }
      
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// ✅ UPDATE ADMIN/HR USER
// ============================================
router.put(
  "/users/:userId",
  authenticate,
  authorize("ADMIN"),
  [
    body("email").optional().isEmail().withMessage("Valid email is required"),
    body("username").optional().isString().notEmpty().withMessage("Username cannot be empty"),
    body("status").optional().isIn(["ACTIVE", "INACTIVE", "SUSPENDED"]).withMessage("Invalid status"),
    body("profile.firstName").optional().isString().trim(),
    body("profile.lastName").optional().isString().trim(),
    body("profile.phone").optional().isString(),
    body("profile.employeeId").optional().isString(),
    body("role").optional().isIn(["ADMIN", "HR"]).withMessage("Role must be ADMIN or HR"),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const updates = req.body;
      
      // Find the user
      const user = await User.findOne({
        _id: userId,
        role: { $in: ["ADMIN", "HR"] },
      });
      
      if (!user) {
        throw new NotFoundError("Admin/HR user not found");
      }
      
      // Prevent role change that would remove the last ADMIN
      if (updates.role && updates.role !== user.role) {
        if (user.role === "ADMIN" && updates.role !== "ADMIN") {
          const adminCount = await User.countDocuments({ role: "ADMIN" });
          if (adminCount <= 1) {
            throw new ValidationError("Cannot change role of the last ADMIN user");
          }
        }
      }
      
      // Update basic fields
      if (updates.email) user.email = updates.email;
      if (updates.username) user.username = updates.username;
      if (updates.status) user.status = updates.status;
      if (updates.role) user.role = updates.role;
      
      // Update profile fields
      if (updates.profile) {
        if (!user.profile) user.profile = {};
        
        const profileFields = ["firstName", "lastName", "phone", "employeeId"];
        profileFields.forEach(field => {
          if (updates.profile[field] !== undefined) {
            user.profile[field] = updates.profile[field];
          }
        });
      }
      
      user.updatedAt = new Date();
      await user.save();
      
      // Get updated user
      const updatedUser = await User.findById(userId)
        .select("-password -passwordResetToken -passwordResetExpire -loginAttempts -lockUntil");
      
      res.status(200).json({
        success: true,
        message: "Admin/HR user updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// ✅ DELETE ADMIN/HR USER
// ============================================
router.delete(
  "/users/:userId",
  authenticate,
  authorize("ADMIN"),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      
      // Don't allow deleting yourself
      if (userId === req.user.userId) {
        throw new ValidationError("You cannot delete your own account");
      }
      
      const user = await User.findOne({
        _id: userId,
        role: { $in: ["ADMIN", "HR"] },
      });
      
      if (!user) {
        throw new NotFoundError("Admin/HR user not found");
      }
      
      // Don't allow deleting the last ADMIN
      if (user.role === "ADMIN") {
        const adminCount = await User.countDocuments({ role: "ADMIN" });
        if (adminCount <= 1) {
          throw new ValidationError("Cannot delete the last ADMIN user");
        }
      }
      
      // Soft delete or hard delete? Let's soft delete
      user.status = "INACTIVE";
      user.deletedAt = new Date();
      await user.save();
      
      res.status(200).json({
        success: true,
        message: "Admin/HR user deactivated successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// ✅ TOGGLE USER STATUS (ACTIVATE/DEACTIVATE)
// ============================================
router.patch(
  "/users/:userId/toggle-status",
  authenticate,
  authorize("ADMIN"),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      
      // Don't allow toggling your own status
      if (userId === req.user.userId) {
        throw new ValidationError("You cannot change your own status");
      }
      
      const user = await User.findOne({
        _id: userId,
        role: { $in: ["ADMIN", "HR"] },
      });
      
      if (!user) {
        throw new NotFoundError("Admin/HR user not found");
      }
      
      // Toggle status
      user.status = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await user.save();
      
      res.status(200).json({
        success: true,
        message: `User ${user.status === "ACTIVE" ? "activated" : "deactivated"} successfully`,
        data: {
          _id: user._id,
          status: user.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// ✅ RESET PASSWORD FOR ADMIN/HR USER
// ============================================
router.post(
  "/users/:userId/reset-password",
  authenticate,
  authorize("ADMIN"),
  [
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/[A-Z]/)
      .withMessage("Password must contain an uppercase letter")
      .matches(/[a-z]/)
      .withMessage("Password must contain a lowercase letter")
      .matches(/[0-9]/)
      .withMessage("Password must contain a number")
      .matches(/[!@#$%^&*]/)
      .withMessage("Password must contain a special character"),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;
      
      const user = await User.findOne({
        _id: userId,
        role: { $in: ["ADMIN", "HR"] },
      });
      
      if (!user) {
        throw new NotFoundError("Admin/HR user not found");
      }
      
      // Update password
      user.password = newPassword;
      user.isFirstLogin = true;
      await user.save();
      
      // Send password reset email
      try {
        await emailService.sendPasswordResetEmail(user.email, user.username, newPassword);
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
      }
      
      res.status(200).json({
        success: true,
        message: "Password reset successfully. User will be prompted to change password on next login.",
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// ✅ GET ADMIN STATISTICS
// ============================================
router.get(
  "/stats",
  authenticate,
  authorize("ADMIN"),
  async (req, res, next) => {
    try {
      const adminCount = await User.countDocuments({ role: "ADMIN", status: "ACTIVE" });
      const hrCount = await User.countDocuments({ role: "HR", status: "ACTIVE" });
      const inactiveAdminCount = await User.countDocuments({ 
        role: { $in: ["ADMIN", "HR"] }, 
        status: "INACTIVE" 
      });
      
      res.status(200).json({
        success: true,
        data: {
          activeAdmins: adminCount,
          activeHR: hrCount,
          totalActive: adminCount + hrCount,
          inactive: inactiveAdminCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// ✅ UPDATE TRAINER PROFILE (Existing route)
// ============================================
router.put(
  "/:userId",
  authenticate,
  authorize("ADMIN", "HR"),
  [
    // Basic Account Fields
    body("email").optional().isEmail().withMessage("Valid email is required"),
    body("username").optional().isString().notEmpty().withMessage("Username cannot be empty"),
    body("trainerCategory").optional().isIn(["PERMANENT", "CONTRACTED"]).withMessage("Trainer category must be PERMANENT or CONTRACTED"),
    body("status").optional().isIn(["ACTIVE", "INACTIVE", "ON_LEAVE", "SUSPENDED"]).withMessage("Invalid status"),
    
    // Personal Information
    body("profile.firstName").optional().isString().trim(),
    body("profile.lastName").optional().isString().trim(),
    body("profile.phone").optional().isString(),
    body("profile.employeeId").optional().isString(),
    body("profile.dateOfBirth").optional().isDate(),
    body("profile.gender").optional().isIn(["Male", "Female", "Other"]),
    body("profile.bio").optional().isString(),
    
    // Address Information
    body("profile.address").optional().isString(),
    body("profile.city").optional().isString(),
    body("profile.state").optional().isString(),
    body("profile.zipCode").optional().isString(),
    body("profile.country").optional().isString(),
    
    // Professional Information
    body("profile.department").optional().isString(),
    body("profile.designation").optional().isString(),
    body("profile.joiningDate").optional().isDate(),
    
    // Skills
    body("profile.skills").optional().isArray(),
    body("profile.skills.*").optional(),
    
    // University Information
    body("profile.university").optional(),
    body("profile.university.name").optional(),
    body("profile.university.enrollmentId").optional(),
    body("profile.university.joinDate").optional(),
    body("profile.university.completionDate").optional(),
    body("profile.university.status").optional(),
    
    // Portfolio sections
    body("profile.subjects").optional(),
    body("profile.semesterActivities").optional(),
    body("profile.projects").optional(),
    body("profile.qualifications").optional(),
    body("profile.experience").optional(),
    body("profile.certifications").optional(),
    body("profile.placementRecord").optional(),
    
    // Client Information
    body("client.name").optional().isString(),
    body("client.email").optional().isEmail(),
    body("client.phone").optional().isString(),
    body("client.address").optional().isString(),
    body("client.city").optional().isString(),
    body("client.state").optional().isString(),
    body("client.zipCode").optional().isString(),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const updates = req.body;

      // Find the user
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError("Trainer not found");
      }

      // Update basic account fields
      if (updates.email) user.email = updates.email;
      if (updates.username) user.username = updates.username;
      if (updates.trainerCategory) {
        if (user.trainerCategory !== updates.trainerCategory) {
          console.log(`🔄 Trainer category changing from ${user.trainerCategory} to ${updates.trainerCategory}`);
        }
        user.trainerCategory = updates.trainerCategory;
      }
      if (updates.status) user.status = updates.status;

      // Update profile fields
      if (updates.profile) {
        if (!user.profile) user.profile = {};

        const deepMerge = (target, source) => {
          Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
              if (!target[key]) target[key] = {};
              deepMerge(target[key], source[key]);
            } else {
              target[key] = source[key];
            }
          });
        };

        deepMerge(user.profile, updates.profile);

        // Special handling for skills
        if (updates.profile.skills && Array.isArray(updates.profile.skills)) {
          user.profile.skills = [...new Set(
            updates.profile.skills
              .map(skill => skill?.toString().trim())
              .filter(skill => skill && skill.length > 0)
              .slice(0, 50)
          )];
        }
      }

      // Update client information
      if (updates.client) {
        if (!user.profile) user.profile = {};
        if (!user.profile.client) user.profile.client = {};

        Object.keys(updates.client).forEach(key => {
          if (updates.client[key] !== undefined) {
            user.profile.client[key] = updates.client[key];
          }
        });
      }

      user.updatedAt = new Date();
      await user.save();

      // Return updated user
      const updatedUser = await User.findById(userId)
        .select("-password -passwordResetToken -passwordResetExpire -loginAttempts -lockUntil")
        .lean();

      console.log(`✅ Admin/HR ${req.user.userId} updated trainer ${userId} at ${new Date().toISOString()}`);

      res.status(200).json({
        success: true,
        message: "Trainer profile updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("❌ Error updating trainer profile:", error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.name === 'NotFoundError') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      next(error);
    }
  }
);

export default router;