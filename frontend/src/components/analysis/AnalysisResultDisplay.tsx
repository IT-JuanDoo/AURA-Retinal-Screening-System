import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnalysisResult } from '../../services/analysisService';
import exportService from '../../services/exportService';
import toast from 'react-hot-toast';

interface AnalysisResultDisplayProps {
  result: AnalysisResult;
}

const AI_CORE_BASE_URL =
  import.meta.env.VITE_AI_CORE_BASE_URL || 'http://localhost:8000';

const resolveImageUrl = (path?: string | null) => {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${AI_CORE_BASE_URL}${path}`;
};

const AnalysisResultDisplay = ({ result }: AnalysisResultDisplayProps) => {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: 'pdf' | 'csv' | 'json') => {
    try {
      setExporting(format);
      toast.loading(`Đang tạo báo cáo ${format.toUpperCase()}...`, { id: `export-${format}` });
      
      let exportResult;
      
      switch (format) {
        case 'pdf':
          exportResult = await exportService.exportToPdf(result.id);
          break;
        case 'csv':
          exportResult = await exportService.exportToCsv(result.id);
          break;
        case 'json':
          exportResult = await exportService.exportToJson(result.id);
          break;
      }

      if (!exportResult) {
        throw new Error('Không nhận được kết quả từ server');
      }

      // Download file từ backend endpoint (không mở trực tiếp từ Cloudinary URL)
      try {
        // Backend trả về exportId, không phải id
        const exportId = (exportResult as any).exportId ?? (exportResult as any).id;
        
        if (!exportId) {
          throw new Error('Không tìm thấy mã báo cáo (exportId) trong phản hồi từ server');
        }
        // Luôn download từ backend endpoint để đảm bảo file đúng format
        const blob = await exportService.downloadExport(exportId);
        
        // Kiểm tra blob có hợp lệ không
        if (!blob || blob.size === 0) {
          throw new Error('File download trống hoặc không hợp lệ');
        }
        const fileName = exportResult.fileName || `aura_report_${result.id.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.${format}`;
        exportService.downloadFile(blob, fileName);
        toast.success(`✅ Xuất ${format.toUpperCase()} thành công!`, { id: `export-${format}` });
      } catch (downloadError: any) {
        // Lấy error message từ nhiều nguồn khác nhau
        let errorMsg = 'Không thể tải file';
        if (downloadError?.message) {
          errorMsg = downloadError.message;
        } else if (downloadError?.response?.data) {
          // Nếu response.data là Blob (JSON error được parse thành blob)
          if (downloadError.response.data instanceof Blob) {
            try {
              const text = await downloadError.response.data.text();
              const errorData = JSON.parse(text);
              errorMsg = errorData.message || errorMsg;
            } catch {
              errorMsg = 'File download không hợp lệ';
            }
          } else {
            errorMsg = downloadError.response.data.message || errorMsg;
          }
        }
        toast.error(`❌ Không thể tải ${format.toUpperCase()}: ${errorMsg}. Vui lòng thử lại hoặc kiểm tra lịch sử xuất báo cáo`, { id: `export-${format}`, duration: 5000 });
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Không thể kết nối đến server';
      toast.error(`❌ Không thể xuất ${format.toUpperCase()}: ${errorMessage}`, { id: `export-${format}`, duration: 5000 });
    } finally {
      setExporting(null);
    }
  };

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
                    src={resolveImageUrl(result.annotatedImageUrl)}
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
                    src={resolveImageUrl(result.heatmapUrl)}
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
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
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
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {result.healthWarnings}
          </p>
        </div>
      )}

      {/* Export Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-8 mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Xuất Báo cáo
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Tải xuống kết quả phân tích dưới các định dạng khác nhau
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting === 'pdf' ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10.92,12.31C10.68,11.54 10.15,9.08 11.55,9.04C12.95,9 12.03,12.16 12.03,12.16C12.42,13.65 14.05,14.72 14.05,14.72C14.55,14.57 17.4,14.24 17,15.72C16.57,17.2 13.5,15.81 13.5,15.81C11.55,15.95 10.09,16.47 10.09,16.47C8.96,18.58 7.64,19.5 7.1,18.61C6.43,17.5 9.23,16.07 9.23,16.07C10.68,13.72 10.9,12.35 10.92,12.31Z" />
              </svg>
            )}
            Xuất PDF
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting === 'csv' ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10,19L12,15H9V10H15V15L13,19H10Z" />
              </svg>
            )}
            Xuất CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={exporting !== null}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting === 'json' ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5,3H7V5H5V10A2,2 0 0,1 3,12A2,2 0 0,1 5,14V19H7V21H5C3.93,20.73 3,20.1 3,19V15A2,2 0 0,0 1,13H0V11H1A2,2 0 0,0 3,9V5A2,2 0 0,1 5,3M19,3A2,2 0 0,1 21,5V9A2,2 0 0,0 23,11H24V13H23A2,2 0 0,0 21,15V19A2,2 0 0,1 19,21H17V19H19V14A2,2 0 0,1 21,12A2,2 0 0,1 19,10V5H17V3H19M12,15A1,1 0 0,1 13,16A1,1 0 0,1 12,17A1,1 0 0,1 11,16A1,1 0 0,1 12,15M8,15A1,1 0 0,1 9,16A1,1 0 0,1 8,17A1,1 0 0,1 7,16A1,1 0 0,1 8,15M16,15A1,1 0 0,1 17,16A1,1 0 0,1 16,17A1,1 0 0,1 15,16A1,1 0 0,1 16,15Z" />
              </svg>
            )}
            Xuất JSON
          </button>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Link
            to="/exports"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Xem lịch sử xuất báo cáo
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

    </main>
  );
};

export default AnalysisResultDisplay;

