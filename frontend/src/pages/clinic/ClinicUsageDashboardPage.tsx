import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import clinicUsageTrackingService, {
  ClinicUsageStatistics,
  PackageUsage,
} from "../../services/clinicUsageTrackingService";
import clinicManagementService, { ClinicActivity } from "../../services/clinicManagementService";
import clinicAuthService from "../../services/clinicAuthService";
import ClinicHeader from "../../components/clinic/ClinicHeader";
import toast from "react-hot-toast";

const ClinicUsageDashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [statistics, setStatistics] = useState<ClinicUsageStatistics | null>(null);
  const [packageUsage, setPackageUsage] = useState<PackageUsage[]>([]);
  const [recentActivity, setRecentActivity] = useState<ClinicActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    (async () => {
      const ok = await clinicAuthService.ensureLoggedIn();
      if (!ok) {
        navigate("/login");
        return;
      }
      loadData();
    })();
  }, [navigate]);

  useEffect(() => {
    if (!clinicAuthService.isLoggedIn()) return;
    loadData();
  }, [startDate, endDate, location.pathname]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, packagesData, activityData] = await Promise.all([
        clinicUsageTrackingService.getClinicUsageStatistics(startDate, endDate),
        clinicUsageTrackingService.getClinicPackageUsage(),
        clinicManagementService.getRecentActivity(20).catch(() => []),
      ]);
      setStatistics(statsData);
      setPackageUsage(packagesData);
      setRecentActivity(activityData);
    } catch (error: any) {
      console.error("Error loading usage data:", error);
      toast.error(error?.response?.data?.message || "Lỗi khi tải dữ liệu sử dụng");
      setStatistics(null);
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  if (loading && !statistics && recentActivity.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <ClinicHeader />
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-slate-600 dark:text-slate-400">Đang tải...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <ClinicHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Không tải được dữ liệu thống kê. Bạn có thể xem lại các kết quả phân tích AI bên dưới.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mb-8">
              <button
                type="button"
                onClick={() => loadData()}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
              >
                Thử lại
              </button>
              <Link
                to="/clinic/dashboard"
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Về Tổng quan
              </Link>
            </div>
            {recentActivity.length > 0 && (
              <div className="text-left border-t border-slate-200 dark:border-slate-700 pt-8 mt-8">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  Kết quả phân tích AI gần đây
                </h2>
                <ul className="space-y-3">
                  {recentActivity.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Mức độ: {item.description}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {new Date(item.createdAt).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {item.relatedEntityId && (
                        <Link
                          to={`/clinic/analysis/result/${item.relatedEntityId}`}
                          className="shrink-0 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                        >
                          Xem kết quả
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { usageStatistics } = statistics;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <ClinicHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Thống kê chi tiết
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {statistics.clinicName} - Theo dõi hình ảnh và kết quả phân tích AI
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/clinic/dashboard"
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Tổng quan
            </Link>
            <Link
              to="/clinic/upload"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
            >
              Upload &amp; phân tích mới
            </Link>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Từ ngày
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Đến ngày
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={loadData}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Làm mới
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards - Images */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">Tổng số hình ảnh</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
              {formatNumber(usageStatistics.totalImages)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">Đã xử lý</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
              {formatNumber(usageStatistics.processedImages)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">Đang chờ</p>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
              {formatNumber(usageStatistics.pendingImages)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">Thất bại</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
              {formatNumber(usageStatistics.failedImages)}
            </p>
          </div>
        </div>

        {/* Summary Cards - Analyses */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">Tổng số phân tích</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
              {formatNumber(usageStatistics.totalAnalyses)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">Hoàn thành</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
              {formatNumber(usageStatistics.completedAnalyses)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">Đang xử lý</p>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
              {formatNumber(usageStatistics.processingAnalyses)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">Thất bại</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
              {formatNumber(usageStatistics.failedAnalyses)}
            </p>
          </div>
        </div>

        {/* Package Usage Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">Tổng số gói</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
              {formatNumber(usageStatistics.totalPackages)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">Gói đang hoạt động</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
              {formatNumber(usageStatistics.activePackages)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">Phân tích còn lại</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
              {formatNumber(usageStatistics.totalRemainingAnalyses)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">Đã sử dụng</p>
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
              {formatNumber(usageStatistics.totalUsedAnalyses)}
            </p>
          </div>
        </div>

        {/* Package Usage Details */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Chi Tiết Sử Dụng Gói Dịch Vụ
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Tên gói
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Loại
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Tổng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Đã dùng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Còn lại
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Tỷ lệ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {packageUsage.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-slate-500">
                      Không có gói dịch vụ nào
                    </td>
                  </tr>
                ) : (
                  packageUsage.map((pkg) => (
                    <tr key={pkg.packageId} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        {pkg.packageName}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {pkg.packageType}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                        {formatNumber(pkg.totalAnalyses)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                        {formatNumber(pkg.usedAnalyses)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                        {formatNumber(pkg.remainingAnalyses)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                pkg.usagePercentage >= 80
                                  ? "bg-red-600"
                                  : pkg.usagePercentage >= 50
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{ width: `${Math.min(pkg.usagePercentage, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {pkg.usagePercentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {pkg.isExpired ? (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs font-semibold rounded">
                            Hết hạn
                          </span>
                        ) : pkg.isActive ? (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-semibold rounded">
                            Hoạt động
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded">
                            Không hoạt động
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Usage Chart */}
        {usageStatistics.dailyUsage && usageStatistics.dailyUsage.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Sử Dụng Theo Ngày
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                      Ngày
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                      Hình ảnh
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                      Phân tích
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                      Credits đã dùng
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {usageStatistics.dailyUsage.map((daily, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="px-4 py-2 text-sm text-slate-900 dark:text-white">
                        {formatDate(typeof daily.date === "string" ? daily.date : String(daily.date))}
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
                        {formatNumber(daily.imageCount)}
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
                        {formatNumber(daily.analysisCount)}
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
                        {formatNumber(daily.usedCredits)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Kết quả phân tích AI gần đây - xem lại từng kết quả */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            Kết quả phân tích AI gần đây
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Bấm &quot;Xem kết quả&quot; để xem lại chi tiết đánh giá AI (điểm rủi ro, tim mạch, đái tháo đường, đột quỵ, mạch máu).
          </p>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <p>Chưa có kết quả phân tích nào.</p>
              <Link
                to="/clinic/upload"
                className="mt-3 inline-block text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
              >
                Tải ảnh &amp; bắt đầu phân tích →
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentActivity.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 px-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">
                        Mức độ rủi ro: {item.description}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {new Date(item.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {item.relatedEntityId && (
                    <Link
                      to={`/clinic/analysis/result/${item.relatedEntityId}`}
                      className="shrink-0 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 text-center"
                    >
                      Xem kết quả
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicUsageDashboardPage;
