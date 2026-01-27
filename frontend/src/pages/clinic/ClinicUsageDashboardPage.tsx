import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import usageTrackingService, {
  ClinicUsageStatistics,
  PackageUsage,
} from "../../services/usageTrackingService";
import toast from "react-hot-toast";

const ClinicUsageDashboardPage = () => {
  const [statistics, setStatistics] = useState<ClinicUsageStatistics | null>(null);
  const [packageUsage, setPackageUsage] = useState<PackageUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const location = useLocation();

  useEffect(() => {
    loadData();
  }, [startDate, endDate, location.pathname]); // Reload when route changes or date filters change

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, packagesData] = await Promise.all([
        usageTrackingService.getClinicUsageStatistics(startDate, endDate),
        usageTrackingService.getClinicPackageUsage(),
      ]);
      setStatistics(statsData);
      setPackageUsage(packagesData);
    } catch (error: any) {
      console.error("Error loading usage data:", error);
      toast.error(error?.response?.data?.message || "Lỗi khi tải dữ liệu sử dụng");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  if (loading && !statistics) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400">
            Không tìm thấy dữ liệu sử dụng
          </p>
        </div>
      </div>
    );
  }

  const { usageStatistics } = statistics;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Bảng Điều Khiển Sử Dụng (FR-27)
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {statistics.clinicName} - Theo dõi hình ảnh và sử dụng gói dịch vụ
          </p>
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
        {usageStatistics.dailyUsage.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
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
                        {formatDate(daily.date)}
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
      </div>
    </div>
  );
};

export default ClinicUsageDashboardPage;
