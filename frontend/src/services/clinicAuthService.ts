import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance for clinic auth
const clinicAuthApi = axios.create({
  baseURL: `${API_BASE_URL}/clinic/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For refresh token cookies
});

// Add interceptor to include auth token
clinicAuthApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('clinic_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ClinicRegisterData {
  clinicName: string;
  registrationNumber?: string;
  taxCode?: string;
  clinicEmail: string;
  clinicPhone?: string;
  address: string;
  city?: string;
  province?: string;
  country?: string;
  websiteUrl?: string;
  clinicType: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
  adminFullName: string;
  adminPhone?: string;
}

export interface ClinicLoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ClinicAdminInfo {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface ClinicInfo {
  id: string;
  clinicName: string;
  email: string;
  phone?: string;
  address: string;
  city?: string;
  province?: string;
  clinicType: string;
  verificationStatus: string;
  isActive: boolean;
}

export interface ClinicAuthResponse {
  success: boolean;
  message: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  admin?: ClinicAdminInfo;
  clinic?: ClinicInfo;
}

const clinicAuthService = {
  // Register new clinic – payload khớp với backend ClinicRegisterDto (camelCase)
  async register(data: ClinicRegisterData): Promise<ClinicAuthResponse> {
    const payload = {
      clinicName: data.clinicName ?? '',
      registrationNumber: data.registrationNumber ?? undefined,
      taxCode: data.taxCode ?? undefined,
      clinicEmail: data.clinicEmail ?? '',
      clinicPhone: data.clinicPhone || undefined,
      address: data.address ?? '',
      city: data.city || undefined,
      province: data.province || undefined,
      country: data.country ?? 'Vietnam',
      websiteUrl: data.websiteUrl || undefined,
      clinicType: data.clinicType ?? 'Clinic',
      adminEmail: data.adminEmail ?? '',
      adminPassword: data.adminPassword ?? '',
      confirmPassword: data.confirmPassword ?? '',
      adminFullName: data.adminFullName ?? '',
      adminPhone: data.adminPhone || undefined,
    };
    const response = await clinicAuthApi.post<ClinicAuthResponse>('/register', payload);
    if (response.data.success && response.data.accessToken) {
      localStorage.setItem('clinic_token', response.data.accessToken);
      localStorage.setItem('clinic_admin', JSON.stringify(response.data.admin));
      localStorage.setItem('clinic_info', JSON.stringify(response.data.clinic));
    }
    return response.data;
  },

  // Login
  async login(data: ClinicLoginData): Promise<ClinicAuthResponse> {
    const response = await clinicAuthApi.post<ClinicAuthResponse>('/login', data);
    if (response.data.success && response.data.accessToken) {
      localStorage.setItem('clinic_token', response.data.accessToken);
      localStorage.setItem('clinic_admin', JSON.stringify(response.data.admin));
      localStorage.setItem('clinic_info', JSON.stringify(response.data.clinic));
    }
    return response.data;
  },

  // Refresh token
  async refreshToken(): Promise<ClinicAuthResponse> {
    const response = await clinicAuthApi.post<ClinicAuthResponse>('/refresh', {});
    if (response.data.success && response.data.accessToken) {
      localStorage.setItem('clinic_token', response.data.accessToken);
      localStorage.setItem('clinic_admin', JSON.stringify(response.data.admin));
      localStorage.setItem('clinic_info', JSON.stringify(response.data.clinic));
    }
    return response.data;
  },

  // Get profile
  async getProfile(): Promise<ClinicAuthResponse> {
    const response = await clinicAuthApi.get<ClinicAuthResponse>('/me');
    return response.data;
  },

  // Change password
  async changePassword(currentPassword: string, newPassword: string, confirmNewPassword: string): Promise<ClinicAuthResponse> {
    const response = await clinicAuthApi.post<ClinicAuthResponse>('/change-password', {
      currentPassword,
      newPassword,
      confirmNewPassword,
    });
    return response.data;
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await clinicAuthApi.post('/logout');
    } catch {
      // Ignore errors on logout
    }
    localStorage.removeItem('clinic_token');
    localStorage.removeItem('clinic_admin');
    localStorage.removeItem('clinic_info');
  },

  // Check if logged in
  isLoggedIn(): boolean {
    return !!localStorage.getItem('clinic_token');
  },

  // Get current admin info
  getCurrentAdmin(): ClinicAdminInfo | null {
    const adminStr = localStorage.getItem('clinic_admin');
    if (adminStr) {
      try {
        return JSON.parse(adminStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  // Get current clinic info
  getCurrentClinic(): ClinicInfo | null {
    const clinicStr = localStorage.getItem('clinic_info');
    if (clinicStr) {
      try {
        return JSON.parse(clinicStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  // Get token
  getToken(): string | null {
    return localStorage.getItem('clinic_token');
  },
};

export default clinicAuthService;
