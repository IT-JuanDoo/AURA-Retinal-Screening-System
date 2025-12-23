import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import HtmlViewer from '../../components/common/HtmlViewer';

const pageConfig: Record<string, { title: string; path: string }> = {
  dashboard: { title: 'Dashboard tổng hệ thống', path: 'dashboard_tổng_hệ_thống/code.html' },
  patients: { title: 'Danh sách & phân loại bệnh nhân', path: 'danh_sách_&_phân_loại_bn/code.html' },
  report: { title: 'Báo cáo chẩn đoán & xuất kết quả', path: 'báo_cáo_chẩn_đoán_&_xuất_kết_quả/code.html' },
  chat: { title: 'Chat tư vấn bác sĩ', path: 'chat_tư_vấn_bác_sĩ/code.html' },
  packages: { title: 'Gói dịch vụ & mua gói', path: 'gói_dịch_vụ_&_mua_gói/code.html' },
  profile: { title: 'Hồ sơ cá nhân & y tế', path: 'hồ_sơ_cá_nhân_&_y_tế/code.html' },
  'doctor-history': { title: 'Lịch sử bệnh nhân & dữ liệu xu hướng bác sĩ', path: 'lịch_sử_bệnh_nhân_&_dữ_liệu_xu_hướng_của_bác_sĩ/code.html' },
  'patient-history': { title: 'Lịch sử phân tích của bệnh nhân', path: 'lịch_sử_phân_tích_của_bệnh_nhân/code.html' },
  payments: { title: 'Lịch sử thanh toán', path: 'lịch_sử_thanh_toán/code.html' },
  'admin-packages': { title: 'Quản lý gói & giá (Admin)', path: 'quản_lý_gói_&_giá_admin/code.html' },
  'clinic-packages': { title: 'Quản lý gói dịch vụ (Phòng khám)', path: 'quản_lý_gói_dịch_vụ_pk/code.html' },
  'admin-notifications': { title: 'Quản lý mẫu thông báo (Admin)', path: 'quản_lý_mẫu_thông_báo_admin/code.html' },
  'admin-roles': { title: 'Quản lý vai trò & quyền truy cập', path: 'quản_lý_vai_trò_&_quyền_truy_cập_admin/code.html' },
  'ai-ready': { title: 'Thông báo kết quả AI đã sẵn sàng', path: 'thông_báo_kết_quả_ai_đã_sẵn_sàng/code.html' },
  'clinic-reports': { title: 'Thống kê & báo cáo phòng khám', path: 'thống_kê_&_báo_cáo_pk/code.html' },
  compliance: { title: 'Tuân thủ dữ liệu & nhật ký kiểm toán', path: 'tuân_thủ_dữ_liệu_&_nhật_ký_kiểm_toán_admin/code.html' },
  'ai-adjust': { title: 'Xác nhận & hiệu chỉnh AI', path: 'xác_nhận_&_hiệu_chỉnh_ai/code.html' },
  'clinic-review': { title: 'Duyệt/đình chỉ đăng ký phòng khám', path: 'duyệt/đình_chỉ_đăng_ký_phòng_khám/code.html' },
  'ai-config': { title: 'Cấu hình AI & mô hình (Admin)', path: 'cấu_hình_ai_&_mô_hình_admin/code.html' },
};

const GiaoDienViewerPage = () => {
  const { page } = useParams<{ page: string }>();
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config = page ? pageConfig[page] : undefined;

  useEffect(() => {
    if (!config) {
      setError('Không tìm thấy giao diện');
      setLoading(false);
      return;
    }

    const loadHtml = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try to import HTML file dynamically
        const module = await import(`../../giaodien/${config.path}?raw`);
        setHtml(module.default);
      } catch (err) {
        console.error('Failed to load HTML:', err);
        setError(`Không thể tải file HTML. Vui lòng đảm bảo thư mục 'giaodien' đã được copy vào 'frontend/src/giaodien'`);
      } finally {
        setLoading(false);
      }
    };

    loadHtml();
  }, [config]);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Không tìm thấy giao diện
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Kiểm tra lại đường dẫn hoặc chọn từ danh sách.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Đang tải giao diện...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
            Lỗi tải giao diện
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg text-left text-sm">
            <p className="font-semibold mb-2">Hướng dẫn:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Copy thư mục <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">giaodien</code> vào <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">frontend/src/giaodien</code></li>
              <li>Đảm bảo các file <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">code.html</code> có trong các thư mục con</li>
              <li>Refresh trang</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return <HtmlViewer html={html} title={config.title} />;
};

export default GiaoDienViewerPage;
