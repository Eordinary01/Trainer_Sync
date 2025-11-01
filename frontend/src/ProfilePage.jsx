import React from 'react';
import { useNavigate } from 'react-router-dom';

// Mock Trainer Data (FR2.3 fields)
const trainerProfile = {
  employeeId: 'T-XEB-1093',
  name: 'Jane Doe',
  email: 'jane.doe@xebia.com',
  phone: '+91 98765 43210',
  clientName: 'Global Tech Solutions',
  clientAddress: 'Tower B, Silicon Valley, Noida, India',
  skills: ['React.js', 'Node.js', 'MongoDB', 'Agile/Scrum'],
  joiningDate: '2023-08-15',
  reportingManager: 'Mr. David Lee (M-007)',
};

export default function ProfilePage() {
    const navigate = useNavigate();

    // Helper component to display each field nicely
    const ProfileDetail = ({ label, value }) => (
        <div className="py-3 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">{label}</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{value}</dd>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            
            {/* Back Button */}
            <button 
              onClick={() => navigate('/dashboard')} 
              className="text-blue-600 hover:text-blue-800 mb-6 flex items-center font-medium"
            >
              ← Back to Dashboard
            </button>

            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 bg-blue-50">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        My Trainer Profile (FR2.2)
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        Personal and client information.
                    </p>
                </div>
                
                <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-gray-200">
                        
                        <ProfileDetail label="Full Name" value={trainerProfile.name} />
                        <ProfileDetail label="Employee ID" value={trainerProfile.employeeId} />
                        <ProfileDetail label="Email Address" value={trainerProfile.email} />
                        <ProfileDetail label="Phone Number" value={trainerProfile.phone} />
                        <ProfileDetail label="Reporting Manager" value={trainerProfile.reportingManager} />
                        <ProfileDetail label="Client Name" value={trainerProfile.clientName} />
                        <ProfileDetail label="Client Address" value={trainerProfile.clientAddress} />
                        <ProfileDetail label="Joining Date" value={trainerProfile.joiningDate} />
                        
                        <div className="py-3 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Skills</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                <span className="inline-flex flex-wrap gap-2">
                                    {trainerProfile.skills.map(skill => (
                                        <span key={skill} className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {skill}
                                        </span>
                                    ))}
                                </span>
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
            
            {/* Admin Edit Link Placeholder (FR2.1) */}
            <div className="text-center mt-6">
                <button 
                    onClick={() => alert("Admin Edit View Placeholder")} 
                    className="text-sm text-gray-500 hover:text-blue-600"
                >
                    [Admin Access: Edit Profile]
                </button>
            </div>
        </div>
    );
}