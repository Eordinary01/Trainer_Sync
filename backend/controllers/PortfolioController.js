// controllers/PortfolioController.js
import User from "../models/User.model.js";
import { ValidationError, NotFoundError } from "../utils/errorHandler.js";

export class PortfolioController {
  constructor() {
    // ============================================
    // BIND ALL METHODS TO PRESERVE 'this' CONTEXT
    // ============================================
    this.getCurrentSemester = this.getCurrentSemester.bind(this);
    this.checkPermission = this.checkPermission.bind(this);

    // Full Portfolio
    this.getFullPortfolio = this.getFullPortfolio.bind(this);

    // Subjects
    this.getUserSubjects = this.getUserSubjects.bind(this);
    this.addSubject = this.addSubject.bind(this);
    this.updateSubject = this.updateSubject.bind(this);
    this.deleteSubject = this.deleteSubject.bind(this);

    // Projects
    this.getUserProjects = this.getUserProjects.bind(this);
    this.addProject = this.addProject.bind(this);
    this.updateProject = this.updateProject.bind(this);
    this.deleteProject = this.deleteProject.bind(this);
    this.verifyProject = this.verifyProject.bind(this);

    // Qualifications
    this.getUserQualifications = this.getUserQualifications.bind(this);
    this.addQualification = this.addQualification.bind(this);
    this.updateQualification = this.updateQualification.bind(this);
    this.deleteQualification = this.deleteQualification.bind(this);

    // Experience
    this.getUserExperience = this.getUserExperience.bind(this);
    this.addExperience = this.addExperience.bind(this);
    this.updateExperience = this.updateExperience.bind(this);
    this.deleteExperience = this.deleteExperience.bind(this);

    // Certifications
    this.getUserCertifications = this.getUserCertifications.bind(this);
    this.addCertification = this.addCertification.bind(this);
    this.updateCertification = this.updateCertification.bind(this);
    this.deleteCertification = this.deleteCertification.bind(this);

    // Skills
    this.getUserSkills = this.getUserSkills.bind(this);
    this.addSkill = this.addSkill.bind(this);
    this.removeSkill = this.removeSkill.bind(this);

    // Activities
    this.getUserActivities = this.getUserActivities.bind(this);
    this.addActivity = this.addActivity.bind(this);
    this.updateActivity = this.updateActivity.bind(this);
    this.deleteActivity = this.deleteActivity.bind(this);
    this.verifyActivity = this.verifyActivity.bind(this);

    // Achievements
    this.addAchievement = this.addAchievement.bind(this);

    // Placement
    this.upsertPlacementStats = this.upsertPlacementStats.bind(this);
    this.upsertPlacementCompany = this.upsertPlacementCompany.bind(this);
    this.deletePlacementStats = this.deletePlacementStats.bind(this);
    this.deletePlacementCompany = this.deletePlacementCompany.bind(this);
    this.verifyPlacementRecord = this.verifyPlacementRecord.bind(this);

    // University
    this.updateUniversityInfo = this.updateUniversityInfo.bind(this);

    // ============================================
    // SYLLABUS MANAGEMENT METHODS
    // ============================================
    this.getTrainersForSyllabus = this.getTrainersForSyllabus.bind(this);
    this.getAllSubjectsWithSyllabus = this.getAllSubjectsWithSyllabus.bind(this);
    this.getSyllabusStats = this.getSyllabusStats.bind(this);
    this.getSubjectSyllabus = this.getSubjectSyllabus.bind(this);
    this.uploadSubjectSyllabus = this.uploadSubjectSyllabus.bind(this);
    this.updateSubjectSyllabus = this.updateSubjectSyllabus.bind(this);
    this.deleteSubjectSyllabus = this.deleteSubjectSyllabus.bind(this);
    this.getSyllabusHistory = this.getSyllabusHistory.bind(this);
    this.getTrainerSubjects = this.getTrainerSubjects.bind(this);
  }

  // ============================================
  // HELPER METHODS
  // ============================================
  getCurrentSemester() {
    const month = new Date().getMonth() + 1;
    if (month >= 1 && month <= 6) return 2; // Jan-Jun: Even semester
    return 1; // Jul-Dec: Odd semester
  }

  checkPermission(req, targetUserId) {
    // Ensure req.user exists
    if (!req.user || !req.user.userId) {
      throw new ValidationError("Authentication required");
    }

    const isAdminOrHR = ["ADMIN", "HR"].includes(req.user.role);
    const isOwnProfile = req.user.userId === targetUserId;

    if (!isOwnProfile && !isAdminOrHR) {
      throw new ValidationError(
        "You do not have permission to view this portfolio",
      );
    }

    return { isOwnProfile, isAdminOrHR };
  }

  // ============================================
  // FULL PORTFOLIO ACCESS
  // ============================================
  async getFullPortfolio(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;

      // Check permission
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId)
        .select("-password -passwordResetToken -loginAttempts -lockUntil")
        .lean();

      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Get portfolio summary
      const summary = {
        university: user.profile?.university?.name || null,
        subjectsCount: user.profile?.subjects?.length || 0,
        projectsCount: user.profile?.projects?.length || 0,
        qualificationsCount: user.profile?.qualifications?.length || 0,
        experienceCount: user.profile?.experience?.length || 0,
        certificationsCount: user.profile?.certifications?.length || 0,
        skills: user.profile?.skills || [],
        activitiesCount:
          user.profile?.semesterActivities?.reduce(
            (acc, sa) => acc + (sa.activities?.length || 0),
            0,
          ) || 0,
      };

      // Get placement stats
      const placementStats = {
        totalCompanies: user.profile?.placementRecord?.companies?.length || 0,
        topRecruiters: user.profile?.placementRecord?.topRecruiters || [],
        latestStats:
          user.profile?.placementRecord?.stats?.length > 0
            ? user.profile.placementRecord.stats.sort(
                (a, b) => b.year - a.year,
              )[0]
            : null,
        coordinator: user.profile?.placementRecord?.coordinator,
      };

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            trainerCategory: user.trainerCategory,
            status: user.status,
          },
          profile: user.profile || {},
          summary,
          placementStats,
          lastUpdated: user.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // SUBJECTS
  // ============================================
  async getUserSubjects(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId).select(
        "profile.subjects profile.firstName profile.lastName",
      );

      if (!user) throw new NotFoundError("User not found");

      res.status(200).json({
        success: true,
        data: {
          trainerName:
            `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim(),
          subjects: user.profile?.subjects || [],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async addSubject(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const { name, code, year, semester, credits } = req.body;

      if (!name || !year) {
        throw new ValidationError("Subject name and year are required");
      }

      if (!user.profile.subjects) {
        user.profile.subjects = [];
      }

      const newSubject = {
        name,
        code: code || "",
        year: parseInt(year),
        semester: semester ? parseInt(semester) : null,
        credits: credits ? parseInt(credits) : null,
        status: "ACTIVE",
      };

      user.profile.subjects.push(newSubject);
      await user.save();

      res.status(201).json({
        success: true,
        message: "Subject added successfully",
        data: newSubject,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSubject(req, res, next) {
    try {
      const { subjectId } = req.params;
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const subject = user.profile.subjects.id(subjectId);
      if (!subject) {
        throw new NotFoundError("Subject not found");
      }

      const { name, code, year, semester, credits, status } = req.body;

      if (name) subject.name = name;
      if (code !== undefined) subject.code = code;
      if (year) subject.year = parseInt(year);
      if (semester !== undefined)
        subject.semester = semester ? parseInt(semester) : null;
      if (credits !== undefined)
        subject.credits = credits ? parseInt(credits) : null;
      if (status) subject.status = status;

      await user.save();

      res.status(200).json({
        success: true,
        message: "Subject updated successfully",
        data: subject,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteSubject(req, res, next) {
    try {
      const { subjectId } = req.params;
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const subjectIndex = user.profile.subjects.findIndex(
        (s) => s._id.toString() === subjectId,
      );

      if (subjectIndex === -1) {
        throw new NotFoundError("Subject not found");
      }

      user.profile.subjects.splice(subjectIndex, 1);
      await user.save();

      res.status(200).json({
        success: true,
        message: "Subject deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // PROJECTS
  // ============================================
  async getUserProjects(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId).select(
        "profile.projects profile.firstName profile.lastName",
      );

      if (!user) throw new NotFoundError("User not found");

      res.status(200).json({
        success: true,
        data: {
          trainerName:
            `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim(),
          projects: user.profile?.projects || [],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async addProject(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const {
        title,
        description,
        type,
        technologies,
        role,
        duration,
        outcomes,
      } = req.body;

      if (!title) {
        throw new ValidationError("Project title is required");
      }

      // ✅ Validate project type against enum
      const validProjectTypes = [
        "ACADEMIC",
        "INDUSTRY",
        "RESEARCH",
        "PERSONAL",
      ];
      if (type && !validProjectTypes.includes(type)) {
        throw new ValidationError(
          `Invalid project type. Must be one of: ${validProjectTypes.join(", ")}`,
        );
      }

      if (!user.profile.projects) {
        user.profile.projects = [];
      }

      const newProject = {
        title,
        description: description || "",
        type: type || "PERSONAL", // Default to PERSONAL if not provided
        technologies: technologies || [],
        role: role || "",
        duration: duration || { ongoing: false },
        outcomes: outcomes || [],
        verifiedBy: null,
        createdAt: new Date(),
      };

      user.profile.projects.push(newProject);
      await user.save();

      res.status(201).json({
        success: true,
        message: "Project added successfully",
        data: newProject,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProject(req, res, next) {
    try {
      const { projectId } = req.params;
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const project = user.profile.projects.id(projectId);
      if (!project) {
        throw new NotFoundError("Project not found");
      }

      const {
        title,
        description,
        type,
        technologies,
        role,
        duration,
        outcomes,
      } = req.body;

      // ✅ Validate project type if provided
      if (type) {
        const validProjectTypes = [
          "ACADEMIC",
          "INDUSTRY",
          "RESEARCH",
          "PERSONAL",
        ];
        if (!validProjectTypes.includes(type)) {
          throw new ValidationError(
            `Invalid project type. Must be one of: ${validProjectTypes.join(", ")}`,
          );
        }
        project.type = type;
      }

      if (title) project.title = title;
      if (description !== undefined) project.description = description;
      if (technologies) project.technologies = technologies;
      if (role !== undefined) project.role = role;
      if (duration) project.duration = duration;
      if (outcomes) project.outcomes = outcomes;

      await user.save();

      res.status(200).json({
        success: true,
        message: "Project updated successfully",
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProject(req, res, next) {
    try {
      const { projectId } = req.params;
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const projectIndex = user.profile.projects.findIndex(
        (p) => p._id.toString() === projectId,
      );

      if (projectIndex === -1) {
        throw new NotFoundError("Project not found");
      }

      user.profile.projects.splice(projectIndex, 1);
      await user.save();

      res.status(200).json({
        success: true,
        message: "Project deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyProject(req, res, next) {
    try {
      console.log("=== VERIFY PROJECT DEBUG ===");
      console.log("1. Request params:", req.params);
      console.log("2. Request user:", {
        userId: req.user?.userId,
        role: req.user?.role,
      });

      const { projectId } = req.params;
      const targetUserId = req.params.userId || req.user.userId;

      console.log("3. Target User ID:", targetUserId);
      console.log("4. Project ID:", projectId);

      // Only Admin/HR can verify
      if (!["ADMIN", "HR"].includes(req.user.role)) {
        throw new ValidationError("Only Admin/HR can verify projects");
      }

      const user = await User.findById(targetUserId);
      if (!user) {
        console.log("5. ❌ User not found in database");
        throw new NotFoundError("User not found");
      }

      console.log("6. ✅ User found:", {
        id: user._id,
        username: user.username,
        email: user.email,
        projectsCount: user.profile?.projects?.length || 0,
      });

      // Find the project
      const project = user.profile.projects.id(projectId);

      if (!project) {
        console.log("7. ❌ Project not found");
        console.log("8. Project ID searched for:", projectId);

        // Check if the ID format is valid
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(projectId);
        console.log("9. Is valid ObjectId?", isValidObjectId);

        throw new NotFoundError("Project not found");
      }

      console.log("10. ✅ Project found:", {
        projectId: project._id,
        title: project.title,
        type: project.type,
      });

      // Check if already verified
      if (project.verifiedBy) {
        throw new ValidationError("Project is already verified");
      }

      const { remarks } = req.body;

      project.verifiedBy = req.user.userId;
      if (remarks) {
        project.verifiedRemarks = remarks;
      }
      project.verifiedAt = new Date();

      // Mark as modified
      user.markModified("profile.projects");

      await user.save();

      console.log("11. ✅ Project verified successfully");

      res.status(200).json({
        success: true,
        message: "Project verified successfully",
        data: project,
      });
    } catch (error) {
      console.error("❌ Error in verifyProject:", error);
      next(error);
    }
  }

  // ============================================
  // QUALIFICATIONS
  // ============================================
  async getUserQualifications(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId).select(
        "profile.qualifications profile.firstName profile.lastName",
      );

      if (!user) throw new NotFoundError("User not found");

      res.status(200).json({
        success: true,
        data: {
          trainerName:
            `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim(),
          qualifications: user.profile?.qualifications || [],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async addQualification(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const {
        degree,
        specialization,
        university,
        year,
        percentage,
        grade,
        type,
      } = req.body;

      if (!degree || !university) {
        throw new ValidationError("Degree and university are required");
      }

      if (!user.profile.qualifications) {
        user.profile.qualifications = [];
      }

      const newQualification = {
        degree,
        specialization: specialization || "",
        university,
        year: year ? parseInt(year) : null,
        percentage: percentage ? parseFloat(percentage) : null,
        grade: grade || "",
        type: type || "CERTIFICATION",
      };

      user.profile.qualifications.push(newQualification);
      await user.save();

      res.status(201).json({
        success: true,
        message: "Qualification added successfully",
        data: newQualification,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateQualification(req, res, next) {
    try {
      const { qualificationId } = req.params;
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const qualification = user.profile.qualifications.id(qualificationId);
      if (!qualification) {
        throw new NotFoundError("Qualification not found");
      }

      const updates = req.body;
      Object.keys(updates).forEach((key) => {
        if (updates[key] !== undefined) {
          if (key === "year") qualification.year = parseInt(updates.year);
          else if (key === "percentage")
            qualification.percentage = parseFloat(updates.percentage);
          else qualification[key] = updates[key];
        }
      });

      await user.save();

      res.status(200).json({
        success: true,
        message: "Qualification updated successfully",
        data: qualification,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteQualification(req, res, next) {
    try {
      const { qualificationId } = req.params;
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const qualIndex = user.profile.qualifications.findIndex(
        (q) => q._id.toString() === qualificationId,
      );

      if (qualIndex === -1) {
        throw new NotFoundError("Qualification not found");
      }

      user.profile.qualifications.splice(qualIndex, 1);
      await user.save();

      res.status(200).json({
        success: true,
        message: "Qualification deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // EXPERIENCE
  // ============================================
  async getUserExperience(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId).select(
        "profile.experience profile.firstName profile.lastName",
      );

      if (!user) throw new NotFoundError("User not found");

      res.status(200).json({
        success: true,
        data: {
          trainerName:
            `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim(),
          experience: user.profile?.experience || [],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async addExperience(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const {
        organization,
        role,
        fromDate,
        toDate,
        current,
        description,
        type,
      } = req.body;

      if (!organization || !role) {
        throw new ValidationError("Organization and role are required");
      }

      if (!user.profile.experience) {
        user.profile.experience = [];
      }

      const newExperience = {
        organization,
        role,
        duration: {
          from: fromDate || null,
          to: current ? null : toDate || null,
          current: current || false,
        },
        description: description || "",
        type: type || "TEACHING",
      };

      user.profile.experience.push(newExperience);
      await user.save();

      res.status(201).json({
        success: true,
        message: "Experience added successfully",
        data: newExperience,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateExperience(req, res, next) {
    try {
      const { experienceId } = req.params;
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const experience = user.profile.experience.id(experienceId);
      if (!experience) {
        throw new NotFoundError("Experience not found");
      }

      const {
        organization,
        role,
        fromDate,
        toDate,
        current,
        description,
        type,
      } = req.body;

      if (organization) experience.organization = organization;
      if (role) experience.role = role;
      if (description !== undefined) experience.description = description;
      if (type) experience.type = type;

      if (
        fromDate !== undefined ||
        toDate !== undefined ||
        current !== undefined
      ) {
        experience.duration = {
          from: fromDate !== undefined ? fromDate : experience.duration.from,
          to: current
            ? null
            : toDate !== undefined
              ? toDate
              : experience.duration.to,
          current:
            current !== undefined ? current : experience.duration.current,
        };
      }

      await user.save();

      res.status(200).json({
        success: true,
        message: "Experience updated successfully",
        data: experience,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteExperience(req, res, next) {
    try {
      const { experienceId } = req.params;
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const expIndex = user.profile.experience.findIndex(
        (e) => e._id.toString() === experienceId,
      );

      if (expIndex === -1) {
        throw new NotFoundError("Experience not found");
      }

      user.profile.experience.splice(expIndex, 1);
      await user.save();

      res.status(200).json({
        success: true,
        message: "Experience deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // CERTIFICATIONS
  // ============================================
  async getUserCertifications(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId).select(
        "profile.certifications profile.firstName profile.lastName",
      );

      if (!user) throw new NotFoundError("User not found");

      res.status(200).json({
        success: true,
        data: {
          trainerName:
            `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim(),
          certifications: user.profile?.certifications || [],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async addCertification(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const { name, issuingOrganization, issueDate, expiryDate, credentialId } =
        req.body;

      if (!name || !issuingOrganization) {
        throw new ValidationError(
          "Certification name and issuing organization are required",
        );
      }

      if (!user.profile.certifications) {
        user.profile.certifications = [];
      }

      const newCertification = {
        name,
        issuingOrganization,
        issueDate: issueDate || null,
        expiryDate: expiryDate || null,
        credentialId: credentialId || "",
      };

      user.profile.certifications.push(newCertification);
      await user.save();

      res.status(201).json({
        success: true,
        message: "Certification added successfully",
        data: newCertification,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCertification(req, res, next) {
    try {
      const { certificationId } = req.params;
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const certification = user.profile.certifications.id(certificationId);
      if (!certification) {
        throw new NotFoundError("Certification not found");
      }

      const updates = req.body;
      Object.keys(updates).forEach((key) => {
        if (updates[key] !== undefined) {
          certification[key] = updates[key];
        }
      });

      await user.save();

      res.status(200).json({
        success: true,
        message: "Certification updated successfully",
        data: certification,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCertification(req, res, next) {
    try {
      const { certificationId } = req.params;
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const certIndex = user.profile.certifications.findIndex(
        (c) => c._id.toString() === certificationId,
      );

      if (certIndex === -1) {
        throw new NotFoundError("Certification not found");
      }

      user.profile.certifications.splice(certIndex, 1);
      await user.save();

      res.status(200).json({
        success: true,
        message: "Certification deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // SKILLS
  // ============================================
  async getUserSkills(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId).select(
        "profile.skills profile.firstName profile.lastName",
      );

      if (!user) throw new NotFoundError("User not found");

      res.status(200).json({
        success: true,
        data: {
          trainerName:
            `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim(),
          skills: user.profile?.skills || [],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async addSkill(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const { skill } = req.body;

      if (!skill) {
        throw new ValidationError("Skill is required");
      }

      if (!user.profile.skills) {
        user.profile.skills = [];
      }

      if (!user.profile.skills.includes(skill)) {
        user.profile.skills.push(skill);
        await user.save();
      }

      res.status(201).json({
        success: true,
        message: "Skill added successfully",
        data: user.profile.skills,
      });
    } catch (error) {
      next(error);
    }
  }

  async removeSkill(req, res, next) {
    try {
      const { skill } = req.params;
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const skillIndex = user.profile.skills.findIndex((s) => s === skill);

      if (skillIndex === -1) {
        throw new NotFoundError("Skill not found");
      }

      user.profile.skills.splice(skillIndex, 1);
      await user.save();

      res.status(200).json({
        success: true,
        message: "Skill removed successfully",
        data: user.profile.skills,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ACTIVITIES (Individual Activities inside Semesters)
  // ============================================
  async getUserActivities(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId).select(
        "profile.semesterActivities profile.firstName profile.lastName",
      );

      if (!user) throw new NotFoundError("User not found");

      // Flatten all activities from all semesters for easier viewing
      const allActivities =
        user.profile?.semesterActivities?.flatMap(
          (semester) =>
            semester.activities?.map((activity) => ({
              ...activity.toObject(),
              semester: semester.semester,
              year: semester.year,
            })) || [],
        ) || [];

      res.status(200).json({
        success: true,
        data: {
          trainerName:
            `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim(),
          activitiesBySemester: user.profile?.semesterActivities || [],
          allActivities: allActivities,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async addActivity(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const { title, description, semester, year, type, achievements } =
        req.body;

      if (!title || !description || !semester || !year) {
        throw new ValidationError(
          "Title, description, semester, and year are required",
        );
      }

      // ✅ VALIDATE TYPE AGAINST ENUM
      const validTypes = [
        "WORKSHOP",
        "SEMINAR",
        "PROJECT",
        "EVENT",
        "ACHIEVEMENT",
        "COMPETITION",
      ];

      if (!type || !validTypes.includes(type)) {
        throw new ValidationError(
          `Invalid activity type. Must be one of: ${validTypes.join(", ")}`,
        );
      }

      // Parse values
      const parsedSemester = parseInt(semester);
      const parsedYear = parseInt(year);

      // Ensure semesterActivities array exists
      if (!user.profile.semesterActivities) {
        user.profile.semesterActivities = [];
      }

      // Find existing semester entry
      let semesterEntry = user.profile.semesterActivities.find(
        (sa) => sa.semester === parsedSemester && sa.year === parsedYear,
      );

      if (!semesterEntry) {
        user.profile.semesterActivities.push({
          semester: parsedSemester,
          year: parsedYear,
          activities: [],
          summary: "",
        });
        semesterEntry =
          user.profile.semesterActivities[
            user.profile.semesterActivities.length - 1
          ];
      }

      // Create new activity with validated type
      const newActivity = {
        title,
        description,
        type,
        achievements: achievements || [],
        date: new Date(),
        verifiedBy: null,
      };

      semesterEntry.activities.push(newActivity);
      user.markModified("profile.semesterActivities");

      await user.save();

      const addedActivity =
        semesterEntry.activities[semesterEntry.activities.length - 1];
      const activityObj = addedActivity.toObject
        ? addedActivity.toObject()
        : addedActivity;

      res.status(201).json({
        success: true,
        message: "Activity added successfully",
        data: {
          ...activityObj,
          semester: semesterEntry.semester,
          year: semesterEntry.year,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateActivity(req, res, next) {
    try {
      const { activityId } = req.params;
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      // Find the activity across all semesters
      let foundSemester = null;
      let foundActivity = null;

      for (const semester of user.profile.semesterActivities || []) {
        const activity = semester.activities.id(activityId);
        if (activity) {
          foundSemester = semester;
          foundActivity = activity;
          break;
        }
      }

      if (!foundActivity) {
        throw new NotFoundError("Activity not found");
      }

      const { title, description, type, achievements } = req.body;

      if (title) foundActivity.title = title;
      if (description) foundActivity.description = description;
      if (type) foundActivity.type = type;
      if (achievements) foundActivity.achievements = achievements;

      await user.save();

      res.status(200).json({
        success: true,
        message: "Activity updated successfully",
        data: {
          ...foundActivity.toObject(),
          semester: foundSemester.semester,
          year: foundSemester.year,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteActivity(req, res, next) {
    try {
      const { activityId } = req.params;
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      console.log("=== DELETE ACTIVITY DEBUG ===");
      console.log("Activity ID to delete:", activityId);
      console.log(
        "Current semesterActivities:",
        JSON.stringify(user.profile.semesterActivities, null, 2),
      );

      // Find and remove the activity with proper path tracking
      let found = false;
      let semesterIndex = -1;
      let activityIndex = -1;

      for (let i = 0; i < (user.profile.semesterActivities || []).length; i++) {
        const semester = user.profile.semesterActivities[i];
        const actIndex = semester.activities.findIndex(
          (a) => a._id.toString() === activityId,
        );

        if (actIndex !== -1) {
          semesterIndex = i;
          activityIndex = actIndex;

          // Remove the activity
          semester.activities.splice(actIndex, 1);

          // If semester becomes empty, optionally remove it
          if (semester.activities.length === 0) {
            user.profile.semesterActivities.splice(i, 1);
            user.markModified("profile.semesterActivities");
          } else {
            // Mark the specific path as modified
            user.markModified(`profile.semesterActivities.${i}.activities`);
          }

          found = true;
          console.log(
            `✅ Activity found and removed from semester ${i}, activity index ${actIndex}`,
          );
          break;
        }
      }

      if (!found) {
        console.log("❌ Activity not found in any semester");
        throw new NotFoundError("Activity not found");
      }

      await user.save();
      console.log("✅ User saved successfully after deletion");

      res.status(200).json({
        success: true,
        message: "Activity deleted successfully",
      });
    } catch (error) {
      console.error("❌ Error in deleteActivity:", error);
      next(error);
    }
  }

  async verifyActivity(req, res, next) {
    try {
      console.log("=== VERIFY ACTIVITY DEBUG ===");
      console.log("1. Request params:", req.params);
      console.log("2. Request user:", {
        userId: req.user?.userId,
        role: req.user?.role,
      });

      const { activityId } = req.params;
      const targetUserId = req.params.userId || req.user.userId;

      console.log("3. Target User ID:", targetUserId);
      console.log("4. Activity ID:", activityId);

      // Only Admin/HR can verify
      if (!["ADMIN", "HR"].includes(req.user.role)) {
        throw new ValidationError("Only Admin/HR can verify activities");
      }

      const user = await User.findById(targetUserId);
      if (!user) {
        console.log("5. ❌ User not found in database");
        throw new NotFoundError("User not found");
      }

      console.log("6. ✅ User found:", {
        id: user._id,
        username: user.username,
        email: user.email,
        hasSemesterActivities: !!user.profile?.semesterActivities,
        semesterActivitiesCount: user.profile?.semesterActivities?.length || 0,
      });

      // Log all activities in the user's profile for debugging
      if (user.profile?.semesterActivities) {
        console.log("7. All activities in user profile:");
        user.profile.semesterActivities.forEach((semester, sIdx) => {
          console.log(`   Semester ${sIdx + 1}:`, {
            semester: semester.semester,
            year: semester.year,
            activitiesCount: semester.activities?.length || 0,
            activityIds:
              semester.activities?.map((a) => a._id.toString()) || [],
          });
        });
      }

      // Find the activity across all semesters
      let foundSemester = null;
      let foundActivity = null;
      let semesterIndex = -1;
      let activityIndex = -1;

      for (let i = 0; i < (user.profile.semesterActivities || []).length; i++) {
        const semester = user.profile.semesterActivities[i];
        // Try to find by ID using Mongoose's .id() method
        const activity = semester.activities.id(activityId);

        if (activity) {
          semesterIndex = i;
          activityIndex = semester.activities.findIndex(
            (a) => a._id.toString() === activityId,
          );
          foundSemester = semester;
          foundActivity = activity;
          console.log(`8. ✅ Activity found in semester ${i + 1}:`, {
            activityId: activity._id,
            title: activity.title,
            type: activity.type,
          });
          break;
        }
      }

      if (!foundActivity) {
        console.log("9. ❌ Activity not found in any semester");
        console.log("10. Activity ID searched for:", activityId);

        // Check if the ID format is valid
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(activityId);
        console.log("11. Is valid ObjectId?", isValidObjectId);

        throw new NotFoundError("Activity not found");
      }

      // Check if already verified
      if (foundActivity.verifiedBy) {
        throw new ValidationError("Activity is already verified");
      }

      const { remarks } = req.body;

      foundActivity.verifiedBy = req.user.userId;
      if (remarks) {
        foundActivity.verifiedRemarks = remarks;
      }
      foundActivity.verifiedAt = new Date();

      // Mark the specific path as modified
      const activityPath = `profile.semesterActivities.${semesterIndex}.activities.${activityIndex}`;
      user.markModified(activityPath);

      await user.save();

      console.log("12. ✅ Activity verified successfully");

      res.status(200).json({
        success: true,
        message: "Activity verified successfully",
        data: {
          ...foundActivity.toObject(),
          semester: foundSemester.semester,
          year: foundSemester.year,
          verifiedBy: foundActivity.verifiedBy,
          verifiedAt: foundActivity.verifiedAt,
        },
      });
    } catch (error) {
      console.error("❌ Error in verifyActivity:", error);
      next(error);
    }
  }

  // ============================================
  // ACHIEVEMENTS
  // ============================================
  async addAchievement(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;
      this.checkPermission(req, targetUserId);

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const {
        title,
        description,
        date,
        type,
        semester,
        year,
        achievements,
        mediaUrls,
      } = req.body;

      if (!title || !description) {
        throw new ValidationError("Title and description are required");
      }

      const currentDate = new Date();
      const targetSemester = semester || this.getCurrentSemester();
      const targetYear = year || currentDate.getFullYear();

      if (!user.profile.semesterActivities) {
        user.profile.semesterActivities = [];
      }

      let semesterActivity = user.profile.semesterActivities.find(
        (sa) => sa.semester === targetSemester && sa.year === targetYear,
      );

      if (!semesterActivity) {
        semesterActivity = {
          semester: targetSemester,
          year: targetYear,
          activities: [],
          summary: "",
        };
        user.profile.semesterActivities.push(semesterActivity);
      }

      const newAchievement = {
        title,
        description,
        date: date || new Date(),
        type: type || "ACHIEVEMENT",
        achievements: achievements || [],
        mediaUrls: mediaUrls || [],
      };

      semesterActivity.activities.push(newAchievement);
      await user.save();

      res.status(201).json({
        success: true,
        message: "Achievement added successfully",
        data: newAchievement,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // PLACEMENT RECORDS
  // ============================================
  // Get placement records
  async getUserPlacementRecord(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;

      const isAdminOrHR = ["ADMIN", "HR"].includes(req.user.role);
      const isOwnProfile = req.user.userId === targetUserId;

      if (!isOwnProfile && !isAdminOrHR) {
        throw new ValidationError(
          "You do not have permission to view placement records",
        );
      }

      const user = await User.findById(targetUserId).select(
        "profile.placementRecord profile.firstName profile.lastName",
      );

      if (!user) throw new NotFoundError("User not found");

      const placementRecord = user.profile?.placementRecord || {
        coordinator: {},
        stats: [],
        companies: [],
        topRecruiters: [],
      };

      res.status(200).json({
        success: true,
        data: {
          trainerName:
            `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim(),
          placementRecord,
          isVerified: !!placementRecord.verifiedBy,
          verifiedBy: placementRecord.verifiedBy,
          verifiedAt: placementRecord.verifiedAt,
          summary: {
            totalStats: placementRecord.stats?.length || 0,
            totalCompanies: placementRecord.companies?.length || 0,
            latestYear:
              placementRecord.stats?.length > 0
                ? Math.max(...placementRecord.stats.map((s) => s.year))
                : null,
            averagePlacementRate:
              placementRecord.stats?.length > 0
                ? (
                    placementRecord.stats.reduce(
                      (acc, s) => acc + (s.placementPercentage || 0),
                      0,
                    ) / placementRecord.stats.length
                  ).toFixed(1)
                : 0,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Add or Update Placement Stats
  async upsertPlacementStats(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;

      const isOwnProfile = req.user.userId === targetUserId;
      const isAdminOrHR = ["ADMIN", "HR"].includes(req.user.role);

      if (!isOwnProfile && !isAdminOrHR) {
        throw new ValidationError(
          "You do not have permission to modify placement records",
        );
      }

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const {
        year,
        totalStudents,
        placedStudents,
        highestPackage,
        averagePackage,
        medianPackage,
      } = req.body;

      if (!year || !totalStudents || placedStudents === undefined) {
        throw new ValidationError(
          "Year, totalStudents, and placedStudents are required",
        );
      }

      if (!user.profile.placementRecord) {
        user.profile.placementRecord = {
          stats: [],
          companies: [],
          topRecruiters: [],
        };
      }

      const existingIndex = user.profile.placementRecord.stats.findIndex(
        (s) => s.year === parseInt(year),
      );

      const placementPercentage =
        totalStudents > 0
          ? (parseInt(placedStudents) / parseInt(totalStudents)) * 100
          : 0;

      const newStat = {
        year: parseInt(year),
        totalStudents: parseInt(totalStudents),
        placedStudents: parseInt(placedStudents),
        placementPercentage,
        highestPackage: highestPackage ? parseFloat(highestPackage) : null,
        averagePackage: averagePackage ? parseFloat(averagePackage) : null,
        medianPackage: medianPackage ? parseFloat(medianPackage) : null,
      };

      if (existingIndex >= 0) {
        user.profile.placementRecord.stats[existingIndex] = newStat;
      } else {
        user.profile.placementRecord.stats.push(newStat);
      }

      // Reset verification when data changes
      user.profile.placementRecord.verifiedBy = null;
      user.profile.placementRecord.verifiedAt = null;
      user.profile.placementRecord.verifiedRemarks = null;
      user.profile.placementRecord.lastUpdated = new Date();

      user.markModified("profile.placementRecord");
      await user.save();

      res.status(200).json({
        success: true,
        message:
          existingIndex >= 0
            ? "Placement stats updated successfully"
            : "Placement stats added successfully",
        data: user.profile.placementRecord,
      });
    } catch (error) {
      next(error);
    }
  }

  // Add or Update Company
  async upsertPlacementCompany(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;

      const isOwnProfile = req.user.userId === targetUserId;
      const isAdminOrHR = ["ADMIN", "HR"].includes(req.user.role);

      if (!isOwnProfile && !isAdminOrHR) {
        throw new ValidationError(
          "You do not have permission to modify placement records",
        );
      }

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const { companyId, name, year, studentsPlaced, packages, roles } =
        req.body;

      if (!name || !year || !studentsPlaced) {
        throw new ValidationError(
          "Company name, year, and studentsPlaced are required",
        );
      }

      if (!user.profile.placementRecord) {
        user.profile.placementRecord = {
          stats: [],
          companies: [],
          topRecruiters: [],
        };
      }
      if (!user.profile.placementRecord.companies) {
        user.profile.placementRecord.companies = [];
      }

      const newCompany = {
        name,
        year: parseInt(year),
        studentsPlaced: parseInt(studentsPlaced),
        packages: {
          highest: packages?.highest ? parseFloat(packages.highest) : null,
          average: packages?.average ? parseFloat(packages.average) : null,
          lowest: packages?.lowest ? parseFloat(packages.lowest) : null,
        },
        roles: roles || [],
        visitDate: new Date(),
      };

      if (companyId) {
        // Update existing company
        const companyIndex = user.profile.placementRecord.companies.findIndex(
          (c) => c._id.toString() === companyId,
        );
        if (companyIndex === -1) {
          throw new NotFoundError("Company not found");
        }

        user.profile.placementRecord.companies[companyIndex] = {
          ...user.profile.placementRecord.companies[companyIndex].toObject(),
          ...newCompany,
        };
      } else {
        // Add new company
        user.profile.placementRecord.companies.push(newCompany);
      }

      // Update topRecruiters based on student count
      if (studentsPlaced > 10) {
        if (!user.profile.placementRecord.topRecruiters.includes(name)) {
          user.profile.placementRecord.topRecruiters.push(name);
        }
      }

      // Reset verification when data changes
      user.profile.placementRecord.verifiedBy = null;
      user.profile.placementRecord.verifiedAt = null;
      user.profile.placementRecord.verifiedRemarks = null;
      user.profile.placementRecord.lastUpdated = new Date();

      user.markModified("profile.placementRecord");
      await user.save();

      res.status(200).json({
        success: true,
        message: companyId
          ? "Company updated successfully"
          : "Company added successfully",
        data: user.profile.placementRecord,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete Placement Stats
  async deletePlacementStats(req, res, next) {
    try {
      const { statId } = req.params;
      const targetUserId = req.params.userId || req.user.userId;

      const isOwnProfile = req.user.userId === targetUserId;
      const isAdminOrHR = ["ADMIN", "HR"].includes(req.user.role);

      if (!isOwnProfile && !isAdminOrHR) {
        throw new ValidationError(
          "You do not have permission to delete placement stats",
        );
      }

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const statIndex = user.profile.placementRecord?.stats?.findIndex(
        (s) => s._id.toString() === statId,
      );

      if (statIndex === -1 || statIndex === undefined) {
        throw new NotFoundError("Placement stat not found");
      }

      user.profile.placementRecord.stats.splice(statIndex, 1);

      // Reset verification when data changes
      user.profile.placementRecord.verifiedBy = null;
      user.profile.placementRecord.verifiedAt = null;
      user.profile.placementRecord.verifiedRemarks = null;
      user.profile.placementRecord.lastUpdated = new Date();

      user.markModified("profile.placementRecord");
      await user.save();

      res.status(200).json({
        success: true,
        message: "Placement stats deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete Placement Company
  async deletePlacementCompany(req, res, next) {
    try {
      const { companyId } = req.params;
      const targetUserId = req.params.userId || req.user.userId;

      const isOwnProfile = req.user.userId === targetUserId;
      const isAdminOrHR = ["ADMIN", "HR"].includes(req.user.role);

      if (!isOwnProfile && !isAdminOrHR) {
        throw new ValidationError(
          "You do not have permission to delete placement companies",
        );
      }

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const companyIndex = user.profile.placementRecord?.companies?.findIndex(
        (c) => c._id.toString() === companyId,
      );

      if (companyIndex === -1 || companyIndex === undefined) {
        throw new NotFoundError("Placement company not found");
      }

      user.profile.placementRecord.companies.splice(companyIndex, 1);

      // Reset verification when data changes
      user.profile.placementRecord.verifiedBy = null;
      user.profile.placementRecord.verifiedAt = null;
      user.profile.placementRecord.verifiedRemarks = null;
      user.profile.placementRecord.lastUpdated = new Date();

      user.markModified("profile.placementRecord");
      await user.save();

      res.status(200).json({
        success: true,
        message: "Placement company deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify Entire Placement Record
  async verifyPlacementRecord(req, res, next) {
    try {
      console.log("=== VERIFY PLACEMENT RECORD DEBUG ===");
      const targetUserId = req.params.userId || req.user.userId;

      if (!["ADMIN", "HR"].includes(req.user.role)) {
        throw new ValidationError("Only Admin/HR can verify placement records");
      }

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      if (!user.profile.placementRecord) {
        throw new ValidationError("No placement record found to verify");
      }

      if (user.profile.placementRecord.verifiedBy) {
        throw new ValidationError("Placement record is already verified");
      }

      const { remarks } = req.body;

      user.profile.placementRecord.verifiedBy = req.user.userId;
      user.profile.placementRecord.verifiedAt = new Date();
      user.profile.placementRecord.verifiedRemarks = remarks || "";
      user.profile.placementRecord.lastUpdated = new Date();

      user.markModified("profile.placementRecord");
      await user.save();

      res.status(200).json({
        success: true,
        message: "Placement record verified successfully",
        data: {
          verifiedBy: user.profile.placementRecord.verifiedBy,
          verifiedAt: user.profile.placementRecord.verifiedAt,
          verifiedRemarks: user.profile.placementRecord.verifiedRemarks,
        },
      });
    } catch (error) {
      console.error("❌ Error in verifyPlacementRecord:", error);
      next(error);
    }
  }

  // Update Full Placement Record (Admin/HR only)
  async updatePlacementRecord(req, res, next) {
    try {
      const targetUserId = req.params.userId;

      if (!["ADMIN", "HR"].includes(req.user.role)) {
        throw new ValidationError("Only Admin/HR can update placement records");
      }

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const { coordinator, stats, companies, topRecruiters } = req.body;

      if (!user.profile.placementRecord) {
        user.profile.placementRecord = {};
      }

      if (coordinator) user.profile.placementRecord.coordinator = coordinator;
      if (stats) user.profile.placementRecord.stats = stats;
      if (companies) user.profile.placementRecord.companies = companies;
      if (topRecruiters)
        user.profile.placementRecord.topRecruiters = topRecruiters;

      // Reset verification when data changes
      user.profile.placementRecord.verifiedBy = null;
      user.profile.placementRecord.verifiedAt = null;
      user.profile.placementRecord.verifiedRemarks = null;
      user.profile.placementRecord.lastUpdated = new Date();

      user.markModified("profile.placementRecord");
      await user.save();

      res.status(200).json({
        success: true,
        message: "Placement record updated successfully",
        data: user.profile.placementRecord,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // UNIVERSITY INFO
  // ============================================
  async updateUniversityInfo(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.user.userId;

      // Only Admin/HR can update university info
      if (!["ADMIN", "HR"].includes(req.user.role)) {
        throw new ValidationError(
          "Only Admin/HR can update university information",
        );
      }

      const user = await User.findById(targetUserId);
      if (!user) throw new NotFoundError("User not found");

      const { name, enrollmentId, joinDate, completionDate, status } = req.body;

      if (!user.profile.university) {
        user.profile.university = {};
      }

      if (name !== undefined) user.profile.university.name = name;
      if (enrollmentId !== undefined)
        user.profile.university.enrollmentId = enrollmentId;
      if (joinDate !== undefined) user.profile.university.joinDate = joinDate;
      if (completionDate !== undefined)
        user.profile.university.completionDate = completionDate;
      if (status !== undefined) user.profile.university.status = status;

      await user.save();

      res.status(200).json({
        success: true,
        message: "University information updated successfully",
        data: user.profile.university,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // SYLLABUS MANAGEMENT METHODS
  // ============================================

  /**
   * Get all trainers with their subjects for syllabus management
   */
  async getTrainersForSyllabus(req, res, next) {
    try {
      const trainers = await User.find({ role: 'TRAINER', isActive: true })
        .select('_id email profile role trainerCategory')
        .populate({
          path: 'profile.subjects',
          select: 'name code year semester credits status syllabus syllabusHistory'
        })
        .lean();

      const formattedTrainers = trainers.map(trainer => ({
        id: trainer._id,
        name: `${trainer.profile?.firstName || ''} ${trainer.profile?.lastName || ''}`.trim(),
        email: trainer.email,
        employeeId: trainer.profile?.employeeId,
        category: trainer.trainerCategory,
        subjects: (trainer.profile?.subjects || []).map(subject => ({
          id: subject._id,
          name: subject.name,
          code: subject.code,
          year: subject.year,
          semester: subject.semester,
          credits: subject.credits,
          status: subject.status,
          syllabus: subject.syllabus ? {
            type: subject.syllabus.type,
            version: subject.syllabus.version,
            hasContent: !!subject.syllabus.url || !!subject.syllabus.content,
            uploadedAt: subject.syllabus.uploadedAt,
            uploadedBy: subject.syllabus.uploadedBy
          } : null
        }))
      }));

      res.status(200).json({
        success: true,
        data: formattedTrainers,
        message: "Trainers fetched successfully"
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all subjects with syllabus status across all trainers
   */
  async getAllSubjectsWithSyllabus(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      const trainers = await User.find({ role: 'TRAINER', isActive: true })
        .select('_id email profile')
        .populate({
          path: 'profile.subjects',
          select: 'name code year semester credits status syllabus'
        })
        .lean();

      const allSubjects = [];

      trainers.forEach(trainer => {
        (trainer.profile?.subjects || []).forEach(subject => {
          allSubjects.push({
            trainerId: trainer._id,
            trainerName: `${trainer.profile?.firstName || ''} ${trainer.profile?.lastName || ''}`.trim(),
            trainerEmail: trainer.email,
            employeeId: trainer.profile?.employeeId,
            subject: {
              id: subject._id,
              name: subject.name,
              code: subject.code,
              year: subject.year,
              semester: subject.semester,
              credits: subject.credits,
              status: subject.status,
              hasSyllabus: !!subject.syllabus,
              syllabusType: subject.syllabus?.type,
              syllabusVersion: subject.syllabus?.version
            }
          });
        });
      });

      // Sort by trainer name then year/semester
      allSubjects.sort((a, b) => {
        if (a.trainerName !== b.trainerName) return a.trainerName.localeCompare(b.trainerName);
        if (a.subject.year !== b.subject.year) return b.subject.year - a.subject.year;
        return b.subject.semester - a.subject.semester;
      });

      const total = allSubjects.length;
      const paginatedSubjects = allSubjects.slice(skip, skip + parseInt(limit));

      res.status(200).json({
        success: true,
        data: {
          subjects: paginatedSubjects,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        },
        message: "Subjects fetched successfully"
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get syllabus statistics
   */
  async getSyllabusStats(req, res, next) {
    try {
      const trainers = await User.find({ role: 'TRAINER', isActive: true })
        .select('profile')
        .populate('profile.subjects')
        .lean();

      let totalSubjects = 0;
      let uploadedSyllabus = 0;
      const byTrainer = [];

      trainers.forEach(trainer => {
        const subjects = trainer.profile?.subjects || [];
        const trainerSubjects = subjects.length;
        const trainerUploaded = subjects.filter(s => s.syllabus).length;

        totalSubjects += trainerSubjects;
        uploadedSyllabus += trainerUploaded;

        byTrainer.push({
          trainer: `${trainer.profile?.firstName || ''} ${trainer.profile?.lastName || ''}`.trim(),
          trainerId: trainer._id,
          total: trainerSubjects,
          uploaded: trainerUploaded,
          pending: trainerSubjects - trainerUploaded
        });
      });

      res.status(200).json({
        success: true,
        data: {
          totalSubjects,
          uploadedSyllabus,
          pendingUploads: totalSubjects - uploadedSyllabus,
          completionRate: totalSubjects ? (uploadedSyllabus / totalSubjects * 100).toFixed(1) : 0,
          byTrainer
        },
        message: "Syllabus statistics fetched successfully"
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get syllabus for a specific subject
   */
  /**
 * Get syllabus for a specific subject
 */
/**
 * Get syllabus for a specific subject
 */
async getSubjectSyllabus(req, res, next) {
  try {
    const { trainerId, subjectId } = req.params;

    console.log('Getting syllabus for:', { trainerId, subjectId });

    // First find the trainer
    const trainer = await User.findOne({
      _id: trainerId,
      role: 'TRAINER'
    });

    if (!trainer) {
      throw new NotFoundError('Trainer not found');
    }

    console.log('Trainer found, total subjects:', trainer.profile?.subjects?.length);

    // Manually find the subject in the array instead of using populate with match
    const subject = trainer.profile.subjects.find(
      s => s._id.toString() === subjectId
    );

    if (!subject) {
      console.log('Subject not found with ID:', subjectId);
      console.log('Available subject IDs:', trainer.profile.subjects.map(s => s._id.toString()));
      throw new NotFoundError('Subject not found for this trainer');
    }

    console.log('Subject found:', {
      id: subject._id.toString(),
      name: subject.name,
      hasSyllabus: !!subject.syllabus
    });

    if (!subject.syllabus) {
      return res.status(404).json({
        success: false,
        message: "No syllabus found for this subject"
      });
    }

    // Return the syllabus for the requested subject
    res.status(200).json({
      success: true,
      data: {
        subjectId: subject._id,
        subjectName: subject.name,
        subjectCode: subject.code,
        year: subject.year,
        semester: subject.semester,
        type: subject.syllabus.type,
        version: subject.syllabus.version,
        url: subject.syllabus.url,
        content: subject.syllabus.content,
        wordCount: subject.syllabus.wordCount,
        uploadedAt: subject.syllabus.uploadedAt,
        uploadedBy: subject.syllabus.uploadedBy,
        uploadedByName: subject.syllabus.uploadedByName
      },
      message: "Syllabus fetched successfully"
    });
  } catch (error) {
    console.error('Error in getSubjectSyllabus:', error);
    next(error);
  }
}

  /**
   * Upload syllabus for a subject
   */
  async uploadSubjectSyllabus(req, res, next) {
  try {
    const { trainerId, subjectId } = req.params;
    const syllabusData = req.body;
    const uploadedBy = req.user.userId;

    const trainer = await User.findOne({
      _id: trainerId,
      role: 'TRAINER'
    });

    if (!trainer) {
      throw new NotFoundError('Trainer not found');
    }

    const subjectIndex = trainer.profile.subjects.findIndex(
      s => s._id.toString() === subjectId
    );

    if (subjectIndex === -1) {
      throw new NotFoundError('Subject not found for this trainer');
    }

    // Initialize syllabusHistory array if it doesn't exist
    if (!trainer.profile.subjects[subjectIndex].syllabusHistory) {
      trainer.profile.subjects[subjectIndex].syllabusHistory = [];
    }

    const newSyllabus = {
      type: syllabusData.type,
      version: 1,
      uploadedAt: new Date(),
      uploadedBy,
      uploadedByName: syllabusData.uploadedByName || 
        (trainer.profile?.firstName + ' ' + trainer.profile?.lastName).trim() || 'Admin',
      ...(syllabusData.type === 'link'
        ? { url: syllabusData.url, filename: syllabusData.filename || syllabusData.url.split('/').pop() }
        : { content: syllabusData.content, wordCount: syllabusData.wordCount || 
            (syllabusData.content ? syllabusData.content.split(/\s+/).filter(w => w).length : 0) }
      )
    };

    trainer.profile.subjects[subjectIndex].syllabus = newSyllabus;
    trainer.markModified(`profile.subjects.${subjectIndex}`);
    
    await trainer.save();

    res.status(201).json({
      success: true,
      data: newSyllabus,
      message: "Syllabus uploaded successfully"
    });
  } catch (error) {
    next(error);
  }
}

  /**
   * Update syllabus for a subject
   */
  async updateSubjectSyllabus(req, res, next) {
  try {
    const { trainerId, subjectId } = req.params;
    const syllabusData = req.body;
    const updatedBy = req.user.userId;

    const trainer = await User.findOne({
      _id: trainerId,
      role: 'TRAINER'
    });

    if (!trainer) {
      throw new NotFoundError('Trainer not found');
    }

    const subjectIndex = trainer.profile.subjects.findIndex(
      s => s._id.toString() === subjectId
    );

    if (subjectIndex === -1) {
      throw new NotFoundError('Subject not found for this trainer');
    }

    if (!trainer.profile.subjects[subjectIndex].syllabus) {
      throw new NotFoundError('No syllabus exists for this subject. Use POST to create one.');
    }

    // Get current syllabus
    const currentSyllabus = trainer.profile.subjects[subjectIndex].syllabus;

    // Save current version to history - FIXED: Create a proper object
    if (!trainer.profile.subjects[subjectIndex].syllabusHistory) {
      trainer.profile.subjects[subjectIndex].syllabusHistory = [];
    }

    // Create a plain object for history, not a Mongoose document
    const historyEntry = {
      type: currentSyllabus.type,
      version: currentSyllabus.version,
      uploadedAt: currentSyllabus.uploadedAt,
      uploadedBy: currentSyllabus.uploadedBy,
      uploadedByName: currentSyllabus.uploadedByName,
      archivedAt: new Date()
    };

    // Add link-specific fields if present
    if (currentSyllabus.type === 'link' && currentSyllabus.url) {
      historyEntry.url = currentSyllabus.url;
      historyEntry.filename = currentSyllabus.filename;
    }
    
    // Add text-specific fields if present
    if (currentSyllabus.type === 'text' && currentSyllabus.content) {
      historyEntry.content = currentSyllabus.content;
      historyEntry.wordCount = currentSyllabus.wordCount;
    }

    trainer.profile.subjects[subjectIndex].syllabusHistory.push(historyEntry);

    // Create new syllabus
    const newSyllabus = {
      type: syllabusData.type,
      version: currentSyllabus.version + 1,
      uploadedAt: new Date(),
      uploadedBy: updatedBy,
      uploadedByName: syllabusData.uploadedByName || trainer.profile?.firstName + ' ' + trainer.profile?.lastName,
      ...(syllabusData.type === 'link'
        ? { url: syllabusData.url, filename: syllabusData.filename || syllabusData.url.split('/').pop() }
        : { content: syllabusData.content, wordCount: syllabusData.wordCount || syllabusData.content.split(/\s+/).filter(w => w).length }
      )
    };

    // Update syllabus
    trainer.profile.subjects[subjectIndex].syllabus = newSyllabus;
    
    // Mark as modified to ensure changes are saved
    trainer.markModified(`profile.subjects.${subjectIndex}.syllabus`);
    trainer.markModified(`profile.subjects.${subjectIndex}.syllabusHistory`);

    await trainer.save();

    res.status(200).json({
      success: true,
      data: newSyllabus,
      message: "Syllabus updated successfully"
    });
  } catch (error) {
    next(error);
  }
}

  /**
   * Delete syllabus for a subject
   */
  async deleteSubjectSyllabus(req, res, next) {
    try {
      const { trainerId, subjectId } = req.params;

      const trainer = await User.findOne({
        _id: trainerId,
        role: 'TRAINER'
      });

      if (!trainer) {
        throw new NotFoundError('Trainer not found');
      }

      const subjectIndex = trainer.profile.subjects.findIndex(
        s => s._id.toString() === subjectId
      );

      if (subjectIndex === -1) {
        throw new NotFoundError('Subject not found for this trainer');
      }

      if (!trainer.profile.subjects[subjectIndex].syllabus) {
        throw new NotFoundError('No syllabus exists for this subject');
      }

      // Move to history before deleting
      if (!trainer.profile.subjects[subjectIndex].syllabusHistory) {
        trainer.profile.subjects[subjectIndex].syllabusHistory = [];
      }

      trainer.profile.subjects[subjectIndex].syllabusHistory.push({
        ...trainer.profile.subjects[subjectIndex].syllabus.toObject(),
        version: trainer.profile.subjects[subjectIndex].syllabus.version,
        archivedAt: new Date()
      });

      // Remove syllabus
      trainer.profile.subjects[subjectIndex].syllabus = undefined;
      await trainer.save();

      res.status(200).json({
        success: true,
        message: "Syllabus deleted successfully"
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get syllabus version history for a subject
   */
 
/**
 * Get syllabus version history for a subject
 */
async getSyllabusHistory(req, res, next) {
  try {
    const { trainerId, subjectId } = req.params;

    console.log('Fetching history for:', { trainerId, subjectId });

    const trainer = await User.findOne({
      _id: trainerId,
      role: 'TRAINER'
    });

    if (!trainer) {
      throw new NotFoundError('Trainer not found');
    }

    // Manually find the subject in the array
    const subject = trainer.profile.subjects.find(
      s => s._id.toString() === subjectId
    );

    if (!subject) {
      console.log('Subject not found with ID:', subjectId);
      throw new NotFoundError('Subject not found');
    }

    console.log('Subject found for history:', {
      id: subject._id.toString(),
      name: subject.name,
      hasHistory: !!subject.syllabusHistory,
      historyLength: subject.syllabusHistory?.length || 0
    });

    // Return history array (sorted by version descending)
    const history = (subject.syllabusHistory || [])
      .map(h => ({
        type: h.type,
        version: h.version,
        uploadedAt: h.uploadedAt,
        uploadedBy: h.uploadedBy,
        uploadedByName: h.uploadedByName,
        archivedAt: h.archivedAt,
        ...(h.type === 'link' ? { url: h.url, filename: h.filename } : {}),
        ...(h.type === 'text' ? { 
          content: h.content ? h.content.substring(0, 100) + '...' : null,
          wordCount: h.wordCount 
        } : {})
      }))
      .sort((a, b) => b.version - a.version);

    res.status(200).json({
      success: true,
      data: history,
      message: "Syllabus history fetched successfully"
    });
  } catch (error) {
    console.error('Error in getSyllabusHistory:', error);
    next(error);
  }
}

  /**
   * Get subjects for a specific trainer
   */
  async getTrainerSubjects(req, res, next) {
    try {
      const { trainerId } = req.params;

      const trainer = await User.findOne({
        _id: trainerId,
        role: 'TRAINER'
      }).populate('profile.subjects');

      if (!trainer) {
        throw new NotFoundError('Trainer not found');
      }

      const subjects = (trainer.profile?.subjects || []).map(subject => ({
        id: subject._id,
        name: subject.name,
        code: subject.code,
        year: subject.year,
        semester: subject.semester,
        credits: subject.credits,
        status: subject.status,
        hasSyllabus: !!subject.syllabus,
        syllabusType: subject.syllabus?.type,
        syllabusVersion: subject.syllabus?.version
      }));

      res.status(200).json({
        success: true,
        data: {
          trainerId: trainer._id,
          trainerName: `${trainer.profile?.firstName || ''} ${trainer.profile?.lastName || ''}`.trim(),
          trainerEmail: trainer.email,
          employeeId: trainer.profile?.employeeId,
          subjects
        },
        message: "Trainer subjects fetched successfully"
      });
    } catch (error) {
      next(error);
    }
  }
}