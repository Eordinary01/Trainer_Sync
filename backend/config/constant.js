// constants.js
export const ROLES = {
  ADMIN: "ADMIN",
  TRAINER: "TRAINER",
  HR: "HR",
};

export const TRAINER_CATEGORY = {
  PERMANENT: "PERMANENT",
  CONTRACTED: "CONTRACTED",
};

export const LEAVE_TYPES = {
  SICK: "SICK",
  CASUAL: "CASUAL",
  PAID: "PAID",
};

// ✅ ADDED: HR leave configuration
export const HR_LEAVE_CONFIG = {
  initial: {
    sick: 0,
    casual: 0,
    paid: 0,
  },
  monthlyIncrement: {
    sick: 0,
    casual: 0,
    paid: 0,
  },
  allowedLeaveTypes: ["SICK", "CASUAL", "PAID"],
  rolloverUnused: false,
  rolloverMaxDays: null,
  isUnlimited: true, // Special flag for HR unlimited leaves
};

export const LEAVE_CONFIG = {
  PERMANENT: {
    initial: {
      sick: 0,
      casual: 0,
      paid: 9999, // Use 9999 for unlimited (converted to "Unlimited" in toJSON)
    },
    monthlyIncrement: {
      sick: 1,
      casual: 1,
      paid: 0, // No increment, already unlimited
    },
    allowedLeaveTypes: ["SICK", "CASUAL", "PAID"],
    rolloverUnused: true,
    rolloverMaxDays: null, // No limit on rollover
  },
  CONTRACTED: {
    initial: {
      sick: 0,
      casual: 0,
      paid: 9999, // Unlimited
    },
    monthlyIncrement: {
      sick: 0,
      casual: 0,
      paid: 0,
    },
    allowedLeaveTypes: ["PAID"],
    rolloverUnused: false,
    rolloverMaxDays: null,
  },
  // ✅ ADDED: HR config for leave service reference
  HR: HR_LEAVE_CONFIG,
};

export const LEAVE_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
};

export const NOTIFICATION_TYPES = {
  // Leave related
  LEAVE_REQUEST: "LEAVE_REQUEST",
  LEAVE_APPROVED: "LEAVE_APPROVED",
  LEAVE_REJECTED: "LEAVE_REJECTED",
  LEAVE_CANCELLED: "LEAVE_CANCELLED",
  LEAVE_UPDATED: "LEAVE_UPDATED",

  // Attendance related
  CLOCK_IN: "CLOCK_IN",
  CLOCK_OUT: "CLOCK_OUT",

  // System related
  PASSWORD_RESET: "PASSWORD_RESET",
  WELCOME: "WELCOME",
  SYSTEM_ALERT: "SYSTEM_ALERT",

  // Attendance alerts
  ATTENDANCE_ALERT: "ATTENDANCE_ALERT",

  // Admin notifications
  ADMIN_NOTIFICATION: "ADMIN_NOTIFICATION",
};

export const USER_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  ON_LEAVE: "ON_LEAVE",
};

export const ATTENDANCE_STATUS = {
  CLOCKED_IN: "CLOCKED_IN",
  CLOCKED_OUT: "CLOCKED_OUT",
  INCOMPLETE: "INCOMPLETE",
};

export const PASSWORD_RULES = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true,
};

export const NOTIFICATION_CATEGORIES = {
  LEAVE: "LEAVE",
  ATTENDANCE: "ATTENDANCE",
  SYSTEM: "SYSTEM",
  ADMIN: "ADMIN",
};

// ✅ FIXED: Include HR in ADMIN_ROLES for management permissions
export const ADMIN_ROLES = ["ADMIN", "HR"];

// ✅ ADD: Applicant roles for leave tracking
export const APPLICANT_ROLES = {
  TRAINER: "TRAINER",
  HR: "HR",
};

// ✅ ADD: Socket event names for consistency
// export const SOCKET_EVENTS = {
//   NEW_NOTIFICATION: 'new_notification',
//   NOTIFICATION_UPDATED: 'notification_updated',
//   NOTIFICATION_DELETED: 'notification_deleted',
//   ALL_NOTIFICATIONS_READ: 'all_notifications_read',
//   ADMIN_NOTIFICATION: 'admin_notification'
// };

// ✅ ADD: Leave validation messages
export const LEAVE_VALIDATION_MESSAGES = {
  INVALID_LEAVE_TYPE: "Invalid leave type. Must be one of: SICK, CASUAL, PAID",
  INVALID_DATE: "Invalid date format",
  REASON_REQUIRED: "Reason is required",
  DATE_RANGE_INVALID: "End date must be after start date",
  INSUFFICIENT_BALANCE: "Insufficient leave balance",
  HR_CANNOT_APPROVE_HR_LEAVE:
    "HR cannot approve leave requests from other HR members",
  TRAINER_CANNOT_APPROVE: "Trainers cannot approve leave requests",
  ADMIN_CANNOT_APPLY_LEAVE: "Admin cannot apply for leave",
};

// ✅ ADD: Common date formats
export const DATE_FORMATS = {
  DISPLAY: "MMM DD, YYYY",
  API: "YYYY-MM-DD",
  DATABASE: "YYYY-MM-DDTHH:mm:ss.SSSZ",
};

// ✅ ADD: Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

// ✅ ADD: User profile fields
export const USER_PROFILE_FIELDS = {
  FIRST_NAME: "profile.firstName",
  LAST_NAME: "profile.lastName",
  EMPLOYEE_ID: "profile.employeeId",
  PHONE: "profile.phone",
  ADDRESS: "profile.address",
};
