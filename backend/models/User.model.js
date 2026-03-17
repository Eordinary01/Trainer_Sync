// models/User.model.js
import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },
    isFirstLogin: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ["ADMIN", "HR", "TRAINER"],
      default: "TRAINER",
    },
    trainerCategory: {
      type: String,
      enum: ["PERMANENT", "CONTRACTED"],
      default: "PERMANENT",
    },

    // ============================================
    // PROFILE SECTION - Role-based fields
    // ============================================
    profile: {
      // ========== BASE FIELDS (ALL USERS) ==========
      firstName: {
        type: String,
        required: [true, "First name is required"],
        trim: true,
      },
      lastName: {
        type: String,
        required: [true, "Last name is required"],
        trim: true,
      },
      phone: {
        type: String,
        required: [true, "Phone number is required"],
      },
      dateOfBirth: Date,
      gender: String,
      address: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      employeeId: {
        type: String,
        unique: true,
        sparse: true,
      },
      bio: String,
      joiningDate: {
        type: Date,
        default: Date.now,
      },
      avatar: String,

      // ========== ADMIN/HR SPECIFIC FIELDS ==========
      department: String,
      designation: String,

      // Client Information (for HR/Admin)
      client: {
        name: String,
        email: String,
        phone: String,
        address: String,
        city: String,
        state: String,
        zipCode: String,
      },

      // ========== TRAINER-ONLY FIELDS ==========
      // Skills
      skills: [String],

      // University Information
      university: {
        name: String,
        enrollmentId: String,
        joinDate: Date,
        completionDate: Date,
        status: {
          type: String,
          enum: ["ACTIVE", "COMPLETED", "WITHDRAWN"],
          default: "ACTIVE",
        },
      },

      // Subjects
      // Subjects
      subjects: [
        {
          name: {
            type: String,
            required: true,
          },
          code: String,
          year: {
            type: Number,
            min: 1,
            max: 4,
          },
          semester: {
            type: Number,
            min: 1,
            max: 8,
          },
          credits: Number,
          syllabus: {
            type: {
              type: String,
              enum: ["link", "text"],
              default: "link",
            },
            version: {
              type: Number,
              default: 1,
            },
            uploadedAt: Date,
            uploadedBy: {
              type: Schema.Types.ObjectId,
              ref: "User",
            },
            uploadedByName: String, // Add this field
            url: String,
            filename: String,
            content: {
              type: String,
              default: "",
            },
            wordCount: Number, // Add this field
            preview: String,
          },
          // ADD THIS - Syllabus History array
          syllabusHistory: [
            {
              type: {
                type: String,
                enum: ["link", "text"],
              },
              version: Number,
              uploadedAt: Date,
              uploadedBy: {
                type: Schema.Types.ObjectId,
                ref: "User",
              },
              uploadedByName: String,
              url: String,
              filename: String,
              content: String,
              wordCount: Number,
              archivedAt: Date,
            },
          ],
          // Keep changeLog if you still need it
          changeLog: [
            {
              version: Number,
              type: String,
              updatedAt: Date,
              updatedBy: {
                type: Schema.Types.ObjectId,
                ref: "User",
              },
              summary: String,
            },
          ],
          status: {
            type: String,
            enum: ["ACTIVE", "ARCHIVED", "COMPLETED"],
            default: "ACTIVE",
          },
        },
      ],

      // Semester Activities
      semesterActivities: [
        {
          semester: Number,
          year: Number,
          activities: [
            {
              title: String,
              description: String,
              date: Date,
              type: {
                type: String,
                enum: [
                  "WORKSHOP",
                  "SEMINAR",
                  "PROJECT",
                  "EVENT",
                  "ACHIEVEMENT",
                  "COMPETITION",
                ],
              },
              achievements: [String],
              mediaUrls: [String],
              verifiedBy: {
                type: Schema.Types.ObjectId,
                ref: "User",
              },
            },
          ],
          summary: String,
        },
      ],

      // Projects
      projects: [
        {
          title: {
            type: String,
            required: true,
          },
          description: String,
          type: {
            type: String,
            enum: ["ACADEMIC", "INDUSTRY", "RESEARCH", "PERSONAL"],
          },
          technologies: [String],
          role: String,
          duration: {
            start: Date,
            end: Date,
            ongoing: Boolean,
          },
          students: [
            {
              name: String,
              rollNumber: String,
              contribution: String,
            },
          ],
          outcomes: [String],
          publications: [
            {
              title: String,
              url: String,
              date: Date,
              type: {
                type: String,
                enum: ["JOURNAL", "CONFERENCE", "THESIS", "REPORT"],
              },
            },
          ],
          links: {
            github: String,
            demo: String,
            documentation: String,
          },
          media: [
            {
              type: String,
              url: String,
            },
          ],
          verifiedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
          },
        },
      ],

      // Qualifications
      qualifications: [
        {
          degree: {
            type: String,
            required: true,
          },
          specialization: String,
          university: String,
          year: Number,
          percentage: Number,
          grade: String,
          type: {
            type: String,
            enum: ["UG", "PG", "PHD", "DIPLOMA", "CERTIFICATION"],
          },
          certificate: {
            filename: String,
            url: String,
          },
          verifiedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
          },
        },
      ],

      // Experience
      experience: [
        {
          organization: {
            type: String,
            required: true,
          },
          role: String,
          duration: {
            from: Date,
            to: Date,
            current: Boolean,
          },
          description: String,
          achievements: [String],
          type: {
            type: String,
            enum: ["TEACHING", "INDUSTRY", "RESEARCH", "ADMINISTRATIVE"],
          },
          certificate: {
            filename: String,
            url: String,
          },
          verifiedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
          },
        },
      ],

      // Certifications
      certifications: [
        {
          name: {
            type: String,
            required: true,
          },
          issuingOrganization: String,
          issueDate: Date,
          expiryDate: Date,
          credentialId: String,
          credentialUrl: String,
          skills: [String],
          certificate: {
            filename: String,
            url: String,
          },
          verifiedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
          },
        },
      ],

      // Placement Record
      placementRecord: {
        coordinator: {
          name: String,
          email: String,
          phone: String,
        },
        stats: [
          {
            year: Number,
            totalStudents: Number,
            placedStudents: Number,
            placementPercentage: Number,
            highestPackage: Number,
            averagePackage: Number,
            medianPackage: Number,
          },
        ],
        companies: [
          {
            name: String,
            year: Number,
            studentsPlaced: Number,
            packages: {
              highest: Number,
              average: Number,
              lowest: Number,
            },
            roles: [String],
            visitDate: Date,
          },
        ],
        topRecruiters: [String],
        lastUpdated: Date,

        verifiedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        verifiedAt: Date,
        verifiedRemarks: String,
      },
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reportingManager: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    subordinates: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Leave Balance Section
    leaveBalance: {
      sick: {
        available: { type: Number, default: 0, min: 0 },
        used: { type: Number, default: 0, min: 0 },
        carryForward: { type: Number, default: 0, min: 0 },
      },
      casual: {
        available: { type: Number, default: 0, min: 0 },
        used: { type: Number, default: 0, min: 0 },
        carryForward: { type: Number, default: 0, min: 0 },
      },
      paid: {
        available: { type: Number, default: 9999, min: 0 },
        used: { type: Number, default: 0, min: 0 },
        carryForward: { type: Number, default: 0, min: 0 },
      },
      lastUpdated: { type: Date, default: Date.now },
      lastIncrementDate: { type: Date, default: Date.now },
      lastRolloverDate: Date,
    },
    isUnlimited: { type: Boolean, default: false },

    leaveHistory: [
      {
        type: {
          type: String,
          enum: [
            "TEST_AUTO_INCREMENT",
            "SYSTEM_INIT",
            "ON_LEAVE",
            "AUTO_INCREMENT",
            "USED",
            "APPLIED",
            "APPROVED",
            "REJECTED",
            "ADMIN_EDIT",
            "ROLLOVER",
            "RESTORED",
            "CANCELLED",
          ],
        },
        leaveType: {
          type: String,
          enum: ["SICK", "CASUAL", "PAID", "ALL", "MIXED"],
        },
        previousBalance: Schema.Types.Mixed,
        newBalance: Schema.Types.Mixed,
        daysAffected: Number,
        modifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
        date: { type: Date, default: Date.now },
        reason: String,
      },
    ],

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "ON_LEAVE", "SUSPENDED"],
      default: "ACTIVE",
    },

    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    passwordResetToken: String,
    passwordResetExpire: Date,
    emailVerified: { type: Boolean, default: false },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        // Remove sensitive fields
        delete ret.password;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpire;
        delete ret.loginAttempts;
        delete ret.lockUntil;

        // Handle HR unlimited leaves
        if (ret.role === "HR" && ret.leaveBalance?.isUnlimited) {
          ret.leaveBalance = {
            sick: { available: "Unlimited", used: 0, carryForward: 0 },
            casual: { available: "Unlimited", used: 0, carryForward: 0 },
            paid: { available: "Unlimited", used: 0, carryForward: 0 },
            lastUpdated: ret.leaveBalance?.lastUpdated || new Date(),
            isUnlimited: true,
          };
        }
        // Handle trainer unlimited paid leaves
        else if (ret.leaveBalance && ret.leaveBalance.paid) {
          if (typeof ret.leaveBalance.paid === "number") {
            ret.leaveBalance.paid = {
              available:
                ret.leaveBalance.paid >= 9999
                  ? "Unlimited"
                  : ret.leaveBalance.paid,
              used: 0,
              carryForward: 0,
            };
          } else if (ret.leaveBalance.paid.available !== undefined) {
            ret.leaveBalance.paid.available =
              ret.leaveBalance.paid.available >= 9999
                ? "Unlimited"
                : ret.leaveBalance.paid.available;
          }
        }

        // For non-trainers, remove trainer-specific fields from response
        if (ret.role !== "TRAINER" && ret.profile) {
          const trainerFields = [
            "skills",
            "university",
            "subjects",
            "semesterActivities",
            "projects",
            "qualifications",
            "experience",
            "certifications",
            "placementRecord",
          ];

          trainerFields.forEach((field) => {
            if (ret.profile[field]) {
              ret.profile[field] = undefined;
            }
          });
        }

        // For trainers, remove admin-specific fields
        if (ret.role === "TRAINER" && ret.profile) {
          ret.profile.department = undefined;
          ret.profile.designation = undefined;
          ret.profile.client = undefined;
        }

        return ret;
      },
    },
  },
);

// ============================================
// PRE-VALIDATION HOOK - Role-based field cleanup
// ============================================
userSchema.pre("validate", function (next) {
  // Role-category validation
  if (this.role !== "TRAINER" && this.trainerCategory) {
    this.trainerCategory = undefined;
  }

  if (["ADMIN", "HR"].includes(this.role) && this.trainerCategory) {
    const error = new Error("ADMIN/HR users cannot have trainerCategory");
    return next(error);
  }

  // ============================================
  // CLEAN UP FIELDS BASED ON ROLE
  // ============================================

  // For ADMIN/HR users - strip out trainer-specific fields
  if (this.role === "ADMIN" || this.role === "HR") {
    if (this.profile) {
      const trainerOnlyFields = [
        "skills",
        "university",
        "subjects",
        "semesterActivities",
        "projects",
        "qualifications",
        "experience",
        "certifications",
        "placementRecord",
      ];

      trainerOnlyFields.forEach((field) => {
        if (this.profile[field]) {
          this.profile[field] = undefined;
        }
      });
    }
  }

  // For TRAINER users - clean up admin fields and initialize arrays
  if (this.role === "TRAINER") {
    if (this.profile) {
      // Remove admin-specific fields
      this.profile.department = undefined;
      this.profile.designation = undefined;
      this.profile.client = undefined;

      // Initialize arrays for new trainers
      if (this.isNew) {
        if (!this.profile.university) this.profile.university = {};
        if (!this.profile.subjects) this.profile.subjects = [];
        if (!this.profile.semesterActivities)
          this.profile.semesterActivities = [];
        if (!this.profile.projects) this.profile.projects = [];
        if (!this.profile.qualifications) this.profile.qualifications = [];
        if (!this.profile.experience) this.profile.experience = [];
        if (!this.profile.certifications) this.profile.certifications = [];
        if (!this.profile.placementRecord) this.profile.placementRecord = {};
      }
    }
  }

  userSchema.pre("save", function (next) {
    // Auto-sync enrollmentId with employeeId for trainers
    if (this.role === "TRAINER" && this.profile?.employeeId) {
      if (!this.profile.university) this.profile.university = {};
      this.profile.university.enrollmentId = this.profile.employeeId;
    }

    // ✅ AUTO-SYNC: University join date with main joining date
    if (this.role === "TRAINER" && this.profile?.joiningDate) {
      if (!this.profile.university) this.profile.university = {};
      // Only set if not already set or if joining date changed
      if (
        !this.profile.university.joinDate ||
        this.isModified("profile.joiningDate")
      ) {
        this.profile.university.joinDate = this.profile.joiningDate;
      }
    }

    next();
  });

  next();
});

// ============================================
// LEAVE BALANCE INITIALIZATION
// ============================================
userSchema.pre("validate", function (next) {
  // Initialize leave balance for new TRAINER users
  if (this.role === "TRAINER" && this.isNew) {
    if (this.trainerCategory === "PERMANENT") {
      this.leaveBalance = {
        sick: { available: 0, used: 0, carryForward: 0 },
        casual: { available: 0, used: 0, carryForward: 0 },
        paid: { available: 9999, used: 0, carryForward: 0 },
        lastIncrementDate: new Date(),
        lastUpdated: new Date(),
        lastRolloverDate: null,
      };
    } else if (this.trainerCategory === "CONTRACTED") {
      this.leaveBalance = {
        sick: { available: 0, used: 0, carryForward: 0 },
        casual: { available: 0, used: 0, carryForward: 0 },
        paid: { available: 9999, used: 0, carryForward: 0 },
        lastUpdated: new Date(),
        lastRolloverDate: null,
      };
    }

    // Initialize leave history
    if (!this.leaveHistory || this.leaveHistory.length === 0) {
      this.leaveHistory = [
        {
          type: "SYSTEM_INIT",
          leaveType: "ALL",
          previousBalance: 0,
          newBalance: 0,
          daysAffected: 0,
          modifiedBy: this.createdBy || null,
          date: new Date(),
          reason: `Initial leave balance for ${this.trainerCategory} trainer - Starts with 0 leaves`,
        },
      ];
    }
  }

  // Initialize leave balance for new HR users
  if (this.role === "HR" && this.isNew) {
    this.leaveBalance = {
      sick: { available: 0, used: 0, carryForward: 0 },
      casual: { available: 0, used: 0, carryForward: 0 },
      paid: { available: 0, used: 0, carryForward: 0 },
      lastUpdated: new Date(),
      lastIncrementDate: null,
      lastRolloverDate: null,
      isUnlimited: true,
    };

    if (!this.leaveHistory || this.leaveHistory.length === 0) {
      this.leaveHistory = [
        {
          type: "SYSTEM_INIT",
          leaveType: "ALL",
          previousBalance: 0,
          newBalance: 0,
          daysAffected: 0,
          modifiedBy: this.createdBy || null,
          date: new Date(),
          reason: `Initial leave balance for HR user - Unlimited leaves (Admin approval required)`,
        },
      ];
    }
  }

  next();
});

// ============================================
// CUSTOM VALIDATIONS
// ============================================
userSchema.pre("save", async function (next) {
  if (this.role === "ADMIN" && this.isNew) {
    const existingAdmin = await this.constructor.findOne({ role: "ADMIN" });
    if (existingAdmin) {
      const error = new Error("Only one ADMIN user can exist in the system");
      return next(error);
    }
  }
  next();
});

// Ensure joiningDate is set
userSchema.pre("save", function (next) {
  if (this.isNew && !this.profile.joiningDate) {
    this.profile.joiningDate = new Date();
  }
  next();
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ============================================
// INSTANCE METHODS
// ============================================

// Compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if account is locked
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Increment login attempts
userSchema.methods.incLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    this.loginAttempts += 1;
  }

  if (this.loginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
  }

  return this.save();
};

userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  return this.save();
};

// Role checks
userSchema.methods.isTrainer = function () {
  return this.role === "TRAINER";
};

userSchema.methods.isAdminOrHR = function () {
  return ["ADMIN", "HR"].includes(this.role);
};

// Unlimited leaves check
userSchema.methods.hasUnlimitedLeaves = function () {
  return (
    this.role === "HR" ||
    this.leaveBalance?.paid?.available >= 9999 ||
    this.leaveBalance?.isUnlimited === true
  );
};

// Approval permissions
userSchema.methods.canApproveLeaves = function () {
  return this.role === "ADMIN" || this.role === "HR";
};

userSchema.methods.canApproveApplicant = function (applicantRole) {
  if (this.role === "ADMIN") return true;
  if (this.role === "HR" && applicantRole === "TRAINER") return true;
  return false;
};

// Leave application permission
userSchema.methods.canApplyForLeave = function () {
  return this.role === "TRAINER" || this.role === "HR";
};

// Auto-increment methods
userSchema.methods.canAutoIncrement = function () {
  if (!this.isTrainer()) return false;
  if (this.trainerCategory !== "PERMANENT") return false;
  if (this.status !== "ACTIVE") return false;
  return true;
};

userSchema.methods.isEligibleForIncrement = function () {
  if (!this.canAutoIncrement()) return false;
  if (!this.leaveBalance || !this.leaveBalance.lastIncrementDate) return false;

  const now = new Date();
  const lastIncrement = new Date(this.leaveBalance.lastIncrementDate);
  const daysSinceLastIncrement = Math.floor(
    (now - lastIncrement) / (1000 * 60 * 60 * 24),
  );

  return daysSinceLastIncrement >= 30;
};

userSchema.methods.getDaysUntilNextIncrement = function () {
  if (!this.canAutoIncrement() || !this.leaveBalance?.lastIncrementDate) {
    return 30;
  }

  const now = new Date();
  const lastIncrement = new Date(this.leaveBalance.lastIncrementDate);
  const daysSinceLastIncrement = Math.floor(
    (now - lastIncrement) / (1000 * 60 * 60 * 24),
  );

  return Math.max(0, 30 - daysSinceLastIncrement);
};

userSchema.methods.incrementLeaves = async function () {
  if (!this.canAutoIncrement()) {
    throw new Error("User is not eligible for leave increment");
  }

  const currentCasual = Number(this.leaveBalance.casual?.available) || 0;
  const currentSick = Number(this.leaveBalance.sick?.available) || 0;

  this.leaveBalance.casual.available = currentCasual + 1;
  this.leaveBalance.sick.available = currentSick + 1;
  this.leaveBalance.lastIncrementDate = new Date();
  this.leaveBalance.lastUpdated = new Date();

  this.leaveHistory.push({
    type: "AUTO_INCREMENT",
    leaveType: "ALL",
    previousBalance: { casual: currentCasual, sick: currentSick },
    newBalance: { casual: currentCasual + 1, sick: currentSick + 1 },
    daysAffected: 0,
    modifiedBy: null,
    date: new Date(),
    reason: "Monthly auto-increment",
  });

  return this.save();
};

// Portfolio helper methods (trainers only)
userSchema.methods.getPortfolioSummary = function () {
  if (!this.isTrainer()) {
    return null;
  }

  return {
    university: this.profile.university?.name || null,
    subjectsCount: this.profile.subjects?.length || 0,
    projectsCount: this.profile.projects?.length || 0,
    qualificationsCount: this.profile.qualifications?.length || 0,
    experienceCount: this.profile.experience?.length || 0,
    certificationsCount: this.profile.certifications?.length || 0,
    skills: this.profile.skills || [],
  };
};

userSchema.methods.getPlacementStats = function () {
  if (!this.isTrainer()) {
    return null;
  }

  const stats = this.profile.placementRecord?.stats || [];
  const latestYear =
    stats.length > 0
      ? stats.reduce((latest, current) =>
          current.year > latest.year ? current : latest,
        )
      : null;

  return {
    totalCompanies: this.profile.placementRecord?.companies?.length || 0,
    topRecruiters: this.profile.placementRecord?.topRecruiters || [],
    latestStats: latestYear,
    coordinator: this.profile.placementRecord?.coordinator,
  };
};

// ============================================
// STATIC METHODS
// ============================================

userSchema.statics.getEligibleTrainersForIncrement = function () {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return this.find({
    role: "TRAINER",
    trainerCategory: "PERMANENT",
    status: "ACTIVE",
    "leaveBalance.lastIncrementDate": { $lte: thirtyDaysAgo },
  });
};

userSchema.statics.getPermanentTrainers = function () {
  return this.find({
    role: "TRAINER",
    trainerCategory: "PERMANENT",
    status: "ACTIVE",
  });
};

userSchema.statics.getContractedTrainers = function () {
  return this.find({
    role: "TRAINER",
    trainerCategory: "CONTRACTED",
    status: "ACTIVE",
  });
};

userSchema.statics.getActiveHRUsers = function () {
  return this.find({
    role: "HR",
    status: "ACTIVE",
  }).select("_id username email profile leaveBalance");
};

userSchema.statics.getAdmin = function () {
  return this.findOne({ role: "ADMIN" });
};

// Get trainers with placement records
userSchema.statics.getTrainersWithPlacement = function () {
  return this.find({
    role: "TRAINER",
    "profile.placementRecord.stats": { $exists: true, $ne: [] },
  }).select(
    "username email profile.firstName profile.lastName profile.placementRecord",
  );
};

// Get trainers with specific skills
userSchema.statics.getTrainersBySkills = function (skills) {
  return this.find({
    role: "TRAINER",
    "profile.skills": { $in: skills },
  });
};

// ============================================
// INDEXES
// ============================================
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ trainerCategory: 1 });
userSchema.index({ role: 1, trainerCategory: 1 });
userSchema.index({ status: 1 });
userSchema.index({ reportingManager: 1 });
userSchema.index({ createdBy: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ "leaveBalance.lastIncrementDate": 1 });

// Portfolio field indexes
userSchema.index({ "profile.skills": 1 });
userSchema.index({ "profile.qualifications.type": 1 });
userSchema.index({ "profile.experience.type": 1 });
userSchema.index({ "profile.certifications.issuingOrganization": 1 });
userSchema.index({ "profile.placementRecord.stats.year": 1 });

export default model("User", userSchema);
