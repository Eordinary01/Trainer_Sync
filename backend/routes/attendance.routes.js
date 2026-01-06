import { AttendanceController } from '../controllers/AttendanceController.js';
import { clockInValidation, validateRequest } from '../middleware/validator.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import express from 'express';

const attendanceRouter = express.Router();
const attendanceController = new AttendanceController();

// Basic routes
attendanceRouter.post(
  '/clock-in',
  authenticate,
  clockInValidation,
  validateRequest,
  (req, res, next) => attendanceController.clockIn(req, res, next)
);

attendanceRouter.post(
  '/clock-out',
  authenticate,
  clockInValidation,
  validateRequest,
  (req, res, next) => attendanceController.clockOut(req, res, next)
);

// ✅ FIXED: Move specific routes BEFORE parameterized routes
attendanceRouter.get('/today', authenticate, (req, res, next) =>
  attendanceController.getTodayStatus(req, res, next)
);

// ✅ FIXED: Add clocked-in list route BEFORE :trainerId routes
attendanceRouter.get(
  "/today/clocked-in-list",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => attendanceController.getTodayClockedInList(req, res, next)
);

// ✅ FIXED: Add count route BEFORE :trainerId routes
attendanceRouter.get(
  '/today/count/clocked-in',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => attendanceController.getTodayClockedInCount(req, res, next)
);

// ✅ FIXED: Now add parameterized routes AFTER specific routes
attendanceRouter.get('/today/:trainerId', authenticate, authorize('ADMIN','HR'), (req, res, next) =>
  attendanceController.getTodayStatus(req, res, next)
);

// History routes
attendanceRouter.get('/history', authenticate, (req, res, next) =>
  attendanceController.getAttendanceHistory(req, res, next)
);

attendanceRouter.get('/history/:trainerId', authenticate, authorize('ADMIN','HR'), (req, res, next) =>
  attendanceController.getAttendanceHistory(req, res, next)
);

// Working hours routes
attendanceRouter.get('/working-hours', authenticate, (req, res, next) =>
  attendanceController.getWorkingHours(req, res, next)
);

attendanceRouter.get('/working-hours/:trainerId', authenticate, authorize('ADMIN','HR'), (req, res, next) =>
  attendanceController.getWorkingHours(req, res, next)
);

// Report routes
attendanceRouter.get(
  '/report/daily',
  authenticate,
  authorize('ADMIN','HR'),
  (req, res, next) => attendanceController.getDailyReport(req, res, next)
);

attendanceRouter.get(
  '/report/weekly',
  authenticate,
  (req, res, next) => attendanceController.getWeeklyReport(req, res, next)
);

attendanceRouter.get(
  '/report/weekly/:trainerId',
  authenticate,
  authorize('ADMIN','HR'),
  (req, res, next) => attendanceController.getWeeklyReport(req, res, next)
);

attendanceRouter.get(
  '/report/monthly',
  authenticate,
  (req, res, next) => attendanceController.getMonthlyReport(req, res, next)
);

attendanceRouter.get(
  '/report/monthly/:trainerId',
  authenticate,
  authorize('ADMIN','HR'),
  (req, res, next) => attendanceController.getMonthlyReport(req, res, next)
);

// // ✅ FIXED: Move activities route to appropriate position
// attendanceRouter.get(
//   "/activities/recent",
//   authenticate,
//   authorize("ADMIN", "HR"),
//   (req, res, next) => attendanceController.getRecentActivities(req, res, next)
// );

// Get attendance rate statistics
attendanceRouter.get(
  '/stats/attendance-rate',
  authenticate,
  authorize('ADMIN', 'HR'),
  (req, res, next) => attendanceController.getAttendanceRate(req, res, next)
);

export default attendanceRouter;