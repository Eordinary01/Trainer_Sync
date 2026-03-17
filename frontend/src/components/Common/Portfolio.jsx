import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  User,
  Briefcase,
  GraduationCap,
  BookOpen,
  Award,
  Calendar,
  MapPin,
  Mail,
  Phone,
  Clock,
  TrendingUp,
  Users,
  AlertCircle,
  Edit2,
  Plus,
  X,
  Loader2,
  ChevronLeft,
  Search,
  Filter,
  Trash2,
  Building2,
  CheckCircle,
  XCircle,
  ChevronRight,
  AlertTriangle,
  Info,
  School,
  FolderGit2,
  Briefcase as BriefcaseIcon,
  BookMarked,
  Sparkles,
  Zap,
  Heart,
  ThumbsUp,
  Award as AwardIcon,
  Medal,
  Flag,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Edit,
  Trash,
  Eye,
  Github,
  FileText,
  Image,
  Video,
  Camera,
  Link2,
  ExternalLink,
  Save,
  ChevronDown,
  ChevronUp,
  Download,
  Clock as ClockIcon,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../config/api.js";

// ============================================
// CONSTANTS & CONFIG
// ============================================
const ACTIVITY_TYPES = [
  "WORKSHOP",
  "SEMINAR",
  "PROJECT",
  "EVENT",
  "ACHIEVEMENT",
  "COMPETITION",
];

const PROJECT_TYPES = ["ACADEMIC", "INDUSTRY", "RESEARCH", "PERSONAL"];

const FILTER_YEARS = Array.from(
  { length: 5 },
  (_, i) => new Date().getFullYear() - i,
);

const SECTIONS = {
  trainer: [
    { id: "overview", label: "Overview", icon: User },
    { id: "activities", label: "My Activities", icon: Calendar },
    { id: "projects", label: "My Projects", icon: Briefcase },
    { id: "placement", label: "My Placement", icon: TrendingUp },
    { id: "syllabus", label: "My Syllabus", icon: BookOpen },
  ],
  admin: [
    { id: "trainers", label: "All Trainers", icon: Users },
    { id: "overview", label: "Overview", icon: User },
    { id: "activities", label: "Activities", icon: Calendar },
    { id: "projects", label: "Projects", icon: Briefcase },
    { id: "placement", label: "Placement Records", icon: TrendingUp },
    { id: "syllabus", label: "Syllabus", icon: BookOpen },
  ],
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const formatDate = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString();
};

const calculatePlacementRate = (placed, total) => {
  if (!total || !placed) return 0;
  return ((parseInt(placed) / parseInt(total)) * 100).toFixed(1);
};

const getInitialModalData = () => ({
  title: "",
  description: "",
  semester: "",
  year: "",
  technologies: "",
  totalStudents: "",
  placedStudents: "",
  averagePackage: "",
  highestPackage: "",
  medianPackage: "",
  lowestPackage: "",
  companyName: "",
  studentsPlaced: "",
  roles: "",
  activityType: "WORKSHOP",
  projectType: "ACADEMIC",
  achievements: "",
  role: "",
  outcomes: "",
  github: "",
  demo: "",
  documentation: "",
  coordinatorName: "",
  coordinatorEmail: "",
  coordinatorPhone: "",
  placementType: "stats",
  // Syllabus fields
  syllabusType: "link",
  linkUrl: "",
  directText: "",
});

// ============================================
// MAIN COMPONENT
// ============================================
export default function Portfolio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userId, trainerId: urlTrainerId, subjectId: urlSubjectId } = useParams();
  const location = useLocation();

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [allTrainers, setAllTrainers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [selectedTrainerData, setSelectedTrainerData] = useState(null);
  const [activeTab, setActiveTab] = useState("trainers");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    year: "ALL",
    type: "ALL",
    status: "ALL",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  // Syllabus specific states
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [syllabusLoading, setSyllabusLoading] = useState(false);
  const [syllabusSaving, setSyllabusSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [versionHistory, setVersionHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Syllabus filter states
  const [syllabusSearchTerm, setSyllabusSearchTerm] = useState("");
  const [syllabusStatusFilter, setSyllabusStatusFilter] = useState("all");

  // Modal states
  const [modals, setModals] = useState({
    activity: false,
    project: false,
    placement: false,
    verify: false,
    syllabus: false,
  });

  const [verifyItem, setVerifyItem] = useState(null);
  const [verifyType, setVerifyType] = useState(null);
  const [verifyRemarks, setVerifyRemarks] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [modalData, setModalData] = useState(getInitialModalData());
  const [submitting, setSubmitting] = useState(false);

  // ============================================
  // ROLE VARIABLES
  // ============================================
  const isAdmin = user?.role === "ADMIN";
  const isHR = user?.role === "HR";
  const isTrainer = user?.role === "TRAINER";
  const isAdminOrHR = isAdmin || isHR;
  const targetUserId = userId || user?._id;

  // ============================================
  // DERIVED CONSTANTS - Trainer and Subject IDs
  // ============================================
  const trainerId = useMemo(() => {
    // Priority 1: From URL params
    if (urlTrainerId) return urlTrainerId;
    
    // Priority 2: From selected trainer data
    if (selectedTrainerData?.user?.id) return selectedTrainerData.user.id;
    
    // Priority 3: From selected trainer
    if (selectedTrainer?._id) return selectedTrainer._id;
    
    // Priority 4: For trainers, use their own ID
    if (isTrainer) return targetUserId;
    
    return null;
  }, [urlTrainerId, selectedTrainerData, selectedTrainer, isTrainer, targetUserId]);

  const subjectId = useMemo(() => {
    // Priority 1: From URL params
    if (urlSubjectId) return urlSubjectId;
    
    // Priority 2: From selected subject
    if (selectedSubject?._id) return selectedSubject._id;
    
    return null;
  }, [urlSubjectId, selectedSubject]);

  // ============================================
  // DERIVED DATA - SEMESTERS
  // ============================================
  const getCurrentSemesterFromSubjects = useMemo(() => {
    const subjects =
      selectedTrainerData?.profile?.subjects ||
      portfolio?.profile?.subjects ||
      [];
    if (!subjects.length) return { semester: "", year: "", isCurrent: false };

    // Calculate current semester based on joining date
    if (portfolio?.profile?.joiningDate) {
      const joiningDate = new Date(portfolio.profile.joiningDate);
      const currentDate = new Date();

      const monthsSinceJoining =
        (currentDate.getFullYear() - joiningDate.getFullYear()) * 12 +
        (currentDate.getMonth() - joiningDate.getMonth());

      const semesterIndex = Math.floor(monthsSinceJoining / 6);
      const currentSemester = semesterIndex + 1;
      const yearsSinceJoining = Math.floor(semesterIndex / 2);
      const currentYear = joiningDate.getFullYear() + yearsSinceJoining;

      const hasCurrentSemester = subjects.some(
        (s) => s.semester === currentSemester && s.year === currentYear,
      );

      if (hasCurrentSemester) {
        return {
          semester: currentSemester.toString(),
          year: currentYear.toString(),
          isCurrent: true,
        };
      }
    }

    const sortedSubjects = [...subjects].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.semester - a.semester;
    });

    const latestSubject = sortedSubjects[0];
    return {
      semester: latestSubject?.semester?.toString() || "",
      year: latestSubject?.year?.toString() || "",
      isCurrent: false,
    };
  }, [selectedTrainerData, portfolio]);

  const availableSemesters = useMemo(() => {
    const subjects =
      selectedTrainerData?.profile?.subjects ||
      portfolio?.profile?.subjects ||
      [];
    if (!subjects.length) return [];

    const semesterMap = new Map();

    subjects.forEach((subject) => {
      if (subject.semester && subject.year) {
        const key = `${subject.year}-${subject.semester}`;
        if (!semesterMap.has(key)) {
          semesterMap.set(key, {
            semester: subject.semester.toString(),
            year: subject.year.toString(),
            display: `Semester ${subject.semester} (${subject.year})`,
          });
        }
      }
    });

    return Array.from(semesterMap.values()).sort((a, b) => {
      if (a.year !== b.year) return parseInt(b.year) - parseInt(a.year);
      return parseInt(b.semester) - parseInt(a.semester);
    });
  }, [selectedTrainerData, portfolio]);

  // ============================================
  // AUTO-FILL SEMESTER WHEN MODAL OPENS
  // ============================================
  useEffect(() => {
    if (modals.activity && !editingItem) {
      const { semester, year } = getCurrentSemesterFromSubjects;

      if (semester && year) {
        setModalData((prev) => ({
          ...prev,
          semester,
          year,
        }));
      } else if (availableSemesters.length > 0) {
        const latest = availableSemesters[0];
        setModalData((prev) => ({
          ...prev,
          semester: latest.semester,
          year: latest.year,
        }));
      }
    }
  }, [
    modals.activity,
    editingItem,
    getCurrentSemesterFromSubjects,
    availableSemesters,
  ]);

  // ============================================
  // SECTIONS BASED ON ROLE
  // ============================================
  const sections = useMemo(
    () => (isAdmin || isHR ? SECTIONS.admin : SECTIONS.trainer),
    [isAdmin, isHR],
  );

  // ============================================
  // FETCH DATA
  // ============================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isAdmin || isHR) {
          await fetchAllTrainers();
          if (userId) {
            await fetchTrainerPortfolio(userId);
            await fetchTrainerSubjects(userId);
          }
        }
        if (isTrainer) {
          await fetchPortfolio(targetUserId);
          await fetchTrainerSubjects(targetUserId);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, [targetUserId, userId]);

  // Fetch subjects when trainer changes
  useEffect(() => {
    if (isAdmin || isHR) {
      if (selectedTrainerData?.user?.id) {
        fetchTrainerSubjects(selectedTrainerData.user.id);
      } else if (selectedTrainer?._id) {
        fetchTrainerSubjects(selectedTrainer._id);
      }
    }
  }, [selectedTrainerData, selectedTrainer]);

  const fetchPortfolio = async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/portfolio/full/${id}`);
      setPortfolio(response.data.data);
    } catch (err) {
      console.error("Error fetching portfolio:", err);
      setError(err.response?.data?.message || "Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainerPortfolio = async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/portfolio/full/${id}`);
      setSelectedTrainerData(response.data.data);
      const trainer = allTrainers.find((t) => t._id === id);
      if (trainer) setSelectedTrainer(trainer);
    } catch (err) {
      console.error("Error fetching trainer portfolio:", err);
      setError(
        err.response?.data?.message || "Failed to load trainer portfolio",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTrainers = async () => {
    try {
      const response = await api.get("/users?role=TRAINER&limit=1000");
      setAllTrainers(response.data.data?.trainers || []);
    } catch (err) {
      console.error("Error fetching trainers:", err);
    }
  };

  const fetchTrainerSubjects = async (id) => {
    try {
      setSyllabusLoading(true);
      const response = await api.get(`/portfolio/${id}/subjects`);
      const responseData = response.data.data;

      console.log("Subjects API Response:", responseData);

      // The API returns subjects array directly in data
      let subjectsArray = [];

      if (responseData) {
        // Case 1: If responseData has subjects property (your current structure)
        if (responseData.subjects && Array.isArray(responseData.subjects)) {
          subjectsArray = responseData.subjects;
        }
        // Case 2: If responseData itself is an array (alternative structure)
        else if (Array.isArray(responseData)) {
          subjectsArray = responseData;
        }
        // Case 3: If responseData has data property that's an array
        else if (responseData.data && Array.isArray(responseData.data)) {
          subjectsArray = responseData.data;
        }
      }

      console.log("Subjects array extracted:", subjectsArray);

      const transformedSubjects = subjectsArray.map((item) => {
        // Each item is already the subject object, no need to access item.subject
        return {
          _id: item.id || item._id || "",
          name: item.name || "",
          code: item.code || "",
          year: item.year || new Date().getFullYear(),
          semester: item.semester || 1,
          credits: item.credits || 0,
          status: item.status || "ACTIVE",
          hasSyllabus: item.hasSyllabus || false,
          syllabusType: item.syllabusType || null,
          syllabusVersion: item.syllabusVersion || null,
          trainerId: responseData.trainerId || id, // Use trainerId from response
          trainerName: responseData.trainerName || "",
          trainerEmail: responseData.trainerEmail || "",
          employeeId: responseData.employeeId || "",
        };
      });

      console.log("Transformed subjects:", transformedSubjects);
      setSubjects(transformedSubjects);
    } catch (err) {
      console.error("Error fetching subjects:", err);
      setSubjects([]);
    } finally {
      setSyllabusLoading(false);
    }
  };

  const fetchSubjectSyllabus = async (subject) => {
    try {
      setSyllabusLoading(true);
      setError(null);

      console.log("Fetching syllabus for subject:", subject);

      const subjectId = subject._id;
      const currentTrainerId = trainerId || subject.trainerId || targetUserId;

      console.log("Fetching syllabus with:", { trainerId: currentTrainerId, subjectId });

      if (!currentTrainerId || !subjectId) {
        setError("Trainer ID and Subject ID are required");
        return;
      }

      // Clear previous selected subject data
      setSelectedSubject(null);
      setModalData((prev) => ({
        ...prev,
        syllabusType: "link",
        linkUrl: "",
        directText: "",
      }));

      const response = await api.get(
        `/portfolio/${currentTrainerId}/subject/${subjectId}/syllabus`,
      );
      const syllabusData = response.data.data;

      console.log("Syllabus data received:", syllabusData);

      // Use the subject object passed directly
      setSelectedSubject({
        _id: subjectId,
        name: subject.name,
        code: subject.code,
        year: subject.year,
        semester: subject.semester,
        credits: subject.credits,
        syllabus: syllabusData
          ? {
              type: syllabusData.type,
              version: syllabusData.version,
              url: syllabusData.url,
              content: syllabusData.content,
              wordCount: syllabusData.wordCount,
              uploadedAt: syllabusData.uploadedAt,
              uploadedBy: syllabusData.uploadedBy,
              uploadedByName: syllabusData.uploadedByName,
            }
          : null,
      });

      if (syllabusData) {
        setModalData((prev) => ({
          ...prev,
          syllabusType: syllabusData.type,
          linkUrl: syllabusData.url || "",
          directText: syllabusData.content || "",
        }));
      }

      // Fetch version history - ONLY for Admin/HR users
      if (isAdmin || isHR) {
        try {
          const historyResponse = await api.get(
            `/portfolio/${currentTrainerId}/subject/${subjectId}/syllabus/history`,
          );
          console.log("History data received:", historyResponse.data.data);
          setVersionHistory(
            Array.isArray(historyResponse.data.data)
              ? historyResponse.data.data
              : [],
          );
        } catch (err) {
          console.error("History endpoint not available:", err);
          setVersionHistory([]);
        }
      } else {
        setVersionHistory([]);
      }
    } catch (err) {
      console.error("Error fetching syllabus:", err);
      if (err.response?.status === 404) {
        // Syllabus doesn't exist - use the subject object passed directly
        setSelectedSubject({
          _id: subject._id,
          name: subject.name,
          code: subject.code,
          year: subject.year,
          semester: subject.semester,
          syllabus: null,
        });
        setModalData((prev) => ({
          ...prev,
          syllabusType: "link",
          linkUrl: "",
          directText: "",
        }));
      } else {
        setError(
          err.response?.data?.error?.message ||
            "Failed to load subject syllabus",
        );
      }
    } finally {
      setSyllabusLoading(false);
    }
  };

  const handleSaveSyllabus = async () => {
    try {
      setSyllabusSaving(true);
      setError(null);
      setSuccess(null);

      if (!trainerId || !subjectId) {
        setError('Trainer ID and Subject ID are required');
        return;
      }

      const syllabusData = {
        type: modalData.syllabusType,
        version: (selectedSubject?.syllabus?.version || 0) + 1,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?._id,
        uploadedByName: `${user?.profile?.firstName || ''} ${user?.profile?.lastName || ''}`.trim() || user?.email
      };

      if (modalData.syllabusType === 'link') {
        if (!modalData.linkUrl) {
          setError('Please enter a URL');
          return;
        }
        syllabusData.url = modalData.linkUrl;
        syllabusData.filename = modalData.linkUrl.split('/').pop() || 'external-link';
      } else {
        if (!modalData.directText) {
          setError('Please enter syllabus content');
          return;
        }
        syllabusData.content = modalData.directText;
        syllabusData.wordCount = modalData.directText.split(/\s+/).filter(w => w).length;
      }

      let response;
      if (selectedSubject?.syllabus) {
        response = await api.put(
          `/portfolio/${trainerId}/subject/${subjectId}/syllabus`,
          syllabusData
        );
      } else {
        response = await api.post(
          `/portfolio/${trainerId}/subject/${subjectId}/syllabus`,
          syllabusData
        );
      }

      if (response.data.success) {
        setSuccess(selectedSubject?.syllabus ? 'Syllabus updated successfully!' : 'Syllabus uploaded successfully!');
        
        // Wait 1 second to show success message, then refresh the data
        setTimeout(async () => {
          // Refresh the subject data
          if (selectedSubject) {
            await fetchSubjectSyllabus(selectedSubject);
          }
          
          // Clear success message after 3 more seconds
          setTimeout(() => {
            setSuccess(null);
          }, 3000);
        }, 1000);
      }
    } catch (err) {
      console.error('Error saving syllabus:', err);
      setError(err.response?.data?.message || 'Failed to save syllabus');
    } finally {
      setSyllabusSaving(false);
    }
  };

  const handleDeleteSyllabus = async () => {
    if (!isAdminOrHR || !selectedSubject?.syllabus) return;
    
    if (!window.confirm('Are you sure you want to delete this syllabus?')) return;

    try {
      setSyllabusSaving(true);
      setError(null);
      setSuccess(null);
      
      if (!trainerId || !subjectId) {
        setError('Trainer ID and Subject ID are required');
        return;
      }
      
      const response = await api.delete(
        `/portfolio/${trainerId}/subject/${subjectId}/syllabus`
      );

      if (response.data.success) {
        setSuccess('Syllabus deleted successfully!');
        
        // Wait 1 second to show success message, then refresh
        setTimeout(async () => {
          if (selectedSubject) {
            await fetchSubjectSyllabus(selectedSubject);
          }
          
          setTimeout(() => {
            setSuccess(null);
          }, 3000);
        }, 1000);
      }
    } catch (err) {
      console.error('Error deleting syllabus:', err);
      setError(err.response?.data?.message || 'Failed to delete syllabus');
    } finally {
      setSyllabusSaving(false);
    }
  };

  const handleDownload = (content, filename) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ============================================
  // DERIVED DATA - STATS & FILTERS
  // ============================================
  const unassignedTrainers = useMemo(
    () =>
      allTrainers.filter(
        (trainer) =>
          !trainer.profile?.university?.name ||
          trainer.profile?.subjects?.length === 0,
      ),
    [allTrainers],
  );

  const isTrainerAssigned = useMemo(() => {
    if (!isTrainer || !portfolio) return true;
    return (
      portfolio?.profile?.university?.name &&
      portfolio?.profile?.subjects?.length > 0
    );
  }, [portfolio, isTrainer]);

  const filteredTrainers = useMemo(
    () =>
      allTrainers.filter((trainer) => {
        const name =
          `${trainer.profile?.firstName || ""} ${trainer.profile?.lastName || ""}`.toLowerCase();
        const email = (trainer.email || "").toLowerCase();
        const employeeId = (trainer.profile?.employeeId || "").toLowerCase();
        const searchLower = searchTerm.toLowerCase();

        return (
          name.includes(searchLower) ||
          email.includes(searchLower) ||
          employeeId.includes(searchLower)
        );
      }),
    [allTrainers, searchTerm],
  );

  const filterItems = useCallback(
    (items) => {
      if (!items) return [];

      let filtered = [...items];

      if (filters.year !== "ALL") {
        filtered = filtered.filter(
          (item) => item.year?.toString() === filters.year,
        );
      }

      if (filters.type !== "ALL") {
        filtered = filtered.filter((item) => item.type === filters.type);
      }

      if (filters.status !== "ALL") {
        const isVerified = filters.status === "verified";
        filtered = filtered.filter((item) => !!item.verifiedBy === isVerified);
      }

      return filtered;
    },
    [filters],
  );

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const matchesSearch =
        subject.name
          ?.toLowerCase()
          .includes(syllabusSearchTerm.toLowerCase()) ||
        subject.code?.toLowerCase().includes(syllabusSearchTerm.toLowerCase());
      const matchesStatus =
        syllabusStatusFilter === "all" ||
        (syllabusStatusFilter === "uploaded" && subject.hasSyllabus) ||
        (syllabusStatusFilter === "pending" && !subject.hasSyllabus);
      return matchesSearch && matchesStatus;
    });
  }, [subjects, syllabusSearchTerm, syllabusStatusFilter]);

  // ============================================
  // MODAL HANDLERS
  // ============================================
  const toggleModal = (modalName, show) => {
    setModals((prev) => ({ ...prev, [modalName]: show }));
  };

  const resetModal = useCallback(() => {
    setModalData(getInitialModalData());
    setEditingItem(null);
  }, []);

  const handleOpenActivityModal = useCallback(() => {
    resetModal();
    const { semester, year } = getCurrentSemesterFromSubjects;

    if (semester && year) {
      setModalData((prev) => ({ ...prev, semester, year }));
    } else if (availableSemesters.length > 0) {
      const latest = availableSemesters[0];
      setModalData((prev) => ({
        ...prev,
        semester: latest.semester,
        year: latest.year,
      }));
    }
    toggleModal("activity", true);
  }, [getCurrentSemesterFromSubjects, availableSemesters, resetModal]);

  const handleOpenPlacementModal = useCallback(
    (type = "stats") => {
      resetModal();
      setModalData((prev) => ({ ...prev, placementType: type }));
      toggleModal("placement", true);
    },
    [resetModal],
  );

  const handleOpenSyllabusModal = useCallback((subject) => {
    console.log("Opening syllabus modal for subject:", subject);

    if (!subject || !subject._id) {
      console.error("Invalid subject:", subject);
      return;
    }

    // Reset modal state before fetching new data
    setSelectedSubject(null);
    setVersionHistory([]);
    setShowHistory(false);
    setPreviewMode(false);

    // Pass the full subject object
    fetchSubjectSyllabus(subject);
    toggleModal("syllabus", true);
  }, []);

  // ============================================
  // CRUD HANDLERS
  // ============================================
  const handleAddActivity = async () => {
    if (
      !modalData.title ||
      !modalData.description ||
      !modalData.semester ||
      !modalData.year
    ) {
      setError("Please fill all required fields");
      return;
    }

    if (!ACTIVITY_TYPES.includes(modalData.activityType)) {
      setError("Invalid activity type");
      return;
    }

    try {
      setSubmitting(true);
      const achievements = modalData.achievements
        ? modalData.achievements.split(",").map((a) => a.trim())
        : [];

      const currentTrainerId = trainerId;

      const url = editingItem
        ? currentTrainerId
          ? `/portfolio/activities/${currentTrainerId}/${editingItem._id}`
          : `/portfolio/activities/${editingItem._id}`
        : currentTrainerId
          ? `/portfolio/activities/${currentTrainerId}`
          : "/portfolio/activities";

      const payload = {
        title: modalData.title,
        description: modalData.description,
        semester: parseInt(modalData.semester),
        year: parseInt(modalData.year),
        type: modalData.activityType,
        achievements,
      };

      const response = editingItem
        ? await api.patch(url, payload)
        : await api.post(url, payload);

      if (response.data.success) {
        setSuccess(
          editingItem
            ? "Activity updated successfully!"
            : "Activity added successfully!",
        );
        setTimeout(() => setSuccess(null), 3000);

        if (selectedTrainerData) {
          await fetchTrainerPortfolio(selectedTrainerData.user.id);
        } else if (selectedTrainer) {
          await fetchTrainerPortfolio(selectedTrainer._id);
        } else {
          await fetchPortfolio(targetUserId);
        }
        toggleModal("activity", false);
        resetModal();
      }
    } catch (err) {
      console.error("Error saving activity:", err);
      setError(err.response?.data?.message || "Failed to save activity");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddProject = async () => {
    if (!modalData.title || !modalData.description) {
      setError("Please fill all required fields");
      return;
    }

    if (!PROJECT_TYPES.includes(modalData.projectType)) {
      setError("Invalid project type");
      return;
    }

    try {
      setSubmitting(true);
      const technologies = modalData.technologies
        ? modalData.technologies.split(",").map((t) => t.trim())
        : [];
      const outcomes = modalData.outcomes
        ? modalData.outcomes.split("\n").filter((o) => o.trim())
        : [];

      const currentTrainerId = trainerId;

      const url = editingItem
        ? currentTrainerId
          ? `/portfolio/projects/${currentTrainerId}/${editingItem._id}`
          : `/portfolio/projects/${editingItem._id}`
        : currentTrainerId
          ? `/portfolio/projects/${currentTrainerId}`
          : "/portfolio/projects";

      const payload = {
        title: modalData.title,
        description: modalData.description,
        technologies,
        type: modalData.projectType,
        role: modalData.role,
        outcomes,
        links: {
          github: modalData.github,
          demo: modalData.demo,
          documentation: modalData.documentation,
        },
      };

      const response = editingItem
        ? await api.patch(url, payload)
        : await api.post(url, payload);

      if (response.data.success) {
        setSuccess(
          editingItem
            ? "Project updated successfully!"
            : "Project added successfully!",
        );
        setTimeout(() => setSuccess(null), 3000);

        if (selectedTrainerData) {
          await fetchTrainerPortfolio(selectedTrainerData.user.id);
        } else if (selectedTrainer) {
          await fetchTrainerPortfolio(selectedTrainer._id);
        } else {
          await fetchPortfolio(targetUserId);
        }
        toggleModal("project", false);
        resetModal();
      }
    } catch (err) {
      console.error("Error saving project:", err);
      setError(err.response?.data?.message || "Failed to save project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpsertPlacement = async () => {
    const isStats = modalData.placementType === "stats";

    if (isStats) {
      if (
        !modalData.year ||
        !modalData.totalStudents ||
        !modalData.placedStudents
      ) {
        setError("Year, total students, and placed students are required");
        return;
      }
    } else {
      if (
        !modalData.companyName ||
        !modalData.year ||
        !modalData.studentsPlaced
      ) {
        setError("Company name, year, and students placed are required");
        return;
      }
    }

    try {
      setSubmitting(true);
      const currentTrainerId = trainerId;

      let url, payload, response;

      if (isStats) {
        url = editingItem
          ? currentTrainerId
            ? `/portfolio/placement/stats/${currentTrainerId}/${editingItem._id}`
            : `/portfolio/placement/stats/${editingItem._id}`
          : currentTrainerId
            ? `/portfolio/placement/stats/${currentTrainerId}`
            : "/portfolio/placement/stats";

        payload = {
          year: parseInt(modalData.year),
          totalStudents: parseInt(modalData.totalStudents),
          placedStudents: parseInt(modalData.placedStudents),
          highestPackage: modalData.highestPackage
            ? parseFloat(modalData.highestPackage)
            : null,
          averagePackage: modalData.averagePackage
            ? parseFloat(modalData.averagePackage)
            : null,
          medianPackage: modalData.medianPackage
            ? parseFloat(modalData.medianPackage)
            : null,
        };

        response = editingItem
          ? await api.patch(url, payload)
          : await api.post(url, payload);
      } else {
        const roles = modalData.roles
          ? modalData.roles.split(",").map((r) => r.trim())
          : [];

        url = editingItem
          ? currentTrainerId
            ? `/portfolio/placement/companies/${currentTrainerId}/${editingItem._id}`
            : `/portfolio/placement/companies/${editingItem._id}`
          : currentTrainerId
            ? `/portfolio/placement/companies/${currentTrainerId}`
            : "/portfolio/placement/companies";

        payload = {
          name: modalData.companyName,
          year: parseInt(modalData.year),
          studentsPlaced: parseInt(modalData.studentsPlaced),
          packages: {
            highest: modalData.highestPackage
              ? parseFloat(modalData.highestPackage)
              : null,
            average: modalData.averagePackage
              ? parseFloat(modalData.averagePackage)
              : null,
            lowest: modalData.lowestPackage
              ? parseFloat(modalData.lowestPackage)
              : null,
          },
          roles,
        };

        response = editingItem
          ? await api.patch(url, payload)
          : await api.post(url, payload);
      }

      if (response.data.success) {
        setSuccess(
          editingItem
            ? "Placement record updated successfully!"
            : "Placement record added successfully!",
        );
        setTimeout(() => setSuccess(null), 3000);

        if (selectedTrainerData) {
          await fetchTrainerPortfolio(selectedTrainerData.user.id);
        } else if (selectedTrainer) {
          await fetchTrainerPortfolio(selectedTrainer._id);
        } else {
          await fetchPortfolio(targetUserId);
        }
        toggleModal("placement", false);
        resetModal();
      }
    } catch (err) {
      console.error("Error saving placement record:", err);
      setError(
        err.response?.data?.message || "Failed to save placement record",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = useCallback((type, item) => {
    setEditingItem(item);

    switch (type) {
      case "activity":
        setModalData({
          ...getInitialModalData(),
          title: item.title,
          description: item.description,
          semester: item.semester?.toString() || "",
          year: item.year?.toString() || "",
          activityType: item.type || "WORKSHOP",
          achievements: item.achievements?.join(", ") || "",
        });
        toggleModal("activity", true);
        break;
      case "project":
        setModalData({
          ...getInitialModalData(),
          title: item.title,
          description: item.description,
          technologies: item.technologies?.join(", ") || "",
          role: item.role || "",
          projectType: item.type || "ACADEMIC",
          outcomes: item.outcomes?.join("\n") || "",
          github: item.links?.github || "",
          demo: item.links?.demo || "",
          documentation: item.links?.documentation || "",
        });
        toggleModal("project", true);
        break;
      case "stats":
        setModalData({
          ...getInitialModalData(),
          placementType: "stats",
          year: item.year?.toString() || "",
          totalStudents: item.totalStudents?.toString() || "",
          placedStudents: item.placedStudents?.toString() || "",
          averagePackage: item.averagePackage?.toString() || "",
          highestPackage: item.highestPackage?.toString() || "",
          medianPackage: item.medianPackage?.toString() || "",
        });
        toggleModal("placement", true);
        break;
      case "company":
        setModalData({
          ...getInitialModalData(),
          placementType: "company",
          companyName: item.name || "",
          year: item.year?.toString() || "",
          studentsPlaced: item.studentsPlaced?.toString() || "",
          averagePackage: item.packages?.average?.toString() || "",
          highestPackage: item.packages?.highest?.toString() || "",
          lowestPackage: item.packages?.lowest?.toString() || "",
          roles: item.roles?.join(", ") || "",
        });
        toggleModal("placement", true);
        break;
      default:
        break;
    }
  }, []);

  const handleDelete = async (type, itemId) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      const currentTrainerId = trainerId;

      const urlPathMap = {
        activity: "activities",
        project: "projects",
        stats: "placement/stats",
        company: "placement/companies",
      };

      const urlPath = urlPathMap[type];
      if (!urlPath) {
        setError(`Invalid item type: ${type}`);
        return;
      }

      const url = currentTrainerId
        ? `/portfolio/${urlPath}/${currentTrainerId}/${itemId}`
        : `/portfolio/${urlPath}/${itemId}`;

      const response = await api.delete(url);

      if (response.data.success) {
        setSuccess(`${type} deleted successfully!`);
        setTimeout(() => setSuccess(null), 3000);

        if (selectedTrainerData) {
          await fetchTrainerPortfolio(selectedTrainerData.user.id);
        } else if (selectedTrainer) {
          await fetchTrainerPortfolio(selectedTrainer._id);
        } else {
          await fetchPortfolio(targetUserId);
        }
      }
    } catch (err) {
      console.error("Error deleting:", err);
      setError(err.response?.data?.message || "Failed to delete");
    }
  };

  // ============================================
  // VERIFICATION HANDLERS
  // ============================================
  const openVerifyModal = (item, type) => {
    setVerifyItem(item);
    setVerifyType(type);
    setVerifyRemarks("");
    toggleModal("verify", true);
  };

  const handleVerify = async () => {
    if (!verifyItem || !verifyType) return;

    try {
      setSubmitting(true);
      const payload = { remarks: verifyRemarks };
      const currentTrainerId = trainerId;

      let response;

      if (verifyType === "placement") {
        if (!currentTrainerId) {
          setError("No trainer selected");
          return;
        }
        const url = `/portfolio/placement/${currentTrainerId}/verify`;
        response = await api.patch(url, payload);
      } else {
        const urlPath = verifyType === "activity" ? "activities" : "projects";
        const url = currentTrainerId
          ? `/portfolio/${urlPath}/${currentTrainerId}/${verifyItem._id}/verify`
          : `/portfolio/${urlPath}/${verifyItem._id}/verify`;

        response = await api.patch(url, payload);
      }

      if (response.data.success) {
        setSuccess(`${verifyType} verified successfully!`);
        setTimeout(() => setSuccess(null), 3000);

        if (selectedTrainerData) {
          await fetchTrainerPortfolio(selectedTrainerData.user.id);
        } else if (selectedTrainer) {
          await fetchTrainerPortfolio(selectedTrainer._id);
        } else {
          await fetchPortfolio(targetUserId);
        }
        toggleModal("verify", false);
        setVerifyItem(null);
        setVerifyType(null);
        setVerifyRemarks("");
      }
    } catch (err) {
      console.error("Error verifying:", err);
      setError(err.response?.data?.message || "Failed to verify");
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // UI HELPERS
  // ============================================
  const getVerificationBadge = (item) => {
    if (item.verifiedBy) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
          <ShieldCheck size={12} />
          Verified
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
        <ShieldAlert size={12} />
        Pending
      </span>
    );
  };

  const getActionButtons = useCallback(
    (item, type) => {
      const isVerified = !!item.verifiedBy;
      const canEdit = isAdmin || isHR;
      const canDelete = isAdmin || isHR;

      // For stats and companies, check the parent placement record's verification status
      const isPlacementVerified =
        selectedTrainerData?.profile?.placementRecord?.verifiedBy;

      // Can verify if it's a placement-related item and the whole record isn't verified
      const canVerifyPlacement =
        (isAdmin || isHR) &&
        (type === "stats" || type === "company") &&
        !isPlacementVerified;

      // For regular items, check individual verification
      const canVerifyRegular =
        (isAdmin || isHR) &&
        !isVerified &&
        (type === "activity" || type === "project");

      return (
        <div className="flex items-center gap-2">
          {/* Show verification badge - for stats/companies, show parent status */}
          {type === "stats" || type === "company" ? (
            isPlacementVerified ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                <ShieldCheck size={12} />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                <ShieldAlert size={12} />
                Pending
              </span>
            )
          ) : type === "placement" ? (
            isPlacementVerified ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                <ShieldCheck size={12} />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                <ShieldAlert size={12} />
                Pending
              </span>
            )
          ) : (
            getVerificationBadge(item)
          )}

          {/* Verify button for stats/companies - verifies entire placement record */}
          {canVerifyPlacement && (
            <button
              onClick={() =>
                openVerifyModal(
                  {
                    title: "Placement Record",
                    description: `Verify entire placement record${type === "stats" ? ` (includes stats for year ${item.year})` : ` (includes company ${item.name})`}`,
                  },
                  "placement",
                )
              }
              className="text-green-600 hover:text-green-700 p-1 rounded-lg hover:bg-green-50"
              title="Verify Entire Placement Record"
            >
              <Shield size={16} />
            </button>
          )}

          {/* Verify button for placement record itself */}
          {type === "placement" &&
            !isPlacementVerified &&
            (isAdmin || isHR) && (
              <button
                onClick={() =>
                  openVerifyModal(
                    {
                      title: "Placement Record",
                      description: "Verify entire placement record",
                    },
                    "placement",
                  )
                }
                className="text-green-600 hover:text-green-700 p-1 rounded-lg hover:bg-green-50"
                title="Verify Entire Placement Record"
              >
                <Shield size={16} />
              </button>
            )}

          {/* Verify button for regular items */}
          {canVerifyRegular && (
            <button
              onClick={() => openVerifyModal(item, type)}
              className="text-green-600 hover:text-green-700 p-1 rounded-lg hover:bg-green-50"
              title="Verify"
            >
              <Shield size={16} />
            </button>
          )}

          {/* Edit button - available for all editable items */}
          {canEdit && (type !== "placement" || !isPlacementVerified) && (
            <button
              onClick={() => handleEdit(type, item)}
              className="text-blue-600 hover:text-blue-700 p-1 rounded-lg hover:bg-blue-50"
              title="Edit"
            >
              <Edit size={14} />
            </button>
          )}

          {/* Delete button - available for all deletable items */}
          {canDelete && type !== "placement" && (
            <button
              onClick={() => handleDelete(type, item._id)}
              className="text-red-600 hover:text-red-700 p-1 rounded-lg hover:bg-red-50"
              title="Delete"
            >
              <Trash size={14} />
            </button>
          )}
        </div>
      );
    },
    [isAdmin, isHR, selectedTrainerData, handleEdit, handleDelete],
  );

  // ============================================
  // RENDER FUNCTIONS - MODALS
  // ============================================
  const renderActivityModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {editingItem ? "Edit Activity" : "Add New Activity"}
        </h3>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Activity Title *"
            value={modalData.title}
            onChange={(e) =>
              setModalData((prev) => ({ ...prev, title: e.target.value }))
            }
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <textarea
            placeholder="Description *"
            value={modalData.description}
            onChange={(e) =>
              setModalData((prev) => ({ ...prev, description: e.target.value }))
            }
            rows="3"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          {/* Semester Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Semester *
            </label>
            {availableSemesters.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
                {availableSemesters.map((item) => (
                  <button
                    key={`${item.year}-${item.semester}`}
                    type="button"
                    onClick={() =>
                      setModalData((prev) => ({
                        ...prev,
                        semester: item.semester,
                        year: item.year,
                      }))
                    }
                    className={`p-3 rounded-lg border-2 transition-all ${
                      modalData.semester === item.semester &&
                      modalData.year === item.year
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="text-center">
                      <span className="text-lg font-bold text-gray-800">
                        Semester {item.semester}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">{item.year}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <AlertTriangle
                  className="mx-auto text-yellow-600 mb-2"
                  size={24}
                />
                <p className="text-sm text-yellow-700">
                  No semesters assigned yet. Please contact HR/Admin.
                </p>
              </div>
            )}
          </div>

          {modalData.semester && modalData.year && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 flex items-center gap-2">
                <Info size={16} className="text-blue-600" />
                Adding activity to{" "}
                <strong>
                  Semester {modalData.semester} ({modalData.year})
                </strong>
              </p>
            </div>
          )}

          <select
            value={modalData.activityType}
            onChange={(e) =>
              setModalData((prev) => ({
                ...prev,
                activityType: e.target.value,
              }))
            }
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          >
            {ACTIVITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Achievements (comma separated)"
            value={modalData.achievements}
            onChange={(e) =>
              setModalData((prev) => ({
                ...prev,
                achievements: e.target.value,
              }))
            }
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => {
              toggleModal("activity", false);
              resetModal();
            }}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddActivity}
            disabled={submitting || !modalData.semester || !modalData.year}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <Loader2 className="animate-spin mx-auto" size={20} />
            ) : editingItem ? (
              "Update"
            ) : (
              "Add"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderProjectModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {editingItem ? "Edit Project" : "Add New Project"}
        </h3>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Project Title *"
            value={modalData.title}
            onChange={(e) =>
              setModalData((prev) => ({ ...prev, title: e.target.value }))
            }
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <textarea
            placeholder="Description *"
            value={modalData.description}
            onChange={(e) =>
              setModalData((prev) => ({ ...prev, description: e.target.value }))
            }
            rows="3"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={modalData.projectType}
            onChange={(e) =>
              setModalData((prev) => ({ ...prev, projectType: e.target.value }))
            }
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          >
            {PROJECT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Technologies (comma separated)"
            value={modalData.technologies}
            onChange={(e) =>
              setModalData((prev) => ({
                ...prev,
                technologies: e.target.value,
              }))
            }
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="text"
            placeholder="Your Role"
            value={modalData.role}
            onChange={(e) =>
              setModalData((prev) => ({ ...prev, role: e.target.value }))
            }
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <textarea
            placeholder="Outcomes (one per line)"
            value={modalData.outcomes}
            onChange={(e) =>
              setModalData((prev) => ({ ...prev, outcomes: e.target.value }))
            }
            rows="3"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-700 mb-3">Project Links</h4>
            <div className="space-y-3">
              <input
                type="url"
                placeholder="GitHub URL"
                value={modalData.github}
                onChange={(e) =>
                  setModalData((prev) => ({ ...prev, github: e.target.value }))
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="url"
                placeholder="Demo URL"
                value={modalData.demo}
                onChange={(e) =>
                  setModalData((prev) => ({ ...prev, demo: e.target.value }))
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="url"
                placeholder="Documentation URL"
                value={modalData.documentation}
                onChange={(e) =>
                  setModalData((prev) => ({
                    ...prev,
                    documentation: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => {
              toggleModal("project", false);
              resetModal();
            }}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddProject}
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <Loader2 className="animate-spin mx-auto" size={20} />
            ) : editingItem ? (
              "Update"
            ) : (
              "Add"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderPlacementModal = () => {
    const isEditingStat = editingItem && editingItem.year !== undefined;
    const isEditingCompany = editingItem && editingItem.name !== undefined;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {editingItem
              ? isEditingStat
                ? "Edit Placement Stats"
                : "Edit Company"
              : "Add Placement Record"}
          </h3>

          {!editingItem && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Record Type
              </label>
              <div className="flex gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="recordType"
                    value="stats"
                    checked={modalData.placementType === "stats"}
                    onChange={() =>
                      setModalData({
                        ...modalData,
                        placementType: "stats",
                        companyName: "",
                        studentsPlaced: "",
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Yearly Statistics
                  </span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="recordType"
                    value="company"
                    checked={modalData.placementType === "company"}
                    onChange={() =>
                      setModalData({
                        ...modalData,
                        placementType: "company",
                        totalStudents: "",
                        placedStudents: "",
                        medianPackage: "",
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Company</span>
                </label>
              </div>
            </div>
          )}

          {editingItem ||
          modalData.placementType === "stats" ||
          isEditingStat ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 2024"
                    value={modalData.year}
                    onChange={(e) =>
                      setModalData({ ...modalData, year: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Students *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 120"
                    value={modalData.totalStudents}
                    onChange={(e) =>
                      setModalData({
                        ...modalData,
                        totalStudents: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Placed Students *
                </label>
                <input
                  type="number"
                  placeholder="e.g., 98"
                  value={modalData.placedStudents}
                  onChange={(e) =>
                    setModalData({
                      ...modalData,
                      placedStudents: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Average Package (in Lakhs)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 8.5"
                    value={modalData.averagePackage}
                    onChange={(e) =>
                      setModalData({
                        ...modalData,
                        averagePackage: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Highest Package (in Lakhs)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 25"
                    value={modalData.highestPackage}
                    onChange={(e) =>
                      setModalData({
                        ...modalData,
                        highestPackage: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Median Package (in Lakhs)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 7.2"
                  value={modalData.medianPackage}
                  onChange={(e) =>
                    setModalData({
                      ...modalData,
                      medianPackage: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {modalData.totalStudents && modalData.placedStudents && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Placement Rate:</span>{" "}
                    {(
                      (parseInt(modalData.placedStudents) /
                        parseInt(modalData.totalStudents)) *
                      100
                    ).toFixed(1)}
                    %
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Google"
                  value={modalData.companyName}
                  onChange={(e) =>
                    setModalData({ ...modalData, companyName: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 2024"
                    value={modalData.year}
                    onChange={(e) =>
                      setModalData({ ...modalData, year: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Students Placed *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 15"
                    value={modalData.studentsPlaced}
                    onChange={(e) =>
                      setModalData({
                        ...modalData,
                        studentsPlaced: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Highest Package
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 32"
                    value={modalData.highestPackage}
                    onChange={(e) =>
                      setModalData({
                        ...modalData,
                        highestPackage: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Average Package
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 18.5"
                    value={modalData.averagePackage}
                    onChange={(e) =>
                      setModalData({
                        ...modalData,
                        averagePackage: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lowest Package
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 12"
                    value={modalData.lowestPackage}
                    onChange={(e) =>
                      setModalData({
                        ...modalData,
                        lowestPackage: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Roles (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g., SDE, Product Manager, Data Scientist"
                  value={modalData.roles}
                  onChange={(e) =>
                    setModalData({ ...modalData, roles: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                toggleModal("placement", false);
                resetModal();
              }}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpsertPlacement}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <Loader2 className="animate-spin mx-auto" size={20} />
              ) : editingItem ? (
                "Update"
              ) : (
                "Add"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };
  const renderVerifyModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Verify Item</h3>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-medium text-gray-800">
              {verifyItem?.title || verifyItem?.name || "Placement Record"}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {verifyItem?.description || `Verify ${verifyType} record`}
            </p>
          </div>

          <textarea
            placeholder="Remarks (optional)"
            value={verifyRemarks}
            onChange={(e) => setVerifyRemarks(e.target.value)}
            rows="3"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <div className="bg-yellow-50 p-3 rounded-lg">
            <p className="text-sm text-yellow-700 flex items-center gap-2">
              <ShieldAlert size={16} />
              {verifyType === "placement"
                ? "Once verified, the entire placement record cannot be modified."
                : "Once verified, this item cannot be edited by the trainer."}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => {
              toggleModal("verify", false);
              setVerifyItem(null);
              setVerifyType(null);
              setVerifyRemarks("");
            }}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleVerify}
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <ShieldCheck size={16} />
                Verify
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderSyllabusModal = () => {
    if (!selectedSubject) return null;
  
    const canEdit = isAdmin || isHR;
    const hasSyllabus = !!selectedSubject.syllabus;
    const isTrainer = user?.role === 'TRAINER';
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-xl">
          {/* Header - More Compact */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <BookOpen className="text-white flex-shrink-0" size={18} />
              <h2 className="text-lg font-semibold text-white truncate">
                {selectedSubject.name}
              </h2>
              {selectedSubject.code && (
                <span className="bg-white/20 text-white px-2 py-0.5 rounded text-xs font-mono">
                  {selectedSubject.code}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-white/80">
              <span>Y{selectedSubject.year}</span>
              <span>•</span>
              <span>S{selectedSubject.semester}</span>
              {selectedSubject.credits && (
                <>
                  <span>•</span>
                  <span>{selectedSubject.credits} cr</span>
                </>
              )}
              <button
                onClick={() => {
                  toggleModal("syllabus", false);
                  setSelectedSubject(null);
                  setShowHistory(false);
                  setPreviewMode(false);
                  setError(null);
                  setSuccess(null);
                }}
                className="ml-2 text-white hover:text-blue-200"
              >
                <X size={16} />
              </button>
            </div>
          </div>
  
          {/* Error/Success Messages */}
          {(error || success) && (
            <div className="px-3 py-2 border-b border-gray-200">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={14} />
                  <p className="text-xs text-red-700 flex-1">{error}</p>
                  <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
                    <X size={12} />
                  </button>
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-start gap-2">
                  <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={14} />
                  <p className="text-xs text-green-700 flex-1">{success}</p>
                  <button onClick={() => setSuccess(null)} className="text-green-600 hover:text-green-800">
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          )}
  
          {/* Main Content - Horizontal Layout */}
          <div className="flex flex-col md:flex-row h-full">
            {/* Left Column - Syllabus Display (60%) */}
            <div className="md:w-3/5 p-3 border-r border-gray-200 overflow-y-auto max-h-[calc(90vh-40px)]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Syllabus Content
                </h3>
                {hasSyllabus && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedSubject.syllabus.type === "link"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {selectedSubject.syllabus.type === "link"
                      ? "🔗 Link"
                      : "📄 Text"}
                    {hasSyllabus && ` · v${selectedSubject.syllabus.version}`}
                  </span>
                )}
              </div>
  
              {hasSyllabus ? (
                <div className="bg-gray-50 rounded border border-gray-200">
                  {selectedSubject.syllabus.type === "link" ? (
                    <div className="p-2">
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                        <Link2
                          size={14}
                          className="text-blue-600 flex-shrink-0"
                        />
                        <a
                          href={selectedSubject.syllabus.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 truncate flex-1"
                        >
                          {selectedSubject.syllabus.url}
                        </a>
                        <ExternalLink
                          size={12}
                          className="text-blue-600 flex-shrink-0"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-2">
                      <div className="bg-white rounded border p-2 max-h-64 overflow-y-auto text-xs">
                        <pre className="whitespace-pre-wrap font-sans">
                          {selectedSubject.syllabus.content}
                        </pre>
                      </div>
                      
                      {/* Download button for trainers */}
                      {isTrainer && selectedSubject.syllabus.content && (
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => handleDownload(
                              selectedSubject.syllabus.content,
                              `${selectedSubject.name}_syllabus_v${selectedSubject.syllabus.version}.txt`
                            )}
                            className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-[10px] hover:bg-green-700 transition-colors"
                            title="Download Syllabus"
                          >
                            <Download size={10} />
                            Download
                          </button>
                        </div>
                      )}
                      
                      {selectedSubject.syllabus.wordCount && (
                        <div className="flex justify-end mt-1">
                          <span className="text-[10px] text-gray-400">
                            {selectedSubject.syllabus.wordCount} words
                          </span>
                        </div>
                      )}
                    </div>
                  )}
  
                  {/* Metadata - Compact */}
                  <div className="border-t border-gray-200 px-2 py-1 bg-gray-100/50 flex items-center justify-between text-[10px] text-gray-500">
                    <span>
                      Uploaded:{" "}
                      {new Date(
                        selectedSubject.syllabus.uploadedAt,
                      ).toLocaleDateString()}
                    </span>
                    {selectedSubject.syllabus.uploadedByName && (
                      <span>by {selectedSubject.syllabus.uploadedByName}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded border border-gray-200 p-4 text-center">
                  <BookOpen className="mx-auto text-gray-300 mb-1" size={24} />
                  <p className="text-xs text-gray-500">No syllabus yet</p>
                  {isTrainer && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      Contact Admin/HR to upload
                    </p>
                  )}
                </div>
              )}
  
              {/* Status Banner - Inline when no syllabus */}
              {!hasSyllabus && canEdit && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded flex items-center gap-1">
                  <AlertTriangle size={12} className="text-yellow-600" />
                  <span className="text-xs text-yellow-700">
                    Ready for upload
                  </span>
                </div>
              )}
            </div>
  
            {/* Right Column - Upload Form (40%) - Only for Admin/HR */}
            {canEdit && (
              <div className="md:w-2/5 p-3 bg-gray-50 overflow-y-auto max-h-[calc(90vh-40px)]">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {hasSyllabus ? "Update" : "Upload"}
                </h3>
  
                {/* Type Toggle - Compact */}
                <div className="flex gap-1 mb-2">
                  <button
                    onClick={() =>
                      setModalData((prev) => ({
                        ...prev,
                        syllabusType: "link",
                      }))
                    }
                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                      modalData.syllabusType === "link"
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Link2 size={12} className="inline mr-1" />
                    Link
                  </button>
                  <button
                    onClick={() =>
                      setModalData((prev) => ({
                        ...prev,
                        syllabusType: "text",
                      }))
                    }
                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                      modalData.syllabusType === "text"
                        ? "bg-green-600 text-white"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <FileText size={12} className="inline mr-1" />
                    Text
                  </button>
                </div>
  
                {/* Form Fields - Compact */}
                {modalData.syllabusType === "link" ? (
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={modalData.linkUrl}
                      onChange={(e) =>
                        setModalData((prev) => ({
                          ...prev,
                          linkUrl: e.target.value,
                        }))
                      }
                      placeholder="https://..."
                      className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                    />
                    {modalData.linkUrl && (
                      <div className="p-1.5 bg-blue-50 rounded border border-blue-200">
                        <p className="text-[10px] text-blue-600 mb-0.5">
                          Preview:
                        </p>
                        <a
                          href={modalData.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 truncate block"
                        >
                          {modalData.linkUrl}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-end">
                      <button
                        onClick={() => setPreviewMode(!previewMode)}
                        className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        {previewMode ? <Edit3 size={10} /> : <Eye size={10} />}
                        {previewMode ? "Edit" : "Preview"}
                      </button>
                    </div>
  
                    {previewMode ? (
                      <div className="bg-white rounded border p-2 min-h-[120px] max-h-48 overflow-y-auto text-xs">
                        {modalData.directText || (
                          <span className="text-gray-400 italic">
                            No content
                          </span>
                        )}
                      </div>
                    ) : (
                      <textarea
                        value={modalData.directText}
                        onChange={(e) =>
                          setModalData((prev) => ({
                            ...prev,
                            directText: e.target.value,
                          }))
                        }
                        placeholder="Paste syllabus..."
                        rows={8}
                        className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    )}
  
                    {modalData.directText && !previewMode && (
                      <div className="flex gap-2 text-[10px] text-gray-500">
                        <span>{modalData.directText.length} chars</span>
                        <span>•</span>
                        <span>
                          {
                            modalData.directText.split(/\s+/).filter((w) => w)
                              .length
                          }{" "}
                          words
                        </span>
                      </div>
                    )}
                  </div>
                )}
  
                {/* Version History - Compact Accordion */}
                {versionHistory.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="flex items-center gap-1 text-[10px] font-medium text-gray-600 hover:text-gray-900 w-full"
                    >
                      {showHistory ? (
                        <ChevronUp size={12} />
                      ) : (
                        <ChevronDown size={12} />
                      )}
                      History ({versionHistory.length})
                    </button>
  
                    {showHistory && (
                      <div className="mt-1 max-h-24 overflow-y-auto">
                        {versionHistory.map((version, idx) => (
                          <div
                            key={idx}
                            className="py-1 border-b last:border-0 text-[10px]"
                          >
                            <div className="flex justify-between">
                              <span className="font-mono">
                                v{version.version}
                              </span>
                              <span>
                                {new Date(
                                  version.uploadedAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
  
          {/* Footer - Action Buttons */}
          <div className="border-t border-gray-200 px-3 py-2 bg-gray-50 flex justify-end gap-2">
            <button
              onClick={() => {
                toggleModal("syllabus", false);
                setSelectedSubject(null);
                setShowHistory(false);
                setPreviewMode(false);
                setError(null);
                setSuccess(null);
              }}
              className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
  
            {canEdit && (
              <>
                <button
                  onClick={handleSaveSyllabus}
                  disabled={
                    syllabusSaving ||
                    (modalData.syllabusType === "link"
                      ? !modalData.linkUrl
                      : !modalData.directText)
                  }
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {syllabusSaving ? (
                    <Loader2 className="animate-spin" size={10} />
                  ) : (
                    <Save size={10} />
                  )}
                  {syllabusSaving
                    ? "Saving..."
                    : hasSyllabus
                      ? "Update"
                      : "Upload"}
                </button>
  
                {hasSyllabus && (
                  <button
                    onClick={handleDeleteSyllabus}
                    disabled={syllabusSaving}
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER FUNCTIONS - ADMIN/HR VIEWS
  // ============================================
  const renderTrainersList = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">All Trainers</h3>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search trainers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 ${
                viewMode === "grid"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
              title="Grid View"
            >
              <Users size={16} />
            </button>
            <button
              onClick={() => setViewMode("details")}
              className={`px-3 py-2 ${
                viewMode === "details"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
              title="Detailed View"
            >
              <FileText size={16} />
            </button>
          </div>
        </div>
      </div>

      {unassignedTrainers.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle
            className="text-yellow-600 flex-shrink-0 mt-0.5"
            size={20}
          />
          <div>
            <p className="font-medium text-yellow-800">
              {unassignedTrainers.length} Trainer
              {unassignedTrainers.length > 1 ? "s" : ""} Need Assignment
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Please assign University and Subjects to these trainers to enable
              them to start working.
            </p>
          </div>
        </div>
      )}

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrainers.map((trainer) => {
            const isAssigned =
              trainer.profile?.university?.name &&
              trainer.profile?.subjects?.length > 0;
            const stats = {
              activities:
                trainer.profile?.semesterActivities?.reduce(
                  (acc, sa) => acc + (sa.activities?.length || 0),
                  0,
                ) || 0,
              projects: trainer.profile?.projects?.length || 0,
              placement: trainer.profile?.placementRecord?.stats?.length || 0,
              pendingVerification: (() => {
                // Count unverified activities
                const unverifiedActivities =
                  trainer.profile?.semesterActivities?.flatMap(
                    (sa) => sa.activities?.filter((a) => !a.verifiedBy) || [],
                  ) || [];

                // Count unverified projects
                const unverifiedProjects =
                  trainer.profile?.projects?.filter((p) => !p.verifiedBy) || [];

                // Handle placement - ONLY count if parent is NOT verified
                let unverifiedPlacementItems = [];
                const placementRecord = trainer.profile?.placementRecord;

                // If placement record exists and is NOT verified, count ALL stats and companies
                if (placementRecord && !placementRecord.verifiedBy) {
                  unverifiedPlacementItems = [
                    ...(placementRecord.stats || []),
                    ...(placementRecord.companies || []),
                  ];
                }
                // If placement record IS verified, count NOTHING from placement

                return [
                  ...unverifiedActivities,
                  ...unverifiedProjects,
                  ...unverifiedPlacementItems,
                ].length;
              })(),
            };

            return (
              <div
                key={trainer._id}
                onClick={() => {
                  setSelectedTrainer(trainer);
                  fetchTrainerPortfolio(trainer._id);
                }}
                className={`bg-white rounded-lg shadow p-4 hover:shadow-md transition-all cursor-pointer border ${
                  isAssigned
                    ? "hover:border-blue-300"
                    : "border-yellow-200 bg-yellow-50/30"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {trainer.profile?.firstName?.[0]}
                    {trainer.profile?.lastName?.[0]}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {trainer.profile?.firstName} {trainer.profile?.lastName}
                    </h4>
                    <p className="text-xs text-gray-500">{trainer.email}</p>
                    <p className="text-xs text-gray-400">
                      ID: {trainer.profile?.employeeId}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-gray-400" />
                </div>

                {!isAssigned ? (
                  <div className="bg-yellow-100 p-2 rounded-lg">
                    <p className="text-xs text-yellow-800 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Assign University & Subjects
                    </p>
                  </div>
                ) : (
                  <>
                    {stats.pendingVerification > 0 && (
                      <div className="mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                          <ShieldAlert size={12} />
                          {stats.pendingVerification} Pending
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-2">
                      {stats.activities > 0 && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                          📊 {stats.activities} Activities
                        </span>
                      )}
                      {stats.projects > 0 && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                          💻 {stats.projects} Projects
                        </span>
                      )}
                      {stats.placement > 0 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                          🎯 {stats.placement} Placements
                        </span>
                      )}
                    </div>

                    {stats.activities === 0 &&
                      stats.projects === 0 &&
                      stats.placement === 0 && (
                        <p className="text-xs text-gray-400 mt-2">
                          No submissions yet
                        </p>
                      )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trainer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activities
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projects
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Placements
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTrainers.map((trainer) => {
                const stats = {
                  activities:
                    trainer.profile?.semesterActivities?.reduce(
                      (acc, sa) => acc + (sa.activities?.length || 0),
                      0,
                    ) || 0,
                  projects: trainer.profile?.projects?.length || 0,
                  placement:
                    trainer.profile?.placementRecord?.stats?.length || 0,
                  pendingVerification: (() => {
                    const unverifiedActivities =
                      trainer.profile?.semesterActivities?.flatMap(
                        (sa) => sa.activities?.filter((a) => !a.verifiedBy) || [],
                      ) || [];
                    
                    const unverifiedProjects =
                      trainer.profile?.projects?.filter((p) => !p.verifiedBy) || [];
                    
                    let unverifiedPlacementItems = [];
                    const placementRecord = trainer.profile?.placementRecord;
                    
                    if (placementRecord && !placementRecord.verifiedBy) {
                      unverifiedPlacementItems = [
                        ...(placementRecord.stats || []),
                        ...(placementRecord.companies || []),
                      ];
                    }
                    
                    return [
                      ...unverifiedActivities,
                      ...unverifiedProjects,
                      ...unverifiedPlacementItems,
                    ].length;
                  })(),
                };

                return (
                  <tr
                    key={trainer._id}
                    onClick={() => {
                      setSelectedTrainer(trainer);
                      fetchTrainerPortfolio(trainer._id);
                    }}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          {trainer.profile?.firstName?.[0]}
                          {trainer.profile?.lastName?.[0]}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {trainer.profile?.firstName}{" "}
                            {trainer.profile?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {trainer.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trainer.profile?.employeeId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          trainer.trainerCategory === "PERMANENT"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {trainer.trainerCategory}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stats.activities}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stats.projects}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stats.placement}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {stats.pendingVerification > 0 ? (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                          {stats.pendingVerification} Pending
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredTrainers.length === 0 && (
        <div className="text-center py-8">
          <Users className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No trainers found</p>
        </div>
      )}
    </div>
  );

  const renderAdminOverview = () => {
    if (!selectedTrainerData) {
      return (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Users className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">
            Please select a trainer from the Trainers tab first
          </p>
        </div>
      );
    }

    const profile = selectedTrainerData.profile;
    const userData = selectedTrainerData.user;

    const totalActivities =
      profile?.semesterActivities?.reduce(
        (acc, sa) => acc + (sa.activities?.length || 0),
        0,
      ) || 0;
    const totalProjects = profile?.projects?.length || 0;
    const totalPlacements = profile?.placementRecord?.stats?.length || 0;

    const isPlacementVerified = profile?.placementRecord?.verifiedBy;

    const pendingVerification = [
      // Activities without verifiedBy
      ...(profile?.semesterActivities?.flatMap(
        (sa) => sa.activities?.filter((a) => !a.verifiedBy) || [],
      ) || []),

      // Projects without verifiedBy
      ...(profile?.projects?.filter((p) => !p.verifiedBy) || []),

      // Placement stats - only count if parent record is NOT verified
      ...(!isPlacementVerified ? profile?.placementRecord?.stats || [] : []),
    ].length;

    const latestPlacement =
      profile?.placementRecord?.stats?.length > 0
        ? profile.placementRecord.stats.sort((a, b) => b.year - a.year)[0]
        : null;

    return (
      <div className="space-y-6">
        {/* Trainer Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {profile?.firstName?.[0]}
              {profile?.lastName?.[0]}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {profile?.firstName} {profile?.lastName}
              </h2>
              <p className="text-gray-600">{userData?.email}</p>
              <p className="text-sm text-gray-500 mt-1">
                Employee ID: {profile?.employeeId} • {userData?.trainerCategory}
              </p>
            </div>

            {/* Performance Score */}
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                {totalActivities + totalProjects + totalPlacements}
              </div>
              <p className="text-xs text-gray-500">Total Contributions</p>
              {pendingVerification > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs mt-2">
                  <ShieldAlert size={12} />
                  {pendingVerification} Pending
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Performance Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
            <Calendar className="text-blue-600 mb-2" size={24} />
            <p className="text-3xl font-bold text-blue-600">
              {totalActivities}
            </p>
            <p className="text-sm text-gray-600">Activities</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
            <Briefcase className="text-purple-600 mb-2" size={24} />
            <p className="text-3xl font-bold text-purple-600">
              {totalProjects}
            </p>
            <p className="text-sm text-gray-600">Projects</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
            <TrendingUp className="text-green-600 mb-2" size={24} />
            <p className="text-3xl font-bold text-green-600">
              {totalPlacements}
            </p>
            <p className="text-sm text-gray-600">Placement Years</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
            <Shield className="text-orange-600 mb-2" size={24} />
            <p className="text-3xl font-bold text-orange-600">
              {pendingVerification}
            </p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
        </div>

        {/* University Info */}
        {profile?.university?.name && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Building2 size={18} className="text-blue-600" />
              University Assignment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">University</p>
                <p className="font-medium">{profile.university.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Join Date</p>
                <p className="font-medium">
                  {formatDate(profile.university.joinDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${
                    profile.university.status === "ACTIVE"
                      ? "bg-green-100 text-green-800"
                      : profile.university.status === "COMPLETED"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {profile.university.status}
                </span>
              </div>
              {latestPlacement && (
                <div>
                  <p className="text-xs text-gray-500">Latest Placement</p>
                  <p className="font-medium text-green-600">
                    {latestPlacement.placementPercentage?.toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subjects */}
        {profile?.subjects?.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-green-600" />
              Assigned Subjects
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {profile.subjects.map((subject, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium">{subject.name}</p>
                  <p className="text-xs text-gray-500">
                    Year {subject.year} • Semester {subject.semester}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFilteredActivities = () => {
    if (!selectedTrainerData) return null;

    const profile = selectedTrainerData.profile;

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Activities</h3>
        {profile?.semesterActivities?.length > 0 ? (
          <div className="space-y-4">
            {profile.semesterActivities.map((semester, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">
                  Semester {semester.semester} - {semester.year}
                </h4>
                <div className="space-y-3">
                  {semester.activities?.map((activity, actIdx) => (
                    <div
                      key={actIdx}
                      className="bg-gray-50 p-3 rounded-lg border"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-medium">{activity.title}</p>
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs mt-1">
                            {activity.type}
                          </span>
                        </div>
                        {getActionButtons(activity, "activity")}
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {activity.description}
                      </p>
                      {activity.achievements?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500">
                            Achievements:
                          </p>
                          <ul className="list-disc list-inside text-xs text-gray-600">
                            {activity.achievements.map((ach, i) => (
                              <li key={i}>{ach}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No activities found</p>
        )}
      </div>
    );
  };

  const renderFilteredProjects = () => {
    if (!selectedTrainerData) return null;

    const profile = selectedTrainerData.profile;

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Projects</h3>
        {profile?.projects?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.projects.map((project, idx) => (
              <div key={idx} className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-800">{project.title}</h4>
                  {getActionButtons(project, "project")}
                </div>
                <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs mb-2">
                  {project.type}
                </span>
                <p className="text-sm text-gray-600 mb-3">
                  {project.description}
                </p>
                {project.technologies?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {project.technologies.map((tech, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No projects found</p>
        )}
      </div>
    );
  };

  const renderFilteredPlacements = () => {
    if (!selectedTrainerData) return null;

    const profile = selectedTrainerData.profile;
    const placementRecord = profile?.placementRecord || {
      stats: [],
      companies: [],
    };
    const stats = placementRecord.stats || [];
    const companies = placementRecord.companies || [];
    const isVerified = !!placementRecord.verifiedBy;

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Placement Records
          </h3>

          {isVerified ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
              <ShieldCheck size={16} />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
              <ShieldAlert size={16} />
              Pending Verification
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-600">Total Years</p>
            <p className="text-2xl font-bold text-blue-600">{stats.length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-gray-600">Companies</p>
            <p className="text-2xl font-bold text-green-600">
              {companies.length}
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-600">Avg Placement</p>
            <p className="text-2xl font-bold text-purple-600">
              {stats.length > 0
                ? (
                    stats.reduce(
                      (acc, s) => acc + (s.placementPercentage || 0),
                      0,
                    ) / stats.length
                  ).toFixed(1)
                : 0}
              %
            </p>
          </div>
        </div>

        {placementRecord.verifiedBy && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              <span className="font-medium">Verified on:</span>{" "}
              {formatDate(placementRecord.verifiedAt)}
              {placementRecord.verifiedRemarks && (
                <>
                  {" "}
                  •{" "}
                  <span className="italic">
                    "{placementRecord.verifiedRemarks}"
                  </span>
                </>
              )}
            </p>
          </div>
        )}

        {stats.length > 0 && (
          <div className="mb-8">
            <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <TrendingUp size={16} className="text-orange-600" />
              Year-wise Statistics
            </h4>
            <div className="space-y-4">
              {filterItems(stats).map((stat) => (
                <div
                  key={stat._id}
                  className="bg-gray-50 p-4 rounded-lg border"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h5 className="font-medium text-gray-800">
                      Year {stat.year}
                    </h5>
                    {getActionButtons(stat, "stats")}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Total Students</p>
                      <p className="text-lg font-bold text-blue-600">
                        {stat.totalStudents}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Placed</p>
                      <p className="text-lg font-bold text-green-600">
                        {stat.placedStudents}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Percentage</p>
                      <p className="text-lg font-bold text-purple-600">
                        {stat.placementPercentage?.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Avg Package</p>
                      <p className="text-lg font-bold text-orange-600">
                        ₹{stat.averagePackage}L
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {companies.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Building2 size={16} className="text-indigo-600" />
              Recruiting Companies
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filterItems(companies).map((company) => (
                <div
                  key={company._id}
                  className="bg-gray-50 p-4 rounded-lg border"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-medium text-gray-800">
                      {company.name}
                    </h5>
                    {getActionButtons(company, "company")}
                  </div>
                  <p className="text-sm text-gray-600">
                    Year {company.year} • {company.studentsPlaced} students
                  </p>
                  {company.packages?.average && (
                    <p className="text-sm text-gray-600 mt-1">
                      Avg Package: ₹{company.packages.average}L
                    </p>
                  )}
                  {company.roles?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Roles:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {company.roles.map((role, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.length === 0 && companies.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            No placement records found
          </p>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER SYLLABUS VIEW
  // ============================================
  const renderSyllabusView = () => {
    const isLoading = syllabusLoading && subjects.length === 0;
    const displaySubjects = isAdmin || isHR ? filteredSubjects : subjects;
    const currentTrainerName = isTrainer
      ? `${portfolio?.profile?.firstName || ""} ${portfolio?.profile?.lastName || ""}`.trim()
      : selectedTrainerData?.profile?.firstName
        ? `${selectedTrainerData.profile.firstName} ${selectedTrainerData.profile.lastName}`
        : selectedTrainer?.profile?.firstName
          ? `${selectedTrainer.profile.firstName} ${selectedTrainer.profile.lastName}`
          : null;

    if (isAdmin || isHR) {
      if (!selectedTrainerData && !selectedTrainer) {
        return (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">
              Please select a trainer from the Trainers tab first
            </p>
          </div>
        );
      }
    }

    return (
      <div className="space-y-6">
        {/* Trainer Info Banner */}
        {currentTrainerName && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {currentTrainerName[0] || "T"}
            </div>
            <div>
              <p className="font-medium text-gray-900">{currentTrainerName}</p>
              <p className="text-sm text-gray-600">Assigned Subjects</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search subjects..."
                  value={syllabusSearchTerm}
                  onChange={(e) => setSyllabusSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={syllabusStatusFilter}
              onChange={(e) => setSyllabusStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Subjects</option>
              <option value="uploaded">With Syllabus</option>
              <option value="pending">No Syllabus</option>
            </select>
          </div>
        </div>

        {/* Subjects Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displaySubjects.map((subject) => (
              <div
                key={subject._id}
                onClick={() => handleOpenSyllabusModal(subject)}
                className="bg-white rounded-lg shadow hover:shadow-md transition-all cursor-pointer border overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <BookOpen size={24} className="text-blue-600" />
                    {subject.hasSyllabus ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        v{subject.syllabusVersion}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                        No Syllabus
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {subject.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Semester {subject.semester} • Year {subject.year}
                  </p>
                  {subject.code && (
                    <p className="text-xs text-gray-400 mt-2">
                      Code: {subject.code}
                    </p>
                  )}
                  {subject.hasSyllabus && (
                    <p className="text-xs text-gray-400 mt-2">
                      Type:{" "}
                      {subject.syllabusType === "link"
                        ? "External Link"
                        : "Direct Text"}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {displaySubjects.length === 0 && !isLoading && (
          <div className="text-center py-12 bg-white rounded-lg">
            <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">No subjects found</p>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // TRAINER VIEW FUNCTIONS
  // ============================================
  const renderTrainerOverview = () => {
    if (!isTrainerAssigned) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <AlertTriangle className="mx-auto text-yellow-600 mb-4" size={48} />
          <h3 className="text-xl font-bold text-yellow-800 mb-2">
            No Assignment Yet
          </h3>
          <p className="text-yellow-700 mb-4">
            Admin/HR hasn't assigned you any University or Subjects yet.
          </p>
          <div className="bg-white p-4 rounded-lg max-w-md mx-auto">
            <p className="text-sm text-gray-600">
              Once assigned, you'll be able to:
            </p>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• Add semester activities and achievements</li>
              <li>• Create project portfolios</li>
              <li>• Update placement records</li>
              <li>• View subject syllabi</li>
            </ul>
          </div>
        </div>
      );
    }

    const totalActivities =
      portfolio?.profile?.semesterActivities?.reduce(
        (acc, sa) => acc + (sa.activities?.length || 0),
        0,
      ) || 0;
    const totalProjects = portfolio?.profile?.projects?.length || 0;
    const totalPlacements =
      portfolio?.profile?.placementRecord?.stats?.length || 0;

    const pendingVerification = [
      // Activities without verifiedBy
      ...(portfolio?.profile?.semesterActivities?.flatMap(
        (sa) => sa.activities?.filter((a) => !a.verifiedBy) || [],
      ) || []),

      // Projects without verifiedBy
      ...(portfolio?.profile?.projects?.filter((p) => !p.verifiedBy) || []),

      // Placement stats - check if placement record is NOT verified
      ...(!portfolio?.profile?.placementRecord?.verifiedBy
        ? portfolio?.profile?.placementRecord?.stats || []
        : []),

      // Companies - check if placement record is NOT verified
      ...(!portfolio?.profile?.placementRecord?.verifiedBy
        ? portfolio?.profile?.placementRecord?.companies || []
        : []),
    ].length;

    const latestPlacement =
      portfolio?.profile?.placementRecord?.stats?.length > 0
        ? portfolio.profile.placementRecord.stats.sort(
            (a, b) => b.year - a.year,
          )[0]
        : null;

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Building2 className="text-blue-600" size={20} />
            Current Assignment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">University</p>
              <p className="font-medium">
                {portfolio?.profile?.university?.name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Employee ID</p>
              <p className="font-medium">{portfolio?.profile?.employeeId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Join Date</p>
              <p className="font-medium">
                {formatDate(portfolio?.profile?.joiningDate)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span
                className={`inline-block px-2 py-1 text-xs rounded-full ${
                  portfolio?.profile?.university?.status === "ACTIVE"
                    ? "bg-green-100 text-green-800"
                    : portfolio?.profile?.university?.status === "COMPLETED"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {portfolio?.profile?.university?.status || "ACTIVE"}
              </span>
            </div>
          </div>

          {portfolio?.profile?.subjects?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-sm text-gray-500 mb-2">Assigned Subjects</p>
              <div className="flex flex-wrap gap-2">
                {portfolio.profile.subjects.map((subject, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-white text-blue-800 rounded-full text-sm border border-blue-200"
                  >
                    {subject.name} (Year {subject.year})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="text-green-600" size={24} />
              <span className="text-2xl font-bold text-gray-900">
                {totalActivities}
              </span>
            </div>
            <h4 className="font-medium text-gray-800">Activities</h4>
            <p className="text-sm text-gray-500 mt-1">Semester activities</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <Briefcase className="text-purple-600" size={24} />
              <span className="text-2xl font-bold text-gray-900">
                {totalProjects}
              </span>
            </div>
            <h4 className="font-medium text-gray-800">Projects</h4>
            <p className="text-sm text-gray-500 mt-1">Projects completed</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="text-orange-600" size={24} />
              <span className="text-2xl font-bold text-gray-900">
                {totalPlacements}
              </span>
            </div>
            <h4 className="font-medium text-gray-800">Placements</h4>
            <p className="text-sm text-gray-500 mt-1">Years with records</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              {pendingVerification > 0 ? (
                <ShieldAlert className="text-yellow-600" size={24} />
              ) : (
                <ShieldCheck className="text-green-600" size={24} />
              )}
              <span className="text-2xl font-bold text-gray-900">
                {pendingVerification}
              </span>
            </div>
            <h4 className="font-medium text-gray-800">Pending</h4>
            <p className="text-sm text-gray-500 mt-1">Awaiting verification</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            Recent Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {latestPlacement && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Latest Placement Year</p>
                <p className="text-2xl font-bold text-blue-600">
                  {latestPlacement.year}
                </p>
                <p className="text-sm mt-2">
                  {latestPlacement.placementPercentage?.toFixed(1)}% placement
                  rate
                </p>
              </div>
            )}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Recent Activities</p>
              <p className="text-2xl font-bold text-purple-600">
                {portfolio?.profile?.semesterActivities?.slice(-1)[0]
                  ?.activities?.length || 0}
              </p>
              <p className="text-sm mt-2">in current semester</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTrainerActivities = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">
          My Semester Activities
        </h3>
        {isTrainerAssigned && (
          <button
            onClick={handleOpenActivityModal}
            className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
          >
            <Plus size={16} /> Add Activity
          </button>
        )}
      </div>

      {!isTrainerAssigned ? (
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <AlertTriangle className="mx-auto text-yellow-600 mb-2" size={32} />
          <p className="text-yellow-700">
            You need to be assigned to a university before adding activities.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Show all available semesters */}
          {availableSemesters.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
              <p className="text-blue-800 font-medium mb-2">
                Your Assigned Semesters
              </p>
              <div className="flex flex-wrap gap-2">
                {availableSemesters.map((item) => (
                  <span
                    key={`${item.year}-${item.semester}`}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    Sem {item.semester} - {item.year}
                  </span>
                ))}
              </div>
            </div>
          )}

          {portfolio?.profile?.semesterActivities?.length > 0 ? (
            portfolio.profile.semesterActivities.map((semester, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">
                  Semester {semester.semester} - {semester.year}
                </h4>
                <div className="space-y-3">
                  {semester.activities?.map((activity, actIdx) => {
                    const isVerified = !!activity.verifiedBy;
                    return (
                      <div
                        key={actIdx}
                        className={`bg-gray-50 p-3 rounded-lg border-l-4 ${
                          isVerified ? "border-green-500" : "border-yellow-500"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{activity.title}</p>
                              {isVerified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                                  <ShieldCheck size={10} />
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                                  <ShieldAlert size={10} />
                                  Pending
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {activity.description}
                            </p>
                            {activity.achievements?.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-500">
                                  Achievements:
                                </p>
                                <ul className="list-disc list-inside text-xs text-gray-600">
                                  {activity.achievements.map((ach, i) => (
                                    <li key={i}>{ach}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          {!isVerified && (
                            <button
                              onClick={() =>
                                handleDelete("activity", activity._id)
                              }
                              className="text-red-600 hover:text-red-700 ml-2"
                              title="Delete"
                            >
                              <Trash size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">
              No activities added yet. Click "Add Activity" to get started.
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderTrainerProjects = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">My Projects</h3>
        {isTrainerAssigned && (
          <button
            onClick={() => toggleModal("project", true)}
            className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
          >
            <Plus size={16} /> Add Project
          </button>
        )}
      </div>

      {!isTrainerAssigned ? (
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <AlertTriangle className="mx-auto text-yellow-600 mb-2" size={32} />
          <p className="text-yellow-700">
            You need to be assigned to a university before adding projects.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portfolio?.profile?.projects?.length > 0 ? (
            portfolio.profile.projects.map((project, index) => {
              const isVerified = !!project.verifiedBy;
              return (
                <div
                  key={project._id || index}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                    isVerified ? "border-green-200" : "border-yellow-200"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-800">
                      {project.title}
                    </h4>
                    {!isVerified && (
                      <button
                        onClick={() => handleDelete("project", project._id)}
                        className="text-red-600 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                  {isVerified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs mb-2">
                      <ShieldCheck size={10} />
                      Verified
                    </span>
                  )}
                  <p className="text-sm text-gray-600 mb-2">
                    {project.description}
                  </p>
                  {project.technologies?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {project.technologies.map((tech, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-gray-500 text-center py-4 col-span-2">
              No projects added yet. Click "Add Project" to get started.
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderTrainerPlacement = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">
          My Placement Records
        </h3>
        <div className="flex gap-2">
          {isTrainerAssigned && (
            <>
              <button
                onClick={() => handleOpenPlacementModal("stats")}
                className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
              >
                <Plus size={16} /> Add Stats
              </button>
            </>
          )}
        </div>
      </div>

      {!isTrainerAssigned ? (
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <AlertTriangle className="mx-auto text-yellow-600 mb-2" size={32} />
          <p className="text-yellow-700">
            You need to be assigned to a university before adding placement
            records.
          </p>
        </div>
      ) : (
        <>
          {portfolio?.profile?.placementRecord?.stats?.length > 0 && (
            <div className="mb-8">
              <h4 className="font-medium text-gray-700 mb-3">
                Year-wise Statistics
              </h4>
              <div className="space-y-4">
                {portfolio.profile.placementRecord.stats.map((stat, index) => {
                  const isVerified = !!stat.verifiedBy;
                  return (
                    <div
                      key={index}
                      className={`bg-gray-50 p-4 rounded-lg border-l-4 ${
                        isVerified ? "border-green-500" : "border-yellow-500"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h5 className="font-medium text-gray-800">
                          Year {stat.year}
                        </h5>
                        {!isVerified && (
                          <button
                            onClick={() => handleDelete("stats", stat._id)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash size={14} />
                          </button>
                        )}
                      </div>
                      {isVerified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs mb-2">
                          <ShieldCheck size={10} />
                          Verified
                        </span>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">
                            Total Students
                          </p>
                          <p className="text-lg font-bold text-blue-600">
                            {stat.totalStudents}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Placed</p>
                          <p className="text-lg font-bold text-green-600">
                            {stat.placedStudents}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Placement %</p>
                          <p className="text-lg font-bold text-purple-600">
                            {stat.placementPercentage?.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Avg Package</p>
                          <p className="text-lg font-bold text-orange-600">
                            ₹{stat.averagePackage}L
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {portfolio?.profile?.placementRecord?.companies?.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-3">
                Recruiting Companies
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {portfolio.profile.placementRecord.companies.map(
                  (company, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 p-4 rounded-lg border"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium text-gray-800">
                          {company.name}
                        </h5>
                        {!company.verifiedBy && (
                          <button
                            onClick={() => handleDelete("company", company._id)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash size={14} />
                          </button>
                        )}
                      </div>
                      {company.verifiedBy && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs mb-2">
                          <ShieldCheck size={10} />
                          Verified
                        </span>
                      )}
                      <p className="text-sm text-gray-600 mt-1">
                        Year {company.year} • {company.studentsPlaced} students
                        placed
                      </p>
                      {company.packages?.average && (
                        <p className="text-sm text-gray-600 mt-1">
                          Avg Package: ₹{company.packages.average}L
                        </p>
                      )}
                      {company.roles?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">Roles:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {company.roles.map((role, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {!portfolio?.profile?.placementRecord?.stats?.length &&
            !portfolio?.profile?.placementRecord?.companies?.length && (
              <p className="text-gray-500 text-center py-4">
                No placement records added yet. Click "Add Stats" to get
                started.
              </p>
            )}
        </>
      )}
    </div>
  );

  const renderTrainerSyllabus = () => {
    if (!isTrainerAssigned) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <AlertTriangle className="mx-auto text-yellow-600 mb-4" size={48} />
          <h3 className="text-xl font-bold text-yellow-800 mb-2">
            No Assignment Yet
          </h3>
          <p className="text-yellow-700">
            You need to be assigned subjects before you can view syllabi.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search subjects..."
                  value={syllabusSearchTerm}
                  onChange={(e) => setSyllabusSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={syllabusStatusFilter}
              onChange={(e) => setSyllabusStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Subjects</option>
              <option value="uploaded">With Syllabus</option>
              <option value="pending">No Syllabus</option>
            </select>
          </div>
        </div>

        {syllabusLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubjects.map((subject) => (
              <div
                key={subject._id}
                onClick={() => handleOpenSyllabusModal(subject)}
                className="bg-white rounded-lg shadow hover:shadow-md transition-all cursor-pointer border"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <BookOpen size={24} className="text-blue-600" />
                    {subject.hasSyllabus ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        v{subject.syllabusVersion}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                        No Syllabus
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {subject.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Semester {subject.semester} • Year {subject.year}
                  </p>
                  {subject.code && (
                    <p className="text-xs text-gray-400 mt-2">
                      Code: {subject.code}
                    </p>
                  )}
                  {subject.hasSyllabus && (
                    <p className="text-xs text-gray-400 mt-2">
                      Type:{" "}
                      {subject.syllabusType === "link"
                        ? "External Link"
                        : "Direct Text"}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredSubjects.length === 0 && !syllabusLoading && (
          <div className="text-center py-12 bg-white rounded-lg">
            <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">No subjects found</p>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  if (loading && !portfolio && !allTrainers.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">
              {isAdmin || isHR
                ? "Trainer Portfolio Management"
                : "My Portfolio"}
            </h1>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                  Admin
                </span>
              )}
              {isHR && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                  HR
                </span>
              )}
              {(isAdmin || isHR) && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Toggle Filters"
                >
                  <Filter size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {success && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600" />
            {success}
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600" />
            {error}
          </div>
        </div>
      )}

      {showFilters && (isAdmin || isHR) && (
        <div className="bg-white border-b p-4">
          <div className="max-w-7xl mx-auto flex flex-wrap gap-4">
            <select
              value={filters.year}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, year: e.target.value }))
              }
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Years</option>
              {FILTER_YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              value={filters.type}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, type: e.target.value }))
              }
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Types</option>
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0) + type.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      )}

      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
          <div className="flex space-x-1">
            {sections.map((tab) => {
              const Icon = tab.icon;
              const isDisabled =
                (isAdmin || isHR) &&
                tab.id !== "trainers" &&
                !selectedTrainerData &&
                !selectedTrainer;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (isDisabled) {
                      setError("Please select a trainer first");
                      return;
                    }
                    setActiveTab(tab.id);
                    navigate(`?tab=${tab.id}`, { replace: true });
                  }}
                  disabled={isDisabled}
                  className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                    activeTab === tab.id
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : isDisabled
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-600 hover:text-gray-900"
                  }`}
                  title={isDisabled ? "Select a trainer first" : ""}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAdmin || isHR ? (
          <>
            {activeTab === "trainers" && renderTrainersList()}
            {activeTab === "overview" && renderAdminOverview()}
            {activeTab === "activities" &&
              (selectedTrainerData ? (
                renderFilteredActivities()
              ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <Users className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">
                    Please select a trainer from the Trainers tab first
                  </p>
                </div>
              ))}
            {activeTab === "projects" &&
              (selectedTrainerData ? (
                renderFilteredProjects()
              ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <Users className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">
                    Please select a trainer from the Trainers tab first
                  </p>
                </div>
              ))}
            {activeTab === "placement" &&
              (selectedTrainerData ? (
                renderFilteredPlacements()
              ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <Users className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">
                    Please select a trainer from the Trainers tab first
                  </p>
                </div>
              ))}
            {activeTab === "syllabus" && renderSyllabusView()}
          </>
        ) : (
          <>
            {activeTab === "overview" && renderTrainerOverview()}
            {activeTab === "activities" && renderTrainerActivities()}
            {activeTab === "projects" && renderTrainerProjects()}
            {activeTab === "placement" && renderTrainerPlacement()}
            {activeTab === "syllabus" && renderTrainerSyllabus()}
          </>
        )}
      </div>

      {modals.activity && renderActivityModal()}
      {modals.project && renderProjectModal()}
      {modals.placement && renderPlacementModal()}
      {modals.verify && renderVerifyModal()}
      {modals.syllabus && renderSyllabusModal()}
    </div>
  );
}