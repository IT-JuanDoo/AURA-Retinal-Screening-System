import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import analysisService, { AnalysisResult } from '../../services/analysisService';
import toast from 'react-hot-toast';
import AnalysisResultDisplay from '../../components/analysis/AnalysisResultDisplay';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import PatientHeader from '../../components/patient/PatientHeader';

const AnalysisResultPage = () => {
  const { analysisId } = useParams<{ analysisId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!analysisId) {
      toast.error('Analysis ID không hợp lệ');
      navigate('/dashboard');
      return;
    }

    loadAnalysisResultWithRetry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId]);

  const loadAnalysisResult = async () => {
    if (!analysisId) return;

    try {
      setLoading(true);
      const data = await analysisService.getAnalysisResult(analysisId);
      setResult(data);
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysisResultWithRetry = async () => {
    if (!analysisId) return;

    // Retry nhẹ: trường hợp backend đang xử lý / record chưa sẵn sàng ngay lập tức
    const maxAttempts = 10; // ~20-30s tuỳ backoff
    let attempt = 0;

    setRetrying(true);
    setResult(null);

    while (attempt < maxAttempts) {
      try {
        await loadAnalysisResult();
        setRetrying(false);
        return;
      } catch (error: any) {
        const status = error?.response?.status;

        // 404: chưa có kết quả (chờ thêm)
        if (status === 404) {
          attempt += 1;
          const delayMs = Math.min(3000, 800 + attempt * 250);
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }

        // Các lỗi khác: hiện thông báo và dừng retry
        toast.error(
          `Lỗi khi tải kết quả phân tích: ${getApiErrorMessage(error, 'Không thể tải kết quả')}`
        );
        setRetrying(false);
        return;
      }
    }

    toast.error('Kết quả phân tích chưa sẵn sàng. Vui lòng thử tải lại sau.');
    setRetrying(false);
  };

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased min-h-screen flex flex-col transition-colors duration-200">
        <PatientHeader />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined animate-spin text-5xl text-blue-600 dark:text-blue-400">
              progress_activity
            </span>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              Đang tải kết quả phân tích...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased min-h-screen flex flex-col transition-colors duration-200">
        <PatientHeader />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined text-5xl text-blue-600 dark:text-blue-400">
              {retrying ? 'hourglass_top' : 'error'}
            </span>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              {retrying ? 'Đang chờ hệ thống xử lý...' : 'Không tìm thấy kết quả phân tích'}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => loadAnalysisResultWithRetry()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Thử tải lại
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold transition-colors"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased min-h-screen flex flex-col transition-colors duration-200">
      <PatientHeader />
      <AnalysisResultDisplay result={result} />
    </div>
  );
};

export default AnalysisResultPage;

