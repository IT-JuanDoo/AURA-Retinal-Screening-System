import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DoctorHeader from "../../components/doctor/DoctorHeader";
import doctorService, {
  DoctorAnalysisItem,
} from "../../services/doctorService";
import AnalysisResultDisplay from "../../components/analysis/AnalysisResultDisplay";
import { AnalysisResult } from "../../services/analysisService";
import toast from "react-hot-toast";

const DoctorAnalysisPage = () => {
  const navigate = useNavigate();
  const { analysisId } = useParams<{ analysisId?: string }>();
  const [analyses, setAnalyses] = useState<DoctorAnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [analysisDetail, setAnalysisDetail] = useState<AnalysisResult | null>(
    null,
  );
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Always load list for sidebar/stats
    loadAnalyses();
  }, []);

  useEffect(() => {
    if (analysisId) {
      loadAnalysisDetail(analysisId);
    } else {
      setAnalysisDetail(null);
    }
  }, [analysisId]);

  const loadAnalyses = async () => {
    try {
      setLoading(true);
      const response = await doctorService.getAnalyses();
      setAnalyses(response);
    } catch (error: any) {
      console.error("Error loading analyses:", error);
      // Mock data for demo
      setAnalyses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAnalysis = async (
    analysisId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();

    // Prevent double-click
    if (confirmingIds.has(analysisId)) {
      return;
    }

    try {
      setConfirmingIds((prev) => new Set(prev).add(analysisId));
      await doctorService.validateAnalysis(analysisId, {
        isAccurate: true, // Xác nhận là đúng
      });
      toast.success("Xác nhận phân tích thành công");
      // Reload danh sách để cập nhật UI
      await loadAnalyses();
    } catch (error: any) {
      console.error("Error confirming analysis:", error);
      toast.error(
        error?.response?.data?.message || "Xác nhận phân tích thất bại",
      );
    } finally {
      setConfirmingIds((prev) => {
        const next = new Set(prev);
        next.delete(analysisId);
        return next;
      });
    }
  };

  const loadAnalysisDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      const result = await doctorService.getAnalysisById(id);
      setAnalysisDetail(result as AnalysisResult);
    } catch (error: any) {
      console.error("Error loading analysis detail:", error);
      toast.error(
        error?.response?.data?.message || "Lỗi khi tải chi tiết phân tích",
      );
      setAnalysisDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRiskBadge = (risk?: string) => {
    switch (risk?.toLowerCase()) {
      case "critical":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            Nghiêm trọng
          </span>
        );
      case "high":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
            Cao
          </span>
        );
      case "medium":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            Trung bình
          </span>
        );
      case "low":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            Thấp
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            Chưa xác định
          </span>
        );
    }
  };

  const getStatusBadge = (status: string, isValidated: boolean) => {
    if (status.toLowerCase() === "completed" && isValidated) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          Đã xác nhận
        </span>
      );
    }
    switch (status.toLowerCase()) {
      case "completed":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            Hoàn thành
          </span>
        );
      case "processing":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            Đang xử lý
          </span>
        );
      case "pending":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            Đang chờ xử lý
          </span>
        );
      case "failed":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            Thất bại
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const filteredAnalyses = analyses.filter((a) => {
    // Filter by status
    if (statusFilter !== "all") {
      if (statusFilter === "pending") {
        // Chờ xác nhận: status = completed và chưa được validate
        if (
          !(a.analysisStatus.toLowerCase() === "completed" && !a.isValidated)
        ) {
          return false;
        }
      } else if (statusFilter === "validated") {
        // Đã xác nhận: đã validate và không ở trạng thái Đang xử lý / Đang chờ xử lý
        if (!a.isValidated) return false;
        const status = a.analysisStatus?.toLowerCase();
        if (status === "processing" || status === "pending") return false;
      } else if (statusFilter === "processing") {
        // Đang xử lý: status = processing hoặc pending
        if (
          a.analysisStatus.toLowerCase() !== "processing" &&
          a.analysisStatus.toLowerCase() !== "pending"
        ) {
          return false;
        }
      } else if (statusFilter === "failed") {
        // Thất bại: status = failed
        if (a.analysisStatus.toLowerCase() !== "failed") {
          return false;
        }
      }
    }

    // Filter by risk level
    if (
      riskFilter !== "all" &&
      a.overallRiskLevel?.toLowerCase() !== riskFilter
    ) {
      return false;
    }

    return true;
  });

  const stats = {
    total: analyses.length,
    pending: analyses.filter(
      (a) => a.analysisStatus.toLowerCase() === "completed" && !a.isValidated,
    ).length,
    validated: analyses.filter((a) => a.isValidated).length,
    highRisk: analyses.filter(
      (a) =>
        a.overallRiskLevel?.toLowerCase() === "high" ||
        a.overallRiskLevel?.toLowerCase() === "critical",
    ).length,
  };

  // Detail view when analysisId is present
  if (analysisId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <DoctorHeader />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate("/doctor/analyses")}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 mb-4 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Quay lại danh sách phân tích
          </button>

          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
            Chi tiết phân tích AI
          </h1>

          {loadingDetail || !analysisDetail ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 flex justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-slate-600 dark:text-slate-400">
                  Đang tải chi tiết phân tích...
                </p>
              </div>
            </div>
          ) : (
            <AnalysisResultDisplay result={analysisDetail} />
          )}
        </main>
      </div>
    );
  }

  // List view (no specific analysis selected)
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DoctorHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Quản lý phân tích
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Xem và xác nhận kết quả phân tích của bệnh nhân
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tổng phân tích
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.total}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Chờ xác nhận
            </p>
            <p className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Đã xác nhận
            </p>
            <p className="text-2xl font-bold text-blue-600">
              {stats.validated}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Rủi ro cao
            </p>
            <p className="text-2xl font-bold text-red-600">{stats.highRisk}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Trạng thái
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="all">Tất cả</option>
                <option value="pending">Chờ xác nhận</option>
                <option value="validated">Đã xác nhận</option>
                <option value="processing">Đang xử lý</option>
                <option value="failed">Thất bại</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mức độ rủi ro
              </label>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="all">Tất cả</option>
                <option value="critical">Nghiêm trọng</option>
                <option value="high">Cao</option>
                <option value="medium">Trung bình</option>
                <option value="low">Thấp</option>
              </select>
            </div>
          </div>
        </div>

        {/* Analyses List */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">
                Đang tải...
              </p>
            </div>
          ) : filteredAnalyses.length === 0 ? (
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
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                Không có phân tích nào
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Chưa có kết quả phân tích từ bệnh nhân của bạn
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredAnalyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/doctor/analyses/${analysis.id}`)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        analysis.overallRiskLevel?.toLowerCase() === "high" ||
                        analysis.overallRiskLevel?.toLowerCase() === "critical"
                          ? "bg-red-100 dark:bg-red-900/30"
                          : analysis.overallRiskLevel?.toLowerCase() ===
                              "medium"
                            ? "bg-yellow-100 dark:bg-yellow-900/30"
                            : "bg-green-100 dark:bg-green-900/30"
                      }`}
                    >
                      <svg
                        className={`w-6 h-6 ${
                          analysis.overallRiskLevel?.toLowerCase() === "high" ||
                          analysis.overallRiskLevel?.toLowerCase() ===
                            "critical"
                            ? "text-red-600 dark:text-red-400"
                            : analysis.overallRiskLevel?.toLowerCase() ===
                                "medium"
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-green-600 dark:text-green-400"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {analysis.patientName || "Bệnh nhân"}
                        </h3>
                        {getStatusBadge(
                          analysis.analysisStatus,
                          analysis.isValidated,
                        )}
                        {getRiskBadge(analysis.overallRiskLevel)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <span>ID: {analysis.id.slice(0, 8)}...</span>
                        <span>•</span>
                        <span>
                          {formatDate(
                            analysis.analysisCompletedAt || analysis.createdAt,
                          )}
                        </span>
                        {analysis.aiConfidenceScore && (
                          <>
                            <span>•</span>
                            <span>
                              Độ tin cậy AI:{" "}
                              {Number(analysis.aiConfidenceScore).toFixed(2)}%
                            </span>
                          </>
                        )}
                      </div>
                      {analysis.diabeticRetinopathyDetected && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                            </svg>
                            Phát hiện dấu hiệu bệnh võng mạc đái tháo đường
                          </span>
                        </div>
                      )}
                    </div>

                    {analysis.isValidated ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/doctor/analyses/${analysis.id}`);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Xem chi tiết
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleConfirmAnalysis(analysis.id, e)}
                        disabled={
                          analysis.analysisStatus.toLowerCase() !==
                            "completed" || confirmingIds.has(analysis.id)
                        }
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {confirmingIds.has(analysis.id) ? (
                          <>
                            <svg
                              className="animate-spin h-4 w-4"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Đang xác nhận...
                          </>
                        ) : (
                          "Xác nhận"
                        )}
                      </button>
                    )}
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

export default DoctorAnalysisPage;
