import jwt from 'jsonwebtoken';
import { envConfig } from '../config/environment.js';

export class JWTHelper {
  // ✅ Updated to include isFirstLogin in payload (default = false)
  static generateToken(userId, role, isFirstLogin = false,trainerCategory = null) {
    const payload = {
      userId,
      role,
      isFirstLogin,
      trainerCategory,
      iat: Math.floor(Date.now() / 1000),
    };
    return jwt.sign(payload, envConfig.JWT_SECRET, {
      expiresIn: envConfig.JWT_EXPIRE,
    });
  }

  static generateRefreshToken(userId) {
    return jwt.sign({ userId }, envConfig.JWT_SECRET, {
      expiresIn: envConfig.JWT_REFRESH_EXPIRE,
    });
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, envConfig.JWT_SECRET);
    } catch (error) {
      throw new Error(`Invalid token: ${error.message}`);
    }
  }

  static decodeToken(token) {
    return jwt.decode(token);
  }

  static extractTokenFromHeader(authHeader) {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    return parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;
  }
}
