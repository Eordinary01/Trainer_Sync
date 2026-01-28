// models/Leave.model.js
import { Schema, model } from "mongoose";
import { LEAVE_TYPES, LEAVE_STATUS } from "../config/constant.js"; 

const leaveSchema = new Schema(
  {
    trainerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
      default: Date.now 
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ✅ Virtual for total days
leaveSchema.virtual('totalDays').get(function() {
  if (!this.fromDate || !this.toDate) return this.numberOfDays || 0;
  const diffTime = Math.abs(this.toDate - this.fromDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
});

// ✅ Better indexing
leaveSchema.index({ trainerId: 1, status: 1 });
leaveSchema.index({ trainerId: 1, fromDate: 1 });
leaveSchema.index({ trainerId: 1, toDate: 1 });
leaveSchema.index({ status: 1, fromDate: 1 });
leaveSchema.index({ status: 1, trainerId: 1 });
leaveSchema.index({ createdAt: -1 });
leaveSchema.index({ leaveType: 1, status: 1 });

// ✅ Pre-save middleware to calculate numberOfDays if not provided
leaveSchema.pre('save', function(next) {
  if (!this.numberOfDays && this.fromDate && this.toDate) {
    const diffTime = Math.abs(this.toDate - this.fromDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    this.numberOfDays = diffDays + 1;
  }
  next();
});

export const Leave = model("Leave", leaveSchema);