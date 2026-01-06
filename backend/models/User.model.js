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
      default: true, // ✅ New users must change password after first login
    },
    role: {
      type: String,
      enum: ["ADMIN", "HR", "TRAINER"],
      default: "TRAINER",
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
      employeeId: {
        type: String,
        unique: true,
        sparse: true,
      },
      joiningDate: {
        type: Date,
        required: [true, "Joining date is required"],
      },
      skills: [String],
      client: {
        name: String,
        address: String,
        city: String,
        state: String,
        zipCode: String,
      },
      avatar: String,
      bio: String,
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
    leaveBalance: {
      sick: { type: Number, default: 10 },
      casual: { type: Number, default: 12 },
      paid: { type: Number, default: 20 },
      lastUpdated: { type: Date, default: Date.now },
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "ON_LEAVE"],
      default: "ACTIVE",
    },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    passwordResetToken: String,
    passwordResetExpire: Date,
    emailVerified: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true }
);

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
  // If lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    this.loginAttempts += 1;
  }
  
  // Lock account after 5 failed attempts
  if (this.loginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  }
  
  // ✅ FIX: Use save() instead of updateOne()
  return this.save();
};

userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  

  return this.save();
};

// Get public profile (exclude sensitive fields)
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpire;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  return obj;
};

// Create indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ reportingManager: 1 });
userSchema.index({ createdBy: 1 }); // Added index for createdBy
userSchema.index({ createdAt: -1 });

// Static method to get the single admin
userSchema.statics.getAdmin = function () {
  return this.findOne({ role: "ADMIN" });
};

export default model("User", userSchema);
