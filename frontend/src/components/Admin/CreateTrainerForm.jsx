import React, { useState } from 'react';
import api from '../../config/api.js';
import { useAuth } from '../../hooks/useAuth.js';

export const CreateTrainerForm = ({ onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    profile: {
      firstName: '',
      lastName: '',
      phone: '',
      employeeId: '',
      joiningDate: '', 
      client: {
        name: '',
        address: '',
        city: '',
      }
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('client.')) {
      const fieldName = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          client: {
            ...prev.profile.client,
            [fieldName]: value
          }
        }
      }));
    } else if (name.startsWith('profile.')) {
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

    // Validate required fields
    if (!formData.profile.joiningDate) {
      setError('Joining date is required');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/users', formData);

      if (response.data.success) {
        setSuccess('✅ Trainer created successfully! Welcome email sent with temporary password.');
        
        // Reset form
        setFormData({
          username: '',
          email: '',
          profile: {
            firstName: '',
            lastName: '',
            phone: '',
            employeeId: '',
            joiningDate: '', // Reset this too
            client: {
              name: '',
              address: '',
              city: '',
            }
          }
        });

        onSuccess?.();
      } else {
        setError(response.data.message || 'Failed to create trainer');
      }

    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error?.message || err.message || 'Failed to create trainer');
    } finally {
      setLoading(false);
    }
  };

  // Only ADMIN or HR can see this
  if (!['ADMIN', 'HR'].includes(user?.role)) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded">
        <p className="text-red-600">❌ Only ADMIN/HR can access this page</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Trainer Account</h2>

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
            Username *
          </label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            required
            placeholder="e.g., john_trainer"
            disabled={loading}
          />
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            required
            placeholder="e.g., john@company.com"
            disabled={loading}
          />
        </div>

        {/* First Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              First Name *
            </label>
            <input
              type="text"
              name="profile.firstName"
              value={formData.profile.firstName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              required
              disabled={loading}
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Last Name *
            </label>
            <input
              type="text"
              name="profile.lastName"
              value={formData.profile.lastName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Phone */}
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">
            Phone *
          </label>
          <input
            type="tel"
            name="profile.phone"
            value={formData.profile.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            required
            placeholder="+91-9999999999"
            disabled={loading}
          />
        </div>

        {/* Employee ID */}
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">
            Employee ID *
          </label>
          <input
            type="text"
            name="profile.employeeId"
            value={formData.profile.employeeId}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            required
            placeholder="e.g., EMP-001"
            disabled={loading}
          />
        </div>

        {/* Joining Date - ADD THIS FIELD */}
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">
            Joining Date *
          </label>
          <input
            type="date"
            name="profile.joiningDate"
            value={formData.profile.joiningDate}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            required
            disabled={loading}
          />
        </div>

        {/* Client Section */}
        <div className="border-t pt-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Client Information (Optional)</h3>
          
          {/* Client Name */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">
              Client Name
            </label>
            <input
              type="text"
              name="client.name"
              value={formData.profile.client.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="e.g., XYZ Corp"
              disabled={loading}
            />
          </div>

          {/* Client Address */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">
              Client Address
            </label>
            <input
              type="text"
              name="client.address"
              value={formData.profile.client.address}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="e.g., 123 Business Street"
              disabled={loading}
            />
          </div>

          {/* Client City */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Client City
            </label>
            <input
              type="text"
              name="client.city"
              value={formData.profile.client.city}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="e.g., New York"
              disabled={loading}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Trainer...' : 'Create Trainer'}
        </button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Note:</strong> A temporary password will be automatically generated and sent to the trainer's email.
          They will be asked to change it on first login.
        </p>
      </div>
    </div>
  );
};

export default CreateTrainerForm;