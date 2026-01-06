// models/Notification.model.js
import { Schema, model } from "mongoose";
import { NOTIFICATION_TYPES } from "../config/constant.js";

const notificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      // Optional for universal notifications
      required: function() {
        return !this.isUniversal;
      }
    },
    userName: {
      type: String,
      required: true,
      default: "System"
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {}
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isUniversal: {
      type: Boolean,
      default: false,
    },
    visibleToRoles: {
      type: [String],
      default: [],
      enum: ['ADMIN', 'HR', 'TRAINER']
    },
    readAt: {
      type: Date
    }
  },
  { timestamps: true }
);

// Indexes for better performance
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ isUniversal: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ userId: 1, isUniversal: 1, isRead: 1 });

export const Notification = model("Notification", notificationSchema);