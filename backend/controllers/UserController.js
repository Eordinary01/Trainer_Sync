import { UserService } from "../services/UserService.js";
import { EmailService } from "../services/EmailService.js";
import { Validators } from "../utils/validators.js";

// ✅ Removed duplicate instantiation here
const emailService = new EmailService();

export class UserController {
  constructor() {
    this.userService = new UserService();
  }

  async createTrainer(req, res, next) {
    try {
      const { username, email, profile, trainerCategory } = req.body;

      console.log('🚀 Creating trainer with data:', { username, email, profile, trainerCategory });

      // ✅ Validate required profile fields
      if (!profile?.firstName || !profile?.lastName || !profile?.phone) {
        return res.status(400).json({
          success: false,
          message: "Missing required profile fields: firstName, lastName, and phone are required"
        });
      }

      // ✅ Validate trainer category
      if (!trainerCategory) {
        return res.status(400).json({
          success: false,
          message: "Trainer category is required (PERMANENT or CONTRACTED)"
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
        trainerCategory: trainerCategory || "PERMANENT", 
        profile: {
          ...profile,
          joiningDate: profile.joiningDate || new Date() // Ensure joiningDate is set
        },
        createdBy: req.user?._id, // ✅ Optional chaining
      };

      console.log('💾 Calling service to create trainer...');
      const trainer = await this.userService.createTrainer(trainerData);
      console.log('✅ Trainer created successfully:', trainer._id);

      // ✅ Send email with the SAME password
      try {
        await emailService.sendWelcomeEmail(
          trainer.email,
          trainer.username,
          tempPassword,
          trainer.trainerCategory
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
          trainerCategory: trainer.trainerCategory, // ✅ Added category
          profile: trainer.profile,
          status: trainer.status,
        },
      });
    } catch (error) {
      console.error('❌ Trainer creation failed:', error);
      
      // ✅ Better error handling
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.name === 'ConflictError') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
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
      
      if (error.name === 'NotFoundError') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  }

  async updateProfile(req, res, next) {
    try {
      // Get user ID from params (admin editing) or from authenticated user
      const targetUserId = req.params.userId || req.user.userId;
      
      // Check permission: Users can only edit their own profile unless they are ADMIN/HR
      if (targetUserId !== req.user.userId && !['ADMIN', 'HR'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to edit this profile'
        });
      }

      // Extract allowed fields only
      const { profile } = req.body;
      
      // Define restricted fields that cannot be edited
      const restrictedFields = [
        'employeeId',
        'reportingManager',
        'email',
        'joiningDate',
        'client.name',
        'client.address'
      ];

      // Check if any restricted fields are being updated
      const updateData = { profile: {} };
      
      // Only allow updating firstName, lastName, phone, and skills
      if (profile) {
        if (profile.firstName) updateData.profile.firstName = profile.firstName;
        if (profile.lastName) updateData.profile.lastName = profile.lastName;
        if (profile.phone) updateData.profile.phone = profile.phone;
        
        // Handle skills - ensure it's an array
        if (profile.skills) {
          if (!Array.isArray(profile.skills)) {
            throw new ValidationError('Skills must be an array');
          }
          updateData.profile.skills = profile.skills;
        }

        // Check for any restricted fields in the request
        const hasRestrictedFields = restrictedFields.some(field => {
          const keys = field.split('.');
          let value = profile;
          for (const key of keys) {
            if (!value || !value[key]) return false;
            value = value[key];
          }
          return value !== undefined;
        });

        if (hasRestrictedFields) {
          throw new ValidationError('Cannot modify restricted fields: employeeId, reportingManager, email, joiningDate, client information');
        }
      }

      const updatedUser = await this.userService.updateProfile(targetUserId, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser
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
      console.error("getAllTrainers error:", error);
      next(error);
    }
  }

  async deactivateTrainer(req, res, next) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Trainer ID is required"
        });
      }

      const trainer = await this.userService.deactivateTrainer(id);
      
      res.status(200).json({
        success: true,
        message: "Trainer deactivated successfully",
        data: trainer,
      });
    } catch (error) {
      console.error("deactivateTrainer error:", error);
      
      if (error.name === 'NotFoundError') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      next(error);
    }
  }

  async activateTrainer(req, res, next) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Trainer ID is required"
        });
      }

      const trainer = await this.userService.activateTrainer(id);
      
      res.status(200).json({
        success: true,
        message: "Trainer activated successfully",
        data: trainer,
      });
    } catch (error) {
      console.error("activateTrainer error:", error);
      
      if (error.name === 'NotFoundError') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      next(error);
    }
  }

  async bulkImport(req, res, next) {
    try {
      const { trainers } = req.body;
      
      if (!trainers || !Array.isArray(trainers) || trainers.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Trainers array is required and cannot be empty"
        });
      }

      const result = await this.userService.bulkImportTrainers(trainers);
      
      res.status(200).json({
        success: true,
        message: `Bulk import completed. Created: ${result.created}, Failed: ${result.failed}`,
        data: result,
      });
    } catch (error) {
      console.error("bulkImport error:", error);
      next(error);
    }
  }

  async searchTrainers(req, res, next) {
    try {
      const { q } = req.query;
      
      if (!q || q.trim() === '') {
        return res.status(400).json({
          success: false,
          message: "Search query is required"
        });
      }

      const result = await this.userService.searchTrainers(q.trim());
      
      res.status(200).json({ 
        success: true, 
        data: result 
      });
    } catch (error) {
      console.error("searchTrainers error:", error);
      next(error);
    }
  }
  async getTotalTrainersCount(req, res, next) {
  try {
    const count = await this.userService.getTotalTrainersCount();
    
    res.json({
      success: true,
      data: { count },
      message: 'Total trainers count fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching total trainers count:', error);
    next(error);
  }
}

  async getUsersCountByRole(req, res, next) {
  try {
    const { role, status } = req.query;
    
    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role parameter is required"
      });
    }

    const count = await this.userService.getUsersCountByRole(role, status);
    
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