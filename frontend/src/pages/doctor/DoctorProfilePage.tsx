import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import doctorService, { DoctorDto } from '../../services/doctorService';
import toast from 'react-hot-toast';
import { uploadAvatar } from '../../services/cloudinaryService';
import userService from '../../services/userService';
import DoctorHeader from '../../components/doctor/DoctorHeader';

const DoctorProfilePage = () => {
  const { fetchCurrentUser } = useAuthStore();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [profile, setProfile] = useState<DoctorDto | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    specialization: '',
    yearsOfExperience: '',
    qualification: '',
    hospitalAffiliation: '',
    bio: '',
    profileImageUrl: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const doctorData = await doctorService.getCurrentDoctor();
      if (doctorData) {
        setProfile(doctorData);
        setFormData({
          firstName: doctorData.firstName || '',
          lastName: doctorData.lastName || '',
          email: doctorData.email || '',
          phone: doctorData.phone || '',
          gender: doctorData.gender || '',
          specialization: doctorData.specialization || '',
          yearsOfExperience: doctorData.yearsOfExperience?.toString() || '',
          qualification: doctorData.qualification || '',
          hospitalAffiliation: doctorData.hospitalAffiliation || '',
          bio: doctorData.bio || '',
          profileImageUrl: doctorData.profileImageUrl || '',
        });
      }
    } catch (error: any) {
      console.error('Error loading doctor profile:', error);
      toast.error('Lỗi khi tải thông tin hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update user profile (basic info)
      await userService.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        gender: formData.gender,
        profileImageUrl: formData.profileImageUrl?.split('?')[0] || formData.profileImageUrl, // Remove cache busting param
      });

      // Update doctor-specific fields
      await doctorService.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        gender: formData.gender,
        specialization: formData.specialization,
        yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : undefined,
        qualification: formData.qualification,
        hospitalAffiliation: formData.hospitalAffiliation,
        bio: formData.bio,
        profileImageUrl: formData.profileImageUrl?.split('?')[0] || formData.profileImageUrl, // Remove cache busting param
      });
      
      // Refresh user data in store
      await fetchCurrentUser();
      await loadProfile();
      
      toast.success('Đã lưu thay đổi thành công!');
      setHasChanges(false);
    } catch (error: any) {
      console.error('Save profile error:', error);
      toast.error(error.response?.data?.message || 'Lưu thay đổi thất bại. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File phải là hình ảnh');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 10MB');
      return;
    }

    try {
      setIsSaving(true);
      
      const imageUrl = await uploadAvatar(file);
      
      await userService.updateProfile({
        profileImageUrl: imageUrl
      });
      
      // Update both formData and profile state immediately with cache busting
      const imageUrlWithCache = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
      setFormData(prev => ({ ...prev, profileImageUrl: imageUrlWithCache }));
      setProfile(prev => prev ? { ...prev, profileImageUrl: imageUrl } : null);
      setHasChanges(false);
      
      // Refresh user data in store
      await fetchCurrentUser();
      
      // Small delay to ensure backend has processed the update
      setTimeout(async () => {
        await loadProfile();
      }, 500);
      
      toast.success('Tải ảnh đại diện thành công!');
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast.error(error.response?.data?.message || error.message || 'Tải ảnh thất bại. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <DoctorHeader />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DoctorHeader />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/doctor/dashboard')}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 mb-4 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại
          </button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Hồ sơ Bác sĩ
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Quản lý thông tin cá nhân và chuyên môn của bạn
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-8 pb-8 border-b border-slate-200 dark:border-slate-700">
            <div className="relative mb-4">
              <img
                src={formData.profileImageUrl || `https://ui-avatars.com/api/?name=${formData.firstName || 'Doctor'}&background=2b8cee&color=fff`}
                alt={`${formData.firstName} ${formData.lastName}`}
                className="h-32 w-32 rounded-full object-cover ring-4 ring-slate-100 dark:ring-slate-800"
                key={formData.profileImageUrl || 'default-avatar'} // Force re-render when image URL changes
                onError={(e) => {
                  // Fallback to default avatar if image fails to load
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('ui-avatars.com')) {
                    target.src = `https://ui-avatars.com/api/?name=${formData.firstName || 'Doctor'}&background=2b8cee&color=fff`;
                  }
                }}
              />
              <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 001.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isSaving}
                />
              </label>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {formData.firstName} {formData.lastName}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">{formData.specialization || 'Bác sĩ'}</p>
            {profile?.isVerified && (
              <span className="mt-2 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                ✓ Đã xác thực
              </span>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Thông tin cơ bản</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Họ
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleFieldChange('lastName', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Tên
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleFieldChange('firstName', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Email không thể thay đổi</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Giới tính
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleFieldChange('gender', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Thông tin chuyên môn</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Chuyên khoa
                  </label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => handleFieldChange('specialization', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Số năm kinh nghiệm
                  </label>
                  <input
                    type="number"
                    value={formData.yearsOfExperience}
                    onChange={(e) => handleFieldChange('yearsOfExperience', e.target.value)}
                    min="0"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Bằng cấp
                  </label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => handleFieldChange('qualification', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Bệnh viện/Phòng khám
                  </label>
                  <input
                    type="text"
                    value={formData.hospitalAffiliation}
                    onChange={(e) => handleFieldChange('hospitalAffiliation', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              {profile?.licenseNumber && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Số giấy phép hành nghề
                  </label>
                  <input
                    type="text"
                    value={profile.licenseNumber}
                    disabled
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Giới thiệu
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleFieldChange('bio', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Giới thiệu về bản thân..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
            <button
              onClick={() => navigate('/doctor/dashboard')}
              className="px-6 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorProfilePage;
