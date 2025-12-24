import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

// Mock data - sẽ được thay thế bằng API call sau
const mockHealthData = {
  healthScore: 92,
  lastAnalysisDate: '24 tháng 10, 2023',
  status: 'stable', // 'stable' | 'warning' | 'critical'
  riskAssessment: 'low', // 'low' | 'medium' | 'high'
  cardiovascular: {
    status: 'good',
    title: 'Rủi ro thấp',
    description: 'Kích thước mạch máu trong giới hạn bình thường.'
  },
  diabeticRetinopathy: {
    status: 'good',
    title: 'Không phát hiện',
    description: 'Không tìm thấy vi phình mạch.'
  },
  bloodPressure: {
    status: 'warning',
    title: 'Cần theo dõi',
    description: 'Quan sát thấy dấu hiệu bắt chéo động-tĩnh mạch nhẹ.'
  },
  healthHistory: [
    { month: 'T5', score: 70 },
    { month: 'T6', score: 75 },
    { month: 'T7', score: 72 },
    { month: 'T8', score: 80 },
    { month: 'T9', score: 88 },
    { month: 'T10', score: 92 },
  ],
  recentReports: [
    { id: 1, title: 'Kiểm tra định kỳ năm', date: '24/10/2023', risk: 'low' },
    { id: 2, title: 'Quét theo dõi', date: '12/04/2023', risk: 'medium' },
    { id: 3, title: 'Sàng lọc ban đầu', date: '10/01/2023', risk: 'low' },
  ]
};

const PatientDashboard = () => {
  const { user, logout } = useAuthStore();
  const [selectedPeriod, setSelectedPeriod] = useState('6months');

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased min-h-screen flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="size-8 text-blue-500 flex items-center justify-center bg-blue-500/10 rounded-lg">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
              </div>
              <h2 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">AURA AI</h2>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link to="/dashboard" className="text-blue-500 font-semibold text-sm leading-normal flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Tổng quan
              </Link>
              <Link to="/history" className="text-slate-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-500 transition-colors text-sm font-medium leading-normal flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Lịch sử
              </Link>
              <Link to="/reports" className="text-slate-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-500 transition-colors text-sm font-medium leading-normal flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Báo cáo
              </Link>
              <Link to="/settings" className="text-slate-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-500 transition-colors text-sm font-medium leading-normal flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Cài đặt
              </Link>
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <button className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 relative">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">2</span>
              </button>
              
              <div className="relative group">
                <div 
                  className="h-8 w-8 rounded-full bg-cover bg-center ring-2 ring-slate-100 dark:ring-slate-800 cursor-pointer hover:ring-primary transition-all"
                  style={{ backgroundImage: `url("${user?.profileImageUrl || `https://ui-avatars.com/api/?name=${user?.firstName || 'User'}&background=2b8cee&color=fff`}")` }}
                  title={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Người dùng'}
                />
                
                {/* Dropdown menu */}
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  {/* User Info Header */}
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Người dùng'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {user?.email || ''}
                    </p>
                  </div>
                  
                  {/* Menu Items */}
                  <div className="p-2">
                    <Link 
                      to="/profile" 
                      className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Hồ sơ</span>
                    </Link>
                    
                    <Link 
                      to="/settings" 
                      className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Cài đặt</span>
                    </Link>
                    
                    <div className="my-1 border-t border-slate-200 dark:border-slate-700"></div>
                    
                    <button 
                      onClick={logout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Chào mừng trở lại, {user?.firstName || 'Bạn'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Lần phân tích gần nhất: {mockHealthData.lastAnalysisDate}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Xuất tóm tắt
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Health Score Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-6 flex flex-col md:flex-row gap-6">
                {/* Retinal Image */}
                <div className="relative w-full md:w-1/3 aspect-video md:aspect-square rounded-lg overflow-hidden bg-slate-900 group">
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-80" 
                    style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCS_EfO0DWFwHZLP6cK_im4WSvx9EwqI5TWPbV8Cnewk6iDd2iFMlUEuzsfktUrbNTKx7ZwGK7LTh99rzKs082lUXvOFnzWQkuuEZ2A3OHqCkieZHf-H-Bn1vOqE27oiEoGQ9IqzlgQroSM93HqyA19mM8MfzPOPtLg2EIuv5wwIYn6-aXIEumrcfIKq0Vd90ycEENAnNKFZUYVoPAoV59noEsQZ7Q80o58qaixsIBqso59qWwnBNWqgKFmO9oEWPgR0xrFDLQi7pBv")' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  <div className="absolute bottom-3 left-3">
                    <span className="bg-blue-500/20 text-blue-100 border border-blue-500/30 text-xs px-2 py-1 rounded-full font-medium backdrop-blur-sm">
                      Đã phân tích AI
                    </span>
                  </div>
                </div>

                {/* Health Info */}
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-3 w-3 rounded-full bg-emerald-500"></span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                      Tình trạng ổn định
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    Đánh giá Rủi ro Thấp
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mb-6">
                    Điểm sức khỏe võng mạc của bạn là <strong className="text-slate-900 dark:text-white">{mockHealthData.healthScore}/100</strong>. 
                    Không phát hiện rủi ro hệ thống ngay lập tức. Tiếp tục theo dõi định kỳ.
                  </p>
                  
                  {/* Score Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      <span>Điểm rủi ro</span>
                      <span>{mockHealthData.healthScore}%</span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-500"
                        style={{ width: `${mockHealthData.healthScore}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6 flex gap-3">
                    <button className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2">
                      Xem báo cáo chi tiết
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Indicator Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Cardiovascular */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-3 hover:border-blue-500/30 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg text-rose-500 dark:text-rose-400 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <svg className="w-6 h-6 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Tim mạch</p>
                  <h4 className="text-slate-900 dark:text-white font-bold text-lg">{mockHealthData.cardiovascular.title}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{mockHealthData.cardiovascular.description}</p>
                </div>
              </div>

              {/* Diabetic Retinopathy */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-3 hover:border-blue-500/30 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <svg className="w-6 h-6 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Võng mạc đái tháo đường</p>
                  <h4 className="text-slate-900 dark:text-white font-bold text-lg">{mockHealthData.diabeticRetinopathy.title}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{mockHealthData.diabeticRetinopathy.description}</p>
                </div>
              </div>

              {/* Blood Pressure */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-3 hover:border-amber-500/30 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-500 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Huyết áp</p>
                  <h4 className="text-slate-900 dark:text-white font-bold text-lg">{mockHealthData.bloodPressure.title}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{mockHealthData.bloodPressure.description}</p>
                </div>
              </div>
            </div>

            {/* Health Score History Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Lịch sử Điểm Sức khỏe</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Theo dõi điểm sức khỏe võng mạc của bạn trong 6 tháng qua</p>
                </div>
                <select 
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border-none text-sm rounded-lg py-1 px-3 text-slate-600 dark:text-slate-300 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="6months">6 tháng qua</option>
                  <option value="1year">Năm qua</option>
                </select>
              </div>
              
              {/* Chart */}
              <div className="h-48 w-full flex items-end justify-between gap-2 md:gap-4 px-2">
                {mockHealthData.healthHistory.map((item, index) => {
                  const isLatest = index === mockHealthData.healthHistory.length - 1;
                  const heightPercent = (item.score / 100) * 100;
                  
                  return (
                    <div key={item.month} className="group relative flex-1 flex flex-col items-center">
                      <div 
                        className={`w-full rounded-t-sm transition-all cursor-pointer ${
                          isLatest 
                            ? 'bg-blue-500/80 hover:bg-blue-500 shadow-[0_0_15px_rgba(43,140,238,0.4)]' 
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      >
                        <div className={`absolute -top-8 left-1/2 -translate-x-1/2 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                          isLatest ? 'bg-blue-500 font-bold' : 'bg-slate-800'
                        }`}>
                          {item.score}
                        </div>
                      </div>
                      <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium ${
                        isLatest ? 'text-blue-500 font-bold' : 'text-slate-400'
                      }`}>
                        {item.month}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="h-6 w-full"></div>
            </div>
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Upload New Scan */}
            <div className="bg-gradient-to-br from-blue-500/10 to-transparent dark:from-blue-500/20 dark:to-slate-900 rounded-xl p-6 border border-blue-500/20 flex flex-col items-center text-center gap-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-sm text-blue-500 z-10">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="z-10">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cần quét hình ảnh mới?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Tải lên hình ảnh đáy mắt mới để AI phân tích ngay lập tức.</p>
              </div>
              <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-bold text-sm shadow-md transition-colors z-10 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Tải lên Ảnh Đáy mắt
              </button>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 z-10 mt-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Bảo mật & Tuân thủ Y tế</span>
              </div>
            </div>

            {/* Recent Reports */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-full max-h-[400px]">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-xl">
                <h3 className="font-bold text-slate-900 dark:text-white">Báo cáo gần đây</h3>
                <Link to="/reports" className="text-xs font-semibold text-blue-500 hover:underline">Xem tất cả</Link>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                <div className="space-y-1">
                  {mockHealthData.recentReports.map((report) => (
                    <div key={report.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group cursor-pointer">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        report.risk === 'low' 
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          : report.risk === 'medium'
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      }`}>
                        {report.risk === 'low' ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{report.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {report.date} • {report.risk === 'low' ? 'Rủi ro thấp' : report.risk === 'medium' ? 'Rủi ro trung bình' : 'Rủi ro cao'}
                        </p>
                      </div>
                      <button className="text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Doctor Consultation CTA */}
            <div className="bg-blue-600 rounded-xl p-5 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 text-white/10">
                <svg className="w-28 h-28" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/>
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-1 relative z-10">Cần tư vấn bác sĩ?</h3>
              <p className="text-blue-100 text-sm mb-4 relative z-10">Chia sẻ báo cáo AI của bạn trực tiếp với phòng khám của Bác sĩ Tâm.</p>
              <button className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold py-2 px-4 rounded-lg backdrop-blur-sm transition-colors relative z-10 flex items-center gap-2">
                Chia sẻ báo cáo
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center px-4 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto space-y-4">
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            <span className="font-bold">Tuyên bố miễn trừ trách nhiệm y tế:</span> AURA AI là một công cụ sàng lọc được thiết kế để hỗ trợ các chuyên gia y tế. 
            Nó không phải là công cụ chẩn đoán và không thay thế lời khuyên của bác sĩ có chuyên môn. 
            Nếu bạn đang gặp phải những thay đổi về thị lực hoặc đau mắt, vui lòng tìm kiếm sự chăm sóc y tế ngay lập tức.
          </p>
          <div className="flex justify-center gap-6 text-xs text-slate-400">
            <Link to="/privacy" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Chính sách bảo mật</Link>
            <Link to="/terms" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Điều khoản dịch vụ</Link>
            <Link to="/support" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Hỗ trợ</Link>
          </div>
          <p className="text-xs text-slate-300 dark:text-slate-600">© 2024 AURA AI Inc.</p>
        </div>
      </footer>
    </div>
  );
};

export default PatientDashboard;

