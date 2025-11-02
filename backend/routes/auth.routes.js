import express from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  loginValidation,
  registerValidation,
  validateRequest,
} from '../middleware/validator.middleware.js';

const router = express.Router();
const authController = new AuthController();

router.post('/register', registerValidation, validateRequest, (req, res, next) =>
  authController.register(req, res, next)
);

router.post('/login', loginValidation, validateRequest, (req, res, next) =>
  authController.login(req, res, next)
);

router.post('/refresh-token', (req, res, next) =>
  authController.refreshToken(req, res, next)
);

router.post('/forgot-password', (req, res, next) =>
  authController.requestPasswordReset(req, res, next)
);

router.post('/reset-password', (req, res, next) =>
  authController.resetPassword(req, res, next)
);

router.post('/change-password', authenticate, (req, res, next) =>
  authController.changePassword(req, res, next)
);

export default router;