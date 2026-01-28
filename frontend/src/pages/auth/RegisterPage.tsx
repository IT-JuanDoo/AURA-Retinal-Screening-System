import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, isLoading, error, clearError } = useAuthStore();
  
  // Determine user type from URL parameter, default to patient
  // Update when searchParams change
  const [userType, setUserType] = useState<'patient' | 'doctor'>(
    searchParams.get('type') === 'doctor' ? 'doctor' : 'patient'
  );

  // Update userType when searchParams change
  useEffect(() => {
    const type = searchParams.get('type') === 'doctor' ? 'doctor' : 'patient';
    setUserType(type);
    // Reset form when switching between patient/doctor
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      licenseNumber: '',
      specialization: '',
      yearsOfExperience: '',
      qualification: '',
      hospitalAffiliation: ''
    });
  }, [searchParams]);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Doctor-specific fields
    licenseNumber: '',
    specialization: '',
    yearsOfExperience: '',
    qualification: '',
    hospitalAffiliation: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    // Split fullName thành firstName và lastName
    const nameParts = formData.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const registerData: any = {
      email: formData.email,
      password: formData.password,
      firstName: firstName,
      lastName: lastName,
      phone: formData.phone,
      userType: userType
    };

    // Add doctor-specific fields if registering as doctor
    if (userType === 'doctor') {
      if (formData.licenseNumber) {
        registerData.licenseNumber = formData.licenseNumber;
      }
      if (formData.specialization) {
        registerData.specialization = formData.specialization;
      }
      if (formData.yearsOfExperience) {
        registerData.yearsOfExperience = parseInt(formData.yearsOfExperience) || null;
      }
      if (formData.qualification) {
        registerData.qualification = formData.qualification;
      }
      if (formData.hospitalAffiliation) {
        registerData.hospitalAffiliation = formData.hospitalAffiliation;
      }
    }

    const success = await register(registerData);

    if (success) {
      toast.success('Đăng ký thành công! Vui lòng kiểm tra email để xác thực.');
      navigate(`/login${userType === 'doctor' ? '?type=doctor' : ''}`);
    } else {
      toast.error(error || 'Đăng ký thất bại');
    }
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

        {/* Logo - Clickable to return to landing page */}
        <Link to="/" className="relative z-10 flex items-center gap-3 hover:opacity-90 transition-opacity cursor-pointer">
          <div className="size-11 text-primary bg-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">AURA</h2>
            <p className="text-xs text-blue-200 uppercase tracking-widest font-medium">Hệ thống Sàng lọc</p>
          </div>
        </Link>

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
          <span>© 2026 Hệ thống AURA.</span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
            </svg>
            Tuân thủ HIPAA
          </span>
        </div>
      </div>

      {/* Right Panel - Register Form */}
      <div className="w-full lg:w-[55%] flex flex-col relative bg-white dark:bg-background-dark">
        {/* Mobile Header */}
        <div className="lg:hidden p-4 flex items-center justify-between border-b border-border-light dark:border-border-dark">
          <Link to="/" className="flex items-center gap-2 text-text-main dark:text-white hover:opacity-90 transition-opacity cursor-pointer">
            <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
            <h2 className="text-lg font-bold">AURA</h2>
          </Link>
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
        <div className="flex-1 flex flex-col justify-center items-center px-6 py-6 lg:px-16">
          <div className="w-full max-w-[380px] space-y-5">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-text-main dark:text-white">
                Tạo tài khoản mới
              </h1>
              <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
                {userType === 'doctor' 
                  ? 'Nhập thông tin chi tiết để đăng ký tài khoản Bác sĩ.'
                  : 'Nhập thông tin chi tiết để bắt đầu với AURA.'}
              </p>
            </div>

            {/* Email Form */}
            <form className="space-y-3" onSubmit={handleSubmit}>
              {/* Full Name Field */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-text-main dark:text-white" htmlFor="fullName">
                  Họ và tên
                </label>
                <input
                  className="block w-full px-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-primary text-sm shadow-sm placeholder:text-gray-400 transition-all"
                  id="fullName"
                  name="fullName"
                  placeholder="Nguyễn Văn A"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-text-main dark:text-white" htmlFor="phone">
                  Số điện thoại
                </label>
                <div className="relative">
                  <input
                    className="block w-full px-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-primary text-sm shadow-sm placeholder:text-gray-400 transition-all"
                    id="phone"
                    name="phone"
                    placeholder="0901 234 567"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-secondary">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-text-main dark:text-white" htmlFor="email">
                  Địa chỉ Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    className="block w-full px-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-primary text-sm shadow-sm placeholder:text-gray-400 transition-all"
                    id="email"
                    name="email"
                    placeholder="ten@phongkham.com"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-secondary">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Doctor-specific fields */}
              {userType === 'doctor' && (
                <>
                  <div className="pt-2 pb-1 border-t border-border-light dark:border-border-dark">
                    <p className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                      Thông tin chuyên môn
                    </p>
                  </div>
                  
                  {/* License Number */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-text-main dark:text-white" htmlFor="licenseNumber">
                      Số giấy phép hành nghề
                    </label>
                    <input
                      className="block w-full px-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-primary text-sm shadow-sm placeholder:text-gray-400 transition-all"
                      id="licenseNumber"
                      name="licenseNumber"
                      placeholder="VD: DR-12345678"
                      type="text"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Specialization */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-text-main dark:text-white" htmlFor="specialization">
                      Chuyên khoa
                    </label>
                    <input
                      className="block w-full px-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-primary text-sm shadow-sm placeholder:text-gray-400 transition-all"
                      id="specialization"
                      name="specialization"
                      placeholder="VD: Nhãn khoa, Nội khoa..."
                      type="text"
                      value={formData.specialization}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Years of Experience & Qualification */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-text-main dark:text-white" htmlFor="yearsOfExperience">
                        Số năm kinh nghiệm
                      </label>
                      <input
                        className="block w-full px-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-primary text-sm shadow-sm placeholder:text-gray-400 transition-all"
                        id="yearsOfExperience"
                        name="yearsOfExperience"
                        placeholder="VD: 5"
                        type="number"
                        min="0"
                        value={formData.yearsOfExperience}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-text-main dark:text-white" htmlFor="qualification">
                        Bằng cấp
                      </label>
                      <input
                        className="block w-full px-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-primary text-sm shadow-sm placeholder:text-gray-400 transition-all"
                        id="qualification"
                        name="qualification"
                        placeholder="VD: Tiến sĩ, Thạc sĩ..."
                        type="text"
                        value={formData.qualification}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  {/* Hospital Affiliation */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-text-main dark:text-white" htmlFor="hospitalAffiliation">
                      Nơi công tác
                    </label>
                    <input
                      className="block w-full px-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-primary text-sm shadow-sm placeholder:text-gray-400 transition-all"
                      id="hospitalAffiliation"
                      name="hospitalAffiliation"
                      placeholder="VD: Bệnh viện Mắt Trung ương..."
                      type="text"
                      value={formData.hospitalAffiliation}
                      onChange={handleChange}
                    />
                  </div>
                </>
              )}

              {/* Password Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-text-main dark:text-white" htmlFor="password">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      className="block w-full px-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-primary text-sm shadow-sm placeholder:text-gray-400 transition-all"
                      id="password"
                      name="password"
                      placeholder="••••••••"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                    />
                    <button
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary hover:text-text-main transition-colors cursor-pointer focus:outline-none"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        {showPassword ? (
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        ) : (
                          <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-text-main dark:text-white" htmlFor="confirmPassword">
                    Xác nhận <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      className="block w-full px-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-primary text-sm shadow-sm placeholder:text-gray-400 transition-all"
                      id="confirmPassword"
                      name="confirmPassword"
                      placeholder="••••••••"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                    <button
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary hover:text-text-main transition-colors cursor-pointer focus:outline-none"
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        {showConfirmPassword ? (
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        ) : (
                          <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
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
                  'Tạo tài khoản'
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div className="text-center text-sm text-text-secondary">
              <p>
                Bạn đã có tài khoản?{' '}
                <Link className="font-semibold text-primary hover:text-primary-dark transition-colors" to="/login">
                  Đăng nhập ngay
                </Link>
              </p>
              <div className="flex justify-center gap-4 mt-3 text-xs opacity-70">
                <a className="hover:text-text-main dark:hover:text-white transition-colors" href="#">
                  Chính sách bảo mật
                </a>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <a className="hover:text-text-main dark:hover:text-white transition-colors" href="#">
                  Điều khoản sử dụng
                </a>
              </div>
              {userType === 'patient' && (
                <div className="mt-6 pt-4 border-t border-border-light dark:border-border-dark">
                  <Link
                    to="/register?type=doctor"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-sm shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 transition-all active:scale-[0.98]"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <span>Đăng kí bác sĩ</span>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
              )}
              {userType === 'doctor' && (
                <p className="mt-4 text-xs text-text-secondary dark:text-gray-500">
                  <Link className="hover:text-primary transition-colors flex items-center justify-center gap-1" to="/login">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Quay lại đăng nhập user
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
