import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import doctorService, { DoctorDto, DoctorStatisticsDto } from '../../services/doctorService';
import patientSearchService from '../../services/patientSearchService';
import toast from 'react-hot-toast';
import DoctorHeader from '../../components/doctor/DoctorHeader';

const DoctorDashboardPage = () => {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<DoctorDto | null>(null);
  const [statistics, setStatistics] = useState<DoctorStatisticsDto | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [doctorData, statsData, patientsData] = await Promise.all([
        doctorService.getCurrentDoctor().catch(() => null),
        doctorService.getStatistics().catch(() => null),
        doctorService.getPatients(true).catch(() => []),
      ]);
      setDoctor(doctorData);
      setStatistics(statsData);
      setPatients(patientsData);
    } catch (error: any) {
      console.error('Error loading doctor data:', error);
      toast.error(error?.response?.data?.message || 'Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadData();
      return;
    }

    try {
      setLoading(true);
      const results = await patientSearchService.searchPatients({
        searchQuery: searchQuery.trim(),
        page: 1,
        pageSize: 10,
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

  if (loading && !doctor) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <DoctorHeader />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Đang tải...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DoctorHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Chào mừng trở lại, {doctor?.firstName || 'Bác sĩ'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {doctor?.specialization || 'Bác sĩ'} - {doctor?.hospitalAffiliation || 'Phòng khám'}
          </p>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Tổng bệnh nhân</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{statistics.totalPatients}</p>
                </div>
                <div className="size-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-3-3h-4a3 3 0 00-3 3v2zM16 4a3 3 0 100 6 3 3 0 000-6zM6.343 6.343a4 4 0 115.657 5.657M6 20h4a3 3 0 003-3v-4a3 3 0 00-3-3H6a3 3 0 00-3 3v4a3 3 0 003 3z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Tổng phân tích</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{statistics.totalAnalyses}</p>
                </div>
                <div className="size-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Đang chờ xử lý</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{statistics.pendingAnalyses}</p>
                </div>
                <div className="size-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Ghi chú y tế</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{statistics.medicalNotesCount}</p>
                </div>
                <div className="size-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Search */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Tìm kiếm bệnh nhân theo tên, email hoặc ID..."
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Tìm kiếm
            </button>
            <Link
              to="/doctor/patients/search"
              className="px-6 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Bộ lọc
            </Link>
          </div>
        </div>

        {/* Patients List */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Bệnh nhân được phân công ({patients.length})
              </h2>
              <Link
                to="/doctor/patients/search"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Xem tất cả →
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Đang tải...</p>
            </div>
          ) : patients.length > 0 ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {patients.slice(0, 10).map((patient) => (
                <div
                  key={patient.userId}
                  className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/doctor/patients/${patient.userId}`)}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div
                      className="w-12 h-12 rounded-full bg-cover bg-center flex-shrink-0"
                      style={{
                        backgroundImage: `url("${patient.profileImageUrl || `https://ui-avatars.com/api/?name=${patient.firstName || 'Patient'}&background=2b8cee&color=fff`}")`,
                      }}
                    />

                    {/* Patient Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {patient.firstName && patient.lastName
                              ? `${patient.firstName} ${patient.lastName}`
                              : patient.email}
                          </h3>
                          <div className="mt-1 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                            <p>Email: {patient.email}</p>
                            {patient.phone && <p>Điện thoại: {patient.phone}</p>}
                            {patient.clinicName && (
                              <p>Phòng khám: {patient.clinicName}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="mt-4 flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-slate-600 dark:text-slate-400">
                            {patient.analysisCount || 0} phân tích
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className="text-slate-600 dark:text-slate-400">
                            {patient.medicalNotesCount || 0} ghi chú
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-slate-600 dark:text-slate-400">
                            Gán: {formatDate(patient.assignedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <svg
                className="w-16 h-16 mx-auto text-slate-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-3-3h-4a3 3 0 00-3 3v2zM16 4a3 3 0 100 6 3 3 0 000-6zM6.343 6.343a4 4 0 115.657 5.657M6 20h4a3 3 0 003-3v-4a3 3 0 00-3-3H6a3 3 0 00-3 3v4a3 3 0 003 3z"
                />
              </svg>
              <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                Chưa có bệnh nhân nào
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Bạn chưa được phân công bệnh nhân nào
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DoctorDashboardPage;
