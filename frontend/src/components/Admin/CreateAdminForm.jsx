import React, { useState } from 'react';
import api from '../../config/api.js';
import { useAuth } from '../../hooks/useAuth.js';

export const CreateAdminForm = ({ onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'HR', // Default to HR
    profile: {
      firstName: '',
      lastName: '',
      phone: '',
      employeeId: '',
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('profile.')) {
      const fieldName = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [fieldName]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate password
      if (formData.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      if (!/[A-Z]/.test(formData.password)) {
        throw new Error('Password must contain uppercase letter');
      }

      if (!/[a-z]/.test(formData.password)) {
        throw new Error('Password must contain lowercase letter');
      }

      if (!/[0-9]/.test(formData.password)) {
        throw new Error('Password must contain number');
      }

      if (!/[!@#$%^&*]/.test(formData.password)) {
        throw new Error('Password must contain special character (!@#$%^&*)');
      }

      // Send to backend
      const response = await api.post('/admin/create-admin', formData);

      setSuccess(`✅ ${formData.role} user created successfully!`);
      
      // Reset form
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'HR',
        profile: {
          firstName: '',
          lastName: '',
          phone: '',
          employeeId: '',
        }
      });

      onSuccess?.();

    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Only ADMIN can see this
  if (user?.role !== 'ADMIN') {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded">
        <p className="text-red-600">❌ Only ADMIN can access this page</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Admin/HR User</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Username */}
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">
            Username
          </label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            required
            placeholder="e.g., hr_manager"
          />
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            required
            placeholder="e.g., hr@company.com"
          />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">
            Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            required
            placeholder="Min 8 chars: uppercase, lowercase, number, special char"
          />
          <p className="text-sm text-gray-600 mt-1">
            Must contain: uppercase, lowercase, number, and special character (!@#$%^&*)
          </p>
        </div>

        {/* Role Selection */}
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">
            Role
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="HR">HR Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        {/* First Name */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              First Name
            </label>
            <input
              type="text"
              name="profile.firstName"
              value={formData.profile.firstName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Last Name
            </label>
            <input
              type="text"
              name="profile.lastName"
              value={formData.profile.lastName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>
        </div>

        {/* Phone */}
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">
            Phone
          </label>
          <input
            type="tel"
            name="profile.phone"
            value={formData.profile.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="+91-9999999999"
          />
        </div>

        {/* Employee ID */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            Employee ID
          </label>
          <input
            type="text"
            name="profile.employeeId"
            value={formData.profile.employeeId}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            required
            placeholder="e.g., HR-001"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </form>
    </div>
  );
};