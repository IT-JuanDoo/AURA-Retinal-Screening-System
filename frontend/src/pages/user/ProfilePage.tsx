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
  // local-only fields for password change form
  password?: string;
  newPassword?: string;
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
    if (!profile.email || !profile.password) {
      setError('Cần email và password');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<UserProfile>('/users', {
        email: profile.email,
        password: profile.password,
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
      const { data } = await api.put<UserProfile>(`/users/${userId}/medical`, profile);
      setProfile(data);
    } catch {
      setError('Cập nhật thông tin y tế thất bại');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (!userId || !profile.password || !profile.newPassword) return;
    setLoading(true);
    setError(null);
    try {
      await api.put(`/users/${userId}/password`, {
        currentPassword: profile.password,
        newPassword: profile.newPassword,
      });
      setProfile({ ...profile, password: '', newPassword: '' });
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

  const onInput = (field: keyof UserProfile, value: any) =>
    setProfile((prev) => ({ ...prev, [field]: value }));

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1>Quản lý hồ sơ & thông tin y tế</h1>
      <p>ID đang dùng: {userId || '(chưa có)'}</p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          placeholder="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <button onClick={loadProfile} disabled={loading || !userId}>
          Tải hồ sơ
        </button>
        <button onClick={createUser} disabled={loading}>
          Tạo user mới
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Đang xử lý...</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
          <h3>Hồ sơ cơ bản</h3>
          <input placeholder="Email" value={profile.email} onChange={(e) => onInput('email', e.target.value)} />
          <input placeholder="Username" value={profile.username || ''} onChange={(e) => onInput('username', e.target.value)} />
          <input placeholder="First name" value={profile.firstName || ''} onChange={(e) => onInput('firstName', e.target.value)} />
          <input placeholder="Last name" value={profile.lastName || ''} onChange={(e) => onInput('lastName', e.target.value)} />
          <input placeholder="Phone" value={profile.phone || ''} onChange={(e) => onInput('phone', e.target.value)} />
          <input placeholder="Gender" value={profile.gender || ''} onChange={(e) => onInput('gender', e.target.value)} />
          <input placeholder="Address" value={profile.address || ''} onChange={(e) => onInput('address', e.target.value)} />
          <button onClick={updateProfile} disabled={loading || !userId} style={{ marginTop: 8 }}>
            Lưu hồ sơ
          </button>
        </div>

        <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
          <h3>Thông tin y tế</h3>
          <input placeholder="Nhóm máu" value={profile.bloodType || ''} onChange={(e) => onInput('bloodType', e.target.value)} />
          <input placeholder="Allergies" value={profile.allergies || ''} onChange={(e) => onInput('allergies', e.target.value)} />
          <input
            placeholder="Chronic conditions"
            value={profile.chronicConditions || ''}
            onChange={(e) => onInput('chronicConditions', e.target.value)}
          />
          <input
            placeholder="Current medications"
            value={profile.currentMedications || ''}
            onChange={(e) => onInput('currentMedications', e.target.value)}
          />
          <input
            placeholder="Emergency contact"
            value={profile.emergencyContactName || ''}
            onChange={(e) => onInput('emergencyContactName', e.target.value)}
          />
          <input
            placeholder="Emergency phone"
            value={profile.emergencyContactPhone || ''}
            onChange={(e) => onInput('emergencyContactPhone', e.target.value)}
          />
          <button onClick={updateMedical} disabled={loading || !userId} style={{ marginTop: 8 }}>
            Lưu thông tin y tế
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, border: '1px solid #ddd', padding: 12, borderRadius: 8, maxWidth: 400 }}>
        <h3>Đổi mật khẩu</h3>
        <input
          type="password"
          placeholder="Mật khẩu hiện tại"
          value={(profile as any).password || ''}
          onChange={(e) => onInput('password' as any, e.target.value)}
        />
        <input
          type="password"
          placeholder="Mật khẩu mới"
          value={(profile as any).newPassword || ''}
          onChange={(e) => onInput('newPassword' as any, e.target.value)}
        />
        <button onClick={changePassword} disabled={loading || !userId} style={{ marginTop: 8 }}>
          Đổi mật khẩu
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;


