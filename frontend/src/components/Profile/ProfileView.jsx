import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { Edit2, X, Plus, Save, AlertCircle, CheckCircle, Building2, Calendar, Mail, Phone, MapPin, Briefcase, Award, BookOpen, Users, User as UserIcon, GraduationCap, FolderGit2, Trophy, Medal, Star, Heart, Shield, ShieldCheck } from 'lucide-react';
import { formatDate } from '../../utils/dateFormat.js';
import api from '../../config/api.js';

// Profile Detail Component
const ProfileDetail = ({ label, value, icon: Icon, isArray = false, arrayValue = [] }) => (
  <div className="py-3 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 hover:bg-gray-50 transition-colors">
    <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
      {Icon && <Icon size={16} className="text-gray-400" />}
      {label}
    </dt>
    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
      {isArray ? (
        <div className="flex flex-wrap gap-2">
          {arrayValue && arrayValue.length > 0 ? (
            arrayValue.map((item, idx) => (
              <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">
                {item}
              </span>
            ))
          ) : (
            <span className="text-gray-400 italic">Not provided</span>
          )}
        </div>
      ) : (
        value || <span className="text-gray-400 italic">Not provided</span>
      )}
    </dd>
  </div>
);

// Section Header Component
const SectionHeader = ({ title, icon: Icon, badge }) => (
  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
      <Icon size={18} className="text-blue-600" />
      {title}
    </h4>
    {badge && (
      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
        {badge}
      </span>
    )}
  </div>
);

// Edit Profile Form Component
const EditProfileForm = ({ profile, userId, onCancel, onSuccess, userRole }) => {
  const { user } = useAuth();
  const isAdminOrHR = ['ADMIN', 'HR'].includes(userRole);
  
  const [formData, setFormData] = useState({
    firstName: profile?.profile?.firstName || '',
    lastName: profile?.profile?.lastName || '',
    phone: profile?.profile?.phone || '',
    dateOfBirth: profile?.profile?.dateOfBirth ? profile.profile.dateOfBirth.split('T')[0] : '',
    gender: profile?.profile?.gender || '',
    address: profile?.profile?.address || '',
    city: profile?.profile?.city || '',
    state: profile?.profile?.state || '',
    zipCode: profile?.profile?.zipCode || '',
    country: profile?.profile?.country || '',
    bio: profile?.profile?.bio || '',
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
      
      // Prepare update data - only include editable fields
      const updateData = {
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
          bio: formData.bio,
          skills: formData.skills
        }
      };

      const response = await api.patch(`/users/profile/${targetUserId}`, updateData);

      if (response.data?.success) {
        setSuccess('Profile updated successfully!');
        setTimeout(() => {
          onSuccess(response.data.data);
        }, 1500);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
      
      // Show detailed errors if any
      if (err.response?.data?.errors) {
        setError(err.response.data.errors.join(', '));
      }
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Editable Fields Notice */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800">
          <strong>Note:</strong> You can update your personal information below. 
          Other professional fields like Employee ID, Email, Department, Subjects, and Portfolio items can only be updated by Admin/HR.
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <SectionHeader title="Personal Information" icon={UserIcon} />
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <SectionHeader title="Address" icon={MapPin} />
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Street Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Street address"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="State"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ZIP code"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Country"
              />
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <SectionHeader title="Bio" icon={BookOpen} />
          <div className="p-4">
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows="4"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Tell us about yourself..."
            />
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <SectionHeader title="Skills" icon={Award} />
          <div className="p-4">
            <div className="flex gap-2 mb-3">
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
            
            <div className="flex flex-wrap gap-2 min-h-[60px] p-2 bg-gray-50 rounded-md border border-gray-200">
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
            <p className="text-xs text-gray-500 mt-2">
              Max 20 skills. Press Enter to add.
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={14} />
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

  const currentUserId = user?._id;
  const targetUserId = userId || currentUserId;
  const isAdminOrHR = ['ADMIN', 'HR'].includes(user?.role);
  const canEdit = !userId || userId === user?._id || isAdminOrHR;

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

    if (!authLoading && !hasFetched && targetUserId) {
      fetchProfile();
    }
  }, [authLoading, hasFetched, targetUserId]);

  const handleBack = () => {
    if (isAdminOrHR) {
      navigate('/admin/dashboard'); 
    } else {
      navigate('/trainer/dashboard'); 
    }
  };

  const handleEditSuccess = (updatedProfile) => {
    setProfile(updatedProfile);
    setIsEditing(false);
    setHasFetched(false);
  };

  if (authLoading || (loading && !profile)) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 md:p-8">
        <button 
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 mb-6 flex items-center font-medium transition-colors"
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
          className="text-blue-600 hover:text-blue-800 mb-6 flex items-center font-medium transition-colors"
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
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
          className="text-blue-600 hover:text-blue-800 mb-6 flex items-center font-medium transition-colors"
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
              className="mt-4 text-blue-600 hover:text-blue-800 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      {/* Back Button */}
      <button 
        onClick={handleBack}
        className="text-blue-600 hover:text-blue-800 mb-6 flex items-center font-medium transition-colors"
      >
        ← Back to Dashboard
      </button>

      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header with Role Badge */}
        <div className="px-4 py-5 sm:px-6 bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {userId && userId !== user?._id ? 'Trainer Profile' : 'My Profile'}
              </h3>
              {profile.role && (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  profile.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                  profile.role === 'HR' ? 'bg-purple-100 text-purple-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {profile.role}
                </span>
              )}
              {profile.status && (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  profile.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                  profile.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                  profile.status === 'ON_LEAVE' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {profile.status}
                </span>
              )}
            </div>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Complete profile information
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
          <div className="border-t border-gray-200">
            <dl className="divide-y divide-gray-200">
              {/* Personal Information Section */}
              <div>
                <SectionHeader title="Personal Information" icon={UserIcon} />
                <ProfileDetail 
                  label="Full Name" 
                  value={`${profile.profile?.firstName || ''} ${profile.profile?.lastName || ''}`.trim() || 'N/A'}
                  icon={UserIcon}
                />
                <ProfileDetail label="Employee ID" value={profile.profile?.employeeId} icon={Briefcase} />
                <ProfileDetail label="Email Address" value={profile.email} icon={Mail} />
                <ProfileDetail label="Phone Number" value={profile.profile?.phone} icon={Phone} />
                <ProfileDetail label="Date of Birth" value={profile.profile?.dateOfBirth ? formatDate(profile.profile.dateOfBirth) : 'N/A'} icon={Calendar} />
                <ProfileDetail label="Gender" value={profile.profile?.gender} icon={UserIcon} />
              </div>

              {/* Professional Information Section */}
              <div>
                <SectionHeader title="Professional Information" icon={Briefcase} />
                <ProfileDetail label="Role" value={profile.role} icon={Briefcase} />
                <ProfileDetail label="Trainer Category" value={profile.trainerCategory} icon={Briefcase} />
                <ProfileDetail label="Department" value={profile.profile?.department || 'N/A'} icon={Building2} />
                <ProfileDetail label="Designation" value={profile.profile?.designation || 'N/A'} icon={Briefcase} />
                <ProfileDetail label="Reporting Manager" value={profile.profile?.reportingManager || 'N/A'} icon={Users} />
                <ProfileDetail label="Joining Date" value={profile.profile?.joiningDate ? formatDate(profile.profile.joiningDate) : 'N/A'} icon={Calendar} />
              </div>

              {/* Address Section */}
              <div>
                <SectionHeader title="Address" icon={MapPin} />
                <ProfileDetail label="Street Address" value={profile.profile?.address} icon={MapPin} />
                <ProfileDetail label="City" value={profile.profile?.city} icon={MapPin} />
                <ProfileDetail label="State" value={profile.profile?.state} icon={MapPin} />
                <ProfileDetail label="ZIP Code" value={profile.profile?.zipCode} icon={MapPin} />
                <ProfileDetail label="Country" value={profile.profile?.country} icon={MapPin} />
              </div>

              {/* Skills Section */}
              <div>
                <SectionHeader title="Skills" icon={Award} />
                <ProfileDetail 
                  label="Skills" 
                  isArray={true}
                  arrayValue={profile.profile?.skills}
                  icon={Award}
                />
              </div>

              {/* Bio Section */}
              {profile.profile?.bio && (
                <div>
                  <SectionHeader title="Bio" icon={BookOpen} />
                  <div className="px-4 py-3 sm:px-6">
                    <p className="text-sm text-gray-700">{profile.profile.bio}</p>
                  </div>
                </div>
              )}

              {/* University Information Section */}
              {profile.profile?.university && (
                <div>
                  <SectionHeader title="University Information" icon={GraduationCap} />
                  <ProfileDetail label="University Name" value={profile.profile.university.name} icon={Building2} />
                  <ProfileDetail label="Enrollment ID" value={profile.profile.university.enrollmentId} icon={BookOpen} />
                  <ProfileDetail label="Join Date" value={profile.profile.university.joinDate ? formatDate(profile.profile.university.joinDate) : 'N/A'} icon={Calendar} />
                  <ProfileDetail label="Completion Date" value={profile.profile.university.completionDate ? formatDate(profile.profile.university.completionDate) : 'N/A'} icon={Calendar} />
                  <ProfileDetail label="University Status" value={profile.profile.university.status} icon={UserIcon} />
                </div>
              )}

              {/* Subjects Section */}
              {profile.profile?.subjects && profile.profile.subjects.length > 0 && (
                <div>
                  <SectionHeader title="Assigned Subjects" icon={BookOpen} badge={`${profile.profile.subjects.length} Subjects`} />
                  <div className="px-4 py-3 sm:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {profile.profile.subjects.map((subject, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <p className="font-medium text-sm">{subject.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Year {subject.year}, Semester {subject.semester} • Code: {subject.code}
                          </p>
                          {subject.syllabus && (
                            <a href={subject.syllabus.url} target="_blank" rel="noopener noreferrer" 
                               className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block">
                              View Syllabus
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Qualifications Section */}
              {profile.profile?.qualifications && profile.profile.qualifications.length > 0 && (
                <div>
                  <SectionHeader title="Qualifications" icon={GraduationCap} badge={`${profile.profile.qualifications.length} Degrees`} />
                  <div className="px-4 py-3 sm:px-6">
                    <div className="space-y-3">
                      {profile.profile.qualifications.map((qual, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <p className="font-medium text-sm">{qual.degree} in {qual.specialization}</p>
                          <p className="text-xs text-gray-600">{qual.university} • {qual.year}</p>
                          <p className="text-xs text-gray-500 mt-1">Grade: {qual.grade} • Percentage: {qual.percentage}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Experience Section */}
              {profile.profile?.experience && profile.profile.experience.length > 0 && (
                <div>
                  <SectionHeader title="Work Experience" icon={Briefcase} badge={`${profile.profile.experience.length} Positions`} />
                  <div className="px-4 py-3 sm:px-6">
                    <div className="space-y-3">
                      {profile.profile.experience.map((exp, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <p className="font-medium text-sm">{exp.role} at {exp.organization}</p>
                          <p className="text-xs text-gray-600">
                            {exp.duration?.from ? formatDate(exp.duration.from) : 'N/A'} - {exp.duration?.current ? 'Present' : (exp.duration?.to ? formatDate(exp.duration.to) : 'N/A')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{exp.description}</p>
                          {exp.achievements && exp.achievements.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-600">Achievements:</p>
                              <ul className="list-disc list-inside text-xs text-gray-500">
                                {exp.achievements.map((ach, i) => (
                                  <li key={i}>{ach}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Certifications Section */}
              {profile.profile?.certifications && profile.profile.certifications.length > 0 && (
                <div>
                  <SectionHeader title="Certifications" icon={Trophy} badge={`${profile.profile.certifications.length} Certifications`} />
                  <div className="px-4 py-3 sm:px-6">
                    <div className="space-y-3">
                      {profile.profile.certifications.map((cert, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <p className="font-medium text-sm">{cert.name}</p>
                          <p className="text-xs text-gray-600">{cert.issuingOrganization}</p>
                          <p className="text-xs text-gray-500">
                            Issued: {cert.issueDate ? formatDate(cert.issueDate) : 'N/A'}
                            {cert.expiryDate && ` • Expires: ${formatDate(cert.expiryDate)}`}
                          </p>
                          {cert.credentialId && (
                            <p className="text-xs text-gray-500 mt-1">Credential ID: {cert.credentialId}</p>
                          )}
                          {cert.credentialUrl && (
                            <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" 
                               className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block">
                              View Credential
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Client Information Section */}
              {profile.profile?.client && (
                <div>
                  <SectionHeader title="Client Information" icon={Building2} />
                  <ProfileDetail label="Client Name" value={profile.profile.client.name} icon={Building2} />
                  <ProfileDetail label="Client Email" value={profile.profile.client.email} icon={Mail} />
                  <ProfileDetail label="Client Phone" value={profile.profile.client.phone} icon={Phone} />
                  <ProfileDetail label="Client Address" value={profile.profile.client.address} icon={MapPin} />
                  <ProfileDetail label="Client City" value={profile.profile.client.city} icon={MapPin} />
                  <ProfileDetail label="Client State" value={profile.profile.client.state} icon={MapPin} />
                  <ProfileDetail label="Client ZIP" value={profile.profile.client.zipCode} icon={MapPin} />
                </div>
              )}
            </dl>
          </div>
        ) : (
          /* Edit Form */
          <EditProfileForm 
            profile={profile}
            userId={userId}
            onCancel={() => setIsEditing(false)}
            onSuccess={handleEditSuccess}
            userRole={user?.role}
          />
        )}
      </div>
    </div>
  );
}