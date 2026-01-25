import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PatientHeader from "../../components/patient/PatientHeader";
import analysisService, { AnalysisResult } from "../../services/analysisService";
import toast from "react-hot-toast";

const PatientReportsPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRisk, setFilterRisk] = useState<string>("all"); // "all", "Low", "Medium", "High", "Critical"
  const [sortBy, setSortBy] = useState<string>("date-desc"); // "date-desc", "date-asc", "risk-desc"

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await analysisService.getUserAnalysisResults();
      // Filter only completed analyses
      const completedReports = data.filter(
        (r) => r.analysisStatus === "Completed"
      );
      setReports(completedReports);
    } catch (error: any) {
      console.error("Error loading reports:", error);
      toast.error("Lỗi khi tải lịch sử báo cáo");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case "Low":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
      case "Medium":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
      case "High":
        return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400";
      case "Critical":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400";
    }
  };

  const getRiskLabel = (risk?: string) => {
    switch (risk) {
      case "Low":
        return "Rủi ro thấp";
      case "Medium":
        return "Rủi ro trung bình";
      case "High":
        return "Rủi ro cao";
      case "Critical":
        return "Rủi ro nghiêm trọng";
      default:
        return "Chưa xác định";
    }
  };

  const getRiskIcon = (risk?: string) => {
    switch (risk) {
      case "Low":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case "Medium":
      case "High":
      case "Critical":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredAndSortedReports = reports
    .filter((report) => {
      if (filterRisk === "all") return true;
      return report.overallRiskLevel === filterRisk;
    })
    .sort((a, b) => {
      if (sortBy === "date-desc") {
        const dateA = a.analysisStartedAt ? new Date(a.analysisStartedAt).getTime() : 0;
        const dateB = b.analysisStartedAt ? new Date(b.analysisStartedAt).getTime() : 0;
        return dateB - dateA;
      } else if (sortBy === "date-asc") {
        const dateA = a.analysisStartedAt ? new Date(a.analysisStartedAt).getTime() : 0;
        const dateB = b.analysisStartedAt ? new Date(b.analysisStartedAt).getTime() : 0;
        return dateA - dateB;
      } else if (sortBy === "risk-desc") {
        const riskOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        const riskA = riskOrder[a.overallRiskLevel as keyof typeof riskOrder] || 0;
        const riskB = riskOrder[b.overallRiskLevel as keyof typeof riskOrder] || 0;
        return riskB - riskA;
      }
      return 0;
    });

  if (loading) {
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PatientHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Lịch Sử Báo Cáo
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Xem lại tất cả các kết quả phân tích AI của bạn
          </p>
        </div>

        {/* Filters and Sort */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Risk Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Lọc theo mức độ rủi ro
              </label>
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">Tất cả</option>
                <option value="Low">Rủi ro thấp</option>
                <option value="Medium">Rủi ro trung bình</option>
                <option value="High">Rủi ro cao</option>
                <option value="Critical">Rủi ro nghiêm trọng</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Sắp xếp theo
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="date-desc">Mới nhất</option>
                <option value="date-asc">Cũ nhất</option>
                <option value="risk-desc">Rủi ro cao nhất</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reports List */}
        {filteredAndSortedReports.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Chưa có báo cáo nào
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {filterRisk !== "all"
                ? "Không tìm thấy báo cáo với mức độ rủi ro đã chọn."
                : "Bạn chưa có kết quả phân tích nào. Hãy tải ảnh lên để bắt đầu."}
            </p>
            {filterRisk === "all" && (
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Tải ảnh lên
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedReports.map((report) => (
              <div
                key={report.id}
                className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/analysis/${report.id}`)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Risk Icon */}
                    <div
                      className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${getRiskColor(
                        report.overallRiskLevel
                      )}`}
                    >
                      {getRiskIcon(report.overallRiskLevel)}
                    </div>

                    {/* Report Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          Phân tích võng mạc
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getRiskColor(
                            report.overallRiskLevel
                          )}`}
                        >
                          {getRiskLabel(report.overallRiskLevel)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        {formatDate(report.analysisStartedAt)}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        {report.riskScore !== undefined && (
                          <span className="text-slate-600 dark:text-slate-400">
                            Điểm tổng: <span className="font-semibold text-slate-900 dark:text-white">{report.riskScore}/100</span>
                          </span>
                        )}
                        {report.hypertensionRisk && (
                          <span className="text-slate-600 dark:text-slate-400">
                            Tim mạch: <span className="font-semibold text-slate-900 dark:text-white">{report.hypertensionRisk}</span>
                          </span>
                        )}
                        {report.diabetesRisk && (
                          <span className="text-slate-600 dark:text-slate-400">
                            Tiểu đường: <span className="font-semibold text-slate-900 dark:text-white">{report.diabetesRisk}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/analysis/${report.id}`);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        {reports.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Tổng số báo cáo</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{reports.length}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Rủi ro thấp</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {reports.filter((r) => r.overallRiskLevel === "Low").length}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Rủi ro trung bình</div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {reports.filter((r) => r.overallRiskLevel === "Medium").length}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Rủi ro cao</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {reports.filter((r) => r.overallRiskLevel === "High" || r.overallRiskLevel === "Critical").length}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PatientReportsPage;
