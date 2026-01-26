import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import patientSearchService, {
  PatientSearchParams,
  PatientSearchResponse,
} from '../../services/patientSearchService';
import toast from 'react-hot-toast';
import PatientHeader from '../../components/patient/PatientHeader';
import { useDebounce } from '../../hooks/useDebounce';

const PatientSearchPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('searchQuery') || '');
  const [riskLevel, setRiskLevel] = useState<string>(searchParams.get('riskLevel') || '');
  const [clinicId, setClinicId] = useState<string>(searchParams.get('clinicId') || '');
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'AssignedAt');
  const [sortDirection, setSortDirection] = useState<string>(searchParams.get('sortDirection') || 'desc');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [pageSize] = useState(20);
  
  const [searchResults, setSearchResults] = useState<PatientSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const performSearch = useCallback(async () => {
    try {
      setLoading(true);
      const params: PatientSearchParams = {
        searchQuery: debouncedSearchQuery || undefined,
        riskLevel: riskLevel || undefined,
        clinicId: clinicId || undefined,
        page,
        pageSize,
        sortBy,
        sortDirection,
      };

      const results = await patientSearchService.searchPatients(params);
      setSearchResults(results);
    } catch (error: any) {
      console.error('Error searching patients:', error);
      toast.error(error?.response?.data?.message || 'Lỗi khi tìm kiếm bệnh nhân');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, riskLevel, clinicId, page, pageSize, sortBy, sortDirection]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    performSearch();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setRiskLevel('');
    setClinicId('');
    setSortBy('AssignedAt');
    setSortDirection('desc');
    setPage(1);
  };

  const getRiskLevelColor = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'Critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'High':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PatientHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Tìm kiếm Bệnh nhân
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Tìm kiếm và lọc bệnh nhân theo ID, tên, email và mức độ rủi ro
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Search Query */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tìm kiếm
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nhập ID, tên hoặc email bệnh nhân..."
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Tìm kiếm
                </button>
              </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Risk Level Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Mức độ rủi ro
                </label>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tất cả</option>
                  <option value="Low">Thấp</option>
                  <option value="Medium">Trung bình</option>
                  <option value="High">Cao</option>
                  <option value="Critical">Nghiêm trọng</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Sắp xếp theo
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="AssignedAt">Ngày gán</option>
                  <option value="FirstName">Tên</option>
                  <option value="LastName">Họ</option>
                  <option value="Email">Email</option>
                  <option value="LatestAnalysisDate">Ngày phân tích gần nhất</option>
                  <option value="LatestRiskLevel">Mức độ rủi ro</option>
                </select>
              </div>

              {/* Sort Direction */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Thứ tự
                </label>
                <select
                  value={sortDirection}
                  onChange={(e) => setSortDirection(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="desc">Giảm dần</option>
                  <option value="asc">Tăng dần</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {(searchQuery || riskLevel || clinicId) && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Results */}
        {loading && !searchResults ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Đang tìm kiếm...</p>
            </div>
          </div>
        ) : searchResults && searchResults.patients.length > 0 ? (
          <>
            {/* Results Summary */}
            <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              Tìm thấy <span className="font-semibold">{searchResults.totalCount}</span> bệnh nhân
              {searchResults.totalPages > 1 && (
                <span> (Trang {searchResults.page}/{searchResults.totalPages})</span>
              )}
            </div>

            {/* Patient List */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {searchResults.patients.map((patient) => (
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

                          {/* Risk Level Badge */}
                          {patient.latestRiskLevel && (
                            <div className="flex-shrink-0">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(
                                  patient.latestRiskLevel
                                )}`}
                              >
                                {patient.latestRiskLevel === 'Critical'
                                  ? 'Nghiêm trọng'
                                  : patient.latestRiskLevel === 'High'
                                  ? 'Cao'
                                  : patient.latestRiskLevel === 'Medium'
                                  ? 'Trung bình'
                                  : 'Thấp'}
                              </span>
                              {patient.latestRiskScore !== null && patient.latestRiskScore !== undefined && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-right">
                                  Điểm: {patient.latestRiskScore.toFixed(1)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="mt-4 flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-slate-600 dark:text-slate-400">
                              {patient.analysisCount} phân tích
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="text-slate-600 dark:text-slate-400">
                              {patient.medicalNotesCount} ghi chú
                            </span>
                          </div>
                          {patient.latestAnalysisDate && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-slate-600 dark:text-slate-400">
                                Phân tích gần nhất: {formatDate(patient.latestAnalysisDate)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {searchResults.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Trước
                </button>
                <span className="px-4 py-2 text-slate-700 dark:text-slate-300">
                  Trang {page} / {searchResults.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(searchResults.totalPages, p + 1))}
                  disabled={page === searchResults.totalPages || loading}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Sau
                </button>
              </div>
            )}
          </>
        ) : searchResults && searchResults.patients.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-12 text-center">
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              Không tìm thấy bệnh nhân
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              Thử thay đổi tiêu chí tìm kiếm hoặc bộ lọc
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default PatientSearchPage;
