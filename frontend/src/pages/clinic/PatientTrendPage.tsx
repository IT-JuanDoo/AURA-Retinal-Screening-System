import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import alertService, { PatientRiskTrend } from "../../services/alertService";
import toast from "react-hot-toast";

const PatientTrendPage = () => {
  const { patientUserId } = useParams<{ patientUserId: string }>();
  const navigate = useNavigate();
  const [trend, setTrend] = useState<PatientRiskTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);

  useEffect(() => {
    if (patientUserId) {
      loadTrend();
    }
  }, [patientUserId, days]);

  const loadTrend = async () => {
    if (!patientUserId) return;
    try {
      setLoading(true);
      const data = await alertService.getPatientRiskTrend(patientUserId, days);
      setTrend(data);
    } catch (error: any) {
      console.error("Error loading trend:", error);
      toast.error(error?.response?.data?.message || "Lỗi khi tải xu hướng rủi ro");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "Critical":
        return "#dc2626"; // red-600
      case "High":
        return "#f97316"; // orange-500
      case "Medium":
        return "#eab308"; // yellow-500
      default:
        return "#22c55e"; // green-500
    }
  };

  const getTrendDirectionColor = (direction: string) => {
    switch (direction) {
      case "Worsening":
        return "text-red-600 dark:text-red-400";
      case "Improving":
        return "text-green-600 dark:text-green-400";
      default:
        return "text-slate-600 dark:text-slate-400";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  };

  // Simple line chart component
  const TrendChart = ({ trend }: { trend: PatientRiskTrend }) => {
    if (trend.trendPoints.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-slate-500">
          Không có dữ liệu để hiển thị
        </div>
      );
    }

    const points = trend.trendPoints;
    const maxScore = Math.max(
      100,
      ...points.map((p) => p.riskScore || 0).filter((s) => s > 0)
    );
    const minScore = Math.min(
      0,
      ...points.map((p) => p.riskScore || 0).filter((s) => s > 0)
    );
    const range = maxScore - minScore || 100;
    const chartHeight = 300;
    const chartWidth = 800;
    const padding = 40;

    const getX = (index: number) => {
      return padding + (index * (chartWidth - 2 * padding)) / (points.length - 1 || 1);
    };

    const getY = (score: number) => {
      return padding + chartHeight - ((score - minScore) / range) * (chartHeight - 2 * padding);
    };

    return (
      <div className="overflow-x-auto">
        <svg
          width={chartWidth}
          height={chartHeight + 60}
          className="border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((score) => {
            const y = getY(score);
            return (
              <g key={score}>
                <line
                  x1={padding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-slate-500 dark:fill-slate-400"
                >
                  {score}
                </text>
              </g>
            );
          })}

          {/* Risk level zones */}
          <rect
            x={padding}
            y={getY(75)}
            width={chartWidth - 2 * padding}
            height={getY(50) - getY(75)}
            fill="#fef2f2"
            opacity={0.3}
          />
          <rect
            x={padding}
            y={getY(50)}
            width={chartWidth - 2 * padding}
            height={getY(25) - getY(50)}
            fill="#fff7ed"
            opacity={0.3}
          />

          {/* Line */}
          {points.length > 1 && (
            <polyline
              points={points
                .map((p, i) => {
                  const score = p.riskScore || 0;
                  return `${getX(i)},${getY(score)}`;
                })
                .join(" ")}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
            />
          )}

          {/* Points */}
          {points.map((point, index) => {
            const score = point.riskScore || 0;
            const x = getX(index);
            const y = getY(score);
            const color = getRiskColor(point.riskLevel);

            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r="6"
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer hover:r-8 transition-all"
                />
                <title>
                  {formatDate(point.analysisDate)}: {point.riskLevel} ({score.toFixed(1)})
                </title>
              </g>
            );
          })}

          {/* X-axis labels */}
          {points.map((point, index) => {
            if (index % Math.ceil(points.length / 5) !== 0 && index !== points.length - 1) {
              return null;
            }
            const x = getX(index);
            return (
              <g key={`label-${index}`}>
                <text
                  x={x}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  className="text-xs fill-slate-600 dark:fill-slate-400"
                >
                  {formatDate(point.analysisDate)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

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

  if (!trend) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400">
            Không tìm thấy dữ liệu xu hướng
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            ← Quay lại
          </button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Phân Tích Xu Hướng Rủi Ro
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Bệnh nhân: {trend.patientName || "Không xác định"}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">Mức rủi ro hiện tại</p>
            <p
              className={`text-2xl font-bold mt-1`}
              style={{ color: getRiskColor(trend.currentRiskLevel) }}
            >
              {trend.currentRiskLevel}
            </p>
            {trend.currentRiskScore && (
              <p className="text-sm text-slate-500 mt-1">
                {trend.currentRiskScore.toFixed(1)} điểm
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">Xu hướng</p>
            <p className={`text-2xl font-bold mt-1 ${getTrendDirectionColor(trend.trendDirection)}`}>
              {trend.trendDirection === "Worsening"
                ? "Xấu đi"
                : trend.trendDirection === "Improving"
                ? "Cải thiện"
                : "Ổn định"}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">Tổng số phân tích</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {trend.totalAnalyses}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">Lần phân tích cuối</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {trend.daysSinceLastAnalysis}
            </p>
            <p className="text-xs text-slate-500 mt-1">ngày trước</p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Khoảng thời gian
            </h2>
            <div className="flex space-x-2">
              {[30, 60, 90, 180].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    days === d
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {d} ngày
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Biểu Đồ Xu Hướng
          </h2>
          <TrendChart trend={trend} />
        </div>

        {/* Trend Points Table */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Lịch Sử Phân Tích
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Ngày phân tích
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Mức rủi ro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Điểm rủi ro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {trend.trendPoints.map((point, index) => (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {formatDate(point.analysisDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: getRiskColor(point.riskLevel) }}
                      >
                        {point.riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {point.riskScore?.toFixed(1) || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => navigate(`/analysis/${point.analysisResultId}`)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientTrendPage;
