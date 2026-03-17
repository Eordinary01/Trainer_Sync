// components/Common/EditTrainerModal.jsx
import React, { useState, useEffect } from "react";
import { X, Save, AlertCircle, Loader, Plus, Trash2, Edit2, Calendar, Briefcase, GraduationCap, Award, BookOpen, User, MapPin, Mail, Phone } from "lucide-react";
import api from "../../config/api.js";
import { formatDate } from "../../utils/dateFormat.js";

export default function EditTrainerModal({ trainer, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState("basic");

  // ============================================
  // FORM DATA - Matches User Model exactly
  // ============================================
  const [formData, setFormData] = useState({
    // Basic Account Info
    email: trainer?.email || "",
    username: trainer?.username || "",
    trainerCategory: trainer?.trainerCategory || "PERMANENT",
    status: trainer?.status || "ACTIVE",

    // Personal Information
    firstName: trainer?.profile?.firstName || "",
    lastName: trainer?.profile?.lastName || "",
    phone: trainer?.profile?.phone || "",
    dateOfBirth: trainer?.profile?.dateOfBirth ? new Date(trainer.profile.dateOfBirth).toISOString().split("T")[0] : "",
    gender: trainer?.profile?.gender || "",
    bio: trainer?.profile?.bio || "",

    // Address Information
    address: trainer?.profile?.address || "",
    city: trainer?.profile?.city || "",
    state: trainer?.profile?.state || "",
    zipCode: trainer?.profile?.zipCode || "",
    country: trainer?.profile?.country || "",

    // Professional Information
    employeeId: trainer?.profile?.employeeId || "",
    joiningDate: trainer?.profile?.joiningDate ? new Date(trainer.profile.joiningDate).toISOString().split("T")[0] : "",
    
    // University Information
    universityName: trainer?.profile?.university?.name || "",
    universityEnrollmentId: trainer?.profile?.university?.enrollmentId || "",
    universityJoinDate: trainer?.profile?.university?.joinDate ? new Date(trainer.profile.university.joinDate).toISOString().split("T")[0] : "",
    universityCompletionDate: trainer?.profile?.university?.completionDate ? new Date(trainer.profile.university.completionDate).toISOString().split("T")[0] : "",
    universityStatus: trainer?.profile?.university?.status || "ACTIVE",

    // Arrays (Admin-managed)
    subjects: trainer?.profile?.subjects || [],
    qualifications: trainer?.profile?.qualifications || [],
    experience: trainer?.profile?.experience || [],
    certifications: trainer?.profile?.certifications || [],
    skills: trainer?.profile?.skills || [],

    // Client Information
    clientName: trainer?.profile?.client?.name || "",
    clientEmail: trainer?.profile?.client?.email || "",
    clientPhone: trainer?.profile?.client?.phone || "",
    clientAddress: trainer?.profile?.client?.address || "",
    clientCity: trainer?.profile?.client?.city || "",
    clientState: trainer?.profile?.client?.state || "",
    clientZipCode: trainer?.profile?.client?.zipCode || "",

    // Trainer-added (view only)
    semesterActivities: trainer?.profile?.semesterActivities || [],
    projects: trainer?.profile?.projects || [],
    placementRecord: trainer?.profile?.placementRecord || {}
  });

  // ============================================
  // AUTO-SYNC EFFECTS
  // ============================================
  
  // Sync enrollmentId with employeeId
  useEffect(() => {
    if (formData.employeeId) {
      setFormData(prev => ({
        ...prev,
        universityEnrollmentId: prev.employeeId
      }));
    }
  }, [formData.employeeId]);

  // Sync university join date with joining date (if empty)
  useEffect(() => {
    if (formData.joiningDate && !formData.universityJoinDate) {
      setFormData(prev => ({
        ...prev,
        universityJoinDate: prev.joiningDate
      }));
    }
  }, [formData.joiningDate]);

  // ============================================
  // TEMPORARY STATES FOR ADDING ITEMS
  // ============================================
  const [newSkill, setNewSkill] = useState("");
  
  const [newSubject, setNewSubject] = useState({
    name: "", code: "", year: "", semester: "", credits: ""
  });
  
  const [newQualification, setNewQualification] = useState({
    degree: "", specialization: "", university: "", year: "", percentage: "", grade: "", type: "UG"
  });
  
  const [newExperience, setNewExperience] = useState({
    organization: "", role: "", fromDate: "", toDate: "", current: false, description: "", type: "TEACHING"
  });
  
  const [newCertification, setNewCertification] = useState({
    name: "", issuingOrganization: "", issueDate: "", expiryDate: "", credentialId: ""
  });

  // ============================================
  // HANDLERS
  // ============================================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  // Subject Handlers
  const handleAddSubject = () => {
    if (newSubject.name && newSubject.year) {
      setFormData(prev => ({
        ...prev,
        subjects: [...prev.subjects, { ...newSubject, id: Date.now() }]
      }));
      setNewSubject({ name: "", code: "", year: "", semester: "", credits: "" });
    }
  };

  const handleRemoveSubject = (index) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index)
    }));
  };

  // Qualification Handlers
  const handleAddQualification = () => {
    if (newQualification.degree && newQualification.university) {
      setFormData(prev => ({
        ...prev,
        qualifications: [...prev.qualifications, { ...newQualification, id: Date.now() }]
      }));
      setNewQualification({ degree: "", specialization: "", university: "", year: "", percentage: "", grade: "", type: "UG" });
    }
  };

  const handleRemoveQualification = (index) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index)
    }));
  };

  // Experience Handlers
  const handleAddExperience = () => {
    if (newExperience.organization && newExperience.role) {
      setFormData(prev => ({
        ...prev,
        experience: [...prev.experience, {
          ...newExperience,
          id: Date.now(),
          duration: {
            from: newExperience.fromDate,
            to: newExperience.current ? null : newExperience.toDate,
            current: newExperience.current
          }
        }]
      }));
      setNewExperience({ organization: "", role: "", fromDate: "", toDate: "", current: false, description: "", type: "TEACHING" });
    }
  };

  const handleRemoveExperience = (index) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  // Certification Handlers
  const handleAddCertification = () => {
    if (newCertification.name && newCertification.issuingOrganization) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, { ...newCertification, id: Date.now() }]
      }));
      setNewCertification({ name: "", issuingOrganization: "", issueDate: "", expiryDate: "", credentialId: "" });
    }
  };

  const handleRemoveCertification = (index) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  // Skill Handlers
  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  // Status Toggle
  const handleStatusToggle = async () => {
    try {
      setLoading(true);
      const endpoint = formData.status === "ACTIVE" ? "deactivate" : "activate";
      const response = await api.patch(`/users/${trainer._id}/${endpoint}`);
      
      if (response.data.success) {
        setFormData(prev => ({ ...prev, status: formData.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }));
        setSuccess(`Trainer ${formData.status === "ACTIVE" ? "deactivated" : "activated"} successfully!`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  // Validation
  const validateForm = () => {
    if (!formData.email?.includes("@")) return "Valid email is required";
    if (!formData.username) return "Username is required";
    if (!formData.firstName || !formData.lastName) return "First and last name are required";
    if (!formData.employeeId) return "Employee ID is required";
    if (!formData.joiningDate) return "Joining date is required";
    return null;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      
const payload = {
  email: formData.email,
  username: formData.username,
  trainerCategory: formData.trainerCategory,
  status: formData.status, // ✅ Add this if you want to update status
  
  // Profile fields - all nested under profile
  profile: {
    // Personal Info
    firstName: formData.firstName,
    lastName: formData.lastName,
    phone: formData.phone,
    dateOfBirth: formData.dateOfBirth || undefined,
    gender: formData.gender || undefined,
    bio: formData.bio || undefined,
    
    // Address
    address: formData.address || undefined,
    city: formData.city || undefined,
    state: formData.state || undefined,
    zipCode: formData.zipCode || undefined,
    country: formData.country || undefined,
    
    // Professional
    employeeId: formData.employeeId,
    joiningDate: formData.joiningDate,
    
    // University
    university: {
      name: formData.universityName,
      enrollmentId: formData.employeeId,
      joinDate: formData.universityJoinDate || formData.joiningDate,
      completionDate: formData.universityCompletionDate || undefined,
      status: formData.universityStatus
    },
    
    // Arrays
    subjects: formData.subjects,
    qualifications: formData.qualifications,
    experience: formData.experience,
    certifications: formData.certifications,
    skills: formData.skills,
    
    // Trainer-added content
    semesterActivities: formData.semesterActivities,
    projects: formData.projects,
    placementRecord: formData.placementRecord
  },
  
  // ✅ FIXED: Client should be at root level, not inside profile
  client: {
    name: formData.clientName || undefined,
    email: formData.clientEmail || undefined,
    phone: formData.clientPhone || undefined,
    address: formData.clientAddress || undefined,
    city: formData.clientCity || undefined,
    state: formData.clientState || undefined,
    zipCode: formData.clientZipCode || undefined,
  }
};

      const response = await api.put(`/admin/${trainer._id}`, payload);

      if (response.data.success) {
        setSuccess("Profile updated successfully!");
        setTimeout(() => {
          onSuccess(response.data.data);
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error("Error updating trainer:", err);
      setError(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // TABS CONFIGURATION
  // ============================================
  const tabs = [
    { id: "basic", label: "Basic Info", icon: User },
    { id: "personal", label: "Personal", icon: User },
    { id: "university", label: "University", icon: GraduationCap },
    { id: "subjects", label: "Subjects", icon: BookOpen },
    { id: "qualifications", label: "Qualifications", icon: Award },
    { id: "experience", label: "Experience", icon: Briefcase },
    { id: "certifications", label: "Certifications", icon: Award },
    { id: "skills", label: "Skills", icon: BookOpen },
    { id: "client", label: "Client", icon: Briefcase },
    { id: "trainer", label: "Trainer's Work", icon: Calendar },
  ];

  // ============================================
  // RENDER FUNCTIONS FOR EACH TAB
  // ============================================
  
  const renderBasicTab = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-gray-800 mb-4">Basic Information</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Trainer Category</label>
          <select
            name="trainerCategory"
            value={formData.trainerCategory}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="PERMANENT">Permanent</option>
            <option value="CONTRACTED">Contracted</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <div className="flex items-center h-10">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              formData.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
            }`}>
              {formData.status}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> Use the status toggle at the top to activate/deactivate this trainer.
        </p>
      </div>
    </div>
  );

  const renderPersonalTab = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-gray-800 mb-4">Personal Information</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
          <input
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
        <select
          name="gender"
          value={formData.gender}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
        <textarea
          name="bio"
          value={formData.bio}
          onChange={handleInputChange}
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Brief description about the trainer..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Street address"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
          <input
            type="text"
            name="zipCode"
            value={formData.zipCode}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
          <input
            type="text"
            name="country"
            value={formData.country}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderUniversityTab = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-gray-800 mb-4">University Information</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID *</label>
        <input
          type="text"
          name="employeeId"
          value={formData.employeeId}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Joining Date *</label>
        <input
          type="date"
          name="joiningDate"
          value={formData.joiningDate}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">University Name</label>
        <input
          type="text"
          name="universityName"
          value={formData.universityName}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enrollment ID <span className="text-xs text-gray-600">(Auto-synced with Employee ID)</span>
        </label>
        <input
          type="text"
          value={formData.employeeId}
          readOnly
          className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-gray-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">University Join Date</label>
          <input
            type="date"
            value={formData.universityJoinDate}
            onChange={(e) => setFormData(prev => ({ ...prev, universityJoinDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Auto-synced with Joining Date if empty</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Completion Date</label>
          <input
            type="date"
            value={formData.universityCompletionDate}
            onChange={(e) => setFormData(prev => ({ ...prev, universityCompletionDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
        <select
          value={formData.universityStatus}
          onChange={(e) => setFormData(prev => ({ ...prev, universityStatus: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="WITHDRAWN">Withdrawn</option>
        </select>
      </div>
    </div>
  );

  const renderSubjectsTab = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-gray-800 mb-4">Subjects</h3>
      
      {/* Add Subject Form */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <input
          type="text"
          placeholder="Subject Name *"
          value={newSubject.name}
          onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Subject Code"
            value={newSubject.code}
            onChange={(e) => setNewSubject({...newSubject, code: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Credits"
            value={newSubject.credits}
            onChange={(e) => setNewSubject({...newSubject, credits: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <select
            value={newSubject.year}
            onChange={(e) => setNewSubject({...newSubject, year: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Year</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
          <select
            value={newSubject.semester}
            onChange={(e) => setNewSubject({...newSubject, semester: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Semester</option>
            <option value="1">Sem 1</option>
            <option value="2">Sem 2</option>
            <option value="3">Sem 3</option>
            <option value="4">Sem 4</option>
            <option value="5">Sem 5</option>
            <option value="6">Sem 6</option>
            <option value="7">Sem 7</option>
            <option value="8">Sem 8</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleAddSubject}
          disabled={!newSubject.name || !newSubject.year}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Add Subject
        </button>
      </div>

      {/* Subjects List */}
      {formData.subjects.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Assigned Subjects</h4>
          {formData.subjects.map((subject, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div>
                <p className="font-medium">{subject.name}</p>
                <p className="text-sm text-gray-600">
                  Year {subject.year} • Semester {subject.semester} • {subject.credits} Credits
                  {subject.code && ` • Code: ${subject.code}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveSubject(index)}
                className="text-red-600 hover:text-red-800 p-1 rounded-lg hover:bg-red-50"
                title="Remove Subject"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderQualificationsTab = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-gray-800 mb-4">Qualifications</h3>
      
      {/* Add Qualification Form */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <input
          type="text"
          placeholder="Degree *"
          value={newQualification.degree}
          onChange={(e) => setNewQualification({...newQualification, degree: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        
        <input
          type="text"
          placeholder="Specialization"
          value={newQualification.specialization}
          onChange={(e) => setNewQualification({...newQualification, specialization: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        
        <input
          type="text"
          placeholder="University *"
          value={newQualification.university}
          onChange={(e) => setNewQualification({...newQualification, university: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />

        <div className="grid grid-cols-3 gap-3">
          <input
            type="number"
            placeholder="Year"
            value={newQualification.year}
            onChange={(e) => setNewQualification({...newQualification, year: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Percentage"
            value={newQualification.percentage}
            onChange={(e) => setNewQualification({...newQualification, percentage: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Grade"
            value={newQualification.grade}
            onChange={(e) => setNewQualification({...newQualification, grade: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={newQualification.type}
          onChange={(e) => setNewQualification({...newQualification, type: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="UG">UG</option>
          <option value="PG">PG</option>
          <option value="PHD">PHD</option>
          <option value="DIPLOMA">Diploma</option>
          <option value="CERTIFICATION">Certification</option>
        </select>

        <button
          type="button"
          onClick={handleAddQualification}
          disabled={!newQualification.degree || !newQualification.university}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Add Qualification
        </button>
      </div>

      {/* Qualifications List */}
      {formData.qualifications.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Added Qualifications</h4>
          {formData.qualifications.map((qual, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div>
                <p className="font-medium">{qual.degree}</p>
                <p className="text-sm text-gray-600">
                  {qual.university} • {qual.year} • {qual.grade}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveQualification(index)}
                className="text-red-600 hover:text-red-800 p-1 rounded-lg hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderExperienceTab = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-gray-800 mb-4">Work Experience</h3>
      
      {/* Add Experience Form */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <input
          type="text"
          placeholder="Organization *"
          value={newExperience.organization}
          onChange={(e) => setNewExperience({...newExperience, organization: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        
        <input
          type="text"
          placeholder="Role *"
          value={newExperience.role}
          onChange={(e) => setNewExperience({...newExperience, role: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            placeholder="From Date"
            value={newExperience.fromDate}
            onChange={(e) => setNewExperience({...newExperience, fromDate: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            placeholder="To Date"
            value={newExperience.toDate}
            onChange={(e) => setNewExperience({...newExperience, toDate: e.target.value})}
            disabled={newExperience.current}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={newExperience.current}
            onChange={(e) => setNewExperience({...newExperience, current: e.target.checked})}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">I currently work here</span>
        </label>

        <textarea
          placeholder="Description"
          value={newExperience.description}
          onChange={(e) => setNewExperience({...newExperience, description: e.target.value})}
          rows="2"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />

        <select
          value={newExperience.type}
          onChange={(e) => setNewExperience({...newExperience, type: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="TEACHING">Teaching</option>
          <option value="INDUSTRY">Industry</option>
          <option value="RESEARCH">Research</option>
          <option value="ADMINISTRATIVE">Administrative</option>
        </select>

        <button
          type="button"
          onClick={handleAddExperience}
          disabled={!newExperience.organization || !newExperience.role}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Add Experience
        </button>
      </div>

      {/* Experience List */}
      {formData.experience.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Added Experience</h4>
          {formData.experience.map((exp, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div>
                <p className="font-medium">{exp.role} at {exp.organization}</p>
                <p className="text-sm text-gray-600">
                  {exp.duration?.current ? 'Present' : exp.duration?.to ? new Date(exp.duration.to).getFullYear() : ''} • {exp.type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveExperience(index)}
                className="text-red-600 hover:text-red-800 p-1 rounded-lg hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCertificationsTab = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-gray-800 mb-4">Certifications</h3>
      
      {/* Add Certification Form */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <input
          type="text"
          placeholder="Certification Name *"
          value={newCertification.name}
          onChange={(e) => setNewCertification({...newCertification, name: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        
        <input
          type="text"
          placeholder="Issuing Organization *"
          value={newCertification.issuingOrganization}
          onChange={(e) => setNewCertification({...newCertification, issuingOrganization: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            placeholder="Issue Date"
            value={newCertification.issueDate}
            onChange={(e) => setNewCertification({...newCertification, issueDate: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            placeholder="Expiry Date"
            value={newCertification.expiryDate}
            onChange={(e) => setNewCertification({...newCertification, expiryDate: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <input
          type="text"
          placeholder="Credential ID"
          value={newCertification.credentialId}
          onChange={(e) => setNewCertification({...newCertification, credentialId: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="button"
          onClick={handleAddCertification}
          disabled={!newCertification.name || !newCertification.issuingOrganization}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Add Certification
        </button>
      </div>

      {/* Certifications List */}
      {formData.certifications.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Added Certifications</h4>
          {formData.certifications.map((cert, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div>
                <p className="font-medium">{cert.name}</p>
                <p className="text-sm text-gray-600">{cert.issuingOrganization}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveCertification(index)}
                className="text-red-600 hover:text-red-800 p-1 rounded-lg hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSkillsTab = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-gray-800 mb-4">Skills</h3>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Add a skill (e.g., React, Python, Communication)"
        />
        <button
          type="button"
          onClick={handleAddSkill}
          disabled={!newSkill.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          Add
        </button>
      </div>

      <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg min-h-[100px]">
        {formData.skills.length > 0 ? (
          formData.skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {skill}
              <button
                type="button"
                onClick={() => handleRemoveSkill(skill)}
                className="hover:text-red-600 focus:outline-none"
                title="Remove skill"
              >
                <X size={14} />
              </button>
            </span>
          ))
        ) : (
          <p className="text-gray-500 w-full text-center py-2">No skills added yet</p>
        )}
      </div>
      <p className="text-xs text-gray-500">Press Enter or click Add to add a skill</p>
    </div>
  );

  const renderClientTab = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-gray-800 mb-4">Client Information</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          name="clientName"
          value={formData.clientName}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Client Name"
        />
        <input
          type="email"
          name="clientEmail"
          value={formData.clientEmail}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Client Email"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input
          type="tel"
          name="clientPhone"
          value={formData.clientPhone}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Client Phone"
        />
        <input
          type="text"
          name="clientAddress"
          value={formData.clientAddress}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Client Address"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <input
          type="text"
          name="clientCity"
          value={formData.clientCity}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="City"
        />
        <input
          type="text"
          name="clientState"
          value={formData.clientState}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="State"
        />
        <input
          type="text"
          name="clientZipCode"
          value={formData.clientZipCode}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Zip Code"
        />
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> Client information is optional and can be left blank.
        </p>
      </div>
    </div>
  );

  const renderTrainerTab = () => (
    <div className="space-y-6">
      <h3 className="font-semibold text-lg text-gray-800 mb-4">Trainer's Added Content</h3>
      
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> These fields are managed by the trainer. Admin can view but edits should be made by the trainer first.
        </p>
      </div>

      {/* Semester Activities */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
          <Calendar size={18} className="text-blue-600" />
          Semester Activities
        </h4>
        {formData.semesterActivities.length > 0 ? (
          <div className="space-y-2">
            {formData.semesterActivities.map((activity, idx) => (
              <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium">Semester {activity.semester} - {activity.year}</p>
                {activity.activities?.map((act, i) => (
                  <p key={i} className="text-sm text-gray-600 mt-1">• {act.title}</p>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No activities added yet by trainer</p>
        )}
      </div>

      {/* Projects */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
          <Briefcase size={18} className="text-blue-600" />
          Projects
        </h4>
        {formData.projects.length > 0 ? (
          <div className="space-y-2">
            {formData.projects.map((project, idx) => (
              <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium">{project.title}</p>
                <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                {project.technologies && (
                  <p className="text-xs text-gray-500 mt-1">Tech: {project.technologies.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No projects added yet by trainer</p>
        )}
      </div>

      {/* Placement Records */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
          <Award size={18} className="text-blue-600" />
          Placement Records
        </h4>
        {formData.placementRecord?.stats?.length > 0 ? (
          <div className="space-y-2">
            {formData.placementRecord.stats.map((stat, idx) => (
              <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium">Year {stat.year}</p>
                <p className="text-sm text-gray-600">
                  Placed: {stat.placedStudents}/{stat.totalStudents} • Avg Package: ₹{stat.averagePackage}L
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No placement records added yet by trainer</p>
        )}
      </div>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">Edit Trainer Profile</h2>
            <p className="text-sm text-gray-600 mt-1">
              {formData.firstName} {formData.lastName} • {formData.employeeId}
            </p>
          </div>
          
          <div className="flex items-center gap-4 ml-4">
            <button
              type="button"
              onClick={handleStatusToggle}
              disabled={loading}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                formData.status === "ACTIVE"
                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                  : "bg-red-100 text-red-800 hover:bg-red-200"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? "Updating..." : formData.status}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
            <AlertCircle size={18} className="text-green-600" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto bg-gray-50 sticky top-[88px] z-10">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
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

          {/* Tab Content */}
          {activeTab === "basic" && renderBasicTab()}
          {activeTab === "personal" && renderPersonalTab()}
          {activeTab === "university" && renderUniversityTab()}
          {activeTab === "subjects" && renderSubjectsTab()}
          {activeTab === "qualifications" && renderQualificationsTab()}
          {activeTab === "experience" && renderExperienceTab()}
          {activeTab === "certifications" && renderCertificationsTab()}
          {activeTab === "skills" && renderSkillsTab()}
          {activeTab === "client" && renderClientTab()}
          {activeTab === "trainer" && renderTrainerTab()}

          {/* Buttons - Hide for trainer tab */}
          {activeTab !== "trainer" && (
            <div className="flex gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
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
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}