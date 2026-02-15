// middleware/rateLimiter.middleware.js
import rateLimit from 'express-rate-limit';

// ✅ Rate limiter for password reset requests
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 3 attempts per window
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    success: false,
    message: "Too many password reset attempts. Please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ Rate limiter for login attempts
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
});