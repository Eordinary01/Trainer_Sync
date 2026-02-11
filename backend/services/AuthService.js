import User from '../models/User.model.js';
import { JWTHelper } from '../utils/jwt.js';
import { Validators } from '../utils/validators.js';
import { Encryption } from '../utils/encryption.js';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../utils/errorHandler.js';
import { TRAINER_CATEGORY, LEAVE_CONFIG } from '../config/constant.js';
import { LeaveService } from './LeaveService.js'; // Import LeaveService

export class AuthService {
  constructor() {
    this.leaveService = new LeaveService(); // Initialize LeaveService
  }

  async register(username, email, password, role = 'TRAINER', profile = {}, trainerCategory = 'PERMANENT') {
    console.log('🚀 AuthService.register called with:', { username, email, role, trainerCategory });
    
    // ✅ Validate email
    if (!Validators.validateEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    // ✅ Validate password
    const passwordValidation = Validators.validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new ValidationError('Password does not meet requirements');
    }

    // ✅ Validate trainer category if registering as trainer
    if (role === 'TRAINER') {
      if (!Object.values(TRAINER_CATEGORY).includes(trainerCategory)) {
        throw new ValidationError(`Invalid trainer category. Must be ${Object.values(TRAINER_CATEGORY).join(' or ')}`);
      }
    }

    // ✅ Check for existing user
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      throw new ConflictError('Email or username already exists');
    }

    // ✅ Create user with minimal initial leave balance
    const user = new User({
      username,
      email,
      password,
      role,
      trainerCategory: role === 'TRAINER' ? trainerCategory : undefined,
      profile,
      // ✅ Leave balance will be initialized separately after user creation
      leaveBalance: {
        sick: { available: 0, used: 0, carryForward: 0 },
        casual: { available: 0, used: 0, carryForward: 0 },
        paid: { available: Infinity, used: 0, carryForward: 0 },
        lastUpdated: new Date(),
        lastIncrementDate: new Date(),
        lastRolloverDate: null,
      },
      isFirstLogin: true, // ✅ Must change password on first login
    });

    await user.save();
    console.log(`✅ User created successfully: ${user._id}`);

    // ✅ Initialize proper leave balance based on category (for trainers only)
    if (role === 'TRAINER') {
      try {
        await this.leaveService.initializeLeaveBalance(user._id, trainerCategory);
        console.log(`✅ Leave balance initialized for trainer: ${user._id} (${trainerCategory})`);
      } catch (leaveError) {
        console.error(`❌ Failed to initialize leave balance for ${user._id}:`, leaveError);
        // Don't fail registration if leave initialization fails
      }
    }

    return user.toJSON();
  }

  async login(username, password) {
    console.log('🔐 Login attempt for:', username);
    
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    }).select('+password +isFirstLogin');

    console.log('👤 User found:', user ? 'Yes' : 'No');
    console.log('📧 User email:', user?.email);
    console.log('👤 User username:', user?.username);
    console.log('🏷️ User role:', user?.role);
    console.log('📊 User category:', user?.trainerCategory);

    if (!user) {
      console.log('❌ User not found');
      throw new AuthenticationError('Invalid credentials');
    }

    console.log('🔒 Account locked:', user.isLocked());
    if (user.isLocked()) {
      throw new AuthenticationError('Account is locked. Please contact administrator.');
    }

    console.log('🔑 Comparing password...');
    const isPasswordValid = await user.comparePassword(password);
    console.log('✅ Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ Password invalid, incrementing login attempts');
      await user.incLoginAttempts();
      
      // Check if account should be locked
      if (user.loginAttempts >= 5) {
        user.lockAccount();
        await user.save();
        throw new AuthenticationError('Account locked due to too many failed attempts. Please contact administrator.');
      }
      
      await user.save();
      throw new AuthenticationError('Invalid credentials');
    }

    console.log('✅ Login successful, resetting login attempts');
    await user.resetLoginAttempts();
    
    // ✅ Check and auto-increment leaves for PERMANENT trainers
    if (user.role === 'TRAINER' && user.trainerCategory === 'PERMANENT') {
      try {
        // Check if 30 days have passed since last increment
        const now = new Date();
        const lastIncrement = user.leaveBalance?.lastIncrementDate || user.createdAt;
        const daysSinceLastIncrement = Math.floor(
          (now - new Date(lastIncrement)) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceLastIncrement >= 30) {
          console.log(`🔄 Auto-incrementing leaves for trainer ${user._id} (${daysSinceLastIncrement} days since last increment)`);
          await this.leaveService.incrementMonthlyLeaves(user._id);
        }
      } catch (incrementError) {
        console.error(`❌ Failed to auto-increment leaves for ${user._id}:`, incrementError);
        // Don't fail login if auto-increment fails
      }
    }

    // ✅ Include isFirstLogin and trainerCategory in Token
    const token = JWTHelper.generateToken(
      user._id, 
      user.role, 
      user.isFirstLogin,
      user.trainerCategory // ✅ Include trainer category in token
    );
    const refreshToken = JWTHelper.generateRefreshToken(user._id);

    return {
      user: user.toJSON(),
      token,
      refreshToken,
      isFirstLogin: user.isFirstLogin,
      trainerCategory: user.trainerCategory,
      expiresIn: '24h',
    };
  }

  async refreshToken(refreshToken) {
    const decoded = JWTHelper.verifyToken(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // ✅ Include isFirstLogin and trainerCategory in new token
    const newToken = JWTHelper.generateToken(
      user._id, 
      user.role, 
      user.isFirstLogin,
      user.trainerCategory
    );
    
    return { 
      token: newToken, 
      expiresIn: '24h',
      isFirstLogin: user.isFirstLogin,
      trainerCategory: user.trainerCategory
    };
  }

  async requestPasswordReset(email) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // ✅ Check if account is locked
    if (user.isLocked()) {
      throw new AuthenticationError('Account is locked. Please contact administrator.');
    }

    const { token, hash } = Encryption.generatePasswordResetToken();
    user.passwordResetToken = hash;
    user.passwordResetExpire = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    await user.save();

    // ✅ Return user details for email template
    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        name: user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim() : user.username
      }
    };
  }

  async resetPassword(token, newPassword) {
    const hashedToken = Encryption.hashToken(token);
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpire: { $gt: Date.now() },
    });

    if (!user) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    // ✅ Check if account is locked
    if (user.isLocked()) {
      throw new AuthenticationError('Account is locked. Please contact administrator.');
    }

    const passwordValidation = Validators.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError('Password does not meet requirements');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    user.isFirstLogin = false; // ✅ Reset isFirstLogin flag
    await user.save();

    return { 
      message: 'Password reset successful',
      user: {
        id: user._id,
        email: user.email,
        username: user.username
      }
    };
  }

  async changePassword(userId, oldPassword, newPassword) {
    console.log('🔐 CHANGE PASSWORD DEBUG START ==========');
    console.log('📝 Input - User ID:', userId);
    console.log('📝 Input - Old Password:', oldPassword ? '***' : 'NOT PROVIDED');
    console.log('📝 Input - New Password:', newPassword ? '***' : 'NOT PROVIDED');

    // ✅ Add better error handling for user lookup
    let user;
    try {
      user = await User.findById(userId).select('+password +isFirstLogin');
      console.log('👤 User found:', user ? `Yes (${user.email})` : 'No');
      console.log('🔒 Account locked:', user?.isLocked ? user.isLocked() : 'N/A');
    } catch (error) {
      console.error('❌ Error finding user:', error);
      throw new NotFoundError('Error finding user');
    }
    
    if (!user) {
      console.log('❌ User not found with ID:', userId);
      throw new NotFoundError('User not found');
    }

    // ✅ Check if account is locked
    if (user.isLocked()) {
      throw new AuthenticationError('Account is locked. Please contact administrator.');
    }

    console.log('🔑 Verifying old password...');
    const isPasswordValid = await user.comparePassword(oldPassword);
    console.log('✅ Old password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      // Increment login attempts for failed password change
      await user.incLoginAttempts();
      await user.save();
      
      if (user.loginAttempts >= 5) {
        user.lockAccount();
        await user.save();
        throw new AuthenticationError('Account locked due to too many failed attempts.');
      }
      
      throw new AuthenticationError('Current password is incorrect');
    }

    console.log('📋 Validating new password...');
    const passwordValidation = Validators.validatePassword(newPassword);
    console.log('✅ New password valid:', passwordValidation.isValid);
    
    if (!passwordValidation.isValid) {
      throw new ValidationError('New password does not meet requirements');
    }

    // ✅ Check if new password is same as old password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      throw new ValidationError('New password cannot be the same as old password');
    }

    console.log('💾 Saving new password...');
    console.log('📝 Before - isFirstLogin:', user.isFirstLogin);
    
    user.password = newPassword;
    user.isFirstLogin = false; // ✅ Set to false after password change
    await user.resetLoginAttempts(); // ✅ Reset login attempts on successful password change
    
    console.log('📝 After - isFirstLogin:', user.isFirstLogin);
    
    await user.save();
    console.log('✅ User saved successfully');

    console.log('🔐 CHANGE PASSWORD DEBUG END ==========');

    return { 
      message: 'Password changed successfully',
      isFirstLogin: false // ✅ Confirm that isFirstLogin is now false
    };
  }

  async verifyToken(token) {
    const decoded = JWTHelper.verifyToken(token);
    
    // ✅ Check if user still exists and is active
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }
    
    if (user.status !== 'ACTIVE') {
      throw new AuthenticationError('Account is not active');
    }
    
    if (user.isLocked()) {
      throw new AuthenticationError('Account is locked');
    }
    
    return {
      ...decoded,
      user: {
        id: user._id,
        role: user.role,
        isFirstLogin: user.isFirstLogin,
        trainerCategory: user.trainerCategory,
        email: user.email,
        username: user.username
      }
    };
  }

  // ✅ NEW: Unlock user account (Admin only)
  async unlockAccount(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    user.unlockAccount();
    await user.save();
    
    return { 
      message: 'Account unlocked successfully',
      user: {
        id: user._id,
        email: user.email,
        username: user.username
      }
    };
  }

  // ✅ NEW: Get login attempts info
  async getLoginAttempts(userId) {
    const user = await User.findById(userId).select('+loginAttempts +lockUntil');
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    return {
      loginAttempts: user.loginAttempts || 0,
      isLocked: user.isLocked(),
      lockUntil: user.lockUntil,
      remainingAttempts: Math.max(0, 5 - (user.loginAttempts || 0))
    };
  }
}