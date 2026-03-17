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
    const isAdminOrHR = ['ADMIN', 'HR'].includes(req.user.role);
    
    // Check permission: Users can only edit their own profile unless they are ADMIN/HR
    if (targetUserId !== req.user.userId && !isAdminOrHR) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this profile'
      });
    }

    // Extract profile data from request body
    const { profile } = req.body;
    
    if (!profile) {
      return res.status(400).json({
        success: false,
        message: 'No profile data provided'
      });
    }

    // ============================================
    // DEFINE RESTRICTED FIELDS BY ROLE
    // ============================================
    
    // Fields that NO ONE can edit (system-managed)
    const systemManagedFields = [
      'employeeId',
      'email',
      'role',
      'trainerCategory',
      'leaveBalance',
      'leaveHistory',
      'createdBy',
      'createdAt',
      'updatedAt',
      'loginAttempts',
      'lockUntil',
      'passwordResetToken',
      'passwordResetExpire'
    ];

    // Fields that ONLY ADMIN/HR can edit (full portfolio control)
    const adminOnlyFields = [
      // Professional info
      'department',
      'designation',
      'reportingManager',
      'status',
      'joiningDate',
      
      // Client info
      'client',
      'client.name',
      'client.address',
      'client.email',
      'client.phone',
      'client.city',
      'client.state',
      'client.zipCode',
      
      // University info (FULL control)
      'university',
      'university.name',
      'university.enrollmentId',
      'university.joinDate',
      'university.completionDate',
      'university.status',
      
      // Academic portfolio (TRAINERS CANNOT EDIT THESE)
      'subjects',
      'semesterActivities',
      'projects',
      'qualifications',
      'experience',
      'certifications',
      
      // Placement records
      'placementRecord',
      
      // Subordinates
      'subordinates'
    ];

    // Fields that TRAINERS can edit (basic personal info ONLY)
    const trainerEditableFields = [
      'firstName',
      'lastName',
      'phone',
      'dateOfBirth',
      'gender',
      'address',
      'city',
      'state',
      'zipCode',
      'country',
      'bio',
      'skills',  // Skills array - ENTIRE array is allowed
      'avatar'
    ];

    // ============================================
    // VALIDATE RESTRICTED FIELDS
    // ============================================
    
    const updateData = { profile: {} };
    const errors = [];

    // Check for system-managed fields (no one can edit)
    const checkSystemFields = (obj, path = '') => {
      if (!obj || typeof obj !== 'object') return;
      
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        const currentPath = path ? `${path}.${key}` : key;
        
        if (systemManagedFields.includes(currentPath)) {
          errors.push(`Cannot modify system-managed field: ${currentPath}`);
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          checkSystemFields(value, currentPath);
        }
      });
    };
    checkSystemFields(profile);

    // For regular users (trainers), check against admin-only fields
    if (!isAdminOrHR) {
      const checkAdminOnlyFields = (obj, path = '') => {
        if (!obj || typeof obj !== 'object') return;
        
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          const currentPath = path ? `${path}.${key}` : key;
          
          // Check if this exact path is admin-only
          if (adminOnlyFields.includes(currentPath)) {
            errors.push(`Cannot modify field: ${currentPath}. Only Admin/HR can update this.`);
          }
          // Check if this path starts with any admin-only field
          else if (adminOnlyFields.some(field => currentPath.startsWith(field + '.'))) {
            errors.push(`Cannot modify field: ${currentPath}. Only Admin/HR can update this.`);
          }
          // Special case: skills array elements should be allowed
          else if (currentPath.startsWith('skills.') && !isNaN(key)) {
            // This is a skill array element - ALLOWED (trainers can edit skills)
            return;
          }
          // Recursively check nested objects (but skip arrays)
          else if (value && typeof value === 'object' && !Array.isArray(value)) {
            checkAdminOnlyFields(value, currentPath);
          }
        });
      };
      
      checkAdminOnlyFields(profile);
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Profile update contains restricted fields',
        errors
      });
    }

    // ============================================
    // BUILD UPDATE DATA BASED ON ROLE
    // ============================================
    
    const buildUpdateData = (obj, target, path = '') => {
      if (!obj || typeof obj !== 'object') return;
      
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        const currentPath = path ? `${path}.${key}` : key;
        
        if (value === undefined) return;
        
        // Skip system-managed fields
        if (systemManagedFields.includes(currentPath)) return;
        
        // For non-admin users, skip admin-only fields
        if (!isAdminOrHR) {
          // Check if this exact path is admin-only
          if (adminOnlyFields.includes(currentPath)) return;
          
          // Check if this path starts with any admin-only field
          if (adminOnlyFields.some(field => currentPath.startsWith(field + '.'))) return;
        }
        
        // Handle nested objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          if (!target[key]) target[key] = {};
          buildUpdateData(value, target[key], currentPath);
        } 
        // Handle arrays
        else if (Array.isArray(value)) {
          // For admin, allow full array updates
          if (isAdminOrHR) {
            target[key] = value;
          }
          // For trainers, only allow skills array
          else if (key === 'skills') {
            // Clean and validate skills
            const cleanedSkills = [...new Set(
              value
                .map(skill => skill?.toString().trim())
                .filter(skill => skill && skill.length > 0)
                .slice(0, 20)
            )];
            target[key] = cleanedSkills;
          }
          // For other arrays, trainers cannot update them
        }
        // Handle primitive values
        else {
          target[key] = value;
        }
      });
    };

    // Build the update data
    buildUpdateData(profile, updateData.profile);

    // ============================================
    // ADD AUDIT INFORMATION
    // ============================================
    
    updateData.metadata = {
      updatedBy: req.user.userId,
      updatedByRole: req.user.role,
      updatedAt: new Date()
    };

    if (targetUserId !== req.user.userId) {
      console.log(`👑 ${req.user.role} ${req.user.userId} updating profile of user ${targetUserId}`);
      updateData.metadata.adminAction = true;
    }

    // ============================================
    // CALL SERVICE TO UPDATE PROFILE
    // ============================================
    
    const updatedUser = await this.userService.updateProfile(targetUserId, updateData);
    
    console.log(`✅ Profile updated successfully for user: ${targetUserId}`);
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('❌ Error in updateProfile controller:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: error.errors
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


  

// ✅ Get portfolio summary
async getPortfolioSummary(req, res, next) {
  try {
    const userId = req.params.userId || req.user.userId;
    
    // Check permission
    if (userId !== req.user.userId && !['ADMIN', 'HR'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this portfolio'
      });
    }

    const summary = await this.userService.getPortfolioSummary(userId);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
}

// ✅ Add subject
async addSubject(req, res, next) {
  try {
    const userId = req.params.userId || req.user.userId;
    
    // Check permission (only self or admin/hr)
    if (userId !== req.user.userId && !['ADMIN', 'HR'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this portfolio'
      });
    }

    const subject = await this.userService.addSubject(userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Subject added successfully',
      data: subject
    });
  } catch (error) {
    next(error);
  }
}

// ✅ Add project
async addProject(req, res, next) {
  try {
    const userId = req.params.userId || req.user.userId;
    
    if (userId !== req.user.userId && !['ADMIN', 'HR'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this portfolio'
      });
    }

    const project = await this.userService.addProject(userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Project added successfully',
      data: project
    });
  } catch (error) {
    next(error);
  }
}

// ✅ Add qualification
async addQualification(req, res, next) {
  try {
    const userId = req.params.userId || req.user.userId;
    
    if (userId !== req.user.userId && !['ADMIN', 'HR'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this portfolio'
      });
    }

    const qualification = await this.userService.addQualification(userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Qualification added successfully',
      data: qualification
    });
  } catch (error) {
    next(error);
  }
}

// ✅ Update placement record (Admin/HR only)
async updatePlacementRecord(req, res, next) {
  try {
    const userId = req.params.userId;
    
    // Only admin/hr can update placement records
    if (!['ADMIN', 'HR'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only Admin/HR can update placement records'
      });
    }

    const placement = await this.userService.updatePlacementRecord(userId, req.body);

    res.status(200).json({
      success: true,
      message: 'Placement record updated successfully',
      data: placement
    });
  } catch (error) {
    next(error);
  }
}

// ✅ Get trainers by skill
async getTrainersBySkill(req, res, next) {
  try {
    const { skill } = req.query;
    const limit = parseInt(req.query.limit) || 10;

    if (!skill) {
      return res.status(400).json({
        success: false,
        message: 'Skill parameter is required'
      });
    }

    const trainers = await this.userService.getTrainersBySkill(skill, limit);

    res.status(200).json({
      success: true,
      data: trainers
    });
  } catch (error) {
    next(error);
  }
}

// ✅ Get placement statistics
async getPlacementStatistics(req, res, next) {
  try {
    const { year } = req.query;
    
    // Only admin/hr can view statistics
    if (!['ADMIN', 'HR'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only Admin/HR can view placement statistics'
      });
    }

    const stats = await this.userService.getPlacementStatistics(year ? parseInt(year) : null);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
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