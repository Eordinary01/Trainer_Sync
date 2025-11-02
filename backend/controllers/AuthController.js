import { AuthService } from '../services/AuthService.js';
import { EmailService } from '../services/EmailService.js';
import { Encryption } from '../utils/encryption.js';
import { envConfig } from '../config/environment.js';

const authService = new AuthService();
const emailService = new EmailService();

export class AuthController {
  async register(req, res, next) {
    try {
      const { username, email, password, profile } = req.body;
      const user = await authService.register(username, email, password, 'TRAINER', profile);
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      res.status(200).json({
        success: true,
        message: 'Token refreshed',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async requestPasswordReset(req, res, next) {
    try {
      const { email } = req.body;
      const token = await authService.requestPasswordReset(email);
      const resetLink = `${envConfig.FRONTEND_URL}/reset-password?token=${token}`;
      await emailService.sendPasswordResetEmail(email, resetLink);
      res.status(200).json({
        success: true,
        message: 'Password reset link sent to email',
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      const result = await authService.resetPassword(token, newPassword);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.user.userId, oldPassword, newPassword);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}