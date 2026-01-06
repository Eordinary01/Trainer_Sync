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
import { DEFAULT_LEAVE_BALANCE } from '../config/constant.js';

export class AuthService {
   async register(username, email, password, role = 'TRAINER', profile = {}) {
    if (!Validators.validateEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    const passwordValidation = Validators.validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new ValidationError('Password does not meet requirements');
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      throw new ConflictError('Email or username already exists');
    }

    const user = new User({
      username,
      email,
      password,
      role,
      profile,
      leaveBalance: DEFAULT_LEAVE_BALANCE,
      isFirstLogin: true, // ✅ Must change password on first login
    });

    await user.save();
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

  if (!user) {
    console.log('❌ User not found');
    throw new AuthenticationError('Invalid credentials');
  }

  console.log('🔒 Account locked:', user.isLocked());
  if (user.isLocked()) throw new AuthenticationError('Account is locked.');

  console.log('🔑 Comparing password...');
  const isPasswordValid = await user.comparePassword(password);
  console.log('✅ Password valid:', isPasswordValid);

  if (!isPasswordValid) {
    console.log('❌ Password invalid, incrementing login attempts');
    await user.incLoginAttempts(); // ✅ FIXED: Correct method name
    throw new AuthenticationError('Invalid credentials');
  }

  console.log('✅ Login successful, resetting login attempts');
  await user.resetLoginAttempts(); // ✅ FIXED: Correct method name

  // ✅ Include isFirstLogin in Token
  const token = JWTHelper.generateToken(user._id, user.role, user.isFirstLogin);
  const refreshToken = JWTHelper.generateRefreshToken(user._id);

  return {
    user: user.toJSON(),
    token,
    refreshToken,
    isFirstLogin: user.isFirstLogin,
    expiresIn: '24h',
  };
}

  async refreshToken(refreshToken) {
    const decoded = JWTHelper.verifyToken(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const newToken = JWTHelper.generateToken(user._id, user.role);
    return { token: newToken, expiresIn: '24h' };
  }

  async requestPasswordReset(email) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const { token, hash } = Encryption.generatePasswordResetToken();
    user.passwordResetToken = hash;
    user.passwordResetExpire = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    await user.save();

    return token;
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

    const passwordValidation = Validators.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError('Password does not meet requirements');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    await user.save();

    return { message: 'Password reset successful' };
  }

  async changePassword(userId, oldPassword, newPassword) {
  console.log('🔐 CHANGE PASSWORD DEBUG START ==========');
  console.log('📝 Input - User ID:', userId);
  console.log('📝 Input - User ID type:', typeof userId);
  console.log('📝 Input - Old Password:', oldPassword ? '***' : 'NOT PROVIDED');
  console.log('📝 Input - New Password:', newPassword ? '***' : 'NOT PROVIDED');

  // ✅ Add better error handling for user lookup
  let user;
  try {
    user = await User.findById(userId).select('+password +isFirstLogin');
    console.log('👤 User found:', user ? `Yes (${user.email})` : 'No');
  } catch (error) {
    console.error('❌ Error finding user:', error);
    throw new NotFoundError('Error finding user');
  }
  
  if (!user) {
    console.log('❌ User not found with ID:', userId);
    throw new NotFoundError('User not found');
  }

  console.log('🔑 Verifying old password...');
  const isPasswordValid = await user.comparePassword(oldPassword);
  console.log('✅ Old password valid:', isPasswordValid);
  
  if (!isPasswordValid) {
    throw new AuthenticationError('Current password is incorrect');
  }

  console.log('📋 Validating new password...');
  const passwordValidation = Validators.validatePassword(newPassword);
  console.log('✅ New password valid:', passwordValidation.isValid);
  
  if (!passwordValidation.isValid) {
    throw new ValidationError('New password does not meet requirements');
  }

  console.log('💾 Saving new password...');
  console.log('📝 Before - isFirstLogin:', user.isFirstLogin);
  
  user.password = newPassword;
  user.isFirstLogin = false;
  
  console.log('📝 After - isFirstLogin:', user.isFirstLogin);
  
  await user.save();
  console.log('✅ User saved successfully');

  console.log('🔐 CHANGE PASSWORD DEBUG END ==========');

  return { message: 'Password changed successfully' };
}

  async verifyToken(token) {
    return JWTHelper.verifyToken(token);
  }
}