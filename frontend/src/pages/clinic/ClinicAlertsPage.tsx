import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import alertService, {
  HighRiskAlert,
  ClinicAlertSummary,
  AbnormalTrend,
} from "../../services/alertService";
import toast from "react-hot-toast";

const ClinicAlertsPage = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<ClinicAlertSummary | null>(null);
  const [alerts, setAlerts] = useState<HighRiskAlert[]>([]);
  const [abnormalTrends, setAbnormalTrends] = useState<AbnormalTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"alerts" | "trends">("alerts");
  const [unacknowledgedOnly, setUnacknowledgedOnly] = useState(false);

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [unacknowledgedOnly]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryData, alertsData, trendsData] = await Promise.all([
        alertService.getClinicAlertSummary(),
        alertService.getClinicAlerts(unacknowledgedOnly, 50),
        alertService.detectAbnormalTrends(30),
      ]);
      setSummary(summaryData);
      setAlerts(alertsData);
      setAbnormalTrends(trendsData);
    } catch (error: any) {
      console.error("Error loading alerts:", error);
      toast.error(error?.response?.data?.message || "Lỗi khi tải dữ liệu cảnh báo");
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await alertService.acknowledgeAlert(alertId);
      toast.success("Đã xác nhận cảnh báo");
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Lỗi khi xác nhận cảnh báo");
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "Critical":
        return "bg-red-600 text-white";
      case "High":
        return "bg-orange-500 text-white";
      case "Medium":
        return "bg-yellow-500 text-white";
      default:
        return "bg-green-500 text-white";
    }
  };

  const getTrendTypeColor = (trendType: string) => {
    switch (trendType) {
      case "RapidDeterioration":
        return "bg-red-100 text-red-800 border-red-300";
      case "SuddenSpike":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "ConsistentHigh":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN");
  };

  if (loading && !summary) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Hệ Thống Cảnh Báo Bệnh Nhân Nguy Cơ Cao (FR-29)
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Theo dõi và phân tích xu hướng rủi ro cho bệnh nhân
          </p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Bệnh nhân nguy cơ cao
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {summary.totalHighRiskPatients}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 dark:text-orange-400 text-xl">⚠️</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Bệnh nhân nguy cơ nghiêm trọng
                  </p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {summary.totalCriticalRiskPatients}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 text-xl">🚨</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Cảnh báo chưa xác nhận
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {summary.unacknowledgedAlerts}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 text-xl">📬</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Cảnh báo cuối cùng
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                    {summary.lastAlertDate
                      ? formatDate(summary.lastAlertDate)
                      : "Chưa có"}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-xl">📅</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
          <div className="border-b border-slate-200 dark:border-slate-800">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("alerts")}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === "alerts"
                    ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Cảnh Báo ({alerts.length})
              </button>
              <button
                onClick={() => setActiveTab("trends")}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === "trends"
                    ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Xu Hướng Bất Thường ({abnormalTrends.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Alerts Tab */}
        {activeTab === "alerts" && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Danh Sách Cảnh Báo
              </h2>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unacknowledgedOnly}
                  onChange={(e) => setUnacknowledgedOnly(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Chỉ hiển thị chưa xác nhận
                </span>
              </label>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {alerts.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-500 dark:text-slate-400">
                    Không có cảnh báo nào
                  </p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      !alert.isAcknowledged ? "bg-red-50 dark:bg-red-900/10" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getRiskColor(
                              alert.overallRiskLevel
                            )}`}
                          >
                            {alert.overallRiskLevel === "Critical"
                              ? "Nghiêm Trọng"
                              : "Nguy Cơ Cao"}
                          </span>
                          {!alert.isAcknowledged && (
                            <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs font-semibold rounded">
                              Chưa xác nhận
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                          {alert.patientName || "Bệnh nhân không xác định"}
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                          {alert.riskScore && (
                            <div>
                              <p className="text-slate-600 dark:text-slate-400">
                                Điểm rủi ro
                              </p>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {alert.riskScore.toFixed(1)}/100
                              </p>
                            </div>
                          )}
                          {alert.hypertensionRisk === "High" && (
                            <div>
                              <p className="text-slate-600 dark:text-slate-400">
                                Tăng huyết áp
                              </p>
                              <p className="font-semibold text-orange-600 dark:text-orange-400">
                                Nguy cơ cao
                              </p>
                            </div>
                          )}
                          {alert.diabetesRisk === "High" && (
                            <div>
                              <p className="text-slate-600 dark:text-slate-400">
                                Tiểu đường
                              </p>
                              <p className="font-semibold text-orange-600 dark:text-orange-400">
                                Nguy cơ cao
                              </p>
                            </div>
                          )}
                          {alert.strokeRisk === "High" && (
                            <div>
                              <p className="text-slate-600 dark:text-slate-400">
                                Đột quỵ
                              </p>
                              <p className="font-semibold text-orange-600 dark:text-orange-400">
                                Nguy cơ cao
                              </p>
                            </div>
                          )}
                        </div>

                        {alert.healthWarnings && (
                          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                              {alert.healthWarnings}
                            </p>
                          </div>
                        )}

                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                          Phát hiện lúc: {formatDate(alert.detectedAt)}
                        </p>
                      </div>

                      <div className="ml-4 flex flex-col space-y-2">
                        {!alert.isAcknowledged && (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            Xác nhận
                          </button>
                        )}
                        <button
                          onClick={() =>
                            navigate(`/analysis/${alert.analysisResultId}`)
                          }
                          className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Abnormal Trends Tab */}
        {activeTab === "trends" && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Xu Hướng Bất Thường
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Phát hiện các xu hướng rủi ro bất thường trong 30 ngày qua
              </p>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {abnormalTrends.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-500 dark:text-slate-400">
                    Không phát hiện xu hướng bất thường nào
                  </p>
                </div>
              ) : (
                abnormalTrends.map((trend) => (
                  <div
                    key={`${trend.patientUserId}-${trend.detectedAt}`}
                    className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${getTrendTypeColor(
                              trend.trendType
                            )}`}
                          >
                            {trend.trendType === "RapidDeterioration"
                              ? "Suy Giảm Nhanh"
                              : trend.trendType === "SuddenSpike"
                              ? "Tăng Đột Ngột"
                              : "Nguy Cơ Cao Liên Tục"}
                          </span>
                        </div>

                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                          {trend.patientName || "Bệnh nhân không xác định"}
                        </h3>

                        <p className="text-slate-700 dark:text-slate-300 mb-4">
                          {trend.description}
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-600 dark:text-slate-400">
                              Mức rủi ro trước
                            </p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {trend.previousRiskLevel || "N/A"}
                            </p>
                            {trend.previousRiskScore && (
                              <p className="text-xs text-slate-500">
                                {trend.previousRiskScore.toFixed(1)} điểm
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-slate-600 dark:text-slate-400">
                              Mức rủi ro hiện tại
                            </p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {trend.currentRiskLevel || "N/A"}
                            </p>
                            {trend.currentRiskScore && (
                              <p className="text-xs text-slate-500">
                                {trend.currentRiskScore.toFixed(1)} điểm
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-slate-600 dark:text-slate-400">
                              Khoảng thời gian
                            </p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {trend.daysBetweenAnalyses} ngày
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-600 dark:text-slate-400">
                              Phát hiện lúc
                            </p>
                            <p className="font-semibold text-slate-900 dark:text-white text-xs">
                              {formatDate(trend.detectedAt)}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            navigate(`/clinic/patient-trend/${trend.patientUserId}`)
                          }
                          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Xem chi tiết xu hướng
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicAlertsPage;
