import { LeaveController } from '../controllers/LeaveController.js';
import { leaveApplicationValidation, validateRequest } from '../middleware/validator.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import express from 'express';

const leavesRouter = express.Router();
const leaveController = new LeaveController();

// ============================================
// ✅ PUBLIC ENDPOINTS (Authentication required)
// ============================================

// Apply for leave (Trainer & HR requests - ADMIN cannot apply)
leavesRouter.post(
  '/',
  authenticate,
  leaveApplicationValidation,
  validateRequest,
  (req, res, next) => leaveController.applyLeave(req, res, next)
);

// Get own leave balance (HR gets unlimited, Trainers get actual)
leavesRouter.get(
  '/balance',
  authenticate,
  (req, res, next) => leaveController.getLeaveBalance(req, res, next)
);

// ✅ ADDED: HR specific leave balance (Unlimited)
leavesRouter.get(
  '/hr/balance',
  authenticate,
  authorize('HR'),
  (req, res, next) => leaveController.getLeaveBalance(req, res, next)
);

// Get own leave history with filters
leavesRouter.get(
  '/history',
  authenticate,
  (req, res, next) => leaveController.getLeaveHistory(req, res, next)
);

// ✅ ADDED: HR specific leave history
leavesRouter.get(
  '/hr/history',
  authenticate,
  authorize('HR'),
  (req, res, next) => leaveController.getHRLeaveHistory(req, res, next)
);

// Get own leave statistics
leavesRouter.get(
  '/statistics',
  authenticate,
  (req, res, next) => leaveController.getLeaveStatistics(req, res, next)
);

// Get own leave audit history
leavesRouter.get(
  '/audit-history',
  authenticate,
  (req, res, next) => leaveController.getLeaveAuditHistory(req, res, next)
);

// Cancel own approved leave
leavesRouter.post(
  '/:id/cancel',
  authenticate,
  (req, res, next) => leaveController.cancelLeave(req, res, next)
);

// Update own leave (basic fields)
leavesRouter.put(
  '/:id',
  authenticate,
  (req, res, next) => leaveController.updateLeave(req, res, next)
);

// ============================================
// ✅ ADMIN/HR ENDPOINTS (Admin/HR only)
// ============================================

// Get all pending leaves (Role-based filtering inside controller)
leavesRouter.get(
  '/pending',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => leaveController.getPendingLeaves(req, res, next)
);

// ✅ ADDED: Get all pending HR leaves (Admin only)
leavesRouter.get(
  '/admin/pending-hr',
  authenticate,
  authorize('ADMIN'),
  (req, res, next) => leaveController.getPendingHRLeaves(req, res, next)
);

// Approve leave request (Role-based approval logic inside controller)
leavesRouter.post(
  '/:id/approve',
  authenticate,
  authorize('ADMIN', 'HR'), // HR can approve, but controller restricts to TRAINER leaves only
  (req, res, next) => leaveController.approveLeave(req, res, next)
);

// Reject leave request (Role-based rejection logic inside controller)
leavesRouter.post(
  '/:id/reject',
  authenticate,
  authorize('ADMIN', 'HR'), // HR can reject, but controller restricts to TRAINER leaves only
  (req, res, next) => leaveController.rejectLeave(req, res, next)
);

// Get leave balance for specific trainer (Admin/HR)
leavesRouter.get(
  '/balance/:trainerId',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => leaveController.getLeaveBalance(req, res, next)
);

// Get leave history for specific trainer (Admin/HR)
leavesRouter.get(
  '/history/:trainerId',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => leaveController.getLeaveHistory(req, res, next)
);

// Get leave statistics for specific trainer (Admin/HR)
leavesRouter.get(
  '/statistics/:trainerId',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => leaveController.getLeaveStatistics(req, res, next)
);

// Get leave audit history for specific trainer (Admin/HR)
leavesRouter.get(
  '/audit-history/:trainerId',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => leaveController.getLeaveAuditHistory(req, res, next)
);

// ============================================
// ✅ LEAVE BALANCE MANAGEMENT (Admin/HR only)
// ============================================

// Edit leave balance (Admin/HR only - anytime)
leavesRouter.put(
  '/balance/:trainerId/edit',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => leaveController.editLeaveBalance(req, res, next)
);

// Update leave balance (Legacy method - add/subtract days)
leavesRouter.patch(
  '/balance/:trainerId/update',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => leaveController.updateLeaveBalance(req, res, next)
);

// Increment monthly leaves manually for specific trainer
leavesRouter.post(
  '/trainer/:trainerId/increment-monthly',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => leaveController.incrementMonthlyLeaves(req, res, next)
);

// Rollover unused leaves for specific trainer
leavesRouter.post(
  '/trainer/:trainerId/rollover',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => leaveController.rolloverUnusedLeaves(req, res, next)
);

// ============================================
// ✅ AUTOMATION ENDPOINTS (Admin/HR only)
// ============================================

// Trigger automated leave increment for all trainers
leavesRouter.post(
  '/automation/increment',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => leaveController.triggerAutoIncrement(req, res, next)
);

// Trigger automated year-end rollover for all trainers
leavesRouter.post(
  '/automation/rollover',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => leaveController.triggerAutoRollover(req, res, next)
);

// Get automation status and statistics
leavesRouter.get(
  '/automation/status',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => leaveController.getAutomationStatus(req, res, next)
);

// Get all trainers' leave balances summary
leavesRouter.get(
  '/summary/all',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => leaveController.getAllTrainersLeaveSummary(req, res, next)
);

// ============================================
// ✅ BULK OPERATIONS (Admin/HR only)
// ============================================

// Generate leave balance report
leavesRouter.get(
  '/reports/balance',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => leaveController.generateBalanceReport(req, res, next)
);

leavesRouter.get(
  '/reports/balance/download',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => leaveController.downloadBalanceReport(req, res, next)
);

export default leavesRouter;