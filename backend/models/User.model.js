import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES, HR_LEAVE_CONFIG } from "../config/constant.js";

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

    profile: {
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
      department: String,
      designation: String,
      qualification: String,
      experience: Number,
      bio: String,
      joiningDate: {
        type: Date,
        default: Date.now,
      },
      skills: [String],
      client: {
        name: String,
        email: String,
        phone: String,
        address: String,
        city: String,
        state: String,
        zipCode: String,
      },
      avatar: String,
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

    // ✅ FIXED: Proper leave balance structure
    leaveBalance: {
      sick: {
        available: {
          type: Number,
          default: 0,
          min: 0,
        },
        used: {
          type: Number,
          default: 0,
          min: 0,
        },
        carryForward: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
      casual: {
        available: {
          type: Number,
          default: 0,
          min: 0,
        },
        used: {
          type: Number,
          default: 0,
          min: 0,
        },
        carryForward: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
      paid: {
        available: {
          type: Number,
          default: 9999,
          min: 0,
        },
        used: {
          type: Number,
          default: 0,
          min: 0,
        },
        carryForward: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
      lastIncrementDate: {
        type: Date,
        default: Date.now, // Will be current date for new trainers
      },
      lastRolloverDate: {
        type: Date,
      },
    },
    isUnlimited: {
      type: Boolean,
      default: false,
    },

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
        modifiedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        date: {
          type: Date,
          default: Date.now,
        },
        reason: String,
      },
    ],

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "ON_LEAVE", "SUSPENDED"],
      default: "ACTIVE",
    },

    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    passwordResetToken: String,
    passwordResetExpire: Date,
    emailVerified: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        // ✅ FIXED: Handle HR unlimited leaves
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
        return ret;
      },
    },
  },
);

// ✅ FIXED: CORRECTED pre('validate') hook
userSchema.pre("validate", function (next) {
  // 1. Role-category validation
  if (this.role !== "TRAINER" && this.trainerCategory) {
    this.trainerCategory = undefined;
  }

  if (["ADMIN", "HR"].includes(this.role) && this.trainerCategory) {
    const error = new Error("ADMIN/HR users cannot have trainerCategory");
    return next(error);
  }

  // 2. Initialize leave balance for new TRAINER users
  if (this.role === "TRAINER" && this.isNew) {
    console.log(
      `🚀 Initializing leave balance for new ${this.trainerCategory} trainer`,
    );

    // ✅ FIXED: New trainers start with ZERO sick/casual leaves
    // They get leaves AFTER 30 days of work (through auto-increment)
    if (this.trainerCategory === "PERMANENT") {
      // Set lastIncrementDate to CURRENT DATE (not 30 days ago)
      // This means they need to work 30 days before first increment
      this.leaveBalance = {
        sick: { available: 0, used: 0, carryForward: 0 }, // ✅ Start with 0
        casual: { available: 0, used: 0, carryForward: 0 }, // ✅ Start with 0
        paid: { available: 9999, used: 0, carryForward: 0 },
        lastIncrementDate: new Date(), // ✅ Current date - will be incremented after 30 days
        lastUpdated: new Date(),
        lastRolloverDate: null,
      };

      console.log(`📊 New PERMANENT trainer: 0 sick, 0 casual leaves`);
      console.log(
        `📅 First increment will be after 30 days from: ${new Date()}`,
      );
    } else if (this.trainerCategory === "CONTRACTED") {
      // Contracted trainers only get paid leave
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

  // ✅ ADDED: Initialize leave balance for new HR users
  if (this.role === "HR" && this.isNew) {
    console.log(
      `🚀 Initializing leave balance for new HR user: ${this.username}`,
    );

    this.leaveBalance = {
      sick: { available: 0, used: 0, carryForward: 0 },
      casual: { available: 0, used: 0, carryForward: 0 },
      paid: { available: 0, used: 0, carryForward: 0 },
      lastUpdated: new Date(),
      lastIncrementDate: null,
      lastRolloverDate: null,
      isUnlimited: true, // ✅ HR has unlimited leaves
    };

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
          reason: `Initial leave balance for HR user - Unlimited leaves (Admin approval required)`,
        },
      ];
    }
  }

  next();
});

// ✅ ADDED: Helper method to check if user has unlimited leaves
userSchema.methods.hasUnlimitedLeaves = function () {
  return (
    this.role === "HR" ||
    this.leaveBalance?.paid?.available >= 9999 ||
    this.leaveBalance?.isUnlimited === true
  );
};

// ✅ ADDED: Method to check if user can approve/reject leaves
userSchema.methods.canApproveLeaves = function () {
  if (this.role === "ADMIN") return true;
  if (this.role === "HR") return true;
  return false;
};

// ✅ ADDED: Method to check if user can approve specific applicant
userSchema.methods.canApproveApplicant = function (applicantRole) {
  if (this.role === "ADMIN") return true; // Admin can approve anyone
  if (this.role === "HR" && applicantRole === "TRAINER") return true; // HR can only approve trainers
  return false;
};

// ✅ ADDED: Method to check if user can apply for leave
userSchema.methods.canApplyForLeave = function () {
  return this.role === "TRAINER" || this.role === "HR"; // ADMIN cannot apply
};

// ✅ FIXED: Also need to update the auto-increment eligibility logic
// in the service/controller to handle this correctly

// Custom validation to ensure only one ADMIN exists
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

// Ensure joiningDate is set on creation
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

// Compare password method
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

// Get public profile
userSchema.methods.toJSON = function () {
  const obj = this.toObject();

  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpire;
  delete obj.loginAttempts;
  delete obj.lockUntil;

  // ✅ FIXED: Handle case where paid might be a number or object
  if (obj.leaveBalance && obj.leaveBalance.paid) {
    if (typeof obj.leaveBalance.paid === "number") {
      obj.leaveBalance.paid = {
        available:
          obj.leaveBalance.paid >= 9999 ? "Unlimited" : obj.leaveBalance.paid,
        used: 0,
        carryForward: 0,
      };
    } else if (obj.leaveBalance.paid.available !== undefined) {
      obj.leaveBalance.paid.available =
        obj.leaveBalance.paid.available >= 9999
          ? "Unlimited"
          : obj.leaveBalance.paid.available;
    }
  }

  return obj;
};

// ✅ FIXED: Helper method to check if user is eligible for auto-increment
userSchema.methods.canAutoIncrement = function () {
  if (this.role !== "TRAINER") return false;
  if (this.trainerCategory !== "PERMANENT") return false;
  if (this.status !== "ACTIVE") return false;
  return true;
};

// ✅ FIXED: Method to check if user can receive monthly increment
userSchema.methods.isEligibleForIncrement = function () {
  if (!this.canAutoIncrement()) return false;

  if (!this.leaveBalance || !this.leaveBalance.lastIncrementDate) {
    return false; // New trainer needs to wait
  }

  const now = new Date();
  const lastIncrement = new Date(this.leaveBalance.lastIncrementDate);
  const daysSinceLastIncrement = Math.floor(
    (now - lastIncrement) / (1000 * 60 * 60 * 24),
  );

  return daysSinceLastIncrement >= 30;
};

// Helper method to get available leave days
userSchema.methods.getAvailableLeave = function (leaveType) {
  if (!this.leaveBalance || !this.leaveBalance[leaveType]) {
    return 0;
  }

  const balance = this.leaveBalance[leaveType];
  if (leaveType === "paid" && balance.available >= 9999) {
    return "Unlimited";
  }

  return balance.available;
};

// Method to get days until next increment
userSchema.methods.getDaysUntilNextIncrement = function () {
  if (
    !this.canAutoIncrement() ||
    !this.leaveBalance ||
    !this.leaveBalance.lastIncrementDate
  ) {
    return 30; // New trainer has 30 days to wait
  }

  const now = new Date();
  const lastIncrement = new Date(this.leaveBalance.lastIncrementDate);
  const daysSinceLastIncrement = Math.floor(
    (now - lastIncrement) / (1000 * 60 * 60 * 24),
  );

  return Math.max(0, 30 - daysSinceLastIncrement);
};

// Method to increment leaves
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
    newBalance: {
      casual: currentCasual + 1,
      sick: currentSick + 1,
    },
    daysAffected: 0,
    modifiedBy: null,
    date: new Date(),
    reason: "Monthly auto-increment",
  });

  return this.save();
};

// Static method to get all permanent trainers eligible for increment
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

// Static method to get all permanent trainers
userSchema.statics.getPermanentTrainers = function () {
  return this.find({
    role: "TRAINER",
    trainerCategory: "PERMANENT",
    status: "ACTIVE",
  });
};

// Static method to get all contracted trainers
userSchema.statics.getContractedTrainers = function () {
  return this.find({
    role: "TRAINER",
    trainerCategory: "CONTRACTED",
    status: "ACTIVE",
  });
};

// Static method to fix all permanent trainers' lastIncrementDate (if needed for testing)
userSchema.statics.setTrainersEligibleForIncrement = async function () {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await this.updateMany(
    {
      role: "TRAINER",
      trainerCategory: "PERMANENT",
      status: "ACTIVE",
    },
    {
      $set: {
        "leaveBalance.lastIncrementDate": thirtyDaysAgo,
      },
    },
  );

  console.log(
    `✅ Set ${result.modifiedCount} permanent trainers as eligible for increment`,
  );
  return result;
};

// ✅ ADDED: Static method to get all active HR users
userSchema.statics.getActiveHRUsers = function () {
  return this.find({
    role: "HR",
    status: "ACTIVE",
  }).select("_id username email profile leaveBalance");
};

// ✅ ADDED: Static method to get pending HR leaves (for admin)
userSchema.statics.getPendingHRLeaves = async function () {
  const Leave = this.db.model("Leave");
  return Leave.find({
    status: "PENDING",
    "appliedBy.role": "HR",
  }).populate("trainerId", "username email profile");
};
// Create indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ trainerCategory: 1 });
userSchema.index({ role: 1, trainerCategory: 1 });
userSchema.index({ status: 1 });
userSchema.index({ reportingManager: 1 });
userSchema.index({ createdBy: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ "leaveBalance.lastIncrementDate": 1 });

// Static method to get the single admin
userSchema.statics.getAdmin = function () {
  return this.findOne({ role: "ADMIN" });
};

export default model("User", userSchema);
