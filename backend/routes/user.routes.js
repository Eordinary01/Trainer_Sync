import express from "express";
import { UserController } from "../controllers/UserController.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import {
  createTrainerValidation,
  validateRequest,
} from "../middleware/validator.middleware.js";

const usersRouter = express.Router();
const userController = new UserController();

// ============================================
// ✅ IMPORTANT: Specific routes BEFORE parameterized routes
// ============================================

// ============================================
// ✅ CREATE TRAINER (Now with category support)
// ============================================
usersRouter.post(
  "/",
  authenticate,
  authorize("ADMIN", "HR"),
  createTrainerValidation,
  validateRequest,
  (req, res, next) => userController.createTrainer(req, res, next),
  // Note: Request body should include trainerCategory: "PERMANENT" or "CONTRACTED"
);

usersRouter.patch(
  "/profile/:id",
  authenticate,

  validateRequest,
  (req, res, next) => userController.updateProfile(req, res, next),
);
// ============================================
// ✅ SEARCH & STATISTICS
// ============================================

// Search trainers by name/email/username
usersRouter.get("/search", authenticate, (req, res, next) =>
  userController.searchTrainers(req, res, next),
);

usersRouter.get(
  "/count/total-trainers",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.getTotalTrainersCount(req, res, next),
);

// Get users count by role (for dashboard stats)
usersRouter.get(
  "/count/by-role",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.getUsersCountByRole(req, res, next),
);

// Get active trainers count
usersRouter.get(
  "/count/active-trainers",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.getActiveTrainersCount(req, res, next),
);

// ✅ NEW: Get trainers by category
usersRouter.get(
  "/category/:category",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.getTrainersByCategory(req, res, next),
  // Params: category = "PERMANENT" or "CONTRACTED"
);

// ✅ NEW: Get leave statistics for all trainers
usersRouter.get(
  "/leaves/statistics/all",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) =>
    userController.getAllTrainersLeaveStatistics(req, res, next),
);

// ============================================
// ✅ BULK OPERATIONS
// ============================================

// Bulk import trainers
usersRouter.post(
  "/bulk/import",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.bulkImport(req, res, next),
);

// ✅ NEW: Bulk update trainer category
usersRouter.patch(
  "/bulk/category",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.bulkUpdateCategory(req, res, next),
  // Body: { trainerIds: [...], newCategory: "PERMANENT" or "CONTRACTED" }
);

// ✅ NEW: Bulk trigger monthly leave increment
usersRouter.post(
  "/bulk/increment-monthly",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.bulkIncrementMonthlyLeaves(req, res, next),
);

// ✅ NEW: Bulk trigger year-end rollover
usersRouter.post(
  "/bulk/rollover",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.bulkRolloverLeaves(req, res, next),
);

// ============================================
// ✅ PARAMETERIZED ROUTES (AFTER specific routes)
// ============================================

// Get all trainers (with filtering and pagination)
usersRouter.get(
  "/",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.getAllTrainers(req, res, next),
  // Query params: page, limit, status, search
);

// Get user profile by ID
usersRouter.get("/:id", authenticate, (req, res, next) =>
  userController.getProfile(req, res, next),
);

// Update user profile by ID
// ✅ UPDATED: Now supports trainerCategory change
usersRouter.put(
  "/:id",
  authenticate,
  (req, res, next) => userController.updateProfile(req, res, next),
  // Body can include: trainerCategory, profile fields, etc.
  // Note: Changing category will reinitialize leave balance
);

// ============================================
// ✅ TRAINER STATUS MANAGEMENT
// ============================================

// Deactivate trainer
usersRouter.patch(
  "/:id/deactivate",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.deactivateTrainer(req, res, next),
);

// Activate trainer
usersRouter.patch(
  "/:id/activate",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.activateTrainer(req, res, next),
);

// ============================================
// ✅ NEW: LEAVE-RELATED USER ENDPOINTS
// ============================================

// Get trainer's leave balance
usersRouter.get("/:id/leave-balance", authenticate, (req, res, next) =>
  userController.getTrainerLeaveBalance(req, res, next),
);

// Get trainer's leave history
usersRouter.get("/:id/leave-history", authenticate, (req, res, next) =>
  userController.getTrainerLeaveHistory(req, res, next),
);

// Get trainer's leave statistics
usersRouter.get("/:id/leave-statistics", authenticate, (req, res, next) =>
  userController.getTrainerLeaveStatistics(req, res, next),
);

// Manually increment trainer's monthly leaves
usersRouter.post(
  "/:id/increment-monthly-leaves",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) =>
    userController.incrementTrainerMonthlyLeaves(req, res, next),
);

// Manually rollover trainer's leaves
usersRouter.post(
  "/:id/rollover-leaves",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.rolloverTrainerLeaves(req, res, next),
);

// Edit trainer's leave balance directly
usersRouter.patch(
  "/:id/leave-balance",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.editTrainerLeaveBalance(req, res, next),
  // Body: { leaveType: "SICK", newBalance: 10, reason: "..." }
);

export default usersRouter;
