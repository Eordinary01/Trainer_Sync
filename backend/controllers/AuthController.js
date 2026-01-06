import { AuthService } from "../services/AuthService.js";
import { EmailService } from "../services/EmailService.js";
import { Encryption } from "../utils/encryption.js";
import { envConfig } from "../config/environment.js";

const authService = new AuthService();
const emailService = new EmailService();

export class AuthController {
  async register(req, res, next) {
    try {
      const { username, email, password, profile } = req.body;
      const user = await authService.register(
        username,
        email,
        password,
        "TRAINER",
        profile
      );
      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      // console.log("📩 Backend received login:", username);
      const result = await authService.login(username, password);
      // console.log("✅ Backend result:", result);
      res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      console.error("❌ Backend Login Error:", error);
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      res.status(200).json({
        success: true,
        message: "Token refreshed",
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
        message: "Password reset link sent to email",
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
      console.log("🔄 CHANGE PASSWORD CONTROLLER START ==========");
      console.log("👤 Authenticated user:", req.user);

      const { oldPassword, newPassword } = req.body;

      console.log("📦 Request body received:", {
        oldPassword: oldPassword ? "***" : "NOT PROVIDED",
        newPassword: newPassword ? "***" : "NOT PROVIDED",
      });

      // ✅ FIX: Use req.user.userId instead of req.user._id
      const userId = req.user.userId;

      console.log("🆔 Using user ID from token:", userId);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID not found in token",
        });
      }

      const result = await authService.changePassword(
        userId,
        oldPassword,
        newPassword
      );

      console.log("✅ Password change successful in controller");

      res.status(200).json({
        success: true,
        message: result.message,
      });

      console.log("🔄 CHANGE PASSWORD CONTROLLER END ==========");
    } catch (error) {
      console.error("❌ CHANGE PASSWORD CONTROLLER ERROR:", error);
      next(error);
    }
  }
}
