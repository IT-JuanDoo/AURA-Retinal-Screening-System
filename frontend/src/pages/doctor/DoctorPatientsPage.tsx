import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DoctorHeader from '../../components/doctor/DoctorHeader';
import doctorService from '../../services/doctorService';
import patientSearchService from '../../services/patientSearchService';
import toast from 'react-hot-toast';

interface PatientItem {
  userId: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  profileImageUrl?: string;
  clinicName?: string;
  analysisCount?: number;
  medicalNotesCount?: number;
  assignedAt?: string;
  lastAnalysisDate?: string;
  riskLevel?: string;
}

const DoctorPatientsPage = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await doctorService.getPatients(true);
      setPatients(data);
    } catch (error: any) {
      console.error('Error loading patients:', error);
      toast.error('Không thể tải danh sách bệnh nhân');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadPatients();
      return;
    }

    try {
      setLoading(true);
      const results = await patientSearchService.searchPatients({
        searchQuery: searchQuery.trim(),
        page: 1,
        pageSize: 50,
      });
      setPatients(results.patients);
    } catch (error: any) {
      console.error('Error searching patients:', error);
      toast.error('Lỗi khi tìm kiếm bệnh nhân');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRiskBadge = (risk?: string) => {
    switch (risk?.toLowerCase()) {
      case 'high':
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            Rủi ro cao
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            Rủi ro TB
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            Rủi ro thấp
          </span>
        );
      default:
        return null;
    }
  };

  const filteredPatients = patients.filter(patient => {
    if (riskFilter !== 'all') {
      if (riskFilter === 'high' && patient.riskLevel?.toLowerCase() !== 'high' && patient.riskLevel?.toLowerCase() !== 'critical') {
        return false;
      }
      if (riskFilter === 'medium' && patient.riskLevel?.toLowerCase() !== 'medium') {
        return false;
      }
      if (riskFilter === 'low' && patient.riskLevel?.toLowerCase() !== 'low') {
        return false;
      }
    }
    return true;
  });

  const stats = {
    total: patients.length,
    highRisk: patients.filter(p => p.riskLevel?.toLowerCase() === 'high' || p.riskLevel?.toLowerCase() === 'critical').length,
    recentActivity: patients.filter(p => {
      if (!p.lastAnalysisDate) return false;
      const daysDiff = (Date.now() - new Date(p.lastAnalysisDate).getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    }).length,
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DoctorHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Bệnh nhân của tôi
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Quản lý và theo dõi bệnh nhân được phân công
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Tổng bệnh nhân</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-3-3h-4a3 3 0 00-3 3v2zM16 4a3 3 0 100 6 3 3 0 000-6zM6.343 6.343a4 4 0 115.657 5.657M6 20h4a3 3 0 003-3v-4a3 3 0 00-3-3H6a3 3 0 00-3 3v4a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Rủi ro cao</p>
                <p className="text-3xl font-bold text-red-600">{stats.highRisk}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Hoạt động gần đây</p>
                <p className="text-3xl font-bold text-green-600">{stats.recentActivity}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Tìm kiếm bệnh nhân theo tên, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tìm kiếm
              </button>
            </div>
            <div>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="all">Tất cả mức độ</option>
                <option value="high">Rủi ro cao</option>
                <option value="medium">Rủi ro TB</option>
                <option value="low">Rủi ro thấp</option>
              </select>
            </div>
          </div>
        </div>

        {/* Patients List */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Đang tải...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-3-3h-4a3 3 0 00-3 3v2zM16 4a3 3 0 100 6 3 3 0 000-6zM6.343 6.343a4 4 0 115.657 5.657M6 20h4a3 3 0 003-3v-4a3 3 0 00-3-3H6a3 3 0 00-3 3v4a3 3 0 003 3z" />
              </svg>
              <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">Không tìm thấy bệnh nhân</p>
              <p className="text-slate-600 dark:text-slate-400">Thử tìm kiếm với từ khóa khác</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.userId}
                  className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/doctor/patients/${patient.userId}`)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-full bg-cover bg-center flex-shrink-0"
                      style={{
                        backgroundImage: `url("${patient.profileImageUrl || `https://ui-avatars.com/api/?name=${patient.firstName || 'Patient'}&background=2b8cee&color=fff`}")`,
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {patient.firstName && patient.lastName
                            ? `${patient.firstName} ${patient.lastName}`
                            : patient.email}
                        </h3>
                        {getRiskBadge(patient.riskLevel)}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
                        <p>{patient.email}</p>
                        {patient.phone && <p>{patient.phone}</p>}
                        {patient.clinicName && (
                          <p className="text-xs">Phòng khám: {patient.clinicName}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-sm">
                      <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 mb-2">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {patient.analysisCount || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          {patient.medicalNotesCount || 0}
                        </span>
                      </div>
                      {patient.lastAnalysisDate && (
                        <p className="text-xs text-slate-400">
                          Phân tích gần nhất: {formatDate(patient.lastAnalysisDate)}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/doctor/patients/${patient.userId}`);
                      }}
                      className="text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DoctorPatientsPage;
