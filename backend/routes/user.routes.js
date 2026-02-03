import express from 'express';
import { UserController } from '../controllers/UserController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { createTrainerValidation, validateRequest } from '../middleware/validator.middleware.js';

const usersRouter = express.Router();
const userController = new UserController();

// ✅ IMPORTANT: Specific routes BEFORE parameterized routes

// Create trainer
usersRouter.post(
  '/',
  authenticate,
  authorize('ADMIN', 'HR'), 
  createTrainerValidation,
  validateRequest,
  (req, res, next) => userController.createTrainer(req, res, next)
);

// Search trainers
usersRouter.get(
  '/search',
  authenticate,
  (req, res, next) => userController.searchTrainers(req, res, next)
);

// Get users count by role (for dashboard stats)
usersRouter.get(
  '/count/by-role',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => userController.getUsersCountByRole(req, res, next)
);

// Get active trainers count
usersRouter.get(
  '/count/active-trainers',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => userController.getActiveTrainersCount(req, res, next)
);

// Bulk import trainers
usersRouter.post(
  '/bulk/import',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => userController.bulkImport(req, res, next)
);

// ✅ Parameterized routes AFTER specific routes

// Get all trainers
usersRouter.get(
  '/',
  authenticate,
  authorize('ADMIN', 'HR'), 
  (req, res, next) => userController.getAllTrainers(req, res, next)
);

// Get profile by ID
usersRouter.get(
  '/:id',
  authenticate,
  (req, res, next) => userController.getProfile(req, res, next)
);

// Update profile by ID
usersRouter.put(
  '/:id',
  authenticate,
  (req, res, next) => userController.updateProfile(req, res, next)
);

// Deactivate trainer - ✅ CHANGED TO PATCH
usersRouter.patch(
  '/:id/deactivate',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => userController.deactivateTrainer(req, res, next)
);

// Activate trainer - ✅ CHANGED TO PATCH
usersRouter.patch(
  '/:id/activate',
  authenticate,
  authorize('ADMIN', 'HR'), 
  (req, res, next) => userController.activateTrainer(req, res, next)
);

export default usersRouter;