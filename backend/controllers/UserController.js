import { UserService } from "../services/UserService.js";
import { EmailService } from "../services/EmailService.js";
import { Validators } from "../utils/validators.js";

const userService = new UserService();
const emailService = new EmailService();

export class UserController {
  constructor() {
    this.userService = new UserService();
  }

  async createTrainer(req, res, next) {
    try {
      const { username, email, profile } = req.body;

      console.log('🚀 Creating trainer with data:', { username, email, profile });

      // ✅ Validate required profile fields
      if (!profile?.firstName || !profile?.lastName || !profile?.phone) {
        return res.status(400).json({
          success: false,
          message: "Missing required profile fields: firstName, lastName, and phone are required"
        });
      }

      // ✅ Generate temporary password that meets requirements
      const tempPassword = this.generateValidTempPassword();

      // ✅ Validate the generated password meets requirements
      const passwordValidation = Validators.validatePassword(tempPassword);
      if (!passwordValidation.isValid) {
        console.error('❌ Generated password invalid:', passwordValidation.errors);
        return res.status(400).json({
          success: false,
          message: "Generated password doesn't meet requirements",
          errors: passwordValidation.errors
        });
      }

      const trainerData = {
        username,
        email,
        password: tempPassword,
        role: "TRAINER",
        profile: {
          ...profile,
          joiningDate: profile.joiningDate || new Date() // Ensure joiningDate is set
        },
        createdBy: req.user._id,
      };

      console.log('💾 Calling service to create trainer...');
      const trainer = await this.userService.createTrainer(trainerData);
      console.log('✅ Trainer created successfully:', trainer._id);

      // ✅ Send email with the SAME password
      try {
        await emailService.sendWelcomeEmail(
          trainer.email,
          trainer.username,
          tempPassword
        );
        console.log('📧 Welcome email sent successfully');
      } catch (emailError) {
        console.error("❌ Failed to send welcome email:", emailError);
        // Don't break flow if email fails
      }

      res.status(201).json({
        success: true,
        message: "Trainer created successfully",
        data: {
          _id: trainer._id,
          username: trainer.username,
          email: trainer.email,
          role: trainer.role,
          profile: trainer.profile,
          status: trainer.status,
        },
      });
    } catch (error) {
      console.error('❌ Trainer creation failed:', error);
      next(error);
    }
  }


  async getProfile(req, res, next) {
    try {
      const userId = req.params.id;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required"
        });
      }
      const profile = await this.userService.getUserProfile(userId);
      res.status(200).json({ success: true, data: profile });
    } catch (error) {
      console.error("getProfile error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  async updateProfile(req, res, next) {
    try {
      const userId = req.params.id || req.user.userId;
      const updated = await this.userService.updateTrainerProfile(userId, req.body);
      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
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
      const result = await this.userService.getAllTrainers(filters, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deactivateTrainer(req, res, next) {
    try {
      const { id } = req.params;
      const trainer = await this.userService.deactivateTrainer(id);
      res.status(200).json({
        success: true,
        message: "Trainer deactivated successfully",
        data: trainer,
      });
    } catch (error) {
      next(error);
    }
  }

  async activateTrainer(req, res, next) {
    try {
      const { id } = req.params;
      const trainer = await this.userService.activateTrainer(id);
      res.status(200).json({
        success: true,
        message: "Trainer activated successfully",
        data: trainer,
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkImport(req, res, next) {
    try {
      const { trainers } = req.body;
      const result = await this.userService.bulkImportTrainers(trainers);
      res.status(200).json({
        success: true,
        message: "Bulk import completed",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async searchTrainers(req, res, next) {
    try {
      const { q } = req.query;
      const result = await this.userService.searchTrainers(q);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getUsersCountByRole(req, res, next) {
    try {
      const { role } = req.query;
      const count = await this.userService.getUsersCountByRole(role);

      res.json({
        success: true,
        data: { count },
        message: 'Users count fetched successfully'
      });
    } catch (error) {
      console.error('Error fetching users count:', error);
      next(error);
    }
  }

  async getActiveTrainersCount(req, res, next) {
    try {
      const count = await this.userService.getActiveTrainersCount();

      res.json({
        success: true,
        data: { count },
        message: 'Active trainers count fetched successfully'
      });
    } catch (error) {
      console.error('Error fetching active trainers count:', error);
      next(error);
    }
  }

  // ✅ Single Password Generator
  generateValidTempPassword() {
    const length = 12;
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*";
    
    // Ensure at least one of each required character type
    let password = "";
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += symbols.charAt(Math.floor(Math.random() * symbols.length));
    
    // Fill the rest randomly
    const allChars = lowercase + uppercase + numbers + symbols;
    for (let i = password.length; i < length; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // Shuffle the password
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    console.log('🔑 Generated password meets requirements');
    return password;
  }
}