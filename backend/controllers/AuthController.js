import { AuthService } from "../services/AuthService.js";
import { EmailService } from "../services/EmailService.js";
import { Encryption } from "../utils/encryption.js";
import { envConfig } from "../config/environment.js";
import { ValidationError, AuthenticationError } from "../utils/errorHandler.js";

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

    // ✅ Basic validation
    if (!email || !email.includes('@')) {
      return res.status(200).json({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link."
      });
    }

    // ✅ Call service - won't throw error for non-existent emails
    const result = await authService.requestPasswordReset(email);

    // ✅ Only send email if we have a valid user and token
    if (result.success && result.token && result.user) {
      // The token is already the 6-digit number from authService
      const resetToken = result.token; // This is "244554"
      
      try {
        // ✅ FIXED: Correct parameter order
        await emailService.sendPasswordResetEmail(
          result.user.email,     // 1st: email
          result.user.name,      // 2nd: username (or name)
          resetToken             // 3rd: 6-digit token
        );
        console.log(`📧 Password reset email sent to: ${result.user.email} with token: ${resetToken}`);
      } catch (emailError) {
        console.error(`❌ Failed to send password reset email:`, emailError);
      }
    }

    // ✅ ALWAYS return the same generic success message
    res.status(200).json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link."
    });

  } catch (error) {
    console.error("❌ Password reset error:", error);
    
    res.status(200).json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link."
    });
  }
}

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      // ✅ Validate required fields
      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Token and new password are required"
        });
      }

      // ✅ Validate token format (6-digit number)
      if (!/^\d{6}$/.test(token)) {
        return res.status(400).json({
          success: false,
          message: "Invalid reset token format"
        });
      }

      const result = await authService.resetPassword(token, newPassword);

      res.status(200).json({
        success: true,
        message: "Password has been reset successfully. You can now login with your new password."
      });

    } catch (error) {
      console.error("❌ Reset password error:", error);
      
      // ✅ Handle specific errors with generic messages
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error instanceof AuthenticationError) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset token. Please request a new one."
        });
      }

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
