import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import analyticsService, {
  GlobalDashboardDto,
  RevenueDashboardDto,
  AiPerformanceDashboardDto,
  SystemHealthDashboardDto,
} from "../../services/analyticsService";
import { useAdminAuthStore } from "../../store/adminAuthStore";
import AdminHeader from "../../components/admin/AdminHeader";

type Tab = "overview" | "revenue" | "ai-performance" | "system-health";

function toViHealthStatus(status: string): string {
  switch (status) {
    case "Healthy":
      return "Tốt";
    case "Warning":
    case "Degraded":
      return "Cảnh báo";
    case "Unhealthy":
    case "Down":
      return "Sự cố";
    default:
      return status;
  }
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { isAdminAuthenticated, logoutAdmin } = useAdminAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<GlobalDashboardDto | null>(null);
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
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const loadDashboard = async () => {
    if (!isAdminAuthenticated) {
      toast.error("Vui lòng đăng nhập lại");
      return;
    }

    setLoading(true);
    try {
      const data = await analyticsService.getGlobalDashboard(
        dateRange.start,
        dateRange.end
      );
      setDashboard(data);
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

  if (!dashboard) {
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
      {/* Header */}
      <AdminHeader />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Tổng quan hệ thống
          </h1>
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
              onClick={loadDashboard}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Làm mới
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
          <nav className="flex space-x-8">
            {[
              { id: "overview" as Tab, label: "Tổng quan" },
              { id: "revenue" as Tab, label: "Doanh thu" },
              { id: "ai-performance" as Tab, label: "Hiệu suất AI" },
              { id: "system-health" as Tab, label: "Sức khỏe hệ thống" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && <OverviewTab dashboard={dashboard} />}
        {activeTab === "revenue" && (
          <RevenueTab revenue={dashboard.revenueDashboard} />
        )}
        {activeTab === "ai-performance" && (
          <AiPerformanceTab performance={dashboard.aiPerformanceDashboard} />
        )}
        {activeTab === "system-health" && (
          <SystemHealthTab health={dashboard.systemHealthDashboard} />
        )}
      </main>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ dashboard }: { dashboard: GlobalDashboardDto }) {
  const { usageStatistics } = dashboard.systemAnalytics;

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Tổng người dùng"
          value={usageStatistics.totalUsers}
          subtitle={`${usageStatistics.activeUsers} đang hoạt động`}
          icon="👥"
          color="blue"
        />
        <MetricCard
          title="Tổng doanh thu"
          value={`${dashboard.revenueDashboard.totalRevenue.toLocaleString(
            "vi-VN",
            { minimumFractionDigits: 0 }
          )} ₫`}
          subtitle={`${dashboard.revenueDashboard.totalTransactions} giao dịch`}
          icon="💰"
          color="green"
        />
        <MetricCard
          title="Tỷ lệ thành công AI"
          value={`${dashboard.aiPerformanceDashboard.successRate.toFixed(1)}%`}
          subtitle={`${dashboard.aiPerformanceDashboard.successfulAnalyses}/${dashboard.aiPerformanceDashboard.totalAnalysesProcessed} lượt phân tích`}
          icon="🤖"
          color="purple"
        />
        <MetricCard
          title="Trạng thái hệ thống"
          value={toViHealthStatus(
            dashboard.systemHealthDashboard.systemStatus.overallStatus
          )}
          subtitle={`CPU: ${dashboard.systemHealthDashboard.systemStatus.cpuUsagePercent.toFixed(
            1
          )}%`}
          icon="⚡"
          color={
            dashboard.systemHealthDashboard.systemStatus.overallStatus ===
            "Healthy"
              ? "green"
              : "red"
          }
        />
      </div>

      {/* Usage Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Thống kê sử dụng
        </h2>
        <SimpleLineChart
          data={usageStatistics.dailyUsage}
          dataKey="analysisCount"
          color="blue"
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Xu hướng doanh thu
        </h2>
        <SimpleLineChart
          data={dashboard.revenueDashboard.dailyRevenueList}
          dataKey="revenue"
          color="green"
          formatValue={(v) => `${v.toLocaleString("vi-VN", { minimumFractionDigits: 0 })} ₫`}
        />
      </div>

      {/* AI Performance Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Xu hướng hiệu suất AI
        </h2>
        <SimpleLineChart
          data={dashboard.aiPerformanceDashboard.dailyPerformance}
          dataKey="averageAccuracy"
          color="purple"
          formatValue={(v) => `${v.toFixed(1)}%`}
        />
      </div>
    </div>
  );
}

// Revenue Tab Component
function RevenueTab({ revenue }: { revenue: RevenueDashboardDto }) {
  return (
    <div className="space-y-6">
      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Tổng doanh thu"
          value={`${revenue.totalRevenue.toLocaleString("vi-VN", {
            minimumFractionDigits: 0,
          })} ₫`}
          subtitle="Tất cả thời gian"
          icon="💰"
          color="green"
        />
        <MetricCard
          title="Doanh thu theo tháng"
          value={`${revenue.monthlyRevenue.toLocaleString("vi-VN", {
            minimumFractionDigits: 0,
          })} ₫`}
          subtitle="Tháng này"
          icon="📅"
          color="blue"
        />
        <MetricCard
          title="Doanh thu theo tuần"
          value={`${revenue.weeklyRevenue.toLocaleString("vi-VN", {
            minimumFractionDigits: 0,
          })} ₫`}
          subtitle="Tuần này"
          icon="📊"
          color="purple"
        />
        <MetricCard
          title="Doanh thu theo ngày"
          value={`${revenue.dailyRevenue.toLocaleString("vi-VN", {
            minimumFractionDigits: 0,
          })} ₫`}
          subtitle="Hôm nay"
          icon="📈"
          color="orange"
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Xu hướng doanh thu theo ngày
        </h2>
        <SimpleLineChart
          data={revenue.dailyRevenueList}
          dataKey="revenue"
          color="green"
          formatValue={(v) => `${v.toLocaleString("vi-VN", { minimumFractionDigits: 0 })} ₫`}
        />
      </div>

      {/* Revenue by Source */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Doanh thu theo nguồn
        </h2>
        <div className="space-y-4">
          <RevenueSourceBar
            label="Gói đăng ký (Phòng khám)"
            value={revenue.revenueBySource.clinicSubscriptions}
            total={revenue.totalRevenue}
            color="blue"
          />
          <RevenueSourceBar
            label="Phân tích cá nhân"
            value={revenue.revenueBySource.individualAnalyses}
            total={revenue.totalRevenue}
            color="green"
          />
          <RevenueSourceBar
            label="Gói phân tích hàng loạt"
            value={revenue.revenueBySource.bulkAnalysisPackages}
            total={revenue.totalRevenue}
            color="purple"
          />
          <RevenueSourceBar
            label="Tính năng nâng cao"
            value={revenue.revenueBySource.premiumFeatures}
            total={revenue.totalRevenue}
            color="orange"
          />
        </div>
      </div>

      {/* Transaction Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Tổng giao dịch
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {revenue.totalTransactions.toLocaleString("vi-VN")}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Giá trị giao dịch trung bình
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {revenue.averageTransactionValue.toLocaleString("vi-VN", { minimumFractionDigits: 0 })} ₫
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Số gói đang hoạt động
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {revenue.activeSubscriptions}
          </p>
        </div>
      </div>
    </div>
  );
}

// AI Performance Tab Component
function AiPerformanceTab({
  performance,
}: {
  performance: AiPerformanceDashboardDto;
}) {
  return (
    <div className="space-y-6">
      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Độ chính xác trung bình"
          value={`${performance.averageAccuracy.toFixed(1)}%`}
          subtitle="Tổng quan"
          icon="🎯"
          color="green"
        />
        <MetricCard
          title="Tỷ lệ thành công"
          value={`${performance.successRate.toFixed(1)}%`}
          subtitle={`${performance.successfulAnalyses}/${performance.totalAnalysesProcessed}`}
          icon="✅"
          color="blue"
        />
        <MetricCard
          title="Độ tin cậy TB"
          value={`${performance.averageConfidenceScore.toFixed(1)}%`}
          subtitle="Độ tin cậy của AI"
          icon="🤖"
          color="purple"
        />
        <MetricCard
          title="Thời gian xử lý TB"
          value={`${performance.averageProcessingTimeSeconds.toFixed(1)}s`}
          subtitle="Mỗi lượt phân tích"
          icon="⏱️"
          color="orange"
        />
      </div>

      {/* Performance Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Xu hướng hiệu suất theo ngày
        </h2>
        <SimpleLineChart
          data={performance.dailyPerformance}
          dataKey="averageAccuracy"
          color="purple"
          formatValue={(v) => `${v.toFixed(1)}%`}
        />
      </div>

      {/* Model Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            Chỉ số mô hình
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-600 dark:text-slate-400">
                  Mô hình Fundus
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {performance.modelMetrics.fundusModelAccuracy.toFixed(1)}%
                </span>
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-500">
                {performance.modelMetrics.fundusAnalysesCount} lượt phân tích
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-600 dark:text-slate-400">
                  Mô hình OCT
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {performance.modelMetrics.octModelAccuracy.toFixed(1)}%
                </span>
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-500">
                {performance.modelMetrics.octAnalysesCount} lượt phân tích
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            Độ chính xác theo mức rủi ro
          </h2>
          <div className="space-y-3">
            <AccuracyBar
              label="Rủi ro thấp"
              accuracy={performance.accuracyByRiskLevel.lowRiskAccuracy}
              count={performance.accuracyByRiskLevel.lowRiskCount}
              color="green"
            />
            <AccuracyBar
              label="Rủi ro trung bình"
              accuracy={performance.accuracyByRiskLevel.mediumRiskAccuracy}
              count={performance.accuracyByRiskLevel.mediumRiskCount}
              color="yellow"
            />
            <AccuracyBar
              label="Rủi ro cao"
              accuracy={performance.accuracyByRiskLevel.highRiskAccuracy}
              count={performance.accuracyByRiskLevel.highRiskCount}
              color="orange"
            />
            <AccuracyBar
              label="Rủi ro nghiêm trọng"
              accuracy={performance.accuracyByRiskLevel.criticalRiskAccuracy}
              count={performance.accuracyByRiskLevel.criticalRiskCount}
              color="red"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// System Health Tab Component
function SystemHealthTab({ health }: { health: SystemHealthDashboardDto }) {
  return (
    <div className="space-y-6">
      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <HealthMetricCard
          title="CPU"
          value={`${health.systemStatus.cpuUsagePercent.toFixed(1)}%`}
          status={
            health.systemStatus.cpuUsagePercent > 80 ? "warning" : "healthy"
          }
          icon="💻"
        />
        <HealthMetricCard
          title="Bộ nhớ"
          value={`${health.systemStatus.memoryUsagePercent.toFixed(1)}%`}
          status={
            health.systemStatus.memoryUsagePercent > 85 ? "warning" : "healthy"
          }
          icon="🧠"
        />
        <HealthMetricCard
          title="Ổ đĩa"
          value={`${health.systemStatus.diskUsagePercent.toFixed(1)}%`}
          status={
            health.systemStatus.diskUsagePercent > 90 ? "warning" : "healthy"
          }
          icon="💾"
        />
        <HealthMetricCard
          title="Độ trễ mạng"
          value={`${health.systemStatus.networkLatencyMs.toFixed(1)}ms`}
          status={
            health.systemStatus.networkLatencyMs > 100 ? "warning" : "healthy"
          }
          icon="🌐"
        />
      </div>

      {/* Database Health */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Tình trạng cơ sở dữ liệu
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Trạng thái</p>
            <p
              className={`text-lg font-semibold mt-1 ${
                health.databaseHealth.status === "Healthy"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {toViHealthStatus(health.databaseHealth.status)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Thời gian phản hồi
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
              {health.databaseHealth.responseTimeMs.toFixed(1)}ms
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Kết nối đang hoạt động
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
              {health.databaseHealth.activeConnections}/
              {health.databaseHealth.maxConnections}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tổng truy vấn
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
              {health.databaseHealth.totalQueries.toLocaleString("vi-VN")}
            </p>
          </div>
        </div>
      </div>

      {/* API Health */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Tình trạng API
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Trạng thái</p>
            <p
              className={`text-lg font-semibold mt-1 ${
                health.apiHealth.status === "Healthy"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {toViHealthStatus(health.apiHealth.status)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tổng yêu cầu
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
              {health.apiHealth.totalRequests.toLocaleString("vi-VN")}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tỷ lệ thành công
            </p>
            <p className="text-lg font-semibold text-green-600 mt-1">
              {health.apiHealth.totalRequests > 0
                ? (
                    (health.apiHealth.successfulRequests /
                      health.apiHealth.totalRequests) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Thời gian phản hồi TB
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
              {health.apiHealth.averageResponseTimeMs.toFixed(1)}ms
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Yêu cầu/giây
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
              {health.apiHealth.requestsPerSecond.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* AI Service Health */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Tình trạng dịch vụ AI
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Trạng thái</p>
            <p
              className={`text-lg font-semibold mt-1 ${
                health.aiServiceHealth.status === "Healthy"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {toViHealthStatus(health.aiServiceHealth.status)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Độ dài hàng đợi
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
              {health.aiServiceHealth.queueLength}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Worker đang chạy
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
              {health.aiServiceHealth.activeWorkers}/
              {health.aiServiceHealth.maxWorkers}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Thời gian phản hồi TB
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
              {health.aiServiceHealth.averageResponseTimeMs.toFixed(0)}ms
            </p>
          </div>
        </div>
      </div>

      {/* Uptime */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Thời gian hoạt động hệ thống
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tỷ lệ uptime
            </p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {health.uptime.uptimePercentage.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tổng thời gian chạy
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white mt-2">
              {health.uptime.totalUptime || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Sự cố
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white mt-2">
              {health.uptime.incidentsCount}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Sự cố gần nhất
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mt-2">
              {new Date(health.uptime.lastIncident).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  color: "blue" | "green" | "purple" | "orange" | "red";
}) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    green: "bg-green-500/10 text-green-600 dark:text-green-400",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {title}
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
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

function HealthMetricCard({
  title,
  value,
  status,
  icon,
}: {
  title: string;
  value: string;
  status: "healthy" | "warning" | "critical";
  icon: string;
}) {
  const statusColors = {
    healthy: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    critical: "text-red-600 dark:text-red-400",
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {title}
          </p>
          <p className={`text-2xl font-bold mt-2 ${statusColors[status]}`}>
            {value}
          </p>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
}

function SimpleLineChart({
  data,
  dataKey,
  color,
  formatValue,
}: {
  data: any[];
  dataKey: string;
  color: string;
  formatValue?: (v: number) => string;
}) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
        Không có dữ liệu
      </div>
    );
  }

  const height = 200;
  const padding = 20;

  const colorClasses = {
    blue: "stroke-blue-500 fill-blue-500/20",
    green: "stroke-green-500 fill-green-500/20",
    purple: "stroke-purple-500 fill-purple-500/20",
    orange: "stroke-orange-500 fill-orange-500/20",
  };

  // Validate and filter data to ensure all values are valid numbers
  const validData = data.filter(
    (d) => d != null && typeof d[dataKey] === "number" && !isNaN(d[dataKey])
  );

  if (validData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
        Không có dữ liệu hợp lệ
      </div>
    );
  }

  // Recalculate min/max with valid data
  const validMaxValue = Math.max(...validData.map((d) => d[dataKey] || 0));
  const validMinValue = Math.min(...validData.map((d) => d[dataKey] || 0));
  const validRange = validMaxValue - validMinValue || 1;

  const points = validData.map((d, i) => {
    const x =
      (i / Math.max(validData.length - 1, 1)) * (100 - padding * 2) + padding;
    const y =
      height -
      ((d[dataKey] - validMinValue) / validRange) * (height - padding * 2) -
      padding;
    // Ensure x and y are valid numbers
    const xNum = isNaN(x) ? padding : Math.max(padding, Math.min(100 - padding, x));
    const yNum = isNaN(y) ? height - padding : Math.max(padding, Math.min(height - padding, y));
    return `${xNum.toFixed(2)},${yNum.toFixed(2)}`;
  });

  // polyline/polygon need space-separated coordinates, not path commands
  const polylinePoints = points.join(" ");
  
  // For polygon, create closed shape: start point -> line points -> end point -> bottom
  const polygonPoints = validData.length > 0
    ? `${points[0]},${height} ${polylinePoints} ${points[points.length - 1]},${height}`
    : "";

  return (
    <div className="relative" style={{ height: `${height + 60}px` }}>
      <svg
        viewBox={`0 0 100 ${height + 60}`}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        {polylinePoints && (
          <polyline
            points={polylinePoints}
            fill="none"
            strokeWidth="2"
            className={colorClasses[color as keyof typeof colorClasses]}
          />
        )}
        {polygonPoints && validData.length > 1 && (
          <polygon
            points={polygonPoints}
            className={colorClasses[color as keyof typeof colorClasses]}
            opacity="0.1"
          />
        )}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-slate-500 dark:text-slate-400 px-2">
        {validData.length > 0 && validData[0]?.date && (
          <>
            <span>
              {new Date(validData[0].date).toLocaleDateString("vi-VN", {
                month: "short",
                day: "numeric",
              })}
            </span>
            <span>
              {validData[validData.length - 1]?.date &&
                new Date(validData[validData.length - 1].date).toLocaleDateString(
                  "vi-VN",
                  {
                    month: "short",
                    day: "numeric",
                  }
                )}
            </span>
          </>
        )}
      </div>
      <div className="absolute top-0 right-0 text-sm text-slate-600 dark:text-slate-400">
        Cao nhất:{" "}
        {formatValue
          ? formatValue(validMaxValue)
          : validMaxValue.toFixed(0)}
      </div>
    </div>
  );
}

function RevenueSourceBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
  };

  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-slate-600 dark:text-slate-400">{label}</span>
        <span className="font-semibold text-slate-900 dark:text-white">
          {value.toLocaleString("vi-VN", { minimumFractionDigits: 0 })} ₫ (
          {percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all ${
            colorClasses[color as keyof typeof colorClasses]
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function AccuracyBar({
  label,
  accuracy,
  count,
  color,
}: {
  label: string;
  accuracy: number;
  count: number;
  color: string;
}) {
  const colorClasses = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
  };

  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-slate-600 dark:text-slate-400">{label}</span>
        <span className="font-semibold text-slate-900 dark:text-white">
          {accuracy.toFixed(1)}% ({count} lượt phân tích)
        </span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            colorClasses[color as keyof typeof colorClasses]
          }`}
          style={{ width: `${accuracy}%` }}
        />
      </div>
    </div>
  );
}
