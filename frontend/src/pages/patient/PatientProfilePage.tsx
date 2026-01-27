import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { uploadAvatar } from '../../services/cloudinaryService';
import userService from '../../services/userService';

interface PatientProfile {
  fullName: string;
  dateOfBirth: string;
  gender: 'Nam' | 'Nữ' | 'Khác';
  email: string;
  phone: string;
  address: string;
  profileImageUrl?: string;
  
  // Medical info
  hasHypertension: boolean;
  hypertensionDiagnosedDate?: string;
  diabetesType: 'Không' | 'Tuýp 1' | 'Tuýp 2' | 'Thai kỳ';
  diabetesTreatment?: string;
  smokingStatus: 'never' | 'quit' | 'active';
  familyHistory?: string;
  
  // Profile completion
  profileCompletion: number;
}

const PatientProfilePage = () => {
  const { user, fetchCurrentUser } = useAuthStore();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  
  const [profile, setProfile] = useState<PatientProfile>({
    fullName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Nguyễn Văn A',
    dateOfBirth: '1985-05-15',
    gender: 'Nam',
    email: user?.email || 'nguyenvana@example.com',
    phone: '0912 345 678',
    address: 'Số 123, Đường ABC, Quận 1, TP.HCM',
    profileImageUrl: user?.profileImageUrl,
    hasHypertension: true,
    hypertensionDiagnosedDate: '2018',
    diabetesType: 'Tuýp 1',
    diabetesTreatment: 'Insulin',
    smokingStatus: 'quit',
    familyHistory: '',
    profileCompletion: 80,
  });

  useEffect(() => {
    // Load profile data from API if needed
    if (user?.email) {
      setProfile(prev => ({
        ...prev,
        email: user.email,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || prev.fullName,
        profileImageUrl: user.profileImageUrl || prev.profileImageUrl,
      }));
    }
  }, [user]);

  const handleProfileChange = (field: keyof PatientProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Split fullName into firstName and lastName
      const nameParts = profile.fullName.trim().split(' ');
      const firstName = nameParts.length > 0 ? nameParts[0] : '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      // Convert dateOfBirth to ISO format if needed
      const dob = profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString() : undefined;

      // Update profile via API
      await userService.updateProfile({
        firstName,
        lastName,
        phone: profile.phone,
        gender: profile.gender,
        address: profile.address,
        dob: dob,
        profileImageUrl: profile.profileImageUrl,
      });
      
      // Refresh user data in store
      await fetchCurrentUser();
      
      toast.success('Đã lưu thay đổi thành công!');
      setHasChanges(false);
    } catch (error: any) {
      console.error('Save profile error:', error);
      toast.error(error.response?.data?.message || 'Lưu thay đổi thất bại. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reload original data
    setHasChanges(false);
    toast('Đã hủy thay đổi');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('File phải là hình ảnh');
      return;
    }

    // Validate file size (max 10MB for Cloudinary)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 10MB');
      return;
    }

    try {
      setIsSaving(true);
      
      // Upload to Cloudinary
      const imageUrl = await uploadAvatar(file);
      
      // Save to backend immediately
      await userService.updateProfile({
        profileImageUrl: imageUrl
      });
      
      // Update local state
      setProfile(prev => ({ ...prev, profileImageUrl: imageUrl }));
      setHasChanges(false); // No pending changes since we saved immediately
      
      // Refresh user data in store
      await fetchCurrentUser();
      
      toast.success('Tải ảnh đại diện thành công!');
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast.error(error.response?.data?.message || error.message || 'Tải ảnh thất bại. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateProfileCompletion = (): number => {
    let completed = 0;
    let total = 0;

    const fields = [
      profile.fullName,
      profile.dateOfBirth,
      profile.gender,
      profile.email,
      profile.phone,
      profile.address,
      profile.familyHistory,
    ];

    fields.forEach(field => {
      total++;
      if (field && field.toString().trim() !== '') completed++;
    });

    return Math.round((completed / total) * 100);
  };

  useEffect(() => {
    const completion = calculateProfileCompletion();
    setProfile(prev => ({ ...prev, profileCompletion: completion }));
  }, [profile.fullName, profile.dateOfBirth, profile.email, profile.phone, profile.address, profile.familyHistory]);

  const getCompletionStatus = () => {
    if (profile.profileCompletion >= 90) return { text: 'Rất tốt', color: 'text-emerald-600 bg-emerald-100' };
    if (profile.profileCompletion >= 70) return { text: 'Khá tốt', color: 'text-blue-600 bg-blue-100' };
    if (profile.profileCompletion >= 50) return { text: 'Trung bình', color: 'text-amber-600 bg-amber-100' };
    return { text: 'Cần cải thiện', color: 'text-red-600 bg-red-100' };
  };

  const completionStatus = getCompletionStatus();

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#e7edf3] dark:border-b-gray-700 bg-white dark:bg-[#1a2632] px-6 py-3 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-primary">
            <div className="size-8 flex items-center justify-center rounded bg-primary/10">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-black tracking-tight text-[#0d141b] dark:text-white">AURA</h2>
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <button className="relative text-gray-500 hover:text-primary transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
          </button>
          <div className="flex items-center gap-3 pl-6 border-l border-gray-100 dark:border-gray-700">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-semibold text-[#0d141b] dark:text-white">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="text-xs text-[#4c739a] dark:text-gray-400">Bệnh nhân</span>
            </div>
            <div className="relative group">
              <div 
                className="h-10 w-10 rounded-full bg-cover bg-center border-2 border-white shadow-sm ring-2 ring-gray-50 cursor-pointer hover:ring-primary transition-all"
                style={{ backgroundImage: `url("${profile.profileImageUrl || `https://ui-avatars.com/api/?name=${user?.firstName || 'User'}&background=2b8cee&color=fff`}")` }}
              />
              
              {/* Dropdown menu */}
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1a2632] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                {/* User Info Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <p className="text-sm font-semibold text-[#0d141b] dark:text-white truncate">
                    {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Người dùng'}
                  </p>
                  <p className="text-xs text-[#4c739a] dark:text-gray-400 truncate mt-0.5">
                    {user?.email || ''}
                  </p>
                </div>
                
                {/* Menu Items */}
                <div className="p-2">
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Hồ sơ</span>
                  </Link>
                  
                  {/* Đã ẩn trang Cài đặt riêng, không hiển thị mục này trong dropdown hồ sơ */}
                  
                  <div className="my-1 border-t border-gray-200 dark:border-gray-700"></div>
                  
                  {/* Nút đăng xuất sử dụng trong dropdown của PatientHeader, nên có thể bỏ ở đây nếu muốn */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 bg-white dark:bg-[#1a2632] border-r border-[#e7edf3] dark:border-gray-700 overflow-y-auto hidden md:flex flex-col">
          <div className="flex flex-col p-4 gap-6">
            <div className="flex flex-col px-2">
              <p className="text-xs font-bold text-[#4c739a] dark:text-gray-500 uppercase tracking-wider mb-2">Menu</p>
              <nav className="flex flex-col gap-1">
                <Link 
                  to="/profile" 
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary border-l-4 border-primary"
                >
                  <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-medium">Hồ sơ cá nhân</span>
                </Link>
                <Link 
                  to="/reports" 
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <svg className="w-[22px] h-[22px] group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium">Kết quả phân tích</span>
                </Link>
              </nav>
            </div>
            <div className="mt-auto rounded-xl bg-gradient-to-br from-primary to-[#1a6ab5] p-4 text-white">
              <div className="mb-3 size-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold mb-1">Kiểm tra mắt AI</h3>
              <p className="text-xs text-white/80 mb-3">Phát hiện sớm các dấu hiệu bệnh lý võng mạc.</p>
              <button 
                onClick={() => navigate('/dashboard')}
                className="w-full rounded bg-white py-1.5 text-xs font-semibold text-primary shadow-sm hover:bg-gray-50 transition-colors"
              >
                Đặt lịch ngay
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-4 md:p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Breadcrumb */}
            <nav className="flex text-sm font-medium text-gray-500 mb-2">
              <ol className="flex items-center space-x-2">
                <li><Link to="/dashboard" className="hover:text-primary transition-colors">Trang chủ</Link></li>
                <li><span className="text-gray-400">/</span></li>
                <li><Link to="/profile" className="hover:text-primary transition-colors">Tài khoản</Link></li>
                <li><span className="text-gray-400">/</span></li>
                <li className="text-primary font-semibold">Hồ sơ cá nhân</li>
              </ol>
            </nav>

            {/* Header with buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#0d141b] dark:text-white tracking-tight">
                  Hồ sơ cá nhân & Y tế
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Quản lý thông tin định danh và tiền sử y tế của bạn để AI chẩn đoán chính xác nhất.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  disabled={!hasChanges || isSaving}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium text-sm bg-white dark:bg-transparent hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                  className="px-4 py-2 rounded-lg bg-primary text-white font-medium text-sm shadow-sm hover:bg-primary-dark transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - 2/3 */}
              <div className="lg:col-span-2 space-y-6">
                {/* Personal Information Section */}
                <section className="bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Thông tin cá nhân</h3>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-green-100 text-green-700 rounded-full border border-green-200 flex items-center gap-1">
                      <svg className="w-[14px] h-[14px]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Đã xác thực
                    </span>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-8 mb-6">
                      {/* Avatar Upload */}
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative group cursor-pointer">
                          <div 
                            className="w-28 h-28 rounded-full bg-cover bg-center ring-4 ring-gray-50 dark:ring-gray-700 shadow-md"
                            style={{ backgroundImage: `url("${profile.profileImageUrl || `https://ui-avatars.com/api/?name=${profile.fullName}&background=2b8cee&color=fff`}")` }}
                          >
                            <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                          </div>
                          <input
                            type="file"
                            accept="image/jpeg,image/png"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="avatar-upload"
                          />
                          <label
                            htmlFor="avatar-upload"
                            className="absolute bottom-1 right-1 p-2 bg-primary text-white rounded-full shadow-lg hover:bg-primary-dark transition-colors border-2 border-white dark:border-gray-800 cursor-pointer"
                          >
                            <svg className="w-4 h-4 block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </label>
                        </div>
                        <span className="text-xs text-gray-500 text-center">JPG, PNG tối đa 2MB</span>
                      </div>

                      {/* Form Fields */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Họ và tên
                          </label>
                          <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <svg className="w-[18px] h-[18px] text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <input
                              type="text"
                              className="pl-10 w-full rounded-lg border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600 focus:border-primary focus:ring-primary dark:text-white text-sm py-2.5"
                              placeholder="Nhập họ và tên đầy đủ"
                              value={profile.fullName}
                              onChange={(e) => handleProfileChange('fullName', e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Ngày sinh
                          </label>
                          <input
                            type="date"
                            className="w-full rounded-lg border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600 focus:border-primary focus:ring-primary dark:text-white text-sm py-2.5"
                            value={profile.dateOfBirth}
                            onChange={(e) => handleProfileChange('dateOfBirth', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Giới tính
                          </label>
                          <select
                            className="w-full rounded-lg border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600 focus:border-primary focus:ring-primary dark:text-white text-sm py-2.5"
                            value={profile.gender}
                            onChange={(e) => handleProfileChange('gender', e.target.value as 'Nam' | 'Nữ' | 'Khác')}
                          >
                            <option>Nam</option>
                            <option>Nữ</option>
                            <option>Khác</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-6 border-t border-gray-100 dark:border-gray-700">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Email liên hệ
                        </label>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <svg className="w-[18px] h-[18px] text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <input
                            type="email"
                            className="pl-10 w-full rounded-lg border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600 focus:border-primary focus:ring-primary dark:text-white text-sm py-2.5"
                            value={profile.email}
                            onChange={(e) => handleProfileChange('email', e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Số điện thoại
                        </label>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <svg className="w-[18px] h-[18px] text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </div>
                          <input
                            type="tel"
                            className="pl-10 w-full rounded-lg border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600 focus:border-primary focus:ring-primary dark:text-white text-sm py-2.5"
                            value={profile.phone}
                            onChange={(e) => handleProfileChange('phone', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Địa chỉ
                        </label>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <svg className="w-[18px] h-[18px] text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            className="pl-10 w-full rounded-lg border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600 focus:border-primary focus:ring-primary dark:text-white text-sm py-2.5"
                            value={profile.address}
                            onChange={(e) => handleProfileChange('address', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Medical Information Section */}
                <section className="bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-blue-50/50 dark:bg-blue-900/10">
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Thông tin y tế cơ bản</h3>
                    </div>
                    <span className="text-xs text-gray-500 italic flex items-center gap-1">
                      <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Cập nhật: {new Date().toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Hypertension */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-blue-200 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex flex-col">
                            <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              Cao huyết áp
                            </label>
                            <span className="text-xs text-gray-500 mt-1">Tiền sử bệnh lý tim mạch</span>
                          </div>
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={profile.hasHypertension}
                              onChange={(e) => handleProfileChange('hasHypertension', e.target.checked)}
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 dark:peer-focus:ring-blue-900 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                          </label>
                        </div>
                        {profile.hasHypertension && (
                          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 p-2 rounded">
                            <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Đã chẩn đoán từ {profile.hypertensionDiagnosedDate || '2018'}
                          </div>
                        )}
                      </div>

                      {/* Diabetes */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-blue-200 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-bold text-gray-900 dark:text-white">Tiểu đường</label>
                          <select
                            className="rounded-md border-gray-300 text-sm py-1 pl-2 pr-8 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:border-primary focus:ring-primary shadow-sm"
                            value={profile.diabetesType}
                            onChange={(e) => handleProfileChange('diabetesType', e.target.value as PatientProfile['diabetesType'])}
                          >
                            <option>Không</option>
                            <option>Tuýp 1</option>
                            <option>Tuýp 2</option>
                            <option>Thai kỳ</option>
                          </select>
                        </div>
                        {profile.diabetesType !== 'Không' && (
                          <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 p-2 rounded">
                            <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                            {profile.diabetesTreatment || 'Đang điều trị'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Smoking Status */}
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <svg className="w-[18px] h-[18px] text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                        </svg>
                        Tiền sử hút thuốc
                      </label>
                      <div className="flex gap-6">
                        <label className="flex items-center cursor-pointer group">
                          <input
                            type="radio"
                            className="h-4 w-4 border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            name="smoke"
                            value="never"
                            checked={profile.smokingStatus === 'never'}
                            onChange={(e) => handleProfileChange('smokingStatus', e.target.value as PatientProfile['smokingStatus'])}
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">
                            Không bao giờ
                          </span>
                        </label>
                        <label className="flex items-center cursor-pointer group">
                          <input
                            type="radio"
                            className="h-4 w-4 border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            name="smoke"
                            value="quit"
                            checked={profile.smokingStatus === 'quit'}
                            onChange={(e) => handleProfileChange('smokingStatus', e.target.value as PatientProfile['smokingStatus'])}
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">
                            Đã bỏ thuốc
                          </span>
                        </label>
                        <label className="flex items-center cursor-pointer group">
                          <input
                            type="radio"
                            className="h-4 w-4 border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            name="smoke"
                            value="active"
                            checked={profile.smokingStatus === 'active'}
                            onChange={(e) => handleProfileChange('smokingStatus', e.target.value as PatientProfile['smokingStatus'])}
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">
                            Đang hút
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Family History */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <svg className="w-[18px] h-[18px] text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Tiền sử gia đình (Mắt & Tim mạch)
                      </label>
                      <textarea
                        className="w-full rounded-lg border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600 focus:border-primary focus:ring-primary dark:text-white text-sm p-3"
                        placeholder="Ví dụ: Bố bị tăng nhãn áp, mẹ bị tiểu đường..."
                        rows={3}
                        value={profile.familyHistory}
                        onChange={(e) => handleProfileChange('familyHistory', e.target.value)}
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column - 1/3 */}
              <div className="space-y-6">
                {/* Profile Completion */}
                <div className="bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    Độ hoàn thiện hồ sơ
                  </h3>
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className={`text-xs font-bold inline-block py-1 px-2 uppercase rounded-md ${completionStatus.color} dark:bg-opacity-20`}>
                          {completionStatus.text}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold inline-block text-primary">
                          {profile.profileCompletion}%
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-2.5 mb-4 text-xs flex rounded-full bg-gray-100 dark:bg-gray-700">
                      <div 
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500" 
                        style={{ width: `${profile.profileCompletion}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Hãy cập nhật đầy đủ tiền sử gia đình để hệ thống AI đưa ra cảnh báo chính xác hơn.
                    </p>
                  </div>
                </div>

                {/* Security Settings */}
                <section className="bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Bảo mật tài khoản</h3>
                  </div>
                  <div className="p-4 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Mật khẩu</span>
                        <span className="text-xs text-gray-500 mt-0.5">Đổi lần cuối 3 tháng trước</span>
                      </div>
                      <button className="text-xs px-3 py-1.5 rounded border border-gray-200 hover:border-primary text-gray-600 hover:text-primary transition-colors font-medium">
                        Thay đổi
                      </button>
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-4 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                          Bảo mật 2 lớp
                          <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1 rounded dark:bg-gray-700 dark:text-gray-300">2FA</span>
                        </span>
                        <span className="text-xs text-gray-500 mt-0.5">Xác thực qua SMS/Email</span>
                      </div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={twoFactorEnabled}
                          onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                        />
                        <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </section>

                {/* Security Notice */}
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
                  <div className="flex gap-3">
                    <div className="bg-white dark:bg-blue-900/50 p-1.5 rounded-full h-fit shadow-sm">
                      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Dữ liệu được mã hóa</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        Thông tin y tế của bạn được bảo mật tuyệt đối theo tiêu chuẩn HIPAA và chỉ phục vụ mục đích chẩn đoán y khoa.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-10"></div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PatientProfilePage;

