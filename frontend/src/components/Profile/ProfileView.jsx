import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { Edit2 } from 'lucide-react';
import { formatDate } from '../../utils/dateFormat.js';
import api from '../../config/api.js';

// Profile Detail Component
const ProfileDetail = ({ label, value }) => (
  <div className="py-3 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
    <dt className="text-sm font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{value || 'N/A'}</dd>
  </div>
);

export default function ProfilePage({ userId }) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  console.log("🔍 ProfilePage - User object:", user);
  console.log("🔍 ProfilePage - User _id:", user?._id);
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
       
        if (authLoading) {
          console.log("⏳ Waiting for auth to load...");
          return;
        }
        
       
        const targetUserId = userId || user?._id;
        
        console.log("🔍 User ID resolution:", {
          userId,
          user_id: user?._id,
          finalTargetUserId: targetUserId
        });
        
        if (!targetUserId) {
          throw new Error(`No user ID available. User object: ${JSON.stringify(user, null, 2)}`);
        }

        console.log("🔍 Fetching profile for user ID:", targetUserId);
        
        const response = await api.get(`/users/${targetUserId}`);
        console.log("✅ Profile API response:", response.data);
        
        setProfile(response.data.data);
      } catch (err) {
        console.error("❌ Profile fetch error:", err);
        setError(err.response?.data || { message: err.message });
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchProfile();
    }
  }, [userId, user, authLoading]);

  const handleBack = () => {
    if (user?.role === 'ADMIN' || user?.role === 'HR') {
      navigate('/admin/dashboard'); 
    } else {
      navigate('/trainer/dashboard'); 
    }
  };

 
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 md:p-8">
        <div className="text-center py-8">Checking authentication...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 md:p-8">
        <button 
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 mb-6 flex items-center font-medium"
        >
          ← Back to Dashboard
        </button>
        <div className="text-center py-8">Loading Profile...</div>
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
            <div className="text-xs text-gray-500 text-left bg-gray-50 p-3 rounded">
              <strong>Error Details:</strong>
              <pre>{JSON.stringify(error, null, 2)}</pre>
            </div>
            <button
              onClick={() => window.location.reload()}
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
        <div className="text-center py-8">No profile data found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      
      {/* Back Button - Fixed navigation */}
      <button 
        onClick={handleBack}
        className="text-blue-600 hover:text-blue-800 mb-6 flex items-center font-medium"
      >
        ← Back to Dashboard
      </button>

      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-blue-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {userId && userId !== user?._id ? 'Trainer Profile' : 'My Trainer Profile'} (FR2.2)
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Personal and client information.
          </p>
        </div>
        
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            
            <ProfileDetail label="Full Name" value={`${profile.profile?.firstName} ${profile.profile?.lastName}`} />
            <ProfileDetail label="Employee ID" value={profile.profile?.employeeId} />
            <ProfileDetail label="Email Address" value={profile.email} />
            <ProfileDetail label="Phone Number" value={profile.profile?.phone} />
            <ProfileDetail label="Reporting Manager" value={profile.reportingManager} />
            <ProfileDetail label="Client Name" value={profile.profile?.client?.name} />
            <ProfileDetail label="Client Address" value={profile.profile?.client?.address} />
            <ProfileDetail label="Joining Date" value={profile.profile?.joiningDate ? formatDate(profile.profile.joiningDate) : 'N/A'} />
            
            <div className="py-3 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Skills</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span className="inline-flex flex-wrap gap-2">
                  {profile.profile?.skills && profile.profile.skills.length > 0 ? (
                    profile.profile.skills.map(skill => (
                      <span key={skill} className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
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
      </div>
      
      {/* Admin Edit Link - Only show for admin viewing other profiles */}
      {(user?.role === 'ADMIN' || user?.role === 'HR') && userId && userId !== user?._id && (
        <div className="text-center mt-6">
          <button 
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit2 size={16} />
            Edit Profile
          </button>
        </div>
      )}
    </div>
  );
}