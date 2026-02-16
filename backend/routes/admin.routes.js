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
    body("email").optional().isEmail().withMessage("Valid email is required"),
    body("username")
      .optional()
      .isString()
      .notEmpty()
      .withMessage("Username cannot be empty"),
    body("profile.firstName").optional().isString().trim(),
    body("profile.lastName").optional().isString().trim(),
    body("profile.phone").optional().isString(),
    body("profile.employeeId").optional().isString(),
    body("profile.department").optional().isString(),
    body("profile.designation").optional().isString(),
    body("profile.qualification").optional().isString(),
    body("profile.experience").optional().isInt({ min: 0 }),
    body("profile.bio").optional().isString(),
    body("profile.gender").optional().isIn(["Male", "Female", "Other"]),
    body("profile.dateOfBirth").optional().isDate(),
    body("profile.address").optional().isString(),
    body("profile.city").optional().isString(),
    body("profile.state").optional().isString(),
    body("profile.zipCode").optional().isString(),
    body("profile.country").optional().isString(),
    body("client.name").optional().isString(),
    body("client.email").optional().isEmail(),
    body("client.phone").optional().isString(),
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

      // Check if user is a trainer
      if (user.role !== "TRAINER") {
        throw new ValidationError("User is not a trainer");
      }

      // Update basic fields
      if (updates.email) user.email = updates.email;
      if (updates.username) user.username = updates.username;

      // Update profile fields
      if (updates.profile) {
        // Initialize profile if it doesn't exist
        if (!user.profile) user.profile = {};

        // Map profile fields
        const profileFields = [
          "firstName",
          "lastName",
          "phone",
          "employeeId",
          "department",
          "designation",
          "qualification",
          "experience",
          "bio",
          "gender",
          "dateOfBirth",
          "address",
          "city",
          "state",
          "zipCode",
          "country",
        ];

        profileFields.forEach((field) => {
          if (updates.profile[field] !== undefined) {
            user.profile[field] = updates.profile[field];
          }
        });
      }

      // Update client information
      if (updates.client) {
        if (!user.profile) user.profile = {};
        if (!user.profile.client) user.profile.client = {};

        const clientFields = ["name", "email", "phone"];
        clientFields.forEach((field) => {
          if (updates.client[field] !== undefined) {
            user.profile.client[field] = updates.client[field];
          }
        });
      }

      user.updatedAt = new Date();
      await user.save();

      // Return updated user without sensitive data
      const updatedUser = await User.findById(userId)
        .select(
          "-password -passwordResetToken -passwordResetExpire -loginAttempts -lockUntil",
        )
        .lean();

      res.status(200).json({
        success: true,
        message: "Trainer profile updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
