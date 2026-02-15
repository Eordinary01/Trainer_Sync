// components/Profile/ProfileView.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { Edit2, X, Plus, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDate } from '../../utils/dateFormat.js';
import api from '../../config/api.js';

// Profile Detail Component
const ProfileDetail = ({ label, value }) => (
  <div className="py-3 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
    <dt className="text-sm font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{value || 'N/A'}</dd>
  </div>
);

// Edit Profile Form Component
const EditProfileForm = ({ profile, userId, onCancel, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: profile?.profile?.firstName || '',
    lastName: profile?.profile?.lastName || '',
    phone: profile?.profile?.phone || '',
    skills: profile?.profile?.skills || []
  });
  
  const [newSkill, setNewSkill] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddSkill = () => {
    if (newSkill.trim()) {
      if (formData.skills.length >= 20) {
        setError('Maximum 20 skills allowed');
        return;
      }
      setFormData({
        ...formData,
        skills: [...new Set([...formData.skills, newSkill.trim()])]
      });
      setNewSkill('');
      setError('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const targetUserId = userId || user?._id;
      
      const response = await api.patch(`/users/profile/${targetUserId}`, {
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          skills: formData.skills
        }
      });

      if (response.data?.success) {
        setSuccess('Profile updated successfully!');
        setTimeout(() => {
          onSuccess(response.data.data);
        }, 1500);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-gray-200 px-4 py-5 sm:p-6 bg-gray-50">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Profile</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-start gap-2">
          <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Restricted Fields Notice */}
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-800">
          <strong>Note:</strong> Employee ID, Email, Reporting Manager, Joining Date, and Client Information cannot be edited.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="First name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Last name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Phone number"
            />
          </div>
        </div>

        {/* Skills */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Skills
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add a skill"
              disabled={formData.skills.length >= 20}
            />
            <button
              type="button"
              onClick={handleAddSkill}
              disabled={!newSkill.trim() || formData.skills.length >= 20}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2 min-h-[60px] p-2 bg-white rounded-md border border-gray-200">
            {formData.skills.length > 0 ? (
              formData.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-red-600"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))
            ) : (
              <p className="text-xs text-gray-500 w-full text-center py-1">
                No skills added
              </p>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Max 20 skills. Press Enter to add.
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-1"
          >
            {loading ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={12} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default function ProfilePage({ userId }) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // ✅ FIXED: Extract user ID outside useEffect - this prevents infinite loops
  const currentUserId = user?._id;
  const targetUserId = userId || currentUserId;

  // ✅ FIXED: useEffect with stable dependencies
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!targetUserId) {
          console.error('No user ID available');
          setLoading(false);
          return;
        }

        console.log('Fetching profile for user:', targetUserId);
        const response = await api.get(`/users/${targetUserId}`);
        setProfile(response.data.data);
        setHasFetched(true);
      } catch (err) {
        console.error("❌ Profile fetch error:", err);
        setError(err.response?.data || { message: err.message });
      } finally {
        setLoading(false);
      }
    };

    // ✅ Only fetch once when conditions are met
    if (!authLoading && !hasFetched && targetUserId) {
      fetchProfile();
    }
  }, [authLoading, hasFetched, targetUserId]); // ✅ Stable dependencies

  const handleBack = () => {
    if (user?.role === 'ADMIN' || user?.role === 'HR') {
      navigate('/admin/dashboard'); 
    } else {
      navigate('/trainer/dashboard'); 
    }
  };

  const handleEditSuccess = (updatedProfile) => {
    setProfile(updatedProfile);
    setIsEditing(false);
    // ✅ Reset fetch flag to allow refresh if needed
    setHasFetched(false);
  };

  if (authLoading || (loading && !profile)) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 md:p-8">
        <button 
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 mb-6 flex items-center font-medium"
        >
          ← Back to Dashboard
        </button>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading Profile...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 md:p-8">
        <button 
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 mb-6 flex items-center font-medium"
        >
          ← Back to Dashboard
        </button>
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden p-6">
          <div className="text-center py-8 text-red-600">
            <h3 className="text-lg font-medium mb-2">Error loading profile</h3>
            <p className="text-sm text-gray-600 mb-4">
              {error.message || 'Unable to load profile data'}
            </p>
            <button
              onClick={() => {
                setHasFetched(false);
                setError(null);
              }}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 md:p-8">
        <button 
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 mb-6 flex items-center font-medium"
        >
          ← Back to Dashboard
        </button>
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">No profile data found</p>
            <button
              onClick={() => {
                setHasFetched(false);
                setLoading(true);
              }}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const canEdit = !userId || userId === user?._id || user?.role === 'ADMIN' || user?.role === 'HR';

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      {/* Back Button */}
      <button 
        onClick={handleBack}
        className="text-blue-600 hover:text-blue-800 mb-6 flex items-center font-medium"
      >
        ← Back to Dashboard
      </button>

      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-5 sm:px-6 bg-blue-50 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {userId && userId !== user?._id ? 'Trainer Profile' : 'My Profile'}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Personal and professional information.
            </p>
          </div>
          
          {/* Edit Button - Only show if user can edit */}
          {canEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              <Edit2 size={14} />
              Edit Profile
            </button>
          )}
        </div>
        
        {/* Profile Details */}
        {!isEditing ? (
          <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">
              <ProfileDetail 
                label="Full Name" 
                value={`${profile.profile?.firstName || ''} ${profile.profile?.lastName || ''}`.trim() || 'N/A'} 
              />
              <ProfileDetail label="Employee ID" value={profile.profile?.employeeId} />
              <ProfileDetail label="Email Address" value={profile.email} />
              <ProfileDetail label="Phone Number" value={profile.profile?.phone} />
              <ProfileDetail label="Reporting Manager" value={profile.reportingManager} />
              <ProfileDetail label="Client Name" value={profile.profile?.client?.name} />
              <ProfileDetail label="Client Address" value={profile.profile?.client?.address} />
              <ProfileDetail 
                label="Joining Date" 
                value={profile.profile?.joiningDate ? formatDate(profile.profile.joiningDate) : 'N/A'} 
              />
              
              <div className="py-3 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Skills</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <span className="inline-flex flex-wrap gap-2">
                    {profile.profile?.skills && profile.profile.skills.length > 0 ? (
                      profile.profile.skills.map(skill => (
                        <span 
                          key={skill} 
                          className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500">No skills listed</span>
                    )}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          /* Edit Form */
          <EditProfileForm 
            profile={profile}
            userId={userId}
            onCancel={() => setIsEditing(false)}
            onSuccess={handleEditSuccess}
          />
        )}
      </div>
    </div>
  );
}