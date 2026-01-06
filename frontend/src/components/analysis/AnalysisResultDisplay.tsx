import { AnalysisResult } from '../../services/analysisService';
import { useNavigate } from 'react-router-dom';

interface AnalysisResultDisplayProps {
  result: AnalysisResult;
}

const AnalysisResultDisplay = ({ result }: AnalysisResultDisplayProps) => {
  const navigate = useNavigate();

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-text-sub-light dark:text-text-sub-dark hover:text-primary mb-4"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Quay lại
        </button>
        <h1 className="text-3xl font-black text-text-main-light dark:text-text-main-dark">
          Kết quả Phân tích AI
        </h1>
        <p className="text-text-sub-light dark:text-text-sub-dark mt-2">
          Phân tích được thực hiện vào{' '}
          {result.analysisCompletedAt
            ? new Date(result.analysisCompletedAt).toLocaleString('vi-VN')
            : 'Chưa hoàn thành'}
        </p>
      </div>

      {/* Overall Risk Card */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-main-light dark:text-text-main-dark">
            Đánh giá Tổng thể
          </h2>
          <span
            className={`px-4 py-2 rounded-lg font-bold ${getRiskColor(result.overallRiskLevel)}`}
          >
            {getRiskLabel(result.overallRiskLevel)}
          </span>
        </div>
        {result.riskScore !== undefined && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-text-sub-light dark:text-text-sub-dark">Điểm rủi ro</span>
              <span className="font-bold">{result.riskScore}/100</span>
            </div>
            <div className="h-3 w-full bg-border-light dark:bg-border-dark rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
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
          <div className="text-sm text-text-sub-light dark:text-text-sub-dark">
            Độ tin cậy AI: <span className="font-bold">{result.aiConfidenceScore}%</span>
          </div>
        )}
      </div>

      {/* Risk Assessments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Cardiovascular Risk */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-rose-500 text-3xl">favorite</span>
            <h3 className="font-bold text-text-main-light dark:text-text-main-dark">
              Tim mạch
            </h3>
          </div>
          <div className={`inline-block px-3 py-1 rounded-lg text-sm font-medium mb-2 ${getRiskColor(result.hypertensionRisk)}`}>
            {getRiskLabel(result.hypertensionRisk)}
          </div>
          {result.hypertensionScore !== undefined && (
            <p className="text-sm text-text-sub-light dark:text-text-sub-dark">
              Điểm: {result.hypertensionScore}/100
            </p>
          )}
        </div>

        {/* Diabetes Risk */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-blue-500 text-3xl">visibility</span>
            <h3 className="font-bold text-text-main-light dark:text-text-main-dark">
              Đái tháo đường
            </h3>
          </div>
          <div className={`inline-block px-3 py-1 rounded-lg text-sm font-medium mb-2 ${getRiskColor(result.diabetesRisk)}`}>
            {getRiskLabel(result.diabetesRisk)}
          </div>
          {result.diabetesScore !== undefined && (
            <p className="text-sm text-text-sub-light dark:text-text-sub-dark">
              Điểm: {result.diabetesScore}/100
            </p>
          )}
          {result.diabeticRetinopathyDetected && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              ⚠️ Phát hiện võng mạc đái tháo đường
            </p>
          )}
        </div>

        {/* Stroke Risk */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-purple-500 text-3xl">warning</span>
            <h3 className="font-bold text-text-main-light dark:text-text-main-dark">
              Đột quỵ
            </h3>
          </div>
          <div className={`inline-block px-3 py-1 rounded-lg text-sm font-medium mb-2 ${getRiskColor(result.strokeRisk)}`}>
            {getRiskLabel(result.strokeRisk)}
          </div>
          {result.strokeScore !== undefined && (
            <p className="text-sm text-text-sub-light dark:text-text-sub-dark">
              Điểm: {result.strokeScore}/100
            </p>
          )}
        </div>
      </div>

      {/* Vascular Abnormalities */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-6 mb-6">
        <h2 className="text-xl font-bold text-text-main-light dark:text-text-main-dark mb-4">
          Bất thường Mạch máu
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-text-sub-light dark:text-text-sub-dark">Độ xoắn mạch</p>
            <p className="text-lg font-bold">
              {result.vesselTortuosity?.toFixed(2) ?? 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-sub-light dark:text-text-sub-dark">
              Biến đổi độ rộng
            </p>
            <p className="text-lg font-bold">
              {result.vesselWidthVariation?.toFixed(2) ?? 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-sub-light dark:text-text-sub-dark">
              Vi phình mạch
            </p>
            <p className="text-lg font-bold">{result.microaneurysmsCount}</p>
          </div>
          <div>
            <p className="text-sm text-text-sub-light dark:text-text-sub-dark">
              Xuất huyết
            </p>
            <p className="text-lg font-bold">
              {result.hemorrhagesDetected ? 'Có' : 'Không'}
            </p>
          </div>
        </div>
      </div>

      {/* Annotated Images */}
      {(result.annotatedImageUrl || result.heatmapUrl) && (
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-text-main-light dark:text-text-main-dark mb-4">
            Hình ảnh Phân tích
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.annotatedImageUrl && (
              <div>
                <h3 className="text-sm font-medium text-text-sub-light dark:text-text-sub-dark mb-2">
                  Ảnh đã chú thích
                </h3>
                <img
                  src={result.annotatedImageUrl}
                  alt="Annotated retinal image"
                  className="w-full rounded-lg border border-border-light dark:border-border-dark"
                />
              </div>
            )}
            {result.heatmapUrl && (
              <div>
                <h3 className="text-sm font-medium text-text-sub-light dark:text-text-sub-dark mb-2">
                  Heatmap
                </h3>
                <img
                  src={result.heatmapUrl}
                  alt="Heatmap visualization"
                  className="w-full rounded-lg border border-border-light dark:border-border-dark"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6 mb-6">
          <h2 className="text-xl font-bold text-text-main-light dark:text-text-main-dark mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500">lightbulb</span>
            Khuyến nghị
          </h2>
          <p className="text-text-main-light dark:text-text-main-dark">
            {result.recommendations}
          </p>
        </div>
      )}

      {/* Health Warnings */}
      {result.healthWarnings && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-6 mb-6">
          <h2 className="text-xl font-bold text-text-main-light dark:text-text-main-dark mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500">warning</span>
            Cảnh báo Sức khỏe
          </h2>
          <p className="text-text-main-light dark:text-text-main-dark">
            {result.healthWarnings}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => navigate('/upload')}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-bold"
        >
          Tải ảnh mới
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-main-light dark:text-text-main-dark rounded-lg hover:bg-gray-50 dark:hover:bg-surface-dark/80 font-bold"
        >
          Về trang chủ
        </button>
      </div>
    </div>
  );
};

export default AnalysisResultDisplay;

