import { UserService } from '../services/UserService.js';
import { EmailService } from '../services/EmailService.js';

const userService = new UserService();
const emailService = new EmailService();

export class UserController {
  async createTrainer(req, res, next) {
    try {
      const { username, email, profile } = req.body;
      
      // Generate a temporary password
      const tempPassword = this.generateTempPassword();
      
      // Create trainer with TRAINER role
      const trainerData = {
        username,
        email,
        password: tempPassword,
        role: 'TRAINER',
        profile,
        createdBy: req.user._id // Track who created this trainer
      };

      const trainer = await userService.createTrainer(trainerData);
      
      // Send welcome email with temporary password
      try {
        await emailService.sendWelcomeEmail(
          trainer.email,
          trainer.username,
          tempPassword
        );
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the request if email fails
      }

      res.status(201).json({
        success: true,
        message: 'Trainer created successfully',
        data: {
          _id: trainer._id,
          username: trainer.username,
          email: trainer.email,
          role: trainer.role,
          profile: trainer.profile,
          status: trainer.status
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const userId = req.params.id || req.user.userId;
      const profile = await userService.getTrainerProfile(userId);
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const userId = req.params.id || req.user.userId;
      const updated = await userService.updateTrainerProfile(userId, req.body);
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllTrainers(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {
        status: req.query.status,
        search: req.query.search,
      };
      const result = await userService.getAllTrainers(filters, page, limit);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deactivateTrainer(req, res, next) {
    try {
      const { id } = req.params;
      const trainer = await userService.deactivateTrainer(id);
      res.status(200).json({
        success: true,
        message: 'Trainer deactivated successfully',
        data: trainer,
      });
    } catch (error) {
      next(error);
    }
  }

  async activateTrainer(req, res, next) {
    try {
      const { id } = req.params;
      const trainer = await userService.activateTrainer(id);
      res.status(200).json({
        success: true,
        message: 'Trainer activated successfully',
        data: trainer,
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkImport(req, res, next) {
    try {
      const { trainers } = req.body;
      const result = await userService.bulkImportTrainers(trainers);
      res.status(200).json({
        success: true,
        message: 'Bulk import completed',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async searchTrainers(req, res, next) {
    try {
      const { q } = req.query;
      const result = await userService.searchTrainers(q);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Helper method to generate temporary password
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