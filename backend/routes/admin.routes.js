import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validateRequest, createAdminValidation } from '../middleware/validator.middleware.js';
import User from '../models/User.model.js';
import { EmailService } from '../services/EmailService.js';
import { ConflictError, ValidationError, NotFoundError } from '../utils/errorHandler.js';

const router = express.Router();
const emailService = new EmailService();


router.post(
  '/create-admin',
  authenticate,
  authorize('ADMIN'),
  createAdminValidation,
  validateRequest,
  async (req, res, next) => {
    try {
      const {
        username,
        email,
        password,
        role,
        profile
      } = req.body;

      // Validate role (only ADMIN or HR)
      if (!['ADMIN', 'HR'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message: 'Role must be ADMIN or HR'
          }
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        throw new ConflictError('Email or username already exists');
      }

      // Create new admin/hr user
      const newUser = new User({
        username,
        email,
        password,
        role,
        profile: {
          firstName: profile?.firstName || '',
          lastName: profile?.lastName || '',
          phone: profile?.phone || '',
          employeeId: profile?.employeeId || '',
          joiningDate: new Date(),
        },
        status: 'ACTIVE',
        // ✅ HR-SPECIFIC: Leave balance handled in pre('validate') hook
        // No need to set leaveBalance here - model handles it
      });

      await newUser.save();

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(
          email,
          username,
          password
        );
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
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
          isUnlimited: true
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

export default router;