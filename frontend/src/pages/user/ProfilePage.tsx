import { useEffect, useState } from 'react';
import api from '../../services/api';

type UserProfile = {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  dob?: string;
  phone?: string;
  gender?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  identificationNumber?: string;
  profileImageUrl?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  bloodType?: string;
  heightCm?: number;
  weightKg?: number;
  allergies?: string;
  chronicConditions?: string;
  currentMedications?: string;
  familyHistory?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  lifestyle?: string;
  medicalNotes?: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
};

const emptyProfile: UserProfile = {
  id: '',
  email: '',
  isActive: true,
  isEmailVerified: false,
};

const ProfilePage = () => {
  const [userId, setUserId] = useState('');
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<UserProfile>(`/users/${userId}`);
      setProfile(data);
    } catch {
      setError('Không tìm thấy người dùng');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    if (!profile.email || !passwordForm.newPassword) {
      setError('Cần email và mật khẩu mới');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<UserProfile>('/users', {
        email: profile.email,
        password: passwordForm.newPassword,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        username: profile.username,
      });
      setProfile(data);
      setUserId(data.id);
    } catch {
      setError('Tạo người dùng thất bại (email có thể đã tồn tại)');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.put<UserProfile>(`/users/${userId}`, profile);
      setProfile(data);
    } catch {
      setError('Cập nhật hồ sơ thất bại');
    } finally {
      setLoading(false);
    }
  };

  const updateMedical = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.put<UserProfile>(`/users/${userId}/medical`, {
        bloodType: profile.bloodType,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        allergies: profile.allergies,
        chronicConditions: profile.chronicConditions,
        currentMedications: profile.currentMedications,
        familyHistory: profile.familyHistory,
        emergencyContactName: profile.emergencyContactName,
        emergencyContactPhone: profile.emergencyContactPhone,
        lifestyle: profile.lifestyle,
        medicalNotes: profile.medicalNotes,
      });
      setProfile(data);
    } catch {
      setError('Cập nhật thông tin y tế thất bại');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      await api.put(`/users/${userId}/password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch {
      setError('Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile.id) return;
    setUserId(profile.id);
  }, [profile.id]);

  const onProfileChange = (field: keyof UserProfile, value: any) =>
    setProfile((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-soft p-6 flex flex-wrap gap-3 items-center">
          <div>
            <h1 className="text-2xl font-bold text-text-main dark:text-white">
              Hồ sơ người dùng & Thông tin y tế
            </h1>
            <p className="text-text-secondary dark:text-gray-400 text-sm">
              Demo FR-8: CRUD, cập nhật hồ sơ, đổi mật khẩu, quản lý thông tin y tế.
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <button
              onClick={loadProfile}
              className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm"
              disabled={loading || !userId}
            >
              Tải hồ sơ
            </button>
            <button
              onClick={createUser}
              className="px-3 py-2 rounded-lg border text-sm"
              disabled={loading}
            >
              Tạo user mới
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {loading && <p className="text-sm">Đang xử lý...</p>}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-soft p-5 space-y-2">
            <h2 className="font-semibold text-text-main dark:text-white mb-2">Hồ sơ cơ bản</h2>
            <input
              className="input"
              placeholder="Email"
              value={profile.email}
              onChange={(e) => onProfileChange('email', e.target.value)}
            />
            <input
              className="input"
              placeholder="Username"
              value={profile.username || ''}
              onChange={(e) => onProfileChange('username', e.target.value)}
            />
            <input
              className="input"
              placeholder="First name"
              value={profile.firstName || ''}
              onChange={(e) => onProfileChange('firstName', e.target.value)}
            />
            <input
              className="input"
              placeholder="Last name"
              value={profile.lastName || ''}
              onChange={(e) => onProfileChange('lastName', e.target.value)}
            />
            <input
              className="input"
              placeholder="Phone"
              value={profile.phone || ''}
              onChange={(e) => onProfileChange('phone', e.target.value)}
            />
            <input
              className="input"
              placeholder="Gender"
              value={profile.gender || ''}
              onChange={(e) => onProfileChange('gender', e.target.value)}
            />
            <input
              className="input"
              placeholder="Address"
              value={profile.address || ''}
              onChange={(e) => onProfileChange('address', e.target.value)}
            />
            <button
              onClick={updateProfile}
              className="mt-2 px-3 py-2 rounded-lg bg-blue-500 text-white text-sm"
              disabled={loading || !userId}
            >
              Lưu hồ sơ
            </button>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-soft p-5 space-y-2">
            <h2 className="font-semibold text-text-main dark:text-white mb-2">Thông tin y tế</h2>
            <input
              className="input"
              placeholder="Nhóm máu"
              value={profile.bloodType || ''}
              onChange={(e) => onProfileChange('bloodType', e.target.value)}
            />
            <input
              className="input"
              placeholder="Allergies"
              value={profile.allergies || ''}
              onChange={(e) => onProfileChange('allergies', e.target.value)}
            />
            <input
              className="input"
              placeholder="Chronic conditions"
              value={profile.chronicConditions || ''}
              onChange={(e) => onProfileChange('chronicConditions', e.target.value)}
            />
            <input
              className="input"
              placeholder="Current medications"
              value={profile.currentMedications || ''}
              onChange={(e) => onProfileChange('currentMedications', e.target.value)}
            />
            <input
              className="input"
              placeholder="Emergency contact"
              value={profile.emergencyContactName || ''}
              onChange={(e) => onProfileChange('emergencyContactName', e.target.value)}
            />
            <input
              className="input"
              placeholder="Emergency phone"
              value={profile.emergencyContactPhone || ''}
              onChange={(e) => onProfileChange('emergencyContactPhone', e.target.value)}
            />
            <textarea
              className="input"
              placeholder="Ghi chú y tế / lối sống"
              value={profile.medicalNotes || ''}
              onChange={(e) => onProfileChange('medicalNotes', e.target.value)}
            />
            <button
              onClick={updateMedical}
              className="mt-2 px-3 py-2 rounded-lg bg-blue-500 text-white text-sm"
              disabled={loading || !userId}
            >
              Lưu thông tin y tế
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-soft p-5 max-w-md space-y-2">
          <h2 className="font-semibold text-text-main dark:text-white mb-2">Đổi mật khẩu</h2>
          <input
            type="password"
            className="input"
            placeholder="Mật khẩu hiện tại"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
          />
          <input
            type="password"
            className="input"
            placeholder="Mật khẩu mới"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
          />
          <button
            onClick={changePassword}
            className="mt-2 px-3 py-2 rounded-lg bg-blue-500 text-white text-sm"
            disabled={loading || !userId}
          >
            Đổi mật khẩu
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;


