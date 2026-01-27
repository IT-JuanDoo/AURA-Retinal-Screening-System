import { useState } from 'react';
import { Link } from 'react-router-dom';
import PatientHeader from '../../components/patient/PatientHeader';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'privacy' | 'appearance'>('account');
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    analysisComplete: true,
    newReport: true,
    marketing: false,
  });

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    setDarkMode(!darkMode);
    toast.success(`Đã chuyển sang chế độ ${!darkMode ? 'tối' : 'sáng'}`);
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    toast.success('Đã cập nhật cài đặt thông báo');
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased min-h-screen flex flex-col transition-colors duration-200">
      <PatientHeader />

      <main className="flex-grow w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
            <Link to="/dashboard" className="hover:text-blue-500">Trang chủ</Link>
            <span>/</span>
            <span>Cài đặt</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Cài đặt
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Quản lý tài khoản và tùy chỉnh trải nghiệm của bạn
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="md:w-64 flex-shrink-0">
            <nav className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <button
                onClick={() => setActiveTab('account')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  activeTab === 'account'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Tài khoản
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  activeTab === 'notifications'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Thông báo
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  activeTab === 'privacy'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Bảo mật
              </button>
              <button
                onClick={() => setActiveTab('appearance')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  activeTab === 'appearance'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                Giao diện
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              {/* Account Tab */}
              {activeTab === 'account' && (
                <div className="p-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Thông tin tài khoản</h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-20 h-20 rounded-full bg-cover bg-center"
                        style={{
                          backgroundImage: `url("${user?.profileImageUrl || `https://ui-avatars.com/api/?name=${user?.firstName || 'User'}&background=2b8cee&color=fff&size=80`}")`,
                        }}
                      />
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {user?.firstName} {user?.lastName}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
                        <Link
                          to="/profile"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                        >
                          Chỉnh sửa hồ sơ
                        </Link>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                      <h4 className="font-medium text-slate-900 dark:text-white mb-4">Thông tin liên kết</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="text-slate-700 dark:text-slate-300">{user?.email}</span>
                          </div>
                          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                            Đã xác thực
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                      <h4 className="font-medium text-slate-900 dark:text-white mb-4">Gói dịch vụ</h4>
                      <Link
                        to="/payments"
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <span className="text-slate-700 dark:text-slate-300">Xem lịch sử thanh toán và gói dịch vụ</span>
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="p-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Cài đặt thông báo</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white mb-4">Kênh thông báo</h4>
                      <div className="space-y-3">
                        <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer">
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="text-slate-700 dark:text-slate-300">Thông báo Email</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={notifications.email}
                            onChange={() => handleNotificationChange('email')}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer">
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span className="text-slate-700 dark:text-slate-300">Thông báo Push</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={notifications.push}
                            onChange={() => handleNotificationChange('push')}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer">
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-slate-700 dark:text-slate-300">Thông báo SMS</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={notifications.sms}
                            onChange={() => handleNotificationChange('sms')}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                      <h4 className="font-medium text-slate-900 dark:text-white mb-4">Loại thông báo</h4>
                      <div className="space-y-3">
                        <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer">
                          <span className="text-slate-700 dark:text-slate-300">Phân tích hoàn thành</span>
                          <input
                            type="checkbox"
                            checked={notifications.analysisComplete}
                            onChange={() => handleNotificationChange('analysisComplete')}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer">
                          <span className="text-slate-700 dark:text-slate-300">Báo cáo mới</span>
                          <input
                            type="checkbox"
                            checked={notifications.newReport}
                            onChange={() => handleNotificationChange('newReport')}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer">
                          <span className="text-slate-700 dark:text-slate-300">Tin tức & Khuyến mãi</span>
                          <input
                            type="checkbox"
                            checked={notifications.marketing}
                            onChange={() => handleNotificationChange('marketing')}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <div className="p-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Bảo mật & Quyền riêng tư</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white mb-4">Mật khẩu</h4>
                      <button className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          <span className="text-slate-700 dark:text-slate-300">Đổi mật khẩu</span>
                        </div>
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                      <h4 className="font-medium text-slate-900 dark:text-white mb-4">Phiên đăng nhập</h4>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">Phiên hiện tại</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">Trình duyệt này</p>
                            </div>
                          </div>
                          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                            Đang hoạt động
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                      <h4 className="font-medium text-red-600 dark:text-red-400 mb-4">Vùng nguy hiểm</h4>
                      <button className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        Xóa tài khoản
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === 'appearance' && (
                <div className="p-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Giao diện</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white mb-4">Chế độ hiển thị</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => !darkMode && toggleDarkMode()}
                          className={`p-4 rounded-lg border-2 transition-colors ${
                            !darkMode
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className="w-12 h-12 mx-auto mb-3 bg-white rounded-lg shadow-sm flex items-center justify-center">
                            <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
                            </svg>
                          </div>
                          <p className="font-medium text-slate-900 dark:text-white">Sáng</p>
                        </button>
                        <button
                          onClick={() => darkMode && toggleDarkMode()}
                          className={`p-4 rounded-lg border-2 transition-colors ${
                            darkMode
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className="w-12 h-12 mx-auto mb-3 bg-slate-800 rounded-lg shadow-sm flex items-center justify-center">
                            <svg className="w-6 h-6 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
                            </svg>
                          </div>
                          <p className="font-medium text-slate-900 dark:text-white">Tối</p>
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                      <h4 className="font-medium text-slate-900 dark:text-white mb-4">Ngôn ngữ</h4>
                      <select className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                        <option value="vi">Tiếng Việt</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
