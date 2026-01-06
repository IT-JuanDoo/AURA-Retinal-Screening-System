import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import analysisService, { AnalysisResult } from '../../services/analysisService';
import toast from 'react-hot-toast';
import AnalysisResultDisplay from '../../components/analysis/AnalysisResultDisplay';

const AnalysisResultPage = () => {
  const { analysisId } = useParams<{ analysisId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!analysisId) {
      toast.error('Analysis ID không hợp lệ');
      navigate('/dashboard');
      return;
    }

    loadAnalysisResult();
  }, [analysisId]);

  const loadAnalysisResult = async () => {
    if (!analysisId) return;

    try {
      setLoading(true);
      const data = await analysisService.getAnalysisResult(analysisId);
      setResult(data);
    } catch (error: any) {
      toast.error(`Lỗi khi tải kết quả phân tích: ${error.message}`);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-5xl text-primary">
            progress_activity
          </span>
          <p className="mt-4 text-text-sub-light dark:text-text-sub-dark">
            Đang tải kết quả phân tích...
          </p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-red-500">error</span>
          <p className="mt-4 text-text-sub-light dark:text-text-sub-dark">
            Không tìm thấy kết quả phân tích
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <AnalysisResultDisplay result={result} />
    </div>
  );
};

export default AnalysisResultPage;

