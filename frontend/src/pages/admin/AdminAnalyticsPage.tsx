import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import analyticsService, {
  SystemAnalyticsDto,
  UsageStatisticsDto,
  ErrorRateDto,
  ImageCountDto,
  RiskDistributionDto,
} from "../../services/analyticsService";
import { useAdminAuthStore } from "../../store/adminAuthStore";
import AdminHeader from "../../components/admin/AdminHeader";

export default function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const { isAdminAuthenticated, logoutAdmin } = useAdminAuthStore();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<SystemAnalyticsDto | null>(null);
  const [dateRange, setDateRange] = useState<{
    start: string;
    end: string;
  }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate("/admin/login");
      return;
    }
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const loadAnalytics = async () => {
    if (!isAdminAuthenticated) {
      toast.error("Vui lòng đăng nhập lại");
      return;
    }

    setLoading(true);
    try {
      const data = await analyticsService.getSystemAnalytics(
        dateRange.start,
        dateRange.end
      );
      setAnalytics(data);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        logoutAdmin();
        window.location.href = "/admin/login";
        return;
      }
      toast.error(
        e?.response?.data?.message || e?.message || "Không tải được dữ liệu"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-600 dark:text-slate-400">
              Đang tải dữ liệu...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-600 dark:text-slate-400">
              Không có dữ liệu
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <AdminHeader />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            System Analytics Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Thống kê và phân tích hệ thống
          </p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-700 dark:text-slate-300">
                Từ:
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-700 dark:text-slate-300">
                Đến:
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <button
              onClick={loadAnalytics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Làm mới
            </button>
          </div>
        </div>

        {/* Usage Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Tổng người dùng"
            value={analytics.usageStatistics.totalUsers}
            subtitle={`${analytics.usageStatistics.activeUsers} đang hoạt động`}
            icon="👥"
            color="blue"
          />
          <StatCard
            title="Tổng bác sĩ"
            value={analytics.usageStatistics.totalDoctors}
            subtitle={`${analytics.usageStatistics.activeDoctors} đang hoạt động`}
            icon="👨‍⚕️"
            color="green"
          />
          <StatCard
            title="Tổng phòng khám"
            value={analytics.usageStatistics.totalClinics}
            subtitle={`${analytics.usageStatistics.activeClinics} đang hoạt động`}
            icon="🏥"
            color="purple"
          />
          <StatCard
            title="Tổng phân tích"
            value={analytics.usageStatistics.totalAnalyses}
            subtitle={`${analytics.usageStatistics.completedAnalyses} đã hoàn thành`}
            icon="🔬"
            color="orange"
          />
        </div>

        {/* Error Rate & Image Count */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ErrorRateCard errorRate={analytics.errorRate} />
          <ImageCountCard imageCount={analytics.imageCount} />
        </div>

        {/* Risk Distribution */}
        <RiskDistributionCard riskDistribution={analytics.riskDistribution} />

        {/* Analysis Status */}
        <AnalysisStatusCard usage={analytics.usageStatistics} />
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: string;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    green: "bg-green-500/10 text-green-600 dark:text-green-400",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {title}
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {value.toLocaleString("vi-VN")}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
            {subtitle}
          </p>
        </div>
        <div
          className={`size-12 rounded-lg flex items-center justify-center text-2xl ${colorClasses[color]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function ErrorRateCard({ errorRate }: { errorRate: ErrorRateDto }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
        Tỷ lệ lỗi
      </h2>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 dark:text-slate-400">
              Tỷ lệ lỗi tổng thể
            </span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {errorRate.overallErrorRate.toFixed(2)}%
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
            <div
              className="bg-red-500 h-3 rounded-full transition-all"
              style={{ width: `${errorRate.overallErrorRate}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              Tổng lỗi
            </p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {errorRate.totalErrors}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              Tổng yêu cầu
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {errorRate.totalRequests}
            </p>
          </div>
        </div>
        {errorRate.errorsByType.length > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Lỗi theo loại:
            </p>
            <div className="space-y-2">
              {errorRate.errorsByType.map((err, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {err.errorType}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {err.count} ({err.percentage.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ImageCountCard({ imageCount }: { imageCount: ImageCountDto }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
        Thống kê hình ảnh
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              Tổng hình ảnh
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {imageCount.totalImages.toLocaleString("vi-VN")}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              Đã xử lý
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {imageCount.processedImages.toLocaleString("vi-VN")}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              Đã tải lên
            </p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {imageCount.uploadedImages.toLocaleString("vi-VN")}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              Thất bại
            </p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {imageCount.failedImages.toLocaleString("vi-VN")}
            </p>
          </div>
        </div>
        {imageCount.processingImages > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-500">
              Đang xử lý
            </p>
            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {imageCount.processingImages.toLocaleString("vi-VN")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function RiskDistributionCard({
  riskDistribution,
}: {
  riskDistribution: RiskDistributionDto;
}) {
  const total =
    riskDistribution.lowRisk +
    riskDistribution.mediumRisk +
    riskDistribution.highRisk +
    riskDistribution.criticalRisk;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
        Phân bổ mức độ rủi ro
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <RiskLevelCard
          level="Thấp"
          count={riskDistribution.lowRisk}
          percentage={riskDistribution.lowRiskPercentage}
          color="green"
        />
        <RiskLevelCard
          level="Trung bình"
          count={riskDistribution.mediumRisk}
          percentage={riskDistribution.mediumRiskPercentage}
          color="yellow"
        />
        <RiskLevelCard
          level="Cao"
          count={riskDistribution.highRisk}
          percentage={riskDistribution.highRiskPercentage}
          color="orange"
        />
        <RiskLevelCard
          level="Nghiêm trọng"
          count={riskDistribution.criticalRisk}
          percentage={riskDistribution.criticalRiskPercentage}
          color="red"
        />
      </div>

      {/* Simple Bar Chart */}
      {total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-8 bg-slate-200 dark:bg-slate-700 rounded overflow-hidden flex">
              {riskDistribution.lowRisk > 0 && (
                <div
                  className="bg-green-500 h-full flex items-center justify-center text-white text-xs font-medium"
                  style={{
                    width: `${riskDistribution.lowRiskPercentage}%`,
                  }}
                >
                  {riskDistribution.lowRiskPercentage > 5 &&
                    `${riskDistribution.lowRiskPercentage.toFixed(1)}%`}
                </div>
              )}
              {riskDistribution.mediumRisk > 0 && (
                <div
                  className="bg-yellow-500 h-full flex items-center justify-center text-white text-xs font-medium"
                  style={{
                    width: `${riskDistribution.mediumRiskPercentage}%`,
                  }}
                >
                  {riskDistribution.mediumRiskPercentage > 5 &&
                    `${riskDistribution.mediumRiskPercentage.toFixed(1)}%`}
                </div>
              )}
              {riskDistribution.highRisk > 0 && (
                <div
                  className="bg-orange-500 h-full flex items-center justify-center text-white text-xs font-medium"
                  style={{
                    width: `${riskDistribution.highRiskPercentage}%`,
                  }}
                >
                  {riskDistribution.highRiskPercentage > 5 &&
                    `${riskDistribution.highRiskPercentage.toFixed(1)}%`}
                </div>
              )}
              {riskDistribution.criticalRisk > 0 && (
                <div
                  className="bg-red-500 h-full flex items-center justify-center text-white text-xs font-medium"
                  style={{
                    width: `${riskDistribution.criticalRiskPercentage}%`,
                  }}
                >
                  {riskDistribution.criticalRiskPercentage > 5 &&
                    `${riskDistribution.criticalRiskPercentage.toFixed(1)}%`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RiskLevelCard({
  level,
  count,
  percentage,
  color,
}: {
  level: string;
  count: number;
  percentage: number;
  color: "green" | "yellow" | "orange" | "red";
}) {
  const colorClasses = {
    green:
      "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    yellow:
      "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    orange:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    red: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <p className="text-sm font-medium mb-2">{level}</p>
      <p className="text-2xl font-bold">{count.toLocaleString("vi-VN")}</p>
      <p className="text-sm mt-1">{percentage.toFixed(1)}%</p>
    </div>
  );
}

function AnalysisStatusCard({ usage }: { usage: UsageStatisticsDto }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
        Trạng thái phân tích
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusCard
          title="Đã hoàn thành"
          count={usage.completedAnalyses}
          total={usage.totalAnalyses}
          color="green"
        />
        <StatusCard
          title="Đang xử lý"
          count={usage.processingAnalyses}
          total={usage.totalAnalyses}
          color="blue"
        />
        <StatusCard
          title="Thất bại"
          count={usage.failedAnalyses}
          total={usage.totalAnalyses}
          color="red"
        />
        <StatusCard
          title="Tổng batch"
          count={usage.completedBatches}
          total={usage.totalBulkBatches}
          color="purple"
          label="Batch hoàn thành"
        />
      </div>
    </div>
  );
}

function StatusCard({
  title,
  count,
  total,
  color,
  label,
}: {
  title: string;
  count: number;
  total: number;
  color: "green" | "blue" | "red" | "purple";
  label?: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const colorClasses = {
    green: "text-green-600 dark:text-green-400",
    blue: "text-blue-600 dark:text-blue-400",
    red: "text-red-600 dark:text-red-400",
    purple: "text-purple-600 dark:text-purple-400",
  };

  return (
    <div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{title}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>
        {count.toLocaleString("vi-VN")}
      </p>
      {label ? (
        <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
          {label}: {total.toLocaleString("vi-VN")}
        </p>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
          {percentage.toFixed(1)}% của {total.toLocaleString("vi-VN")}
        </p>
      )}
    </div>
  );
}
