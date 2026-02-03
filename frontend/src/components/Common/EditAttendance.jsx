import React, { useState } from "react";
import { X, Save, AlertCircle, Clock } from "lucide-react";
import api from "../../config/api.js";
import { formatTime } from "../../utils/dateFormat.js";

export default function EditAttendanceModal({ attendance, trainer, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    clockInTime: attendance?.clockInTime ? new Date(attendance.clockInTime).toISOString().slice(0, 16) : "",
    clockOutTime: attendance?.clockOutTime ? new Date(attendance.clockOutTime).toISOString().slice(0, 16) : "",
    status: attendance?.status || "CLOCKED_OUT",
    notes: attendance?.notes || "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.clockInTime) {
      setError("Clock-in time is required");
      return false;
    }

    if (formData.status === "CLOCKED_OUT" && !formData.clockOutTime) {
      setError("Clock-out time is required when status is CLOCKED_OUT");
      return false;
    }

    if (formData.clockOutTime && formData.clockInTime) {
      const clockIn = new Date(formData.clockInTime);
      const clockOut = new Date(formData.clockOutTime);

      if (clockOut <= clockIn) {
        setError("Clock-out time must be after clock-in time");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        clockInTime: new Date(formData.clockInTime).toISOString(),
        ...(formData.clockOutTime && { clockOutTime: new Date(formData.clockOutTime).toISOString() }),
        status: formData.status,
        ...(formData.notes && { notes: formData.notes }),
      };

      const response = await api.put(`/attendance/${attendance._id}`, payload);

      if (response.data.success) {
        onSuccess(response.data.data);
        onClose();
      } else {
        setError(response.data.message || "Failed to update attendance");
      }
    } catch (err) {
      console.error("Error updating attendance:", err);
      setError(err.response?.data?.message || "Failed to update attendance record");
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkingHours = () => {
    if (!formData.clockInTime || !formData.clockOutTime) return null;

    const clockIn = new Date(formData.clockInTime);
    const clockOut = new Date(formData.clockOutTime);

    if (clockOut <= clockIn) return null;

    const diffMs = clockOut - clockIn;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  const workingHours = calculateWorkingHours();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Attendance</h2>
            <p className="text-sm text-gray-600 mt-1">
              {trainer?.profile?.firstName} {trainer?.profile?.lastName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Clock In Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clock-In Time *
            </label>
            <input
              type="datetime-local"
              name="clockInTime"
              value={formData.clockInTime}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="CLOCKED_IN">Clocked In</option>
              <option value="CLOCKED_OUT">Clocked Out</option>
            </select>
          </div>

          {/* Clock Out Time */}
          {formData.status === "CLOCKED_OUT" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clock-Out Time *
              </label>
              <input
                type="datetime-local"
                name="clockOutTime"
                value={formData.clockOutTime}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          )}

          {/* Working Hours Display */}
          {workingHours && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <Clock size={18} className="text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Working Hours</p>
                <p className="text-lg font-bold text-blue-700">{workingHours}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Add any notes about this attendance record (e.g., 'Late arrival - traffic')"
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}