import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface AnalysisResult {
  id: string;
  imageId: string;
  analysisStatus: string;
  overallRiskLevel?: string;
  riskScore?: number;
  analysisCompletedAt?: string;
  createdAt?: string;
}

interface PatientHistoryTimelineProps {
  patientId: string;
}

const PatientHistoryTimeline = ({ patientId }: PatientHistoryTimelineProps) => {
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalysisHistory();
  }, [patientId]);

  const loadAnalysisHistory = async () => {
    try {
      setLoading(true);
      // Get analysis results for this patient using doctor endpoint
      const response = await api.get<AnalysisResult[]>(`/doctors/analyses`, {
        params: { patientId },
      });
      setAnalyses(response.data || []);
    } catch (error: any) {
      // Error loading analysis history
      toast.error('Lỗi khi tải lịch sử phân tích');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'Critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'High':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Đang tải lịch sử...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
        Lịch sử Phân tích ({analyses.length})
      </h3>

      {analyses.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>

          <div className="space-y-6">
            {analyses.map((analysis) => (
              <div key={analysis.id} className="relative pl-12">
                {/* Timeline dot */}
                <div className="absolute left-0 top-2">
                  <div className={`size-8 rounded-full border-2 border-white dark:border-slate-900 ${
                    analysis.overallRiskLevel === 'Critical' || analysis.overallRiskLevel === 'High'
                      ? 'bg-red-500'
                      : analysis.overallRiskLevel === 'Medium'
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}></div>
                </div>

                {/* Content Card */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(analysis.analysisStatus)}`}>
                          {analysis.analysisStatus === 'Completed' ? 'Hoàn thành' : 
                           analysis.analysisStatus === 'Processing' ? 'Đang xử lý' : 'Thất bại'}
                        </span>
                        {analysis.overallRiskLevel && (
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskLevelColor(analysis.overallRiskLevel)}`}>
                            {analysis.overallRiskLevel === 'Critical' ? 'Nghiêm trọng' :
                             analysis.overallRiskLevel === 'High' ? 'Cao' :
                             analysis.overallRiskLevel === 'Medium' ? 'Trung bình' : 'Thấp'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        {formatDate(analysis.analysisCompletedAt || analysis.createdAt)}
                      </p>
                      {analysis.riskScore !== null && analysis.riskScore !== undefined && (
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          Điểm rủi ro: <span className="font-semibold">{analysis.riskScore.toFixed(1)}</span>
                        </p>
                      )}
                    </div>
                    <Link
                      to={`/doctor/analyses/${analysis.id}`}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            Chưa có lịch sử phân tích
          </p>
          <p className="text-slate-600 dark:text-slate-400">
            Bệnh nhân này chưa có kết quả phân tích nào
          </p>
        </div>
      )}
    </div>
  );
};

export default PatientHistoryTimeline;
