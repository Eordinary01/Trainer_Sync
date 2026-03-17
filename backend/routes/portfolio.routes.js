// routes/portfolio.routes.js
import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { PortfolioController } from "../controllers/PortfolioController.js";

const router = express.Router();
const portfolioController = new PortfolioController();

// ============================================
// ✅ SECTION 1: FULL PORTFOLIO (Get everything)
// ============================================
router.get(
  "/full",
  authenticate,
  portfolioController.getFullPortfolio
);

router.get(
  "/full/:userId",
  authenticate,
  portfolioController.getFullPortfolio
);

// ============================================
// ✅ SECTION 2: SUBJECTS
// ============================================
router.get(
  "/subjects",
  authenticate,
  portfolioController.getUserSubjects
);

router.get(
  "/subjects/:userId",
  authenticate,
  portfolioController.getUserSubjects
);

router.post(
  "/subjects",
  authenticate,
  portfolioController.addSubject
);

router.post(
  "/subjects/:userId",
  authenticate,
  portfolioController.addSubject
);

router.patch(
  "/subjects/:subjectId",
  authenticate,
  portfolioController.updateSubject
);

router.patch(
  "/subjects/:userId/:subjectId",
  authenticate,
  portfolioController.updateSubject
);

router.delete(
  "/subjects/:subjectId",
  authenticate,
  portfolioController.deleteSubject
);

router.delete(
  "/subjects/:userId/:subjectId",
  authenticate,
  portfolioController.deleteSubject
);

// ============================================
// ✅ SECTION 3: PROJECTS - WITH VERIFICATION
// ============================================

// GET routes
router.get(
  "/projects",
  authenticate,
  portfolioController.getUserProjects
);

router.get(
  "/projects/:userId",
  authenticate,
  portfolioController.getUserProjects
);

// POST routes (Add)
router.post(
  "/projects",
  authenticate,
  portfolioController.addProject
);

router.post(
  "/projects/:userId",
  authenticate,
  portfolioController.addProject
);

// ✅ VERIFY routes - MUST come before generic PATCH
router.patch(
  "/projects/:projectId/verify",
  authenticate,
  authorize("ADMIN", "HR"),
  portfolioController.verifyProject
);

router.patch(
  "/projects/:userId/:projectId/verify",
  authenticate,
  authorize("ADMIN", "HR"),
  portfolioController.verifyProject
);

// UPDATE routes (Generic PATCH)
router.patch(
  "/projects/:projectId",
  authenticate,
  portfolioController.updateProject
);

router.patch(
  "/projects/:userId/:projectId",
  authenticate,
  portfolioController.updateProject
);

// DELETE routes
router.delete(
  "/projects/:projectId",
  authenticate,
  portfolioController.deleteProject
);

router.delete(
  "/projects/:userId/:projectId",
  authenticate,
  portfolioController.deleteProject
);

// ============================================
// ✅ SECTION 4: QUALIFICATIONS
// ============================================
router.get(
  "/qualifications",
  authenticate,
  portfolioController.getUserQualifications
);

router.get(
  "/qualifications/:userId",
  authenticate,
  portfolioController.getUserQualifications
);

router.post(
  "/qualifications",
  authenticate,
  portfolioController.addQualification
);

router.post(
  "/qualifications/:userId",
  authenticate,
  portfolioController.addQualification
);

router.patch(
  "/qualifications/:qualificationId",
  authenticate,
  portfolioController.updateQualification
);

router.patch(
  "/qualifications/:userId/:qualificationId",
  authenticate,
  portfolioController.updateQualification
);

router.delete(
  "/qualifications/:qualificationId",
  authenticate,
  portfolioController.deleteQualification
);

router.delete(
  "/qualifications/:userId/:qualificationId",
  authenticate,
  portfolioController.deleteQualification
);

// ============================================
// ✅ SECTION 5: EXPERIENCE
// ============================================
router.get(
  "/experience",
  authenticate,
  portfolioController.getUserExperience
);

router.get(
  "/experience/:userId",
  authenticate,
  portfolioController.getUserExperience
);

router.post(
  "/experience",
  authenticate,
  portfolioController.addExperience
);

router.post(
  "/experience/:userId",
  authenticate,
  portfolioController.addExperience
);

router.patch(
  "/experience/:experienceId",
  authenticate,
  portfolioController.updateExperience
);

router.patch(
  "/experience/:userId/:experienceId",
  authenticate,
  portfolioController.updateExperience
);

router.delete(
  "/experience/:experienceId",
  authenticate,
  portfolioController.deleteExperience
);

router.delete(
  "/experience/:userId/:experienceId",
  authenticate,
  portfolioController.deleteExperience
);

// ============================================
// ✅ SECTION 6: CERTIFICATIONS
// ============================================
router.get(
  "/certifications",
  authenticate,
  portfolioController.getUserCertifications
);

router.get(
  "/certifications/:userId",
  authenticate,
  portfolioController.getUserCertifications
);

router.post(
  "/certifications",
  authenticate,
  portfolioController.addCertification
);

router.post(
  "/certifications/:userId",
  authenticate,
  portfolioController.addCertification
);

router.patch(
  "/certifications/:certificationId",
  authenticate,
  portfolioController.updateCertification
);

router.patch(
  "/certifications/:userId/:certificationId",
  authenticate,
  portfolioController.updateCertification
);

router.delete(
  "/certifications/:certificationId",
  authenticate,
  portfolioController.deleteCertification
);

router.delete(
  "/certifications/:userId/:certificationId",
  authenticate,
  portfolioController.deleteCertification
);

// ============================================
// ✅ SECTION 7: SKILLS
// ============================================
router.get(
  "/skills",
  authenticate,
  portfolioController.getUserSkills
);

router.get(
  "/skills/:userId",
  authenticate,
  portfolioController.getUserSkills
);

router.post(
  "/skills",
  authenticate,
  portfolioController.addSkill
);

router.post(
  "/skills/:userId",
  authenticate,
  portfolioController.addSkill
);

router.delete(
  "/skills/:skill",
  authenticate,
  portfolioController.removeSkill
);

router.delete(
  "/skills/:userId/:skill",
  authenticate,
  portfolioController.removeSkill
);

// ============================================
// ✅ SECTION 8: ACTIVITIES - WITH VERIFICATION
// ============================================

// GET routes
router.get(
  "/activities",
  authenticate,
  portfolioController.getUserActivities
);

router.get(
  "/activities/:userId",
  authenticate,
  portfolioController.getUserActivities
);

// POST routes (Add)
router.post(
  "/activities",
  authenticate,
  portfolioController.addActivity
);

router.post(
  "/activities/:userId",
  authenticate,
  portfolioController.addActivity
);

// VERIFY routes - MUST come before generic PATCH
router.patch(
  "/activities/:activityId/verify",
  authenticate,
  authorize("ADMIN", "HR"),
  portfolioController.verifyActivity
);

router.patch(
  "/activities/:userId/:activityId/verify",
  authenticate,
  authorize("ADMIN", "HR"),
  portfolioController.verifyActivity
);

// UPDATE routes (Generic PATCH)
router.patch(
  "/activities/:activityId",
  authenticate,
  portfolioController.updateActivity
);

router.patch(
  "/activities/:userId/:activityId",
  authenticate,
  portfolioController.updateActivity
);

// DELETE routes
router.delete(
  "/activities/:activityId",
  authenticate,
  portfolioController.deleteActivity
);

router.delete(
  "/activities/:userId/:activityId",
  authenticate,
  portfolioController.deleteActivity
);

// ============================================
// ✅ SECTION 9: ACHIEVEMENTS
// ============================================
router.post(
  "/achievements",
  authenticate,
  portfolioController.addAchievement
);

router.post(
  "/achievements/:userId",
  authenticate,
  portfolioController.addAchievement
);

// ============================================
// ✅ SECTION 10: PLACEMENT RECORDS - Unified
// ============================================

// Get placement records
router.get(
  "/placement",
  authenticate,
  portfolioController.getUserPlacementRecord
);

router.get(
  "/placement/:userId",
  authenticate,
  portfolioController.getUserPlacementRecord
);

// Unified Placement Stats operations
router.post(
  "/placement/stats",
  authenticate,
  portfolioController.upsertPlacementStats
);

router.post(
  "/placement/stats/:userId",
  authenticate,
  portfolioController.upsertPlacementStats
);

router.patch(
  "/placement/stats/:statId",
  authenticate,
  portfolioController.upsertPlacementStats
);

router.patch(
  "/placement/stats/:userId/:statId",
  authenticate,
  portfolioController.upsertPlacementStats
);

// Delete Placement Stats
router.delete(
  "/placement/stats/:statId",
  authenticate,
  portfolioController.deletePlacementStats
);

router.delete(
  "/placement/stats/:userId/:statId",
  authenticate,
  portfolioController.deletePlacementStats
);

// Unified Placement Company operations
router.post(
  "/placement/companies",
  authenticate,
  portfolioController.upsertPlacementCompany
);

router.post(
  "/placement/companies/:userId",
  authenticate,
  portfolioController.upsertPlacementCompany
);

router.patch(
  "/placement/companies/:companyId",
  authenticate,
  portfolioController.upsertPlacementCompany
);

router.patch(
  "/placement/companies/:userId/:companyId",
  authenticate,
  portfolioController.upsertPlacementCompany
);

// Delete Placement Company
router.delete(
  "/placement/companies/:companyId",
  authenticate,
  portfolioController.deletePlacementCompany
);

router.delete(
  "/placement/companies/:userId/:companyId",
  authenticate,
  portfolioController.deletePlacementCompany
);

// Verify entire placement record
router.patch(
  "/placement/:userId/verify",
  authenticate,
  authorize("ADMIN", "HR"),
  portfolioController.verifyPlacementRecord
);

// Full placement record update (Admin/HR only) - FIXED: Removed duplicate
router.put(
  "/placement/:userId",
  authenticate,
  authorize("ADMIN", "HR"),
  portfolioController.updatePlacementRecord
);

// ============================================
// ✅ SECTION 11: UNIVERSITY INFO (Admin/HR only)
// ============================================
router.put(
  "/university",
  authenticate,
  authorize("ADMIN", "HR"),
  portfolioController.updateUniversityInfo
);

router.put(
  "/university/:userId",
  authenticate,
  authorize("ADMIN", "HR"),
  portfolioController.updateUniversityInfo
);

// ============================================
// ✅ SECTION 12: SYLLABUS MANAGEMENT ROUTES
// ============================================

// Get all trainers with subjects for syllabus upload (Admin/HR only)
router.get(
  "/syllabus/trainers",
  authenticate,
  authorize("ADMIN", "HR"),
  portfolioController.getTrainersForSyllabus
);

// Get all subjects with syllabus status (Admin/HR only)
router.get(
  "/syllabus/subjects",
  authenticate,
  authorize("ADMIN", "HR"),
  portfolioController.getAllSubjectsWithSyllabus
);

// Get syllabus statistics (Admin/HR only)
router.get(
  "/syllabus/stats",
  authenticate,
  authorize("ADMIN", "HR"),
  portfolioController.getSyllabusStats
);

// Get syllabus for a specific subject
router.get(
  "/:trainerId/subject/:subjectId/syllabus",
  authenticate,
  portfolioController.getSubjectSyllabus
);

// Upload syllabus for a subject (Admin/HR only)
router.post(
  "/:trainerId/subject/:subjectId/syllabus",
  authenticate,
  authorize("ADMIN", "HR"),
  portfolioController.uploadSubjectSyllabus
);

// Update syllabus (Admin/HR only)
router.put(
  "/:trainerId/subject/:subjectId/syllabus",
  authenticate,
  authorize("ADMIN", "HR"),
  portfolioController.updateSubjectSyllabus
);

// Delete syllabus (Admin/HR only)
router.delete(
  "/:trainerId/subject/:subjectId/syllabus",
  authenticate,
  authorize("ADMIN", "HR"),
  portfolioController.deleteSubjectSyllabus
);

// Get syllabus version history for a subject
router.get(
  "/:trainerId/subject/:subjectId/syllabus/history",
  authenticate,
  authorize("ADMIN", "HR"),
  portfolioController.getSyllabusHistory
);

// Get subjects for a specific trainer
router.get(
  "/:trainerId/subjects",
  authenticate,
  portfolioController.getTrainerSubjects
);

export default router;