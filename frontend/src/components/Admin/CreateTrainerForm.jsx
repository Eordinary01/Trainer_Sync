// components/Admin/CreateTrainerForm.jsx
import React, { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  User,
  Briefcase,
  GraduationCap,
  BookOpen,
  Award,
  X,
  Plus,
  Calendar,
} from "lucide-react";
import api from "../../config/api.js";
import { useAuth } from "../../hooks/useAuth.js";

export const CreateTrainerForm = ({ onSuccess }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ============================================
  // FORM DATA - Matches User Model exactly
  // ============================================
  const [formData, setFormData] = useState({
    // Basic Account Info
    username: "",
    email: "",
    trainerCategory: "PERMANENT",

    // Profile - Basic Info
    profile: {
      firstName: "",
      lastName: "",
      phone: "",
      employeeId: "",
      joiningDate: "",
      dateOfBirth: "",
      gender: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      bio: "",

      // University Info - ✅ Added completionDate
      university: {
        name: "",
        enrollmentId: "",
        joinDate: "",
        completionDate: "", // ✅ Added missing field
        status: "ACTIVE",
      },

      // Subjects
      subjects: [],

      // Admin-added professional fields
      qualifications: [],
      experience: [],
      certifications: [],
      skills: [],

      // Trainer-filled fields (initialized empty)
      semesterActivities: [],
      projects: [],
      placementRecord: {},

      // Client Info (Optional)
      client: {
        name: "",
        address: "",
        city: "",
      },
    },
  });

  // ============================================
  // TEMPORARY STATES FOR ARRAY INPUTS
  // ============================================
  const [currentSkill, setCurrentSkill] = useState("");

  const [currentSubject, setCurrentSubject] = useState({
    name: "",
    code: "",
    year: "",
    semester: "",
    credits: "",

    syllabus: {
      type: "link", //'link or text'
      url: "",
      content: "",
      filename: "",
    },
  });

  const [currentQualification, setCurrentQualification] = useState({
    degree: "",
    specialization: "",
    university: "",
    year: "",
    percentage: "",
    grade: "",
    type: "UG",
  });

  const [currentExperience, setCurrentExperience] = useState({
    organization: "",
    role: "",
    fromDate: "",
    toDate: "",
    current: false,
    description: "",
    type: "TEACHING",
  });

  const [currentCertification, setCurrentCertification] = useState({
    name: "",
    issuingOrganization: "",
    issueDate: "",
    expiryDate: "",
    credentialId: "",
  });

  // ============================================
  // AUTO-SYNC EFFECTS
  // ============================================

  // Auto-sync enrollmentId with employeeId
  useEffect(() => {
    if (formData.profile.employeeId) {
      setFormData((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          university: {
            ...prev.profile.university,
            enrollmentId: prev.profile.employeeId,
          },
        },
      }));
    }
  }, [formData.profile.employeeId]);

  // Auto-set university joinDate to joiningDate
  useEffect(() => {
    if (formData.profile.joiningDate) {
      setFormData((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          university: {
            ...prev.profile.university,
            joinDate: prev.profile.joiningDate,
          },
        },
      }));
    }
  }, [formData.profile.joiningDate]);

  // ============================================
  // STEPS CONFIGURATION
  // ============================================
  const steps = [
    { number: 1, title: "Basic Info", icon: User },
    { number: 2, title: "Personal", icon: User },
    { number: 3, title: "Assignment", icon: BookOpen },
    { number: 4, title: "Qualifications", icon: GraduationCap },
    { number: 5, title: "Experience", icon: Briefcase },
    { number: 6, title: "Certifications", icon: Award },
    { number: 7, title: "Skills", icon: BookOpen },
    { number: 8, title: "Review", icon: Check },
  ];

  // ============================================
  // HANDLE INPUT CHANGES
  // ============================================
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("profile.")) {
      const path = name.split(".");
      if (path.length === 2) {
        setFormData((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            [path[1]]: value,
          },
        }));
      } else if (path.length === 3) {
        setFormData((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            [path[1]]: {
              ...prev.profile[path[1]],
              [path[2]]: value,
            },
          },
        }));
      }
    } else if (name.startsWith("client.")) {
      const fieldName = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          client: {
            ...prev.profile.client,
            [fieldName]: value,
          },
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // ============================================
  // QUALIFICATIONS HANDLERS
  // ============================================
  const handleAddQualification = (e) => {
    e.preventDefault(); // ✅ Prevent form submission
    if (currentQualification.degree && currentQualification.university) {
      setFormData((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          qualifications: [
            ...prev.profile.qualifications,
            { ...currentQualification, id: Date.now() },
          ],
        },
      }));
      setCurrentQualification({
        degree: "",
        specialization: "",
        university: "",
        year: "",
        percentage: "",
        grade: "",
        type: "UG",
      });
    }
  };

  const handleRemoveQualification = (index, e) => {
    e.preventDefault(); // ✅ Prevent form submission
    setFormData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        qualifications: prev.profile.qualifications.filter(
          (_, i) => i !== index,
        ),
      },
    }));
  };

  // ============================================
  // EXPERIENCE HANDLERS
  // ============================================
  const handleAddExperience = (e) => {
    e.preventDefault(); // ✅ Prevent form submission
    if (currentExperience.organization && currentExperience.role) {
      setFormData((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          experience: [
            ...prev.profile.experience,
            {
              ...currentExperience,
              id: Date.now(),
              duration: {
                from: currentExperience.fromDate,
                to: currentExperience.current ? null : currentExperience.toDate,
                current: currentExperience.current,
              },
            },
          ],
        },
      }));
      setCurrentExperience({
        organization: "",
        role: "",
        fromDate: "",
        toDate: "",
        current: false,
        description: "",
        type: "TEACHING",
      });
    }
  };

  const handleRemoveExperience = (index, e) => {
    e.preventDefault(); // ✅ Prevent form submission
    setFormData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        experience: prev.profile.experience.filter((_, i) => i !== index),
      },
    }));
  };

  // ============================================
  // CERTIFICATIONS HANDLERS
  // ============================================
  const handleAddCertification = (e) => {
    e.preventDefault(); // ✅ Prevent form submission
    if (currentCertification.name && currentCertification.issuingOrganization) {
      setFormData((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          certifications: [
            ...prev.profile.certifications,
            { ...currentCertification, id: Date.now() },
          ],
        },
      }));
      setCurrentCertification({
        name: "",
        issuingOrganization: "",
        issueDate: "",
        expiryDate: "",
        credentialId: "",
      });
    }
  };

  const handleRemoveCertification = (index, e) => {
    e.preventDefault(); // ✅ Prevent form submission
    setFormData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        certifications: prev.profile.certifications.filter(
          (_, i) => i !== index,
        ),
      },
    }));
  };

  // ============================================
  // SKILLS HANDLERS
  // ============================================
  const handleAddSkill = (e) => {
    e.preventDefault(); // ✅ Prevent form submission
    if (
      currentSkill.trim() &&
      !formData.profile.skills.includes(currentSkill.trim())
    ) {
      setFormData((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          skills: [...prev.profile.skills, currentSkill.trim()],
        },
      }));
      setCurrentSkill("");
    }
  };

  const handleSkillKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // ✅ Prevent form submission on Enter
      handleAddSkill(e);
    }
  };

  const handleRemoveSkill = (skillToRemove, e) => {
    e.preventDefault(); // ✅ Prevent form submission
    setFormData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        skills: prev.profile.skills.filter((skill) => skill !== skillToRemove),
      },
    }));
  };

  // ============================================
  // SUBJECTS HANDLERS
  // ============================================
  const handleAddSubject = (e) => {
  e.preventDefault();
  
  // Validate subject basics
  if (!currentSubject.name || !currentSubject.year) {
    alert('Subject name and year are required');
    return;
  }

  // ✅ CRITICAL: Validate syllabus is provided
  const hasSyllabusLink = currentSubject.syllabus.type === 'link' && currentSubject.syllabus.url?.trim();
  const hasSyllabusText = currentSubject.syllabus.type === 'text' && currentSubject.syllabus.content?.trim();

  if (!hasSyllabusLink && !hasSyllabusText) {
    alert('❌ Syllabus is compulsory!\n\nPlease provide either:\n• A link to the syllabus document, OR\n• Text content of the syllabus');
    return;
  }

  // Subject is valid, add it
  const subjectWithSyllabus = {
    ...currentSubject,
    id: Date.now()
  };

  setFormData(prev => ({
    ...prev,
    profile: {
      ...prev.profile,
      subjects: [...prev.profile.subjects, subjectWithSyllabus]
    }
  }));

  // Reset form
  setCurrentSubject({
    name: '',
    code: '',
    year: '',
    semester: '',
    credits: '',
    syllabus: {
      type: 'link',
      url: '',
      content: '',
      filename: ''
    }
  });
};

  const handleRemoveSubject = (index, e) => {
    e.preventDefault(); // ✅ Prevent form submission
    setFormData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        subjects: prev.profile.subjects.filter((_, i) => i !== index),
      },
    }));
  };

  // ============================================
  // NAVIGATION
  // ============================================
  const nextStep = (e) => {
    e.preventDefault(); // ✅ CRITICAL: Prevent form submission
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevStep = (e) => {
    e.preventDefault(); // ✅ CRITICAL: Prevent form submission
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ============================================
  // VALIDATION
  // ============================================
  const validateForm = () => {
    if (!formData.username) return "Username is required";
    if (!formData.email) return "Email is required";
    if (!formData.profile.firstName) return "First name is required";
    if (!formData.profile.lastName) return "Last name is required";
    if (!formData.profile.phone) return "Phone is required";
    if (!formData.profile.employeeId) return "Employee ID is required";
    if (!formData.profile.joiningDate) return "Joining date is required";
    if (!formData.profile.university.name) return "University name is required";
    if (formData.profile.subjects.length === 0)
      return "At least one subject is required";
    return null;
  };

  // ============================================
  // SUBMIT HANDLER
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // ✅ FIXED: Properly structure the payload
      const payload = {
        username: formData.username,
        email: formData.email,
        trainerCategory: formData.trainerCategory,
        profile: {
          // Basic info
          firstName: formData.profile.firstName,
          lastName: formData.profile.lastName,
          phone: formData.profile.phone,
          employeeId: formData.profile.employeeId,
          joiningDate: formData.profile.joiningDate,
          dateOfBirth: formData.profile.dateOfBirth || null,
          gender: formData.profile.gender || null,
          address: formData.profile.address || "",
          city: formData.profile.city || "",
          state: formData.profile.state || "",
          zipCode: formData.profile.zipCode || "",
          country: formData.profile.country || "",
          bio: formData.profile.bio || "",

          // ✅ University - properly structured
          university: {
            name: formData.profile.university.name,
            enrollmentId: formData.profile.employeeId, // Sync with employeeId
            joinDate: formData.profile.joiningDate,
            completionDate: formData.profile.university.completionDate || null,
            status: formData.profile.university.status || "ACTIVE",
          },

          // ✅ Subjects - send as-is
          subjects: formData.profile.subjects.map((subject) => ({
            name: subject.name,
            code: subject.code || "",
            year: parseInt(subject.year) || null,
            semester: subject.semester ? parseInt(subject.semester) : null,
            credits: subject.credits ? parseInt(subject.credits) : null,
            status: "ACTIVE",
            // ✅ Include syllabus if provided
            ...(subject.syllabus &&
              (subject.syllabus.url || subject.syllabus.content) && {
                syllabus: {
                  type: subject.syllabus.type,
                  ...(subject.syllabus.type === "link" && {
                    url: subject.syllabus.url,
                    filename: subject.syllabus.filename || "external-link",
                  }),
                  ...(subject.syllabus.type === "text" && {
                    content: subject.syllabus.content,
                  }),
                },
              }),
          })),

          // ✅ Qualifications - send as-is
          qualifications: formData.profile.qualifications.map((qual) => ({
            degree: qual.degree,
            specialization: qual.specialization || "",
            university: qual.university,
            year: qual.year ? parseInt(qual.year) : null,
            percentage: qual.percentage ? parseFloat(qual.percentage) : null,
            grade: qual.grade || "",
            type: qual.type || "CERTIFICATION",
          })),

          // ✅ Experience - with duration wrapper
          experience: formData.profile.experience.map((exp) => ({
            organization: exp.organization,
            role: exp.role,
            duration: {
              from: exp.duration?.from || exp.fromDate || null,
              to: exp.duration?.to || (exp.current ? null : exp.toDate) || null,
              current: exp.duration?.current || exp.current || false,
            },
            description: exp.description || "",
            type: exp.type || "TEACHING",
          })),

          // ✅ Certifications
          certifications: formData.profile.certifications.map((cert) => ({
            name: cert.name,
            issuingOrganization: cert.issuingOrganization,
            issueDate: cert.issueDate || null,
            expiryDate: cert.expiryDate || null,
            credentialId: cert.credentialId || "",
          })),

          // ✅ Skills
          skills: formData.profile.skills || [],

          // ✅ Client
          client: {
            name: formData.profile.client.name || "",
            address: formData.profile.client.address || "",
            city: formData.profile.client.city || "",
          },

          // Trainer-filled (empty at creation)
          semesterActivities: [],
          projects: [],
          placementRecord: {
            coordinator: {},
            stats: [],
            companies: [],
            topRecruiters: [],
          },
        },
      };

      console.log("📦 Sending payload:", JSON.stringify(payload, null, 2));

      const response = await api.post("/users", payload);

      if (response.data.success) {
        setSuccess("✅ Trainer created successfully! Welcome email sent.");

        // Reset form
        setFormData({
          username: "",
          email: "",
          trainerCategory: "PERMANENT",
          profile: {
            firstName: "",
            lastName: "",
            phone: "",
            employeeId: "",
            joiningDate: "",
            dateOfBirth: "",
            gender: "",
            address: "",
            city: "",
            state: "",
            zipCode: "",
            country: "",
            bio: "",
            university: {
              name: "",
              enrollmentId: "",
              joinDate: "",
              completionDate: "",
              status: "ACTIVE",
            },
            subjects: [],
            qualifications: [],
            experience: [],
            certifications: [],
            skills: [],
            semesterActivities: [],
            projects: [],
            placementRecord: {},
            client: {
              name: "",
              address: "",
              city: "",
            },
          },
        });

        setCurrentStep(1);
        onSuccess?.();
      } else {
        setError(response.data.message || "Failed to create trainer");
      }
    } catch (err) {
      console.error("Error creating trainer:", err);
      setError(err.response?.data?.message || "Failed to create trainer");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // STEP RENDERERS (Keep all your existing render functions exactly as they are)
  // ============================================

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Basic Account Information
      </h3>

      <div>
        <label className="block text-gray-700 font-semibold mb-2">
          Username *
        </label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          required
          placeholder="e.g., john_trainer"
        />
      </div>

      <div>
        <label className="block text-gray-700 font-semibold mb-2">
          Email *
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          required
          placeholder="e.g., john@university.edu"
        />
      </div>

      <div>
        <label className="block text-gray-700 font-semibold mb-2">
          Trainer Category *
        </label>
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="inline-flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="trainerCategory"
              value="PERMANENT"
              checked={formData.trainerCategory === "PERMANENT"}
              onChange={handleChange}
              className="form-radio h-4 w-4 text-blue-600"
            />
            <div className="ml-3">
              <span className="font-medium text-gray-700">Permanent</span>
              <p className="text-sm text-gray-500">
                Gets monthly leave increments
              </p>
            </div>
          </label>
          <label className="inline-flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="trainerCategory"
              value="CONTRACTED"
              checked={formData.trainerCategory === "CONTRACTED"}
              onChange={handleChange}
              className="form-radio h-4 w-4 text-blue-600"
            />
            <div className="ml-3">
              <span className="font-medium text-gray-700">Contracted</span>
              <p className="text-sm text-gray-500">Fixed leave balance</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Personal Details
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            First Name *
          </label>
          <input
            type="text"
            name="profile.firstName"
            value={formData.profile.firstName}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Last Name *
          </label>
          <input
            type="text"
            name="profile.lastName"
            value={formData.profile.lastName}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Phone *
          </label>
          <input
            type="tel"
            name="profile.phone"
            value={formData.profile.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
            placeholder="+91-9999999999"
          />
        </div>
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Date of Birth
          </label>
          <input
            type="date"
            name="profile.dateOfBirth"
            value={formData.profile.dateOfBirth}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-gray-700 font-semibold mb-2">Gender</label>
        <select
          name="profile.gender"
          value={formData.profile.gender}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-gray-700 font-semibold mb-2">Bio</label>
        <textarea
          name="profile.bio"
          value={formData.profile.bio}
          onChange={handleChange}
          rows="3"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Brief introduction..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Address
          </label>
          <input
            type="text"
            name="profile.address"
            value={formData.profile.address}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Street address"
          />
        </div>
        <div>
          <label className="block text-gray-700 font-semibold mb-2">City</label>
          <input
            type="text"
            name="profile.city"
            value={formData.profile.city}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            State
          </label>
          <input
            type="text"
            name="profile.state"
            value={formData.profile.state}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Zip Code
          </label>
          <input
            type="text"
            name="profile.zipCode"
            value={formData.profile.zipCode}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Country
          </label>
          <input
            type="text"
            name="profile.country"
            value={formData.profile.country}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Teaching Assignment & Syllabus
      </h3>

      {/* Employee ID */}
      <div>
        <label className="block text-gray-700 font-semibold mb-2">
          Employee ID *{" "}
          <span className="text-sm text-gray-500">
            (Auto-syncs with Enrollment ID)
          </span>
        </label>
        <input
          type="text"
          name="profile.employeeId"
          value={formData.profile.employeeId}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          required
          placeholder="e.g., EMP-001"
        />
      </div>

      {/* Joining Date */}
      <div>
        <label className="block text-gray-700 font-semibold mb-2">
          Joining Date *{" "}
          <span className="text-sm text-gray-500">(University Join Date)</span>
        </label>
        <input
          type="date"
          name="profile.joiningDate"
          value={formData.profile.joiningDate}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* University Name */}
      <div>
        <label className="block text-gray-700 font-semibold mb-2">
          University Name *
        </label>
        <input
          type="text"
          name="profile.university.name"
          value={formData.profile.university.name}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          required
          placeholder="e.g., University of Mumbai"
        />
      </div>

      {/* University Completion Date */}
      <div>
        <label className="block text-gray-700 font-semibold mb-2">
          University Completion Date{" "}
          <span className="text-sm text-gray-500">(Optional)</span>
        </label>
        <input
          type="date"
          name="profile.university.completionDate"
          value={formData.profile.university.completionDate}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* University Status */}
      <div>
        <label className="block text-gray-700 font-semibold mb-2">
          University Status
        </label>
        <select
          name="profile.university.status"
          value={formData.profile.university.status}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="WITHDRAWN">Withdrawn</option>
        </select>
      </div>

      {/* Enrollment ID (Read-only) */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <label className="block text-gray-700 font-semibold mb-2">
          Enrollment ID{" "}
          <span className="text-sm text-gray-600">
            (Auto-synced with Employee ID)
          </span>
        </label>
        <input
          type="text"
          value={
            formData.profile.university.enrollmentId ||
            formData.profile.employeeId
          }
          readOnly
          className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg text-gray-600"
        />
      </div>

      {/* Subjects Assignment with Syllabus */}
      <div className="border-t pt-4">
        <h4 className="font-semibold text-gray-800 mb-4">
          Assign Subjects with Syllabus
        </h4>

        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          {/* Subject Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Subject Name *
              </label>
              <input
                type="text"
                value={currentSubject.name}
                onChange={(e) =>
                  setCurrentSubject({ ...currentSubject, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Data Structures"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Subject Code
              </label>
              <input
                type="text"
                value={currentSubject.code}
                onChange={(e) =>
                  setCurrentSubject({ ...currentSubject, code: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., CS301"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Year *
              </label>
              <select
                value={currentSubject.year}
                onChange={(e) =>
                  setCurrentSubject({
                    ...currentSubject,
                    year: parseInt(e.target.value),
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Semester
              </label>
              <select
                value={currentSubject.semester}
                onChange={(e) =>
                  setCurrentSubject({
                    ...currentSubject,
                    semester: parseInt(e.target.value),
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
                <option value="4">Semester 4</option>
                <option value="5">Semester 5</option>
                <option value="6">Semester 6</option>
                <option value="7">Semester 7</option>
                <option value="8">Semester 8</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Credits
              </label>
              <input
                type="number"
                value={currentSubject.credits}
                onChange={(e) =>
                  setCurrentSubject({
                    ...currentSubject,
                    credits: parseInt(e.target.value),
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="4"
              />
            </div>
          </div>

          {/* ✅ NEW: Syllabus Upload Section */}
          <div className="border-t pt-4 mt-4">
            <h5 className="font-semibold text-gray-700 mb-3">
              Syllabus Information (Optional)
            </h5>

            {/* Syllabus Type Selection */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">
                Syllabus Type
              </label>
              <div className="flex gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="link"
                    checked={currentSubject.syllabus.type === "link"}
                    onChange={(e) =>
                      setCurrentSubject({
                        ...currentSubject,
                        syllabus: {
                          ...currentSubject.syllabus,
                          type: e.target.value,
                          content: "", // Clear content if switching to link
                        },
                      })
                    }
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-gray-700">Link to Syllabus</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="text"
                    checked={currentSubject.syllabus.type === "text"}
                    onChange={(e) =>
                      setCurrentSubject({
                        ...currentSubject,
                        syllabus: {
                          ...currentSubject.syllabus,
                          type: e.target.value,
                          url: "", // Clear url if switching to text
                          filename: "",
                        },
                      })
                    }
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-gray-700">Text Content</span>
                </label>
              </div>
            </div>

            {/* Link Type Input */}
            {currentSubject.syllabus.type === "link" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Syllabus URL
                  </label>
                  <input
                    type="url"
                    value={currentSubject.syllabus.url}
                    onChange={(e) =>
                      setCurrentSubject({
                        ...currentSubject,
                        syllabus: {
                          ...currentSubject.syllabus,
                          url: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., https://example.com/syllabus.pdf"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Filename (Optional)
                  </label>
                  <input
                    type="text"
                    value={currentSubject.syllabus.filename}
                    onChange={(e) =>
                      setCurrentSubject({
                        ...currentSubject,
                        syllabus: {
                          ...currentSubject.syllabus,
                          filename: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., DS-Syllabus-2024"
                  />
                </div>
              </div>
            )}

            {/* Text Type Input */}
            {currentSubject.syllabus.type === "text" && (
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Syllabus Content
                </label>
                <textarea
                  value={currentSubject.syllabus.content}
                  onChange={(e) =>
                    setCurrentSubject({
                      ...currentSubject,
                      syllabus: {
                        ...currentSubject.syllabus,
                        content: e.target.value,
                      },
                    })
                  }
                  rows="6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Paste syllabus content here..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {currentSubject.syllabus.content.length} characters
                </p>
              </div>
            )}

            {/* Info Box */}
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              ℹ️ Syllabus is COMPULSORY  during trainer creation. You can update it later.
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddSubject}
            disabled={!currentSubject.name || !currentSubject.year}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Add Subject
          </button>
        </div>

        {/* Subjects List */}
        {formData.profile.subjects.length > 0 && (
          <div className="mt-4 space-y-2">
            <h5 className="font-medium text-gray-700">Assigned Subjects:</h5>
            {formData.profile.subjects.map((subject, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium">{subject.name}</p>
                    <p className="text-sm text-gray-600">
                      Year {subject.year}{" "}
                      {subject.semester && `• Semester ${subject.semester}`}
                      {subject.code && ` • ${subject.code}`} • {subject.credits}{" "}
                      Credits
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveSubject(index, e)}
                    className="text-red-600 hover:text-red-800 p-1 rounded-lg hover:bg-red-50"
                    title="Remove Subject"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* ✅ Show Syllabus Status */}
                {subject.syllabus &&
                  (subject.syllabus.url || subject.syllabus.content) && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-green-700 text-sm">
                        <Check size={14} />
                        <span>
                          {subject.syllabus.type === "link"
                            ? `✓ Syllabus Link: ${subject.syllabus.filename || "external-link"}`
                            : `✓ Syllabus Content: ${subject.syllabus.content.substring(0, 50)}...`}
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Qualifications (Add by Admin/HR)
      </h3>

      {/* Add Qualification Form */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Degree *
            </label>
            <input
              type="text"
              value={currentQualification.degree}
              onChange={(e) =>
                setCurrentQualification({
                  ...currentQualification,
                  degree: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., B.Sc Computer Science"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Specialization
            </label>
            <input
              type="text"
              value={currentQualification.specialization}
              onChange={(e) =>
                setCurrentQualification({
                  ...currentQualification,
                  specialization: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Artificial Intelligence"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              University *
            </label>
            <input
              type="text"
              value={currentQualification.university}
              onChange={(e) =>
                setCurrentQualification({
                  ...currentQualification,
                  university: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Year</label>
            <input
              type="number"
              value={currentQualification.year}
              onChange={(e) =>
                setCurrentQualification({
                  ...currentQualification,
                  year: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="2023"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Percentage
            </label>
            <input
              type="number"
              step="0.01"
              value={currentQualification.percentage}
              onChange={(e) =>
                setCurrentQualification({
                  ...currentQualification,
                  percentage: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="85.5"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Grade
            </label>
            <input
              type="text"
              value={currentQualification.grade}
              onChange={(e) =>
                setCurrentQualification({
                  ...currentQualification,
                  grade: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="A+"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Type</label>
            <select
              value={currentQualification.type}
              onChange={(e) =>
                setCurrentQualification({
                  ...currentQualification,
                  type: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="UG">UG</option>
              <option value="PG">PG</option>
              <option value="PHD">PHD</option>
              <option value="DIPLOMA">Diploma</option>
              <option value="CERTIFICATION">Certification</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddQualification}
          disabled={
            !currentQualification.degree || !currentQualification.university
          }
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Add Qualification
        </button>
      </div>

      {/* Qualifications List */}
      {formData.profile.qualifications.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700">Added Qualifications</h4>
          {formData.profile.qualifications.map((qual, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
            >
              <div>
                <p className="font-medium">{qual.degree}</p>
                <p className="text-sm text-gray-600">
                  {qual.university} - {qual.year} • {qual.grade}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => handleRemoveQualification(index, e)}
                className="text-red-600 hover:text-red-800 p-1 rounded-lg hover:bg-red-50"
                title="Remove Qualification"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Work Experience (Add by Admin/HR)
      </h3>

      {/* Add Experience Form */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Organization *
            </label>
            <input
              type="text"
              value={currentExperience.organization}
              onChange={(e) =>
                setCurrentExperience({
                  ...currentExperience,
                  organization: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., ABC University"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Role *
            </label>
            <input
              type="text"
              value={currentExperience.role}
              onChange={(e) =>
                setCurrentExperience({
                  ...currentExperience,
                  role: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Senior Lecturer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              From Date
            </label>
            <input
              type="date"
              value={currentExperience.fromDate}
              onChange={(e) =>
                setCurrentExperience({
                  ...currentExperience,
                  fromDate: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              To Date
            </label>
            <input
              type="date"
              value={currentExperience.toDate}
              onChange={(e) =>
                setCurrentExperience({
                  ...currentExperience,
                  toDate: e.target.value,
                })
              }
              disabled={currentExperience.current}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={currentExperience.current}
            onChange={(e) =>
              setCurrentExperience({
                ...currentExperience,
                current: e.target.checked,
              })
            }
            className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label className="ml-2 text-gray-700">I currently work here</label>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Description
          </label>
          <textarea
            value={currentExperience.description}
            onChange={(e) =>
              setCurrentExperience({
                ...currentExperience,
                description: e.target.value,
              })
            }
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Describe responsibilities and achievements..."
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-2">Type</label>
          <select
            value={currentExperience.type}
            onChange={(e) =>
              setCurrentExperience({
                ...currentExperience,
                type: e.target.value,
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="TEACHING">Teaching</option>
            <option value="INDUSTRY">Industry</option>
            <option value="RESEARCH">Research</option>
            <option value="ADMINISTRATIVE">Administrative</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleAddExperience}
          disabled={!currentExperience.organization || !currentExperience.role}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Add Experience
        </button>
      </div>

      {/* Experience List */}
      {formData.profile.experience.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700">Added Experience</h4>
          {formData.profile.experience.map((exp, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
            >
              <div>
                <p className="font-medium">
                  {exp.role} at {exp.organization}
                </p>
                <p className="text-sm text-gray-600">
                  {exp.duration?.from
                    ? new Date(exp.duration.from).getFullYear()
                    : ""}{" "}
                  -
                  {exp.duration?.current
                    ? "Present"
                    : exp.duration?.to
                      ? new Date(exp.duration.to).getFullYear()
                      : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => handleRemoveExperience(index, e)}
                className="text-red-600 hover:text-red-800 p-1 rounded-lg hover:bg-red-50"
                title="Remove Experience"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Certifications (Add by Admin/HR)
      </h3>

      {/* Add Certification Form */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Certification Name *
          </label>
          <input
            type="text"
            value={currentCertification.name}
            onChange={(e) =>
              setCurrentCertification({
                ...currentCertification,
                name: e.target.value,
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., AWS Certified Developer"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Issuing Organization *
          </label>
          <input
            type="text"
            value={currentCertification.issuingOrganization}
            onChange={(e) =>
              setCurrentCertification({
                ...currentCertification,
                issuingOrganization: e.target.value,
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Amazon Web Services"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Issue Date
            </label>
            <input
              type="date"
              value={currentCertification.issueDate}
              onChange={(e) =>
                setCurrentCertification({
                  ...currentCertification,
                  issueDate: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Expiry Date
            </label>
            <input
              type="date"
              value={currentCertification.expiryDate}
              onChange={(e) =>
                setCurrentCertification({
                  ...currentCertification,
                  expiryDate: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Credential ID
          </label>
          <input
            type="text"
            value={currentCertification.credentialId}
            onChange={(e) =>
              setCurrentCertification({
                ...currentCertification,
                credentialId: e.target.value,
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="button"
          onClick={handleAddCertification}
          disabled={
            !currentCertification.name ||
            !currentCertification.issuingOrganization
          }
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Add Certification
        </button>
      </div>

      {/* Certifications List */}
      {formData.profile.certifications.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700">Added Certifications</h4>
          {formData.profile.certifications.map((cert, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
            >
              <div>
                <p className="font-medium">{cert.name}</p>
                <p className="text-sm text-gray-600">
                  {cert.issuingOrganization}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => handleRemoveCertification(index, e)}
                className="text-red-600 hover:text-red-800 p-1 rounded-lg hover:bg-red-50"
                title="Remove Certification"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep7 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Skills (Add by Admin/HR)
      </h3>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={currentSkill}
            onChange={(e) => setCurrentSkill(e.target.value)}
            onKeyPress={handleSkillKeyPress}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Add a skill (e.g., React, Python, Communication)"
          />
          <button
            type="button"
            onClick={handleAddSkill}
            disabled={!currentSkill.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2 min-h-[100px] p-3 bg-white rounded-lg border">
          {formData.profile.skills.length > 0 ? (
            formData.profile.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {skill}
                <button
                  type="button"
                  onClick={(e) => handleRemoveSkill(skill, e)}
                  className="hover:text-red-600 focus:outline-none"
                  title="Remove skill"
                >
                  <X size={14} />
                </button>
              </span>
            ))
          ) : (
            <p className="text-gray-500 w-full text-center py-2">
              No skills added yet. Add skills above.
            </p>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter or click Add to add a skill
        </p>
      </div>
    </div>
  );

  const renderStep8 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Review & Submit
      </h3>

      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-blue-800 font-medium">
          📋 Summary of Trainer Profile
        </p>
        <p className="text-blue-800 text-sm mt-2">
          Admin/HR has added: Qualifications, Experience, Certifications, and
          Skills. Trainer will add: Activities, Achievements, Projects, and
          Placement Records.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2">Basic Info</h4>
          <p className="text-sm">
            <span className="text-gray-600">Name:</span>{" "}
            {formData.profile.firstName} {formData.profile.lastName}
          </p>
          <p className="text-sm">
            <span className="text-gray-600">Email:</span> {formData.email}
          </p>
          <p className="text-sm">
            <span className="text-gray-600">Category:</span>{" "}
            {formData.trainerCategory}
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2">Assignment</h4>
          <p className="text-sm">
            <span className="text-gray-600">University:</span>{" "}
            {formData.profile.university.name}
          </p>
          <p className="text-sm">
            <span className="text-gray-600">Employee ID:</span>{" "}
            {formData.profile.employeeId}
          </p>
          <p className="text-sm">
            <span className="text-gray-600">Subjects:</span>{" "}
            {formData.profile.subjects.length}
          </p>
          {formData.profile.university.completionDate && (
            <p className="text-sm">
              <span className="text-gray-600">Completion:</span>{" "}
              {new Date(
                formData.profile.university.completionDate,
              ).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2">Professional</h4>
          <p className="text-sm">
            <span className="text-gray-600">Qualifications:</span>{" "}
            {formData.profile.qualifications.length}
          </p>
          <p className="text-sm">
            <span className="text-gray-600">Experience:</span>{" "}
            {formData.profile.experience.length} entries
          </p>
          <p className="text-sm">
            <span className="text-gray-600">Certifications:</span>{" "}
            {formData.profile.certifications.length}
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2">Skills</h4>
          <p className="text-sm">
            <span className="text-gray-600">Skills added:</span>{" "}
            {formData.profile.skills.length}
          </p>
          {formData.profile.skills.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {formData.profile.skills.slice(0, 3).join(", ")}
              {formData.profile.skills.length > 3 && "..."}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 overflow-x-auto pb-2">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div
                key={step.number}
                className="flex flex-col items-center min-w-[80px] cursor-pointer"
                onClick={() => setCurrentStep(step.number)}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors
                    ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : isCompleted
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-600"
                    }`}
                >
                  {isCompleted ? <Check size={16} /> : <Icon size={16} />}
                </div>
                <span
                  className={`text-xs mt-1 text-center ${
                    isActive ? "text-blue-600 font-semibold" : "text-gray-600"
                  }`}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
        <div className="w-full bg-gray-200 h-2 rounded-full">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Error/Success Messages */}
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

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
        {currentStep === 6 && renderStep6()}
        {currentStep === 7 && renderStep7()}
        {currentStep === 8 && renderStep8()}

        {/* Navigation Buttons - FIXED: Added type="button" and onClick with e.preventDefault */}
        <div className="flex justify-between mt-8 pt-4 border-t">
          <button
            type="button" // ✅ Explicitly set type="button"
            onClick={prevStep}
            disabled={currentStep === 1 || loading}
            className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          {currentStep < steps.length ? (
            <button
              type="button" // ✅ Explicitly set type="button"
              onClick={nextStep}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="submit" // ✅ Only the final button is type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold transition-colors"
            >
              {loading ? "Creating..." : "Create Trainer"}
              {!loading && <Check size={16} />}
            </button>
          )}
        </div>
      </form>

      {/* Info Note */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Note:</strong> A temporary password will be automatically
          generated and sent to the trainer's email.
        </p>
        <p className="text-sm text-blue-800 mt-2">
          <strong>📝 Trainer's Responsibilities:</strong> After creation,
          trainer will add: Semester Activities, Achievements, Project Details,
          and Placement Records.
        </p>
        <p className="text-sm text-blue-800 mt-2">
          <strong>👑 Admin/HR Added:</strong> Qualifications, Experience,
          Certifications, Skills, and University details.
        </p>
      </div>
    </div>
  );
};

export default CreateTrainerForm;
