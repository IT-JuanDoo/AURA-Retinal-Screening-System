import { AnalysisResult } from '../../services/analysisService';

interface AnalysisResultDisplayProps {
  result: AnalysisResult;
}

const AnalysisResultDisplay = ({ result }: AnalysisResultDisplayProps) => {

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'Low':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'Medium':
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
      case 'High':
      case 'Critical':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getRiskLabel = (risk?: string) => {
    switch (risk) {
      case 'Low':
        return 'Thấp';
      case 'Medium':
        return 'Trung bình';
      case 'High':
        return 'Cao';
      case 'Critical':
        return 'Nghiêm trọng';
      default:
        return 'Chưa xác định';
    }
  };

  return (
    <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8 md:mb-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">
            Kết quả Phân tích AI
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg">
            Phân tích được thực hiện vào{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {result.analysisCompletedAt
                ? new Date(result.analysisCompletedAt).toLocaleString('vi-VN')
                : 'Chưa hoàn thành'}
            </span>
          </p>
        </div>
      </div>

      {/* Overall Risk Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Đánh giá Tổng thể
          </h2>
          <span
            className={`px-5 py-2.5 rounded-lg font-bold text-base ${getRiskColor(result.overallRiskLevel)}`}
          >
            {getRiskLabel(result.overallRiskLevel)}
          </span>
        </div>
        {result.riskScore !== undefined && (
          <div className="mb-6">
            <div className="flex justify-between text-sm font-semibold mb-3">
              <span className="text-slate-600 dark:text-slate-400">Điểm rủi ro</span>
              <span className="text-slate-900 dark:text-white text-lg">{result.riskScore}/100</span>
            </div>
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  result.riskScore < 40
                    ? 'bg-green-500'
                    : result.riskScore < 70
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${result.riskScore}%` }}
              />
            </div>
          </div>
        )}
        {result.aiConfidenceScore !== undefined && (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Độ tin cậy AI: <span className="font-bold text-slate-900 dark:text-white">{result.aiConfidenceScore}%</span>
          </div>
        )}
      </div>

      {/* Risk Assessments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Cardiovascular Risk */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-rose-500 dark:text-rose-400 text-2xl">favorite</span>
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              Tim mạch
            </h3>
          </div>
          <div className={`inline-block px-4 py-2 rounded-lg text-sm font-semibold mb-3 ${getRiskColor(result.hypertensionRisk)}`}>
            {getRiskLabel(result.hypertensionRisk)}
          </div>
          {result.hypertensionScore !== undefined && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Điểm: <span className="font-bold text-slate-900 dark:text-white">{result.hypertensionScore}/100</span>
            </p>
          )}
        </div>

        {/* Diabetes Risk */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-500 dark:text-blue-400 text-2xl">visibility</span>
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              Đái tháo đường
            </h3>
          </div>
          <div className={`inline-block px-4 py-2 rounded-lg text-sm font-semibold mb-3 ${getRiskColor(result.diabetesRisk)}`}>
            {getRiskLabel(result.diabetesRisk)}
          </div>
          {result.diabetesScore !== undefined && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Điểm: <span className="font-bold text-slate-900 dark:text-white">{result.diabetesScore}/100</span>
            </p>
          )}
          {result.diabeticRetinopathyDetected && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-base">warning</span>
              Phát hiện võng mạc đái tháo đường
            </p>
          )}
        </div>

        {/* Stroke Risk */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-500 dark:text-purple-400 text-2xl">warning</span>
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              Đột quỵ
            </h3>
          </div>
          <div className={`inline-block px-4 py-2 rounded-lg text-sm font-semibold mb-3 ${getRiskColor(result.strokeRisk)}`}>
            {getRiskLabel(result.strokeRisk)}
          </div>
          {result.strokeScore !== undefined && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Điểm: <span className="font-bold text-slate-900 dark:text-white">{result.strokeScore}/100</span>
            </p>
          )}
        </div>
      </div>

      {/* Vascular Abnormalities */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-8 mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
          Bất thường Mạch máu
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Độ xoắn mạch</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {result.vesselTortuosity?.toFixed(2) ?? 'N/A'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Biến đổi độ rộng
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {result.vesselWidthVariation?.toFixed(2) ?? 'N/A'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Vi phình mạch
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{result.microaneurysmsCount ?? 0}</p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Xuất huyết
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {result.hemorrhagesDetected ? 'Có' : 'Không'}
            </p>
          </div>
        </div>
      </div>

      {/* Annotated Images */}
      {(result.annotatedImageUrl || result.heatmapUrl) && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-8 mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            Hình ảnh Phân tích
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {result.annotatedImageUrl && (
              <div className="flex flex-col gap-3">
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
                  Ảnh đã chú thích
                </h3>
                <div className="rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                  <img
                    src={result.annotatedImageUrl}
                    alt="Annotated retinal image"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}
            {result.heatmapUrl && (
              <div className="flex flex-col gap-3">
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
                  Heatmap
                </h3>
                <div className="rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                  <img
                    src={result.heatmapUrl}
                    alt="Heatmap visualization"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">lightbulb</span>
            Khuyến nghị
          </h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            {result.recommendations}
          </p>
        </div>
      )}

      {/* Health Warnings */}
      {result.healthWarnings && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">warning</span>
            Cảnh báo Sức khỏe
          </h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            {result.healthWarnings}
          </p>
        </div>
      )}

    </main>
  );
};

export default AnalysisResultDisplay;

