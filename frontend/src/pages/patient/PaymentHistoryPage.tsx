import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PatientHeader from '../../components/patient/PatientHeader';
import paymentService, { PaymentHistory } from '../../services/paymentService';
import { userPackageService, UserPackage } from '../../services/packageApi';
import toast from 'react-hot-toast';

const PaymentHistoryPage = () => {
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [myPackages, setMyPackages] = useState<UserPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'payments' | 'packages'>('payments');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentsData, packagesData] = await Promise.all([
        paymentService.getPaymentHistory(),
        userPackageService.getMyPackages(),
      ]);
      setPayments(paymentsData);
      setMyPackages(packagesData);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
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

  const getStatusBadge = (status: string) => {
    const { label, color } = paymentService.formatStatus(status);
    const colorClasses: Record<string, string> = {
      green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      gray: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colorClasses[color]}`}>
        {label}
      </span>
    );
  };

  const totalSpent = payments
    .filter(p => p.paymentStatus.toLowerCase() === 'completed' || p.paymentStatus.toLowerCase() === 'success')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalCredits = myPackages
    .filter(p => p.isActive && !p.isExpired)
    .reduce((sum, p) => sum + p.remainingAnalyses, 0);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased min-h-screen flex flex-col transition-colors duration-200">
      <PatientHeader />

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
            <Link to="/dashboard" className="hover:text-blue-500">Trang chủ</Link>
            <span>/</span>
            <span>Lịch sử thanh toán</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Lịch sử thanh toán
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Quản lý giao dịch và gói dịch vụ của bạn
              </p>
            </div>
            <Link
              to="/packages"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Mua thêm gói
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Tổng chi tiêu</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {paymentService.formatCurrency(totalSpent)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Lượt phân tích còn lại</p>
                <p className="text-2xl font-bold text-blue-600">{totalCredits}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Gói đang hoạt động</p>
                <p className="text-2xl font-bold text-purple-600">
                  {myPackages.filter(p => p.isActive && !p.isExpired).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-800">
            <div className="flex">
              <button
                onClick={() => setActiveTab('payments')}
                className={`px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'payments'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Lịch sử giao dịch ({payments.length})
              </button>
              <button
                onClick={() => setActiveTab('packages')}
                className={`px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'packages'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Gói dịch vụ của tôi ({myPackages.length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Đang tải...</p>
            </div>
          ) : activeTab === 'payments' ? (
            // Payment History Tab
            payments.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">Chưa có giao dịch nào</p>
                <p className="text-slate-600 dark:text-slate-400 mb-4">Mua gói dịch vụ để bắt đầu sử dụng</p>
                <Link
                  to="/packages"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Xem gói dịch vụ
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {payments.map((payment) => (
                  <div key={payment.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {payment.packageName || 'Gói dịch vụ'}
                          </h3>
                          {getStatusBadge(payment.paymentStatus)}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                          <span>{formatDate(payment.paymentDate)}</span>
                          <span>•</span>
                          <span>{paymentService.formatPaymentMethod(payment.paymentMethod)}</span>
                          <span>•</span>
                          <span className="font-mono text-xs">{payment.transactionId}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {paymentService.formatCurrency(payment.amount, payment.currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // My Packages Tab
            myPackages.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">Chưa có gói nào</p>
                <p className="text-slate-600 dark:text-slate-400 mb-4">Mua gói dịch vụ để bắt đầu phân tích</p>
                <Link
                  to="/packages"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Xem gói dịch vụ
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {myPackages.map((pkg) => (
                  <div key={pkg.id} className={`p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${pkg.isExpired ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        pkg.isExpired
                          ? 'bg-slate-100 dark:bg-slate-800'
                          : pkg.remainingAnalyses > 0
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-yellow-100 dark:bg-yellow-900/30'
                      }`}>
                        <svg className={`w-6 h-6 ${
                          pkg.isExpired
                            ? 'text-slate-400'
                            : pkg.remainingAnalyses > 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {pkg.packageName || 'Gói dịch vụ'}
                          </h3>
                          {pkg.isExpired ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                              Đã hết hạn
                            </span>
                          ) : pkg.remainingAnalyses === 0 ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                              Đã dùng hết
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              Đang hoạt động
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                          <span>Mua: {formatDate(pkg.purchasedAt)}</span>
                          {pkg.expiresAt && (
                            <>
                              <span>•</span>
                              <span>Hết hạn: {formatDate(pkg.expiresAt)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">
                          {pkg.remainingAnalyses}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">lượt còn lại</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
};

export default PaymentHistoryPage;
