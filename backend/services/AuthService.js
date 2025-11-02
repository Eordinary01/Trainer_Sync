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

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
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
    });

    await user.save();
    return user.toJSON();
  }

  async login(username, password) {
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    }).select('+password');

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    if (user.isLocked()) {
      throw new AuthenticationError('Account is locked. Try again later.');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      throw new AuthenticationError('Invalid credentials');
    }

    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    const token = JWTHelper.generateToken(user._id, user.role);
    const refreshToken = JWTHelper.generateRefreshToken(user._id);

    return {
      user: user.toJSON(),
      token,
      refreshToken,
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
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isPasswordValid = await user.comparePassword(oldPassword);
    if (!isPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const passwordValidation = Validators.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError('New password does not meet requirements');
    }

    user.password = newPassword;
    await user.save();

    return { message: 'Password changed successfully' };
  }

  async verifyToken(token) {
    return JWTHelper.verifyToken(token);
  }
}
