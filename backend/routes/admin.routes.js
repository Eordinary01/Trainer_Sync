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
} from "../utils/errorHandler.js";
import { body } from "express-validator";

const router = express.Router();
const emailService = new EmailService();

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
        // ✅ HR-SPECIFIC: Leave balance handled in pre('validate') hook
        // No need to set leaveBalance here - model handles it
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
          // ✅ HR-SPECIFIC: Include leave balance with unlimited flag
          leaveBalance: newUser.leaveBalance,
          isUnlimited: true,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);


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
    
    // Skills - Make this more flexible
    body("profile.skills").optional().isArray().withMessage("Skills must be an array"),
    body("profile.skills.*").optional(),
    
    // University Information - Make optional and flexible
    body("profile.university").optional(),
    body("profile.university.name").optional(),
    body("profile.university.enrollmentId").optional(),
    body("profile.university.joinDate").optional(),
    body("profile.university.completionDate").optional(),
    body("profile.university.status").optional(),
    
    // Subjects - Make completely optional and flexible
    body("profile.subjects").optional(),
    
    // Semester Activities - Make completely optional and flexible
    body("profile.semesterActivities").optional(),
    
    // Projects - Make completely optional and flexible
    body("profile.projects").optional(),
    
    // Qualifications - Make completely optional and flexible
    body("profile.qualifications").optional(),
    
    // Experience - Make completely optional and flexible
    body("profile.experience").optional(),
    
    // Certifications - Make completely optional and flexible
    body("profile.certifications").optional(),
    
    // Placement Record - Make completely optional and flexible
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

      // ============================================
      // UPDATE BASIC ACCOUNT FIELDS
      // ============================================
      if (updates.email) user.email = updates.email;
      if (updates.username) user.username = updates.username;
      if (updates.trainerCategory) {
        // If category changes, leave balance might need reinitialization
        if (user.trainerCategory !== updates.trainerCategory) {
          console.log(`🔄 Trainer category changing from ${user.trainerCategory} to ${updates.trainerCategory}`);
          // The service layer will handle leave balance reinitialization
        }
        user.trainerCategory = updates.trainerCategory;
      }
      if (updates.status) user.status = updates.status;

      // ============================================
      // UPDATE PROFILE FIELDS
      // ============================================
      if (updates.profile) {
        // Initialize profile if it doesn't exist
        if (!user.profile) user.profile = {};

        // Helper function to deep merge objects
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

        // Special handling for skills (if present)
        if (updates.profile.skills && Array.isArray(updates.profile.skills)) {
          // Clean skills: trim, remove empty, remove duplicates
          user.profile.skills = [...new Set(
            updates.profile.skills
              .map(skill => skill?.toString().trim())
              .filter(skill => skill && skill.length > 0)
              .slice(0, 50)
          )];
        }
      }

      // ============================================
      // UPDATE CLIENT INFORMATION
      // ============================================
      if (updates.client) {
        if (!user.profile) user.profile = {};
        if (!user.profile.client) user.profile.client = {};

        Object.keys(updates.client).forEach(key => {
          if (updates.client[key] !== undefined) {
            user.profile.client[key] = updates.client[key];
          }
        });
      }

      // Update timestamp
      user.updatedAt = new Date();
      
      // Save the user
      await user.save();

      // Return updated user without sensitive data
      const updatedUser = await User.findById(userId)
        .select("-password -passwordResetToken -passwordResetExpire -loginAttempts -lockUntil")
        .lean();

      // Log the update for audit trail
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
  },
);

export default router;
