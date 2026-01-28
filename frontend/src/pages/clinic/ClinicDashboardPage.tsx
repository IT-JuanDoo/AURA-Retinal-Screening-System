import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ClinicHeader from '../../components/clinic/ClinicHeader';
import clinicAuthService from '../../services/clinicAuthService';
import clinicManagementService, { ClinicDashboardStats, ClinicActivity } from '../../services/clinicManagementService';
import toast from 'react-hot-toast';

const ClinicDashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ClinicDashboardStats | null>(null);
  const [activity, setActivity] = useState<ClinicActivity[]>([]);
  
  const clinicInfo = clinicAuthService.getCurrentClinic();
  const isPending = clinicInfo?.verificationStatus === 'Pending';
  const isRejected = clinicInfo?.verificationStatus === 'Rejected';

  useEffect(() => {
    if (!clinicAuthService.isLoggedIn()) {
      navigate('/login');
      return;
    }
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, activityData] = await Promise.all([
        clinicManagementService.getDashboardStats(),
        clinicManagementService.getRecentActivity(5),
      ]);
      setStats(statsData);
      setActivity(activityData);
    } catch (error: any) {
      console.error('Error fetching dashboard:', error);
      if (error.response?.status === 401) {
        toast.error('Phiên đăng nhập hết hạn');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Pending status page
  if (isPending) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <ClinicHeader />
        <main className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Đang chờ xét duyệt
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Yêu cầu đăng ký của phòng khám <strong>{clinicInfo?.clinicName}</strong> đang được xem xét. 
              Chúng tôi sẽ thông báo qua email khi có kết quả.
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Thời gian xét duyệt thường từ 1-3 ngày làm việc. Vui lòng kiểm tra email thường xuyên.
              </p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <Link
                to="/clinic/settings"
                className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Cập nhật thông tin
              </Link>
              <button
                onClick={() => clinicAuthService.logout().then(() => navigate('/login'))}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Rejected status page
  if (isRejected) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <ClinicHeader />
        <main className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Yêu cầu bị từ chối
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Rất tiếc, yêu cầu đăng ký của phòng khám đã bị từ chối.
              Vui lòng liên hệ bộ phận hỗ trợ để biết thêm chi tiết.
            </p>
            <a
              href="mailto:support@aura.health"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Liên hệ hỗ trợ
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <ClinicHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Xin chào, {clinicInfo?.clinicName}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Tổng quan hoạt động phòng khám
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Doctors */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Bác sĩ</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {stats?.totalDoctors || 0}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {stats?.activeDoctors || 0} đang hoạt động
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Patients */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Bệnh nhân</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {stats?.totalPatients || 0}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {stats?.activePatients || 0} đang theo dõi
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Analyses */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Phân tích</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {stats?.totalAnalyses || 0}
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      {stats?.pendingAnalyses || 0} đang chờ xử lý
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Package */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Gói dịch vụ</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {stats?.remainingAnalyses || 0}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      lượt phân tích còn lại
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Overview & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Risk Distribution */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Phân bố mức độ rủi ro
                </h3>
                <div className="space-y-4">
                  {/* High Risk */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Cao/Nghiêm trọng</span>
                      <span className="text-sm font-semibold text-red-600">{stats?.highRiskCount || 0}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${stats?.totalAnalyses ? (stats.highRiskCount / stats.totalAnalyses * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Medium Risk */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Trung bình</span>
                      <span className="text-sm font-semibold text-yellow-600">{stats?.mediumRiskCount || 0}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full" 
                        style={{ width: `${stats?.totalAnalyses ? (stats.mediumRiskCount / stats.totalAnalyses * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Low Risk */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Thấp</span>
                      <span className="text-sm font-semibold text-green-600">{stats?.lowRiskCount || 0}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${stats?.totalAnalyses ? (stats.lowRiskCount / stats.totalAnalyses * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <Link
                  to="/clinic/usage-dashboard"
                  className="mt-6 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  Xem thống kê chi tiết
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* Recent Activity */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Hoạt động gần đây
                </h3>
                {activity.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <svg className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>Chưa có hoạt động nào</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activity.map((item) => (
                      <div key={item.id} className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          item.type === 'Analysis' ? 'bg-indigo-100 dark:bg-indigo-900/30' :
                          item.type === 'Alert' ? 'bg-red-100 dark:bg-red-900/30' :
                          'bg-green-100 dark:bg-green-900/30'
                        }`}>
                          {item.type === 'Analysis' ? (
                            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          ) : item.type === 'Alert' ? (
                            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900 dark:text-white truncate">{item.title}</p>
                          {item.description && (
                            <p className={`text-xs mt-0.5 ${
                              item.description === 'High' || item.description === 'Critical' ? 'text-red-600 dark:text-red-400' :
                              item.description === 'Medium' ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-green-600 dark:text-green-400'
                            }`}>
                              Mức độ: {item.description}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {new Date(item.createdAt).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                to="/clinic/bulk-upload"
                className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/50 transition-colors">
                    <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">Upload hàng loạt</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Tải lên nhiều ảnh cùng lúc</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/clinic/reports"
                className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">Tạo báo cáo</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Báo cáo chiến dịch sàng lọc</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/clinic/packages"
                className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">Mua gói dịch vụ</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Nâng cấp gói phân tích</p>
                  </div>
                </div>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ClinicDashboardPage;
