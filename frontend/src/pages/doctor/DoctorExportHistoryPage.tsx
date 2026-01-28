import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DoctorHeader from '../../components/doctor/DoctorHeader';
import exportService, { ExportHistoryItem } from '../../services/exportService';
import toast from 'react-hot-toast';

const DoctorExportHistoryPage = () => {
  const [exports, setExports] = useState<ExportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadExports();
  }, []);

  const loadExports = async () => {
    try {
      setLoading(true);
      const data = await exportService.getExportHistory(50, 0);
      setExports(data);
    } catch (error: any) {
      console.error('Error loading exports:', error);
      toast.error('Không thể tải lịch sử xuất báo cáo');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (exportItem: ExportHistoryItem) => {
    const isExpired =
      exportItem.status?.toLowerCase() === 'expired' ||
      (!!exportItem.expiresAt && new Date(exportItem.expiresAt) < new Date());

    if (isExpired) {
      toast.error('File đã hết hạn');
      return;
    }

    try {
      setDownloading(exportItem.exportId);
      
      // Track download
      await exportService.trackDownload(exportItem.exportId);
      
      // Download file
      const blob = await exportService.downloadExport(exportItem.exportId);
      const fileExtension = exportService.getFileExtension(exportItem.reportType.toLowerCase());
      const fileName =
        exportItem.fileName ||
        `export_${exportItem.exportId}${fileExtension}`;
      exportService.downloadFile(blob, fileName);
      
      toast.success('Tải xuống thành công');
      
      // Refresh to update download count
      await loadExports();
    } catch (error: any) {
      console.error('Error downloading export:', error);
      toast.error('Không thể tải xuống file');
    } finally {
      setDownloading(null);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case 'pdf':
        return (
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10.92,12.31C10.68,11.54 10.15,9.08 11.55,9.04C12.95,9 12.03,12.16 12.03,12.16C12.42,13.65 14.05,14.72 14.05,14.72C14.55,14.57 17.4,14.24 17,15.72C16.57,17.2 13.5,15.81 13.5,15.81C11.55,15.95 10.09,16.47 10.09,16.47C8.96,18.58 7.64,19.5 7.1,18.61C6.43,17.5 9.23,16.07 9.23,16.07C10.68,13.72 10.9,12.35 10.92,12.31Z" />
            </svg>
          </div>
        );
      case 'csv':
        return (
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10,19L12,15H9V10H15V15L13,19H10Z" />
            </svg>
          </div>
        );
      case 'json':
        return (
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5,3H7V5H5V10A2,2 0 0,1 3,12A2,2 0 0,1 5,14V19H7V21H5C3.93,20.73 3,20.1 3,19V15A2,2 0 0,0 1,13H0V11H1A2,2 0 0,0 3,9V5A2,2 0 0,1 5,3M19,3A2,2 0 0,1 21,5V9A2,2 0 0,0 23,11H24V13H23A2,2 0 0,0 21,15V19A2,2 0 0,1 19,21H17V19H19V14A2,2 0 0,1 21,12A2,2 0 0,1 19,10V5H17V3H19M12,15A1,1 0 0,1 13,16A1,1 0 0,1 12,17A1,1 0 0,1 11,16A1,1 0 0,1 12,15M8,15A1,1 0 0,1 9,16A1,1 0 0,1 8,17A1,1 0 0,1 7,16A1,1 0 0,1 8,15M16,15A1,1 0 0,1 17,16A1,1 0 0,1 16,17A1,1 0 0,1 15,16A1,1 0 0,1 16,15Z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DoctorHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
            <Link to="/doctor" className="hover:text-blue-500">Tổng quan</Link>
            <span>/</span>
            <span>Lịch sử xuất báo cáo</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Lịch sử xuất báo cáo
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Xem và tải xuống các báo cáo đã xuất
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">Tổng báo cáo</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{exports.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">PDF</p>
            <p className="text-2xl font-bold text-red-600">
              {exports.filter(e => e.reportType.toLowerCase() === 'pdf').length}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">CSV</p>
            <p className="text-2xl font-bold text-green-600">
              {exports.filter(e => e.reportType.toLowerCase() === 'csv').length}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">JSON</p>
            <p className="text-2xl font-bold text-blue-600">
              {exports.filter(e => e.reportType.toLowerCase() === 'json').length}
            </p>
          </div>
        </div>

        {/* Export List */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Danh sách báo cáo</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Đang tải...</p>
            </div>
          ) : exports.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">Chưa có báo cáo nào</p>
              <p className="text-slate-600 dark:text-slate-400 mb-4">Xuất báo cáo từ kết quả phân tích để xem ở đây</p>
              <Link
                to="/doctor/analyses"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Xem báo cáo phân tích
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {exports.map((exportItem) => (
                <div
                  key={exportItem.exportId}
                  className={`p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                    (exportItem.status?.toLowerCase() === 'expired' ? 'opacity-60' : '')
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {getFormatIcon(exportItem.reportType)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                          {exportItem.fileName || `Báo cáo ${exportItem.reportType.toUpperCase()}`}
                        </h3>
                        {exportItem.status?.toLowerCase() === 'expired' && (
                          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-full">
                            Đã hết hạn
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                        <span>{formatDate(exportItem.exportedAt)}</span>
                        <span>•</span>
                        <span>{exportService.formatFileSize(exportItem.fileSize)}</span>
                        <span>•</span>
                        <span>{exportItem.downloadCount} lượt tải</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/doctor/analyses/${exportItem.analysisResultId ?? ''}`}
                        className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                        title="Xem kết quả phân tích"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => handleDownload(exportItem)}
                        disabled={
                          exportItem.status?.toLowerCase() === 'expired' ||
                          downloading === exportItem.exportId
                        }
                        className={`p-2 rounded-lg transition-colors ${
                          exportItem.status?.toLowerCase() === 'expired'
                            ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                            : 'text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                        }`}
                        title="Tải xuống"
                      >
                        {downloading === exportItem.exportId ? (
                          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        )}
                      </button>
                    </div>
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

export default DoctorExportHistoryPage;
