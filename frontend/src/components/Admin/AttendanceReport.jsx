import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Filter, 
  Calendar, 
  Users, 
  Clock,
  Loader2,
  ChevronDown,
  FileText,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import api from '../../config/api.js';

export default function AttendanceReport() {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    trainerCategory: '',
    trainerId: '',
    showDetails: false
  });
  const [trainers, setTrainers] = useState([]);

  // Fetch trainers for dropdown
  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      const response = await api.get('/users');
      if (response.data.success) {
        setTrainers(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching trainers:', error);
    }
  };

  const generateReport = async () => {
    try {
      setGenerating(true);
      const response = await api.get('/leaves/reports/balance', {
        params: filters
      });
      
      if (response.data.success) {
        setReports(response.data.data || []);
      } else {
        alert('Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert(error.response?.data?.message || 'Error generating report');
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = async () => {
    try {
      setLoading(true);
      const response = await api.get('/leaves/reports/balance/download', {
        params: filters,
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-report-${filters.month}-${filters.year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Attendance & Leave Reports</h1>
        <button
          onClick={downloadReport}
          disabled={loading || reports.length === 0}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Download size={20} />
          )}
          Download Excel
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Report Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Month Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month
            </label>
            <select
              value={filters.month}
              onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {getMonthName(i + 1)}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <select
              value={filters.year}
              onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Trainer Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trainer Category
            </label>
            <select
              value={filters.trainerCategory}
              onChange={(e) => setFilters(prev => ({ ...prev, trainerCategory: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Categories</option>
              <option value="PERMANENT">Permanent</option>
              <option value="CONTRACTED">Contracted</option>
            </select>
          </div>

          {/* Specific Trainer Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specific Trainer
            </label>
            <select
              value={filters.trainerId}
              onChange={(e) => setFilters(prev => ({ ...prev, trainerId: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Trainers</option>
              {trainers.map((trainer) => (
                <option key={trainer._id} value={trainer._id}>
                  {trainer.profile?.firstName} {trainer.profile?.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Show Details Toggle */}
        <div className="mt-4 flex items-center">
          <input
            type="checkbox"
            id="showDetails"
            checked={filters.showDetails}
            onChange={(e) => setFilters(prev => ({ ...prev, showDetails: e.target.checked }))}
            className="mr-2"
          />
          <label htmlFor="showDetails" className="text-sm text-gray-700">
            Show detailed leave breakdown
          </label>
        </div>

        {/* Generate Button */}
        <div className="mt-6">
          <button
            onClick={generateReport}
            disabled={generating}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Generating...
              </>
            ) : (
              <>
                <BarChart3 size={20} />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report Summary */}
      {reports.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-green-600" />
            <h2 className="text-xl font-semibold text-gray-800">Report Summary</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="text-blue-600" size={20} />
                <h3 className="font-medium text-blue-800">Total Trainers</h3>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {reports.length}
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-green-600" size={20} />
                <h3 className="font-medium text-green-800">Avg. Attendance</h3>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {Math.round(reports.reduce((acc, report) => acc + (report.attendance?.percentage || 0), 0) / reports.length)}%
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="text-purple-600" size={20} />
                <h3 className="font-medium text-purple-800">Total Leaves Taken</h3>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {reports.reduce((acc, report) => acc + (report.leaves?.totalTaken || 0), 0)}
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="text-orange-600" size={20} />
                <h3 className="font-medium text-orange-800">Report Period</h3>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {getMonthName(filters.month)} {filters.year}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Report Table */}
      {reports.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trainer Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attendance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leaves Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leaves Taken
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">
                          {report.trainer?.name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {report.trainer?.employeeId || 'N/A'} • {report.trainer?.email || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        report.trainer?.category === 'PERMANENT'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {report.trainer?.category || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${report.attendance?.percentage || 0}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm font-medium">
                            {report.attendance?.percentage || 0}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {report.attendance?.present || 0} present, {report.attendance?.absent || 0} absent
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {filters.showDetails ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Sick:</span>
                            <span className="font-medium">{report.leaves?.balance?.sick || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Casual:</span>
                            <span className="font-medium">{report.leaves?.balance?.casual || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Paid:</span>
                            <span className="font-medium">
                              {report.leaves?.balance?.paid >= 9999 ? 'Unlimited' : report.leaves?.balance?.paid || 0}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm">
                          <span className="font-medium">Total: </span>
                          {(report.leaves?.balance?.sick || 0) + (report.leaves?.balance?.casual || 0) + 
                           (report.leaves?.balance?.paid >= 9999 ? 0 : (report.leaves?.balance?.paid || 0))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {filters.showDetails ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Sick:</span>
                            <span className="font-medium">{report.leaves?.taken?.sick || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Casual:</span>
                            <span className="font-medium">{report.leaves?.taken?.casual || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Paid:</span>
                            <span className="font-medium">{report.leaves?.taken?.paid || 0}</span>
                          </div>
                          <div className="border-t pt-1 mt-1">
                            <div className="flex justify-between text-sm font-medium">
                              <span>Total:</span>
                              <span>{report.leaves?.totalTaken || 0}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm font-medium">
                          {report.leaves?.totalTaken || 0} days
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        report.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : report.status === 'ON_LEAVE'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {report.status || 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Footer with total counts */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="flex justify-between text-sm text-gray-600">
              <div>
                Showing {reports.length} trainer{reports.length !== 1 ? 's' : ''}
              </div>
              <div className="flex gap-6">
                <div>
                  <span className="font-medium">Total Leaves Taken:</span>{' '}
                  {reports.reduce((acc, report) => acc + (report.leaves?.totalTaken || 0), 0)}
                </div>
                <div>
                  <span className="font-medium">Avg. Attendance:</span>{' '}
                  {Math.round(reports.reduce((acc, report) => acc + (report.attendance?.percentage || 0), 0) / reports.length)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Generated</h3>
          <p className="text-gray-600 mb-6">
            Use the filters above to generate an attendance and leave report.
          </p>
          <button
            onClick={generateReport}
            disabled={generating}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Generating...
              </>
            ) : (
              <>
                <BarChart3 size={20} />
                Generate Your First Report
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}