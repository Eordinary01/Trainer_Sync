// routes/user.routes.js
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
// ✅ SECTION 1: PUBLIC / UNPROTECTED ROUTES
// ============================================
// (None - all routes require authentication)


// ============================================
// ✅ SECTION 2: STATISTICS & COUNTS (Specific routes)
// ============================================
usersRouter.get(
  "/count/total-trainers",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.getTotalTrainersCount(req, res, next),
);

usersRouter.get(
  "/count/active-trainers",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.getActiveTrainersCount(req, res, next),
);

usersRouter.get(
  "/count/by-role",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.getUsersCountByRole(req, res, next),
);

// ✅ NEW: Get trainers by category count
usersRouter.get(
  "/count/category/:category",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.getTrainersByCategoryCount(req, res, next),
);


// ============================================
// ✅ SECTION 3: SEARCH ROUTES
// ============================================
usersRouter.get(
  "/search",
  authenticate,
  (req, res, next) => userController.searchTrainers(req, res, next),
);

// ✅ NEW: Search trainers by skill
usersRouter.get(
  "/search/skills",
  authenticate,
  (req, res, next) => userController.getTrainersBySkill(req, res, next),
);

// ✅ NEW: Search trainers by qualification
usersRouter.get(
  "/search/qualifications",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.getTrainersByQualification(req, res, next),
);


// ============================================
// ✅ SECTION 4: PORTFOLIO ROUTES
// ============================================

// Get portfolio summary (self or by ID)
usersRouter.get(
  "/portfolio/summary",
  authenticate,
  (req, res, next) => userController.getPortfolioSummary(req, res, next),
);

usersRouter.get(
  "/portfolio/summary/:userId",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.getPortfolioSummary(req, res, next),
);

// ============================================
// ✅ SECTION 4A: SUBJECTS
// ============================================
usersRouter.post(
  "/portfolio/subjects",
  authenticate,
  (req, res, next) => userController.addSubject(req, res, next),
);

usersRouter.post(
  "/portfolio/subjects/:userId",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.addSubject(req, res, next),
);

usersRouter.patch(
  "/portfolio/subjects/:subjectId",
  authenticate,
  (req, res, next) => userController.updateSubject(req, res, next),
);

usersRouter.delete(
  "/portfolio/subjects/:subjectId",
  authenticate,
  (req, res, next) => userController.deleteSubject(req, res, next),
);

// ✅ Syllabus upload
usersRouter.post(
  "/portfolio/subjects/:subjectId/syllabus",
  authenticate,
  (req, res, next) => userController.uploadSyllabus(req, res, next),
);

// ============================================
// ✅ SECTION 4B: PROJECTS
// ============================================
usersRouter.post(
  "/portfolio/projects",
  authenticate,
  (req, res, next) => userController.addProject(req, res, next),
);

usersRouter.post(
  "/portfolio/projects/:userId",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.addProject(req, res, next),
);

usersRouter.patch(
  "/portfolio/projects/:projectId",
  authenticate,
  (req, res, next) => userController.updateProject(req, res, next),
);

usersRouter.delete(
  "/portfolio/projects/:projectId",
  authenticate,
  (req, res, next) => userController.deleteProject(req, res, next),
);

// ============================================
// ✅ SECTION 4C: QUALIFICATIONS
// ============================================
usersRouter.post(
  "/portfolio/qualifications",
  authenticate,
  (req, res, next) => userController.addQualification(req, res, next),
);

usersRouter.post(
  "/portfolio/qualifications/:userId",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.addQualification(req, res, next),
);

usersRouter.patch(
  "/portfolio/qualifications/:qualificationId",
  authenticate,
  (req, res, next) => userController.updateQualification(req, res, next),
);

usersRouter.delete(
  "/portfolio/qualifications/:qualificationId",
  authenticate,
  (req, res, next) => userController.deleteQualification(req, res, next),
);

// ============================================
// ✅ SECTION 4D: EXPERIENCE
// ============================================
usersRouter.post(
  "/portfolio/experience",
  authenticate,
  (req, res, next) => userController.addExperience(req, res, next),
);

usersRouter.post(
  "/portfolio/experience/:userId",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.addExperience(req, res, next),
);

usersRouter.patch(
  "/portfolio/experience/:experienceId",
  authenticate,
  (req, res, next) => userController.updateExperience(req, res, next),
);

usersRouter.delete(
  "/portfolio/experience/:experienceId",
  authenticate,
  (req, res, next) => userController.deleteExperience(req, res, next),
);

// ============================================
// ✅ SECTION 4E: CERTIFICATIONS
// ============================================
usersRouter.post(
  "/portfolio/certifications",
  authenticate,
  (req, res, next) => userController.addCertification(req, res, next),
);

usersRouter.post(
  "/portfolio/certifications/:userId",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.addCertification(req, res, next),
);

usersRouter.patch(
  "/portfolio/certifications/:certificationId",
  authenticate,
  (req, res, next) => userController.updateCertification(req, res, next),
);

usersRouter.delete(
  "/portfolio/certifications/:certificationId",
  authenticate,
  (req, res, next) => userController.deleteCertification(req, res, next),
);

// ============================================
// ✅ SECTION 4F: SEMESTER ACTIVITIES
// ============================================
usersRouter.post(
  "/portfolio/activities",
  authenticate,
  (req, res, next) => userController.addSemesterActivity(req, res, next),
);

usersRouter.post(
  "/portfolio/activities/:userId",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.addSemesterActivity(req, res, next),
);

usersRouter.patch(
  "/portfolio/activities/:activityId",
  authenticate,
  (req, res, next) => userController.updateSemesterActivity(req, res, next),
);

usersRouter.delete(
  "/portfolio/activities/:activityId",
  authenticate,
  (req, res, next) => userController.deleteSemesterActivity(req, res, next),
);

// ============================================
// ✅ SECTION 4G: UNIVERSITY INFO
// ============================================
usersRouter.patch(
  "/portfolio/university",
  authenticate,
  (req, res, next) => userController.updateUniversityInfo(req, res, next),
);

usersRouter.patch(
  "/portfolio/university/:userId",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.updateUniversityInfo(req, res, next),
);

// ============================================
// ✅ SECTION 4H: PLACEMENT RECORD (Admin/HR only)
// ============================================
usersRouter.put(
  "/portfolio/placement/:userId",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.updatePlacementRecord(req, res, next),
);

usersRouter.get(
  "/statistics/placement",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.getPlacementStatistics(req, res, next),
);

usersRouter.get(
  "/statistics/placement/:year",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.getPlacementStatisticsByYear(req, res, next),
);


// ============================================
// ✅ SECTION 5: BULK OPERATIONS
// ============================================
usersRouter.post(
  "/bulk/import",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.bulkImport(req, res, next),
);

usersRouter.patch(
  "/bulk/category",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.bulkUpdateCategory(req, res, next),
);

usersRouter.post(
  "/bulk/increment-monthly",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.bulkIncrementMonthlyLeaves(req, res, next),
);

usersRouter.post(
  "/bulk/rollover",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.bulkRolloverLeaves(req, res, next),
);


// ============================================
// ✅ SECTION 6: TRAINER CREATION
// ============================================
usersRouter.post(
  "/",
  authenticate,
  authorize("ADMIN", "HR"),
  createTrainerValidation,
  validateRequest,
  (req, res, next) => userController.createTrainer(req, res, next),
);


// ============================================
// ✅ SECTION 7: CATEGORY-BASED ROUTES
// ============================================
usersRouter.get(
  "/category/:category",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.getTrainersByCategory(req, res, next),
);

usersRouter.get(
  "/leave-statistics/all",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.getAllTrainersLeaveStatistics(req, res, next),
);


// ============================================
// ✅ SECTION 8: PROFILE UPDATE ROUTES
// ============================================
usersRouter.patch(
  "/profile/:id",
  authenticate,
  validateRequest,
  (req, res, next) => userController.updateProfile(req, res, next),
);


// ============================================
// ✅ SECTION 9: USER-SPECIFIC ROUTES (WITH :id)
// ============================================

// Get all trainers (with pagination)
usersRouter.get(
  "/",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.getAllTrainers(req, res, next),
);

// Get user by ID
usersRouter.get(
  "/:id",
  authenticate,
  (req, res, next) => userController.getProfile(req, res, next),
);

// Update user by ID
usersRouter.put(
  "/:id",
  authenticate,
  (req, res, next) => userController.updateProfile(req, res, next),
);

// ============================================
// ✅ SECTION 10: TRAINER STATUS MANAGEMENT
// ============================================
usersRouter.patch(
  "/:id/deactivate",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.deactivateTrainer(req, res, next),
);

usersRouter.patch(
  "/:id/activate",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.activateTrainer(req, res, next),
);


// ============================================
// ✅ SECTION 11: LEAVE-RELATED USER ENDPOINTS
// ============================================
usersRouter.get(
  "/:id/leave-balance",
  authenticate,
  (req, res, next) => userController.getTrainerLeaveBalance(req, res, next),
);

usersRouter.get(
  "/:id/leave-history",
  authenticate,
  (req, res, next) => userController.getTrainerLeaveHistory(req, res, next),
);

usersRouter.get(
  "/:id/leave-statistics",
  authenticate,
  (req, res, next) => userController.getTrainerLeaveStatistics(req, res, next),
);

usersRouter.post(
  "/:id/increment-monthly-leaves",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.incrementTrainerMonthlyLeaves(req, res, next),
);

usersRouter.post(
  "/:id/rollover-leaves",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.rolloverTrainerLeaves(req, res, next),
);

usersRouter.patch(
  "/:id/leave-balance",
  authenticate,
  authorize("ADMIN", "HR"),
  (req, res, next) => userController.editTrainerLeaveBalance(req, res, next),
);

// ✅ NEW: Get increment status for a trainer
usersRouter.get(
  "/:id/increment-status",
  authenticate,
  (req, res, next) => userController.getIncrementStatus(req, res, next),
);





// // ============================================
// // ✅ SECTION 12: PORTFOLIO ACCESS BY USER ID
// // ============================================

// // Get full portfolio by user ID
// usersRouter.get(
//   "/:id/portfolio",
//   authenticate,
//   (req, res, next) => userController.getFullPortfolio(req, res, next),
// );

// // Get specific portfolio sections by user ID
// usersRouter.get(
//   "/:id/portfolio/subjects",
//   authenticate,
//   (req, res, next) => userController.getUserSubjects(req, res, next),
// );

// usersRouter.get(
//   "/:id/portfolio/projects",
//   authenticate,
//   (req, res, next) => userController.getUserProjects(req, res, next),
// );

// usersRouter.get(
//   "/:id/portfolio/qualifications",
//   authenticate,
//   (req, res, next) => userController.getUserQualifications(req, res, next),
// );

// usersRouter.get(
//   "/:id/portfolio/experience",
//   authenticate,
//   (req, res, next) => userController.getUserExperience(req, res, next),
// );

// usersRouter.get(
//   "/:id/portfolio/certifications",
//   authenticate,
//   (req, res, next) => userController.getUserCertifications(req, res, next),
// );

// usersRouter.get(
//   "/:id/portfolio/activities",
//   authenticate,
//   (req, res, next) => userController.getUserActivities(req, res, next),
// );

// usersRouter.get(
//   "/:id/portfolio/placement",
//   authenticate,
//   authorize("ADMIN", "HR"),
//   (req, res, next) => userController.getUserPlacementRecord(req, res, next),
// );

export default usersRouter;