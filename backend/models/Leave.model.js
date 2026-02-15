// models/Leave.model.js
import { Schema, model } from "mongoose";
import {
  LEAVE_TYPES,
  LEAVE_STATUS,
  LEAVE_CONFIG,
  TRAINER_CATEGORY,
} from "../config/constant.js";

const leaveSchema = new Schema(
  {
    // ✅ FIXED: Rename to applicantId to handle both Trainers and HR
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // ✅ ADDED: Store applicant role for filtering
    applicantRole: {
      type: String,
      enum: ["ADMIN", "HR", "TRAINER"],
      required: true,
    },
    // ✅ ADDED: Store applicant name for quick access
    applicantName: {
      type: String,
      trim: true,
    },
    // Keep trainerId for backward compatibility
    trainerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
     appliedBy: {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      role: {
        type: String,
        enum: ["ADMIN", "HR", "TRAINER"],
      },
      name: {
        type: String,
        trim: true,
      }
    },

    leaveType: {
      type: String,
      enum: Object.values(LEAVE_TYPES),
      required: true,
    },
    fromDate: {
      type: Date,
      required: true,
    },
    toDate: {
      type: Date,
      required: true,
    },
    numberOfDays: {
      type: Number,
      required: true,
      min: 0.5,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 500,
    },
    emergencyContact: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(LEAVE_STATUS),
      default: "PENDING",
    },

    // ✅ Approval fields
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },

    // ✅ Rejection fields
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: {
      type: Date,
    },

    // ✅ Cancellation fields
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    cancelledAt: {
      type: Date,
    },

    // ✅ Comments/Remarks
    adminRemarks: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    // ✅ User comments
    userComments: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    // ✅ Track application date
    appliedOn: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ✅ Virtual for total days
leaveSchema.virtual("totalDays").get(function () {
  if (!this.fromDate || !this.toDate) return this.numberOfDays || 0;
  const diffTime = Math.abs(this.toDate - this.fromDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
});

// ✅ Updated indexes
leaveSchema.index({ applicantId: 1, status: 1 });
leaveSchema.index({ applicantId: 1, fromDate: 1 });
leaveSchema.index({ applicantId: 1, toDate: 1 });
leaveSchema.index({ applicantRole: 1, status: 1 });
leaveSchema.index({ status: 1, fromDate: 1 });
leaveSchema.index({ createdAt: -1 });
leaveSchema.index({ leaveType: 1, status: 1 });
leaveSchema.index({ approvedAt: -1 });
leaveSchema.index({ rejectedAt: -1 });

// ✅ Keep old indexes for backward compatibility
leaveSchema.index({ trainerId: 1, status: 1 });
leaveSchema.index({ trainerId: 1, fromDate: 1 });

// ✅ Updated pre-save middleware
leaveSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const User = this.constructor.db.model("User");
      const applicant = await User.findById(this.applicantId);

      if (!applicant) {
        return next(new Error("Applicant not found"));
      }

      // Set applicant role if not set
      if (!this.applicantRole) {
        this.applicantRole = applicant.role;
      }

      // Set applicant name if not set
      if (!this.applicantName) {
        this.applicantName =
          `${applicant.profile?.firstName || ""} ${applicant.profile?.lastName || ""}`.trim();
      }

      // For backward compatibility, also set trainerId if applicant is TRAINER
      if (applicant.role === "TRAINER") {
        this.trainerId = this.applicantId;
      }

      // Skip leave type validation for HR (they can apply for any leave type)
      if (applicant.role === "HR") {
        // HR leaves don't need leave type validation
        // But they still need date validation
        if (this.toDate < this.fromDate) {
          return next(new Error("End date must be on or after start date"));
        }
        return next();
      }

      // For TRAINERs, validate leave type based on category
      if (applicant.role === "TRAINER") {
        const leaveConfig = LEAVE_CONFIG[applicant.trainerCategory];
        if (!leaveConfig) {
          return next(new Error("Invalid trainer category"));
        }

        if (!leaveConfig.allowedLeaveTypes.includes(this.leaveType)) {
          return next(
            new Error(
              `${this.leaveType} leaves are not available for ${applicant.trainerCategory} trainers`,
            ),
          );
        }

        // Validate maximum leave days
        const maxLeaveDays = leaveConfig.maxLeaveDays || 30;
        if (this.numberOfDays > maxLeaveDays) {
          return next(new Error(`Leave cannot exceed ${maxLeaveDays} days`));
        }
      }

      // Validate dates for all users
      if (this.toDate < this.fromDate) {
        return next(new Error("End date must be on or after start date"));
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// ✅ Pre-save middleware to calculate numberOfDays
leaveSchema.pre("save", function (next) {
  if (!this.numberOfDays && this.fromDate && this.toDate) {
    const diffTime = Math.abs(this.toDate - this.fromDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    this.numberOfDays = diffDays + 1;
  }

  if (this.numberOfDays < 0.5) {
    this.numberOfDays = 0.5;
  }

  next();
});

// ✅ Helper methods
leaveSchema.methods.isSingleDayLeave = function () {
  if (!this.fromDate || !this.toDate) return false;

  const fromDateOnly = new Date(this.fromDate);
  const toDateOnly = new Date(this.toDate);

  fromDateOnly.setHours(0, 0, 0, 0);
  toDateOnly.setHours(0, 0, 0, 0);

  return fromDateOnly.getTime() === toDateOnly.getTime();
};

leaveSchema.methods.isHalfDayLeave = function () {
  return this.numberOfDays === 0.5;
};

// ✅ Check if leave is for HR
leaveSchema.methods.isHRLeave = function () {
  return this.applicantRole === "HR";
};

// ✅ Check if leave is for Trainer
leaveSchema.methods.isTrainerLeave = function () {
  return this.applicantRole === "TRAINER";
};

export const Leave = model("Leave", leaveSchema);
