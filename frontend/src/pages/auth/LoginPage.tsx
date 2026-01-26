import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import FacebookLogin from '@greatsumini/react-facebook-login';
import { useAuthStore } from '../../store/authStore';
import doctorService from '../../services/doctorService';
import toast from 'react-hot-toast';

// Facebook App ID từ environment variables
const facebookAppId = (import.meta as any).env.VITE_FACEBOOK_APP_ID || '';

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, googleLogin, facebookLogin, isLoading, error, clearError } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Clear form when searchParams change
  useEffect(() => {
    setEmail('');
    setPassword('');
    clearError();
  }, [searchParams, clearError]);

  // Helper function to check if user is doctor and redirect accordingly
  // Always check the actual role, not just the URL parameter
  const handlePostLoginRedirect = async () => {
    try {
      // Try to get doctor profile - if successful, user is a doctor
      const doctor = await doctorService.getCurrentDoctor();
      if (doctor) {
        // User is a doctor, redirect to doctor dashboard
        navigate('/doctor/dashboard');
      } else {
        // User is not a doctor, redirect to patient dashboard
        navigate('/dashboard');
      }
    } catch (error: any) {
      // On any error, redirect to patient dashboard (safer default)
      console.warn('Error checking doctor status:', error);
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    const success = await login({ email, password });
    if (success) {
      toast.success('Đăng nhập thành công!');
      await handlePostLoginRedirect();
    } else {
      toast.error(error || 'Đăng nhập thất bại');
    }
  };

  // Google OAuth Login Hook
  const handleGoogleLoginClick = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // Gửi access_token lên backend để xác thực
        const success = await googleLogin(tokenResponse.access_token);
        if (success) {
          toast.success('Đăng nhập bằng Google thành công!');
          await handlePostLoginRedirect();
        } else {
          toast.error(error || 'Đăng nhập Google thất bại');
        }
      } catch (err: any) {
        console.error('Google login error:', err);
        const errorMessage = err?.response?.data?.message || 'Đăng nhập Google thất bại';
        toast.error(errorMessage);
      }
    },
    onError: (errorResponse) => {
      console.error('Google OAuth error:', errorResponse);
      toast.error('Đăng nhập Google thất bại. Vui lòng thử lại.');
    },
    scope: 'openid email profile', // Thêm scope để lấy thông tin user
  });

  const handleGoogleLogin = () => {
    handleGoogleLoginClick();
  };

  // Facebook OAuth Login Handler
  const handleFacebookLoginSuccess = async (response: { accessToken: string }) => {
    try {
      const success = await facebookLogin(response.accessToken);
      if (success) {
        toast.success('Đăng nhập bằng Facebook thành công!');
        await handlePostLoginRedirect();
      } else {
        toast.error(error || 'Đăng nhập Facebook thất bại');
      }
    } catch (err) {
      console.error('Facebook login error:', err);
      toast.error('Đăng nhập Facebook thất bại');
    }
  };

  const handleFacebookLoginError = (error: { status: string }) => {
    console.error('Facebook OAuth error:', error);
    toast.error('Đăng nhập Facebook thất bại');
  };

  return (
    <div className="bg-background-light dark:bg-background-dark h-screen flex font-display text-text-main dark:text-white transition-colors duration-200 overflow-hidden">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex w-[45%] relative bg-surface-dark overflow-hidden flex-col justify-between p-10 text-white">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            alt="Abstract Retinal Background"
            className="w-full h-full object-cover opacity-50 mix-blend-overlay"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAM8hBUYvH_Qm04ce9TJVuQBVJXuHyZM35HU6T5oWLIJenFAzLKQrcAe-3Y17J2WfFoQGZV19j9nKLBF1u-IB_Eo7zBzuqkxo2dkXeFdejT2MBtBiaJ9GCzbbL-1NX1JLZrISt8fE0S5FrtaiRRoSgiAxA31jwm_JAoQRD8Jn5M97mfNj8SiMrNJRjJk3eyRSeNDpquxAurSq8Fc2IrvzYjskt54nOQsi_PCLRVCxW6STY7qTRRjBOReOgabwQGJ0gmW7wrsmWBtPSU"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-slate-900/95 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-90"></div>
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="size-11 text-primary bg-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">AURA</h2>
            <p className="text-xs text-blue-200 uppercase tracking-widest font-medium">Hệ thống Sàng lọc</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10">
          <div className="space-y-5 max-w-md">
            <div className="inline-flex items-center rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200 backdrop-blur-sm">
              Hỗ trợ Quyết định Lâm sàng (CDS)
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Phân tích Mạch máu Võng mạc bằng AI.
            </h1>
            <p className="text-base text-blue-100 font-light leading-relaxed opacity-90">
              AURA hỗ trợ bác sĩ và phòng khám phát hiện sớm các nguy cơ sức khỏe toàn thân thông qua phân tích hình ảnh võng mạc tự động, tiên tiến.
            </p>
            <div className="pt-5 flex items-center gap-4 border-t border-white/10">
              <div className="flex -space-x-2">
                <img alt="Doctor Profile" className="inline-block h-10 w-10 rounded-full ring-2 ring-surface-dark object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5qoD80bKo3fnnoVIVkRgANix_72ISSyJooBrZjWsAkvyUkxGJEZo2C9HNUaub8ApISpE3O0e1bXAeDuGyBPd67h8vNko5uzu1Dbnb1RCxr9WUldymMsoB6nJH1BAtxNM13BTVSdHSd6wF-Kluc7ImmOzOZhy8tSr29FeEHGu1MLqcs-Q8r5d-hz3EZi3DNgMDthh6IHiRESyRTb5oDp0muB5b3dKZVoixUsFcLD76K8vzf0VQ4rznNWlZ-jZ_sYod0NbfawEXIbpb"/>
                <img alt="Researcher Profile" className="inline-block h-10 w-10 rounded-full ring-2 ring-surface-dark object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAMK_XPZY32bKH5jJCoV1uBpDCYvWSlWwiefxS-DIChz070fZdFPnl5WpmWvCwoat4ba03mCN9Yj7wac9fRNONdFyBHb6skVIM4u2a_8jb9CQD-gb9ON0EYl5Neu6wVuHQ2iAUWdiPGhw-xgh1UCTmzKhyxCZIHy9C_7nQ4x_khGJ7ARlOpa6C2TQRuNcPJFI0q2SbRASVYu6cqWAXxJ_Pb0VnlOYbSSJ6sL2KlU9ztfo8pElHUSNzyC-NJXj-iuZOekRAiHlOQGz7o"/>
                <img alt="Staff Profile" className="inline-block h-10 w-10 rounded-full ring-2 ring-surface-dark object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCk-xVSvXxFrdpVQIDrFWz8R0dmInh_040ePYuISqW1DsexGgAVlcQSzLXC_Z-KMCk9HyKSgeHYtFUrQrepaSVaHdxAG48nNWZ4YOHQU-ABm9txpzJAz6Llr56L6naaUO6zqBQKTTjAiMD6nIzE2iy3F_datKZJ8aZ90dp2x1Wn-y6CEYOJzOzg3gZkMy7xRPt3BEXuqt2PSo5ahgSp7eUXbmnS1uRVyfdwxfY2kX8g65ZfTFU2F_3Ycscfsv3z4p_nM6FxCBbvVWUe"/>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Được các chuyên gia tin dùng</p>
                <p className="text-xs text-blue-200">Sử dụng tại hơn 2.000 phòng khám</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-400 flex justify-between w-full">
          <span>© 2024 Hệ thống AURA.</span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
            </svg>
            Tuân thủ HIPAA
          </span>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-[55%] flex flex-col relative bg-white dark:bg-background-dark">
        {/* Mobile Header */}
        <div className="lg:hidden p-4 flex items-center justify-between border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-2 text-text-main dark:text-white">
            <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
            <h2 className="text-lg font-bold">AURA</h2>
          </div>
        </div>

        {/* Help Button */}
        <div className="absolute top-5 right-6 hidden lg:block">
          <button className="text-text-secondary hover:text-primary text-sm font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-background-light dark:hover:bg-surface-dark transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/>
            </svg>
            Trung tâm trợ giúp
          </button>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex flex-col justify-center items-center px-6 py-8 lg:px-16">
          <div className="w-full max-w-[380px] space-y-6">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-text-main dark:text-white">
                Chào mừng đến với AURA
              </h1>
              <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
                Đăng nhập để truy cập hệ thống
              </p>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-3 py-2.5 border border-border-light dark:border-border-dark rounded-lg hover:bg-background-light dark:hover:bg-surface-dark transition-all bg-white dark:bg-transparent disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-sm font-medium text-text-main dark:text-white">Google</span>
              </button>

              <FacebookLogin
                appId={facebookAppId}
                onSuccess={handleFacebookLoginSuccess}
                onFail={handleFacebookLoginError}
                render={({ onClick }) => (
                  <button
                    onClick={onClick}
                    disabled={isLoading || !facebookAppId}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 border border-border-light dark:border-border-dark rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all bg-white dark:bg-transparent disabled:opacity-50"
                  >
                    <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                      <path clipRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" fillRule="evenodd"/>
                    </svg>
                    <span className="text-sm font-medium text-text-main dark:text-white">Facebook</span>
                  </button>
                )}
              />
            </div>

            {/* Divider */}
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-border-light dark:border-border-dark"></div>
              <span className="flex-shrink-0 mx-4 text-xs font-medium text-text-secondary uppercase tracking-wider">
                hoặc
              </span>
              <div className="flex-grow border-t border-border-light dark:border-border-dark"></div>
            </div>

            {/* Email Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-main dark:text-white" htmlFor="email">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <input
                    className="block w-full px-4 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-primary text-sm shadow-sm placeholder:text-gray-400 transition-all"
                    id="email"
                    name="email"
                    placeholder="ten@phongkham.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-secondary">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-main dark:text-white" htmlFor="password">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    className="block w-full px-4 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-primary text-sm shadow-sm placeholder:text-gray-400 transition-all"
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary hover:text-text-main transition-colors cursor-pointer focus:outline-none"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary bg-white dark:bg-surface-dark dark:border-border-dark cursor-pointer"
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label className="ml-2 block text-sm text-text-main dark:text-gray-300 cursor-pointer" htmlFor="remember-me">
                    Ghi nhớ đăng nhập
                  </label>
                </div>
                <Link className="text-sm font-medium text-primary hover:text-primary-dark transition-colors" to="/forgot-password">
                  Quên mật khẩu?
                </Link>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                className="flex w-full justify-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-primary-dark hover:shadow-blue-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Đăng nhập'
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div className="text-center text-sm text-text-secondary">
              <p>
                Bạn chưa có tài khoản?{' '}
                <Link className="font-semibold text-primary hover:text-primary-dark transition-colors" to="/register">
                  Tạo tài khoản mới
                </Link>
              </p>
              <div className="flex justify-center gap-4 mt-4 text-xs opacity-70">
                <a className="hover:text-text-main dark:hover:text-white transition-colors" href="#">
                  Chính sách bảo mật
                </a>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <a className="hover:text-text-main dark:hover:text-white transition-colors" href="#">
                  Điều khoản sử dụng
                </a>
              </div>
              <p className="mt-4 text-xs text-text-secondary dark:text-gray-500">
                <Link className="hover:text-primary transition-colors" to="/register?type=doctor">
                  Đăng kí bác sĩ
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
