// components/Syllabus/SyllabusManager.jsx - DEBUG VERSION
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  BookOpen,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Edit3,
  Eye,
  Save,
  Link2,
  FileText,
  Trash2,
  Clock,
  GraduationCap,
  User
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import api from '../../config/api.js';

export default function SyllabusManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { trainerId, subjectId } = useParams();
  
  console.log('=== SYLLABUSMANAGER RENDER ===');
  console.log('Current pathname:', location.pathname);
  console.log('trainerId from URL:', trainerId);
  console.log('subjectId from URL:', subjectId);
  console.log('user role:', user?.role);
  
  const isAdminOrHR = ['ADMIN', 'HR'].includes(user?.role);
  const isTrainer = user?.role === 'TRAINER';
  
  const basePath = isTrainer ? '/trainer' : '/admin';
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Data states
  const [trainers, setTrainers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  
  // Syllabus form states
  const [syllabusType, setSyllabusType] = useState('link');
  const [linkUrl, setLinkUrl] = useState('');
  const [directText, setDirectText] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  // ===== EFFECT 1: Load trainers =====
  useEffect(() => {
    console.log('=== EFFECT 1: LOAD TRAINERS ===');
    console.log('pathname includes /trainers:', location.pathname.includes('/trainers'));
    console.log('trainerId is null/empty:', !trainerId);
    console.log('trainers.length:', trainers.length);
    
    if (location.pathname.includes('/trainers') && !trainerId && trainers.length === 0) {
      console.log('✅ CALLING fetchTrainers');
      fetchTrainers();
    } else {
      console.log('❌ NOT calling fetchTrainers');
      console.log('  - includes /trainers:', location.pathname.includes('/trainers'));
      console.log('  - !trainerId:', !trainerId);
      console.log('  - trainers.length === 0:', trainers.length === 0);
      if (!location.pathname.includes('/trainers')) {
        setLoading(false);
      }
    }
  }, [location.pathname, trainerId]);

  // ===== EFFECT 2: Set selected trainer =====
  useEffect(() => {
    console.log('=== EFFECT 2: SET SELECTED TRAINER ===');
    console.log('trainerId:', trainerId);
    console.log('trainers.length:', trainers.length);
    console.log('trainers data:', trainers);
    
    if (trainerId && trainers.length > 0) {
      console.log('Looking for trainer with id:', trainerId);
      const trainer = trainers.find(t => {
        console.log('  Comparing:', t.id, '===', trainerId, '?', t.id === trainerId);
        return t.id === trainerId;
      });
      
      if (trainer) {
        console.log('✅ Found trainer:', trainer.name);
        setSelectedTrainer(trainer);
      } else {
        console.log('❌ Trainer not found!');
        console.log('Available IDs:', trainers.map(t => t.id));
      }
    } else {
      console.log('❌ Skipping - missing trainerId or no trainers loaded');
    }
  }, [trainerId, trainers]);

  // ===== EFFECT 3: Fetch subject syllabus =====
  useEffect(() => {
    console.log('=== EFFECT 3: FETCH SUBJECT SYLLABUS ===');
    console.log('trainerId:', trainerId);
    console.log('subjectId:', subjectId);
    console.log('selectedTrainer:', selectedTrainer?.name);
    
    if (trainerId && subjectId && selectedTrainer) {
      const subject = selectedTrainer.subjects?.find(s => s.id === subjectId);
      if (subject) {
        console.log('✅ Found subject:', subject.name);
        fetchSubjectSyllabus(subject);
      } else {
        console.log('❌ Subject not found');
      }
    }
  }, [trainerId, subjectId, selectedTrainer]);

  const fetchTrainers = async () => {
    console.log('=== FETCHING TRAINERS ===');
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/users/syllabus/trainers');
      
      console.log('✅ API Response received');
      console.log('Response:', response.data);
      
      const trainersData = response.data.data || [];
      console.log('Trainers count:', trainersData.length);
      console.log('Trainers data:', trainersData);
      
      // Ensure all subjects have syllabus data properly set
      const trainersWithStatus = trainersData.map(trainer => ({
        ...trainer,
        subjects: (trainer.subjects || []).map(subject => ({
          ...subject,
          syllabus: subject.syllabus || null
        }))
      }));
      
      console.log('Trainers with status:', trainersWithStatus);
      setTrainers(trainersWithStatus);
    } catch (err) {
      console.error('❌ Error fetching trainers:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError('Failed to load trainers');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectSyllabus = async (subject) => {
    try {
      setLoading(true);
      setError('');
      
      if (!trainerId || !subjectId) {
        setError('Trainer ID and Subject ID are required');
        return;
      }
      
      let syllabusData = null;
      
      try {
        const response = await api.get(`/users/${trainerId}/subject/${subjectId}/syllabus`);
        syllabusData = response.data.data;
      } catch (err) {
        if (err.response?.status === 404) {
          console.log('No syllabus found for this subject');
        } else {
          throw err;
        }
      }
      
      setSelectedSubject({
        id: subjectId,
        name: subject.name,
        code: subject.code,
        year: subject.year,
        semester: subject.semester,
        credits: subject.credits,
        status: subject.status,
        syllabus: syllabusData ? {
          type: syllabusData.type,
          version: syllabusData.version,
          url: syllabusData.url,
          content: syllabusData.content,
          wordCount: syllabusData.wordCount,
          uploadedAt: syllabusData.uploadedAt,
          uploadedByName: syllabusData.uploadedByName
        } : null
      });
      
      if (syllabusData) {
        if (syllabusData.type === 'link') {
          setSyllabusType('link');
          setLinkUrl(syllabusData.url || '');
        } else {
          setSyllabusType('text');
          setDirectText(syllabusData.content || '');
        }
      } else {
        setSyllabusType('link');
        setLinkUrl('');
        setDirectText('');
      }
    } catch (err) {
      console.error('Error fetching subject syllabus:', err);
      setError(err.response?.data?.message || 'Failed to load subject syllabus');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSyllabus = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (!trainerId || !subjectId) {
        setError('Trainer ID and Subject ID are required');
        return;
      }

      const syllabusData = {
        type: syllabusType,
        version: (selectedSubject?.syllabus?.version || 0) + 1,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?._id,
        uploadedByName: `${user?.profile?.firstName || ''} ${user?.profile?.lastName || ''}`.trim() || user?.email
      };

      if (syllabusType === 'link') {
        if (!linkUrl) {
          setError('Please enter a URL');
          return;
        }
        syllabusData.url = linkUrl;
        syllabusData.filename = linkUrl.split('/').pop() || 'external-link';
      } else {
        if (!directText) {
          setError('Please enter syllabus content');
          return;
        }
        syllabusData.content = directText;
        syllabusData.wordCount = directText.split(/\s+/).filter(w => w).length;
      }

      let response;
      if (selectedSubject?.syllabus) {
        response = await api.put(
          `/users/${trainerId}/subject/${subjectId}/syllabus`,
          syllabusData
        );
      } else {
        response = await api.post(
          `/users/${trainerId}/subject/${subjectId}/syllabus`,
          syllabusData
        );
      }

      if (response.data.success) {
        setSuccess('Syllabus saved successfully!');
        await fetchTrainers();
        setTimeout(() => {
          navigate(`${basePath}/syllabus/trainer/${trainerId}`);
        }, 2000);
      }
    } catch (err) {
      console.error('Error saving syllabus:', err);
      setError(err.response?.data?.message || 'Failed to save syllabus');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSyllabus = async () => {
    if (!isAdminOrHR || !selectedSubject?.syllabus) return;
    
    if (!window.confirm('Are you sure you want to delete this syllabus?')) return;

    try {
      setSaving(true);
      setError('');
      
      const response = await api.delete(
        `/users/${trainerId}/subject/${subjectId}/syllabus`
      );

      if (response.data.success) {
        setSuccess('Syllabus deleted successfully!');
        await fetchTrainers();
        setTimeout(() => {
          navigate(`${basePath}/syllabus/trainer/${trainerId}`);
        }, 2000);
      }
    } catch (err) {
      console.error('Error deleting syllabus:', err);
      setError(err.response?.data?.message || 'Failed to delete syllabus');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBack = () => {
    console.log('handleBack called');
    if (subjectId && trainerId) {
      navigate(`${basePath}/syllabus/trainer/${trainerId}`);
    } else if (trainerId) {
      navigate(`${basePath}/syllabus/trainers`);
    } else {
      navigate(`${basePath}/dashboard`);
    }
  };

  const handleSelectTrainer = (trainer) => {
    console.log('=== handleSelectTrainer CALLED ===');
    console.log('Selected trainer:', trainer.name, 'ID:', trainer.id);
    console.log('Current basePath:', basePath);
    console.log('Navigation path:', `${basePath}/syllabus/trainer/${trainer.id}`);
    
    navigate(`${basePath}/syllabus/trainer/${trainer.id}`);
    
    console.log('navigate() called');
  };

  const handleSelectSubject = (subject) => {
    console.log('=== handleSelectSubject CALLED ===');
    console.log('Selected subject:', subject.name);
    navigate(`${basePath}/syllabus/trainer/${trainerId}/subjects/${subject.id}`);
  };

  const getFilteredSubjects = () => {
    if (!selectedTrainer || !selectedTrainer.subjects) return [];
    
    let filtered = selectedTrainer.subjects.filter(subject => {
      const hasSyllabus = subject.syllabus?.hasContent === true;
      
      const matchesSearch = 
        subject.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.code?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'pending' && !hasSyllabus) ||
        (statusFilter === 'uploaded' && hasSyllabus);
      
      return matchesSearch && matchesStatus;
    });
    
    filtered.sort((a, b) => {
      const aHasSyllabus = !!(a.syllabus && Object.keys(a.syllabus).length > 0);
      const bHasSyllabus = !!(b.syllabus && Object.keys(b.syllabus).length > 0);
      return (aHasSyllabus ? 1 : 0) - (bHasSyllabus ? 1 : 0);
    });
    
    return filtered;
  };

  console.log('=== RENDER DECISION ===');
  console.log('isAdminOrHR:', isAdminOrHR);
  console.log('Loading?', loading);
  console.log('trainers.length:', trainers.length);
  console.log('selectedTrainer:', selectedTrainer?.name);
  console.log('selectedSubject:', selectedSubject?.name);

  if (loading && trainers.length === 0 && !selectedSubject && location.pathname.includes('/trainers')) {
    console.log('→ Rendering LOADING state');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={40} />
          <p className="text-gray-600">Loading trainers...</p>
        </div>
      </div>
    );
  }

  // STEP 1: TRAINERS LIST (Admin/HR only)
  if (isAdminOrHR && location.pathname.includes('/trainers') && !trainerId) {
    console.log('→ Rendering TRAINERS LIST');
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate(basePath + '/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
              Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Select Trainer</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainers.map((trainer) => {
              const missingCount = (trainer.subjects || []).filter(
                s => !s.syllabus || Object.keys(s.syllabus).length === 0
              ).length;
              
              return (
                <div
                  key={trainer.id}
                  onClick={() => {
                    console.log('Trainer card clicked:', trainer.name);
                    handleSelectTrainer(trainer);
                  }}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-6 border hover:border-blue-500"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {trainer.name?.[0] || 'T'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{trainer.name}</h3>
                      <p className="text-sm text-gray-500">{trainer.email}</p>
                      <p className="text-xs text-gray-400 mt-1">ID: {trainer.employeeId}</p>
                      <div className="flex gap-2 mt-2">
                        <p className="text-xs text-blue-600">
                          {trainer.subjects?.length || 0} subjects
                        </p>
                        {missingCount > 0 && (
                          <p className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                            ⚠️ {missingCount} missing
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {trainers.length === 0 && !loading && (
            <div className="text-center py-12 bg-white rounded-lg">
              <User className="mx-auto text-gray-300 mb-3" size={48} />
              <p className="text-gray-500">No trainers found</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // STEP 2: TRAINER'S SUBJECTS LIST
  if (isAdminOrHR && trainerId && !subjectId && selectedTrainer) {
    console.log('→ Rendering TRAINER SUBJECTS LIST');
    const filteredSubjects = getFilteredSubjects();
    const totalMissing = (selectedTrainer.subjects || []).filter(
      s => !s.syllabus || Object.keys(s.syllabus).length === 0
    ).length;

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
                Back to Trainers
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedTrainer.name}'s Subjects
              </h1>
            </div>
          </div>

          {/* Trainer Info */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {selectedTrainer.name?.[0] || 'T'}
            </div>
            <div>
              <p className="font-medium text-gray-900">{selectedTrainer.name}</p>
              <p className="text-sm text-gray-600">{selectedTrainer.email}</p>
              <p className="text-xs text-gray-500">ID: {selectedTrainer.employeeId}</p>
            </div>
            {totalMissing > 0 && (
              <div className="ml-auto">
                <p className="text-sm text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full font-medium">
                  {totalMissing} subjects need syllabus
                </p>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search subjects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="pending">⚠️ Missing Syllabus</option>
                <option value="uploaded">✅ Has Syllabus</option>
                <option value="all">📚 All Subjects</option>
              </select>
            </div>
          </div>

          {/* Subjects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubjects.map((subject) => {
              const hasSyllabus = !!(subject.syllabus && Object.keys(subject.syllabus).length > 0);
              
              return (
                <div
                  key={subject.id}
                  onClick={() => handleSelectSubject(subject)}
                  className={`rounded-lg shadow hover:shadow-md transition-all cursor-pointer border ${
                    hasSyllabus 
                      ? 'bg-white hover:border-green-500' 
                      : 'bg-yellow-50 hover:border-yellow-500 border-yellow-200'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <BookOpen size={24} className={hasSyllabus ? "text-blue-600" : "text-yellow-600"} />
                      {hasSyllabus ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          v{subject.syllabus.version}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          ⚠️ No Syllabus
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{subject.name}</h3>
                    <p className="text-sm text-gray-600">
                      Semester {subject.semester} • Year {subject.year}
                    </p>
                    {subject.code && (
                      <p className="text-xs text-gray-500 mt-2">Code: {subject.code}</p>
                    )}
                    {hasSyllabus && (
                      <p className="text-xs text-gray-500 mt-2">
                        Type: {subject.syllabus.type === 'link' ? '🔗 External Link' : '📄 Direct Text'}
                      </p>
                    )}
                    {!hasSyllabus && (
                      <p className="text-xs text-yellow-600 mt-3 font-medium">
                        Click to upload syllabus →
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredSubjects.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg">
              <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
              <p className="text-gray-500">
                {searchTerm 
                  ? 'No subjects match your search' 
                  : statusFilter === 'pending'
                  ? 'All subjects have syllabi uploaded!'
                  : 'No subjects found'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // STEP 3: SYLLABUS DETAIL (placeholder - not showing full code for brevity)
  if (trainerId && subjectId && selectedSubject) {
    console.log('→ Rendering SYLLABUS DETAIL');
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h1 className="text-2xl font-bold">{selectedSubject.name}</h1>
            <p className="text-gray-600">Trainer: {selectedTrainer?.name}</p>
          </div>
        </div>
      </div>
    );
  }

  console.log('→ Rendering DEFAULT redirect');
  if (isAdminOrHR) {
    return <Navigate to={`${basePath}/syllabus/trainers`} replace />;
  }
  
  return <Navigate to={`${basePath}/dashboard`} replace />;
}