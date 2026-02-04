import { Schema, model } from "mongoose";

const attendanceSchema = new Schema(
  {
    trainerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    clockInTime: Date,
    clockInLocation: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
    clockOutTime: Date,
    clockOutLocation: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
    totalWorkingHours: Number,
    status: {
      type: String,
      enum: ["CLOCKED_IN", "CLOCKED_OUT", "INCOMPLETE"],
      default: "INCOMPLETE",
    },
    isLate: Boolean,
    remarks: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

attendanceSchema.index({ trainerId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ trainerId: 1, clockInTime: -1 });
attendanceSchema.index({ date: 1 });

export const Attendance = model("Attendance", attendanceSchema);
