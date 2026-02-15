import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/api.js";
import { useAuth } from "../../hooks/useAuth.js";
import {
  Info,
  AlertCircle,
  CheckCircle,
  Calendar,
  FileText,
  XCircle,
  Lock,
  Infinity,
} from "lucide-react";

// Constants for validation rules
const VALIDATION_RULES = {
  reason: {
    minWords: 7,
    minCharacters: 30,
    maxCharacters: 500,
  },
  dateRange: {
    maxDays: 30,
    minAdvanceNotice: 1,
  },
};

export default function LeaveApplication() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [leaveData, setLeaveData] = useState({
    leaveType: "",
    fromDate: "",
    toDate: "",
    reason: "",
  });

  const [balance, setBalance] = useState({
    sick: { available: 0 },
    casual: { available: 0 },
    paid: { available: 0 },
  });

  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});
  const [touched, setTouched] = useState({
    fromDate: false,
    toDate: false,
    reason: false,
  });
  const [existingLeaves, setExistingLeaves] = useState([]);
  const [leaveCheckLoading, setLeaveCheckLoading] = useState(false);

  // ✅ Check if user is HR
  const isHR = useMemo(() => {
    return user?.role === "HR";
  }, [user]);

  // Check if user is a contracted trainer
  const isContracted = useMemo(() => {
    return user?.trainerCategory === "CONTRACTED";
  }, [user]);

  // Helper to safely get balance value (handles HR Unlimited)
  const getBalanceValue = useCallback((type) => {
    const balanceData = balance[type];
    if (!balanceData) return 0;
    
    // HR Unlimited case
    if (balanceData.available === "Unlimited" || balanceData.available === Infinity) {
      return Infinity;
    }
    
    if (typeof balanceData === 'object') {
      return balanceData.available || 0;
    }
    return balanceData || 0;
  }, [balance]);

  // Calculate word count
  const wordCount = useMemo(() => {
    return leaveData.reason
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }, [leaveData.reason]);

  // Calculate date difference
  const dateDifference = useMemo(() => {
    if (!leaveData.fromDate || !leaveData.toDate) return 0;
    const fromDate = new Date(leaveData.fromDate);
    const toDate = new Date(leaveData.toDate);
    return Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
  }, [leaveData.fromDate, leaveData.toDate]);

  // ✅ Get available leave types based on user role and category
  const availableLeaveTypes = useMemo(() => {
    const baseTypes = [
      { value: "CASUAL", label: "Casual Leave", color: "green" },
      { value: "SICK", label: "Sick Leave", color: "blue" },
      { value: "PAID", label: "Paid Leave", color: "purple" },
    ];

    // ✅ HR can apply for all leave types (Unlimited)
    if (isHR) {
      return baseTypes;
    }

    // Trainers - Contracted can only apply for paid leave
    if (isContracted) {
      return baseTypes.filter(type => type.value === "PAID");
    }
    
    // Permanent trainers - all types
    return baseTypes;
  }, [isHR, isContracted]);

  // Set default leave type based on available types
  useEffect(() => {
    if (availableLeaveTypes.length > 0 && !leaveData.leaveType) {
      setLeaveData(prev => ({
        ...prev,
        leaveType: availableLeaveTypes[0].value
      }));
    }
  }, [availableLeaveTypes, leaveData.leaveType]);

  // ✅ Fetch Leave Balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        setBalanceLoading(true);
        
        const endpoint = isHR ? "/leaves/hr/balance" : "/leaves/balance";
        const res = await api.get(endpoint);
        const data = res.data.data || {
          sick: { available: 0 },
          casual: { available: 0 },
          paid: { available: 0 },
        };
        
        const formattedBalance = {
          sick: typeof data.sick === 'object' ? data.sick : { available: data.sick || 0 },
          casual: typeof data.casual === 'object' ? data.casual : { available: data.casual || 0 },
          paid: typeof data.paid === 'object' ? data.paid : { available: data.paid || 0 },
        };
        
        setBalance(formattedBalance);
      } catch (err) {
        console.error("Error fetching balance:", err);
        setBalance({
          sick: { available: 0 },
          casual: { available: 0 },
          paid: { available: 0 },
        });
      } finally {
        setBalanceLoading(false);
      }
    };
    
    if (user) {
      fetchBalance();
    }
  }, [user, isHR]);

  // ✅ Fetch user's existing leaves
  useEffect(() => {
    const fetchExistingLeaves = async () => {
      try {
        setLeaveCheckLoading(true);
        
        const endpoint = isHR ? "/leaves/hr/history" : "/leaves/history";
        const response = await api.get(`${endpoint}?limit=100`);

        if (response.data.success) {
          let leaves = [];
          if (response.data.data?.leaves) {
            leaves = response.data.data.leaves;
          } else if (Array.isArray(response.data.data)) {
            leaves = response.data.data;
          }
          setExistingLeaves(leaves);
        }
      } catch (error) {
        console.error("Error fetching existing leaves:", error);
        setExistingLeaves([]);
      } finally {
        setLeaveCheckLoading(false);
      }
    };

    if (user) {
      fetchExistingLeaves();
    }
  }, [user, isHR]);

  // Function to check for overlapping leaves
  const checkForOverlappingLeaves = useCallback(
    (leaves, newFromDate, newToDate) => {
      if (!newFromDate || !newToDate || leaves.length === 0) return [];

      const newFrom = new Date(newFromDate);
      const newTo = new Date(newToDate);

      return leaves.filter((leave) => {
        if (leave.status === "REJECTED" || leave.status === "CANCELLED") {
          return false;
        }
        const leaveFrom = new Date(leave.fromDate);
        const leaveTo = new Date(leave.toDate);
        return newFrom <= leaveTo && newTo >= leaveFrom;
      });
    },
    [],
  );

  // Format overlapping leave message
  const formatOverlappingMessage = useCallback((overlappingLeaves) => {
    if (overlappingLeaves.length === 0) return "";

    const leave = overlappingLeaves[0];
    const fromDate = new Date(leave.fromDate).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const toDate = new Date(leave.toDate).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return `You already have a ${leave.status.toLowerCase()} ${leave.leaveType.toLowerCase()} leave from ${fromDate} to ${toDate}. Please select different dates.`;
  }, []);

  // Real-time validation effect
  useEffect(() => {
    const errors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Date validations
    if (touched.fromDate && leaveData.fromDate) {
      const fromDate = new Date(leaveData.fromDate);

      if (fromDate < today) {
        errors.fromDate = "From date cannot be in the past";
      } else {
        const daysInAdvance = Math.ceil(
          (fromDate - today) / (1000 * 60 * 60 * 24),
        );
        if (daysInAdvance < VALIDATION_RULES.dateRange.minAdvanceNotice) {
          errors.fromDate = `Please apply at least ${VALIDATION_RULES.dateRange.minAdvanceNotice} day(s) in advance`;
        }
      }
    }

    if (touched.toDate && leaveData.toDate && leaveData.fromDate) {
      const fromDate = new Date(leaveData.fromDate);
      const toDate = new Date(leaveData.toDate);

      if (toDate < fromDate) {
        errors.toDate = "To date cannot be earlier than from date";
      } else if (dateDifference > VALIDATION_RULES.dateRange.maxDays) {
        errors.dateRange = `Maximum ${VALIDATION_RULES.dateRange.maxDays} days allowed per application`;
      }

      // Check for overlapping leaves
      if (fromDate && toDate && existingLeaves.length > 0) {
        const overlappingLeaves = checkForOverlappingLeaves(
          existingLeaves,
          leaveData.fromDate,
          leaveData.toDate,
        );

        if (overlappingLeaves.length > 0) {
          errors.overlapping = formatOverlappingMessage(overlappingLeaves);
        }
      }
    }

    // ✅ Balance validation - Skip for HR (Unlimited)
    if (!isHR && leaveData.leaveType && dateDifference > 0) {
      const leaveTypeKey = leaveData.leaveType.toLowerCase();
      const availableBalance = getBalanceValue(leaveTypeKey);
      if (availableBalance !== Infinity && dateDifference > availableBalance) {
        errors.balance = `Insufficient ${leaveData.leaveType} leave balance. Available: ${availableBalance} days, Required: ${dateDifference} days`;
      }
    }

    // Reason validation
    if (touched.reason) {
      if (!leaveData.reason.trim()) {
        errors.reason = "Reason is required";
      } else if (wordCount < VALIDATION_RULES.reason.minWords) {
        errors.reason = `Minimum ${VALIDATION_RULES.reason.minWords} words required`;
      } else if (
        leaveData.reason.length < VALIDATION_RULES.reason.minCharacters
      ) {
        errors.reason = `Minimum ${VALIDATION_RULES.reason.minCharacters} characters required`;
      } else if (
        leaveData.reason.length > VALIDATION_RULES.reason.maxCharacters
      ) {
        errors.reason = `Maximum ${VALIDATION_RULES.reason.maxCharacters} characters allowed`;
      }
    }

    setValidationErrors(errors);
  }, [
    leaveData,
    touched,
    balance,
    dateDifference,
    wordCount,
    existingLeaves,
    checkForOverlappingLeaves,
    formatOverlappingMessage,
    getBalanceValue,
    isHR,
  ]);

  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setLeaveData((prev) => ({ ...prev, [name]: value }));

      if (!touched[name]) {
        setTouched((prev) => ({ ...prev, [name]: true }));
      }
    },
    [touched],
  );

  const handleBlur = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleDateChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setLeaveData((prev) => ({ ...prev, [name]: value }));
      setTouched((prev) => ({ ...prev, [name]: true }));
    },
    [],
  );

  // 📌 Submit Leave
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validationErrors.overlapping) {
      alert("Cannot submit: You already have leave applied for these dates.");
      return;
    }

    setTouched({
      fromDate: true,
      toDate: true,
      reason: true,
    });

    if (Object.keys(validationErrors).length > 0) {
      alert("Please fix the validation errors before submitting.");
      return;
    }

    if (!leaveData.fromDate || !leaveData.toDate || !leaveData.reason.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    if (!leaveData.leaveType) {
      alert("Please select a leave type.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/leaves", leaveData);

      if (res.data.success) {
        alert(isHR 
          ? "Leave Application Submitted Successfully! Admin will review your request." 
          : "Leave Application Submitted Successfully! HR notified.");
        navigate("/dashboard");
      } else {
        alert(res.data.message || "Leave application failed.");
      }
    } catch (error) {
      console.error("Error details:", error);

      if (error.response?.status === 409) {
        const errorMessage = error.response?.data?.message ||
          "You already have a leave for these dates.";
        alert(`Cannot Submit: ${errorMessage}`);
        setValidationErrors((prev) => ({
          ...prev,
          overlapping: errorMessage,
        }));
      } else if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message ||
          "Validation failed. Please check your inputs.";
        alert(`Validation Error: ${errorMessage}`);

        if (errorMessage.includes("balance")) {
          setValidationErrors((prev) => ({
            ...prev,
            balance: errorMessage,
          }));
        } else if (errorMessage.includes("date")) {
          setValidationErrors((prev) => ({
            ...prev,
            dateRange: errorMessage,
          }));
        }
      } else {
        alert(
          error.response?.data?.message ||
            "Something went wrong! Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getWordCountStatus = useCallback(() => {
    if (wordCount === 0) return "empty";
    if (wordCount < VALIDATION_RULES.reason.minWords) return "insufficient";
    return "sufficient";
  }, [wordCount]);

  const isFormValid = useCallback(() => {
    return (
      leaveData.leaveType &&
      leaveData.fromDate &&
      leaveData.toDate &&
      leaveData.reason.trim() &&
      wordCount >= VALIDATION_RULES.reason.minWords &&
      leaveData.reason.length >= VALIDATION_RULES.reason.minCharacters &&
      !validationErrors.overlapping &&
      !validationErrors.balance &&
      !validationErrors.dateRange &&
      !validationErrors.fromDate &&
      !validationErrors.toDate
    );
  }, [leaveData, wordCount, validationErrors]);

  const wordCountStatus = getWordCountStatus();
  const formValid = isFormValid();

  // Calculate available balance for selected leave type
  const availableBalance = useMemo(() => {
    const leaveTypeKey = leaveData.leaveType.toLowerCase();
    return getBalanceValue(leaveTypeKey);
  }, [leaveData.leaveType, getBalanceValue]);

  // Get role badge
  const getRoleBadge = () => {
    if (isHR) {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 flex items-center gap-1">
          <Infinity size={14} className="text-purple-600" />
          HR (Unlimited Leaves)
        </span>
      );
    }
    
    if (!user?.trainerCategory) return null;

    const config = {
      PERMANENT: { color: "bg-green-100 text-green-800", label: "Permanent Trainer" },
      CONTRACTED: { color: "bg-blue-100 text-blue-800", label: "Contracted Trainer" },
    };

    const { color, label } = config[user.trainerCategory] || {
      color: "bg-gray-100 text-gray-800",
      label: user.trainerCategory,
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      {/* Back Button */}
      <button
        onClick={() => navigate("/dashboard")}
        className="text-blue-600 hover:text-blue-800 mb-6 flex items-center gap-2 font-medium transition-colors"
      >
        <span className="text-lg">←</span>
        Back to Dashboard
      </button>

      <div className="max-w-4xl mx-auto">
        {/* Information Card */}
        <div className={`mb-6 bg-gradient-to-r ${isHR ? 'from-purple-50 to-indigo-50 border-purple-200' : 'from-blue-50 to-indigo-50 border-blue-200'} border rounded-xl p-5 shadow-sm`}>
          <div className="flex items-start gap-4">
            <div className={`${isHR ? 'bg-purple-100' : 'bg-blue-100'} p-2 rounded-lg`}>
              <Info className={`${isHR ? 'text-purple-600' : 'text-blue-600'}`} size={22} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-bold ${isHR ? 'text-purple-800' : 'text-blue-800'} text-lg`}>
                  Leave Application Guidelines
                </h3>
                {getRoleBadge()}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className={`flex items-center gap-2 text-sm ${isHR ? 'text-purple-700' : 'text-blue-700'}`}>
                  <FileText size={14} className={isHR ? 'text-purple-500' : 'text-blue-500'} />
                  <span>
                    Minimum <strong>{VALIDATION_RULES.reason.minWords} words</strong> required
                  </span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${isHR ? 'text-purple-700' : 'text-blue-700'}`}>
                  <Calendar size={14} className={isHR ? 'text-purple-500' : 'text-blue-500'} />
                  <span>
                    Maximum <strong>{VALIDATION_RULES.dateRange.maxDays} days</strong> per application
                  </span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${isHR ? 'text-purple-700' : 'text-blue-700'}`}>
                  <Calendar size={14} className={isHR ? 'text-purple-500' : 'text-blue-500'} />
                  <span>
                    Apply at least <strong>{VALIDATION_RULES.dateRange.minAdvanceNotice} day(s)</strong> in advance
                  </span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${isHR ? 'text-purple-700' : 'text-blue-700'}`}>
                  <AlertCircle size={14} className={isHR ? 'text-purple-500' : 'text-blue-500'} />
                  <span>{isHR ? 'Admin approval required' : 'Leave balance checked automatically'}</span>
                </div>
              </div>
              
              {/* HR-specific message */}
              {isHR && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2 text-purple-700 text-sm">
                    <Infinity size={14} className="text-purple-600" />
                    <span>
                      <strong>HR Leave Policy:</strong> You have <strong>Unlimited Leaves</strong>. Admin approval is required for all HR leave applications.
                    </span>
                  </div>
                </div>
              )}

              {/* Contracted trainer message */}
              {isContracted && !isHR && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-700 text-sm">
                    <Lock size={14} className="text-amber-600" />
                    <span>
                      <strong>Note for Contracted Trainers:</strong> You can only apply for Paid Leave. Sick and Casual leaves are not available for your category.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className={`bg-gradient-to-r ${isHR ? 'from-purple-600 to-indigo-600' : 'from-blue-600 to-indigo-600'} p-6`}>
            <h2 className="text-3xl font-bold text-white">Apply for Leave</h2>
            <p className={`${isHR ? 'text-purple-100' : 'text-blue-100'} mt-2`}>
              {isHR 
                ? 'Submit your leave application for Admin approval' 
                : 'Fill in the details below to submit your leave application'}
            </p>
          </div>

          <div className="p-6 md:p-8">
            {/* Existing Leaves Warning */}
            {validationErrors.overlapping && (
              <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg animate-pulse">
                <div className="flex items-start gap-3 text-red-700">
                  <XCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold mb-1">⚠️ Leave Conflict Detected</div>
                    <p>{validationErrors.overlapping}</p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => navigate("/dashboard/leaves")}
                        className="text-sm bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition-colors inline-flex items-center gap-1"
                      >
                        View My Leaves
                      </button>
                      <button
                        onClick={() => {
                          setLeaveData((prev) => ({
                            ...prev,
                            fromDate: "",
                            toDate: "",
                          }));
                          setValidationErrors((prev) => {
                            const { overlapping, ...rest } = prev;
                            return rest;
                          });
                        }}
                        className="text-sm bg-gray-600 text-white px-3 py-1.5 rounded hover:bg-gray-700 transition-colors"
                      >
                        Clear Dates
                      </button>
                    </div>
                  </div>
                  {leaveCheckLoading && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                  )}
                </div>
              </div>
            )}

            {/* Balance Warning - Only for Trainers */}
            {!isHR && validationErrors.balance && (
              <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-3 text-red-700">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                  <div>
                    <span className="font-bold">{validationErrors.balance}</span>
                    <div className="text-sm text-red-600 mt-1">
                      You have {availableBalance === Infinity ? "Unlimited" : availableBalance} {leaveData.leaveType} days remaining
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-7">
              {/* Leave Type */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Select Leave Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {availableLeaveTypes.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setLeaveData((prev) => ({
                          ...prev,
                          leaveType: option.value,
                        }));
                        setTouched((prev) => ({ ...prev, leaveType: true }));
                      }}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                        leaveData.leaveType === option.value
                          ? isHR
                            ? `border-${option.color}-500 bg-${option.color}-50 shadow-md`
                            : `border-${option.color}-500 bg-${option.color}-50 shadow-md`
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      } ${isContracted && !isHR && option.value !== "PAID" ? "opacity-60 cursor-not-allowed" : ""}`}
                      disabled={isContracted && !isHR && option.value !== "PAID"}
                    >
                      <div className="text-left">
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={`font-bold text-lg ${
                              leaveData.leaveType === option.value
                                ? `text-${option.color}-700`
                                : "text-gray-700"
                            }`}
                          >
                            {option.label}
                          </div>
                          {leaveData.leaveType === option.value && (
                            <CheckCircle className="text-green-500" size={18} />
                          )}
                        </div>
                        
                        {/* ✅ Show balance directly on the button - THIS REPLACES THE SEPARATE WIDGET */}
                        <div className={`text-sm mt-1 ${isContracted && !isHR && option.value !== "PAID" ? "text-gray-400" : "text-gray-600"}`}>
                          {isHR 
                            ? "♾️ Unlimited"
                            : `Available: ${getBalanceValue(option.value.toLowerCase())} days`
                          }
                        </div>
                        
                        {isHR && (
                          <div className="text-xs text-purple-600 font-medium mt-2">
                            Admin approval required
                          </div>
                        )}
                        
                        {isContracted && !isHR && option.value !== "PAID" && (
                          <div className="text-xs text-gray-500 mt-2 italic flex items-center gap-1">
                            <Lock size={12} />
                            Not available
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    From Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="fromDate"
                      value={leaveData.fromDate}
                      onChange={handleDateChange}
                      onBlur={() => handleBlur("fromDate")}
                      min={new Date().toISOString().split("T")[0]}
                      className={`w-full p-3.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                        validationErrors.fromDate || validationErrors.overlapping
                          ? "border-red-300 bg-red-50"
                          : touched.fromDate && !validationErrors.fromDate
                            ? "border-green-300 bg-green-50"
                            : "border-gray-300 hover:border-gray-400"
                      }`}
                      required
                    />
                    {validationErrors.fromDate && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                        <AlertCircle size={14} />
                        {validationErrors.fromDate}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    To Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="toDate"
                      value={leaveData.toDate}
                      onChange={handleDateChange}
                      onBlur={() => handleBlur("toDate")}
                      min={leaveData.fromDate || new Date().toISOString().split("T")[0]}
                      className={`w-full p-3.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                        validationErrors.toDate ||
                        validationErrors.dateRange ||
                        validationErrors.overlapping
                          ? "border-red-300 bg-red-50"
                          : touched.toDate &&
                              !validationErrors.toDate &&
                              !validationErrors.dateRange
                            ? "border-green-300 bg-green-50"
                            : "border-gray-300 hover:border-gray-400"
                      }`}
                      required
                    />
                    {(validationErrors.toDate || validationErrors.dateRange) && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                        <AlertCircle size={14} />
                        {validationErrors.toDate || validationErrors.dateRange}
                      </p>
                    )}
                    {dateDifference > 0 &&
                      !validationErrors.dateRange &&
                      !validationErrors.overlapping && (
                        <p className="mt-2 text-sm text-green-600 font-medium">
                          ✅ Total days: {dateDifference} day{dateDifference !== 1 ? "s" : ""}
                        </p>
                      )}
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-gray-700">
                    Reason for Leave
                  </label>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold px-3 py-1 rounded-full ${
                        wordCountStatus === "sufficient"
                          ? "bg-green-100 text-green-700"
                          : wordCountStatus === "insufficient"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {wordCount} word{wordCount !== 1 ? "s" : ""}
                    </span>
                    {wordCountStatus === "sufficient" && (
                      <CheckCircle className="text-green-500" size={18} />
                    )}
                  </div>
                </div>
                <div className="relative">
                  <textarea
                    name="reason"
                    rows="5"
                    value={leaveData.reason}
                    onChange={handleChange}
                    onBlur={() => handleBlur("reason")}
                    className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none ${
                      validationErrors.reason
                        ? "border-red-300 bg-red-50"
                        : touched.reason && !validationErrors.reason
                          ? "border-green-300 bg-green-50"
                          : "border-gray-300 hover:border-gray-400"
                    }`}
                    placeholder="Please provide a detailed reason for your leave application..."
                    required
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                    {leaveData.reason.length}/{VALIDATION_RULES.reason.maxCharacters}
                  </div>
                </div>
                <div className="mt-3">
                  {validationErrors.reason ? (
                    <p className="text-sm text-red-600 flex items-center gap-2">
                      <AlertCircle size={14} />
                      {validationErrors.reason}
                    </p>
                  ) : (
                    <div className="flex justify-between text-sm">
                      <div>
                        {wordCount < VALIDATION_RULES.reason.minWords ? (
                          <span className="text-amber-600 font-medium">
                            <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                            Need {VALIDATION_RULES.reason.minWords - wordCount} more words
                          </span>
                        ) : (
                          <span className="text-green-600 font-medium">
                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            ✓ Minimum requirement met
                          </span>
                        )}
                      </div>
                      <div className="text-gray-500">
                        Min. {VALIDATION_RULES.reason.minWords} words, {VALIDATION_RULES.reason.minCharacters} chars
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Section */}
              <div className="pt-6 border-t border-gray-200">
                <div className={`mb-4 p-4 bg-gradient-to-r ${isHR ? 'from-purple-50 to-indigo-50' : 'from-gray-50 to-gray-100'} rounded-xl`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-800">Ready to Submit</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {formValid
                          ? "✅ All requirements met"
                          : validationErrors.overlapping
                            ? "❌ Leave conflict detected"
                            : !isHR && validationErrors.balance
                              ? "❌ Insufficient balance"
                              : !leaveData.leaveType
                                ? "❌ Please select a leave type"
                                : "Please complete all fields correctly"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-800">
                        {dateDifference > 0
                          ? `${dateDifference} day${dateDifference !== 1 ? "s" : ""}`
                          : "Select dates"}
                      </div>
                      <div className="text-sm text-gray-500">Total leave days</div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !formValid || validationErrors.overlapping || !leaveData.leaveType}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                    loading
                      ? isHR ? "bg-purple-400 cursor-wait" : "bg-blue-400 cursor-wait"
                      : !formValid || validationErrors.overlapping || !leaveData.leaveType
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : isHR
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-3">
                      <div className={`w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin`}></div>
                      Processing Submission...
                    </span>
                  ) : validationErrors.overlapping ? (
                    "❌ Cannot Submit (Leave Conflict)"
                  ) : !leaveData.leaveType ? (
                    "❌ Select Leave Type First"
                  ) : !formValid ? (
                    "Please Complete All Fields"
                  ) : isHR ? (
                    "✅ Submit for Admin Approval"
                  ) : (
                    "✅ Submit Leave Application"
                  )}
                </button>

                <p className="mt-4 text-sm text-gray-500 text-center">
                  {isHR 
                    ? "By submitting, you confirm that all information provided is accurate and complete. Admin will review your request."
                    : "By submitting, you confirm that all information provided is accurate and complete. HR will be notified immediately."}
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}