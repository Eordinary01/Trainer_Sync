import express from 'express';
import { UserController } from '../controllers/UserController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { createTrainerValidation, validateRequest } from '../middleware/validator.middleware.js';

const usersRouter = express.Router();
const userController = new UserController();

// Existing routes...
usersRouter.post(
  '/',
  authenticate,
  authorize('ADMIN', 'HR'), 
  createTrainerValidation,
  validateRequest,
  (req, res, next) => userController.createTrainer(req, res, next)
);

usersRouter.get('/search', authenticate, (req, res, next) =>
  userController.searchTrainers(req, res, next)
);

usersRouter.get(
  '/',
  authenticate,
  authorize('ADMIN', 'HR'), 
  (req, res, next) => userController.getAllTrainers(req, res, next)
);

usersRouter.get('/:id', authenticate, (req, res, next) =>
  userController.getProfile(req, res, next)
);

usersRouter.put('/:id', authenticate, (req, res, next) =>
  userController.updateProfile(req, res, next)
);

usersRouter.post(
  '/:id/deactivate',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => userController.deactivateTrainer(req, res, next)
);

usersRouter.post(
  '/:id/activate',
  authenticate,
  authorize('ADMIN', 'HR'), 
  (req, res, next) => userController.activateTrainer(req, res, next)
);

usersRouter.post(
  '/bulk/import',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => userController.bulkImport(req, res, next)
);

// NEW ROUTES FOR DASHBOARD DATA
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

export default usersRouter;