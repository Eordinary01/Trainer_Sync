import { LeaveController } from '../controllers/LeaveController.js';
import { leaveApplicationValidation, validateRequest } from '../middleware/validator.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import express from 'express';


const leavesRouter = express.Router();
const leaveController = new LeaveController();

leavesRouter.post(
  '/',
  authenticate,
  leaveApplicationValidation,
  validateRequest,
  (req, res, next) => leaveController.applyLeave(req, res, next)
);

leavesRouter.get('/balance', authenticate, (req, res, next) =>
  leaveController.getLeaveBalance(req, res, next)
);

leavesRouter.get('/balance/:trainerId', authenticate, authorize('ADMIN','HR'), (req, res, next) =>
  leaveController.getLeaveBalance(req, res, next)
);

leavesRouter.get(
  '/pending',
  authenticate,
  authorize('ADMIN','HR'),
  (req, res, next) => leaveController.getPendingLeaves(req, res, next)
);

leavesRouter.put(
  '/:id/approve',
  authenticate,
  authorize('ADMIN','HR'),
  (req, res, next) => leaveController.approveLeave(req, res, next)
);

leavesRouter.put(
  '/:id/reject',
  authenticate,
  authorize('ADMIN','HR'),
  (req, res, next) => leaveController.rejectLeave(req, res, next)
);

leavesRouter.get('/history', authenticate, (req, res, next) =>
  leaveController.getLeaveHistory(req, res, next)
);

leavesRouter.get('/history/:trainerId', authenticate, authorize('ADMIN','HR'), (req, res, next) =>
  leaveController.getLeaveHistory(req, res, next)
);

export default leavesRouter;