import { body, validationResult } from 'express-validator';
import { ValidationError } from '../utils/errorHandler.js';

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
    }));
    return next(new ValidationError('Validation failed', details));
  }
  next();
};

export const loginValidation = [
  body('username')
    .notEmpty().withMessage('Username is required')
    .trim(),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

export const registerValidation = [
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

export const createTrainerValidation = [
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Invalid email format'),
  body('profile.firstName').notEmpty().withMessage('First name is required'),
  body('profile.lastName').notEmpty().withMessage('Last name is required'),
  body('profile.employeeId').notEmpty().withMessage('Employee ID is required'),
];

export const clockInValidation = [
  body('latitude')
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude')
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
];

export const leaveApplicationValidation = [
  body('leaveType')
    .isIn(['SICK', 'CASUAL', 'PAID']).withMessage('Invalid leave type'),
  body('fromDate')
    .isISO8601().withMessage('Invalid from date'),
  body('toDate')
    .isISO8601().withMessage('Invalid to date'),
  body('reason').notEmpty().withMessage('Reason is required'),
];

export const createAdminValidation = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters')
    .trim(),

  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain number')
    .matches(/[!@#$%^&*]/)
    .withMessage('Password must contain special character (!@#$%^&*)'),

  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['ADMIN', 'HR'])
    .withMessage('Role must be ADMIN or HR'),

  body('profile.firstName')
    .notEmpty()
    .withMessage('First name is required'),

  body('profile.lastName')
    .notEmpty()
    .withMessage('Last name is required'),

  body('profile.employeeId')
    .notEmpty()
    .withMessage('Employee ID is required'),
];