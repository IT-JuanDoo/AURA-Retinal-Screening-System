import api from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  userType?: 'patient' | 'doctor';
  // Doctor-specific fields
  licenseNumber?: string;
  specialization?: string;
  yearsOfExperience?: number | null;
  qualification?: string;
  hospitalAffiliation?: string;
}

export interface UserInfo {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  isEmailVerified: boolean;
  authenticationProvider: string;
  userType?: string;  // "User" or "Doctor"
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  user?: UserInfo;
}

export interface GoogleLoginPayload {
  accessToken: string;
}

export interface FacebookLoginPayload {
  accessToken: string;
}

const authService = {
  // Email authentication
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', credentials);
    return response.data;
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    if (response.data.success && response.data.accessToken) {
      localStorage.setItem('token', response.data.accessToken);
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
    }
    return response.data;
  },

  // Social authentication
  async googleLogin(accessToken: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/google', { accessToken });
    if (response.data.success && response.data.accessToken) {
      localStorage.setItem('token', response.data.accessToken);
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
    }
    return response.data;
  },

  async facebookLogin(accessToken: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/facebook', { accessToken });
    if (response.data.success && response.data.accessToken) {
      localStorage.setItem('token', response.data.accessToken);
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
    }
    return response.data;
  },

  // Token management
  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await api.post<AuthResponse>('/auth/refresh', { refreshToken });
    if (response.data.success && response.data.accessToken) {
      localStorage.setItem('token', response.data.accessToken);
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
    }
    return response.data;
  },

  // Email verification
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },

  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },

  // Password reset
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/auth/reset-password', { token, newPassword, confirmPassword });
    return response.data;
  },

  // User info
  async getCurrentUser(): Promise<{ success: boolean; user?: UserInfo }> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  },

  // Helper methods
  getToken(): string | null {
    return localStorage.getItem('token');
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },

  // Decode JWT token to get user_type claim
  getUserTypeFromToken(): string | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      // JWT format: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      // Decode base64url payload
      const payload = parts[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      
      // Return user_type claim (case-insensitive check)
      return decoded.user_type || decoded['user_type'] || null;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  },

  // Check if current user is a doctor based on token
  isDoctor(): boolean {
    const userType = this.getUserTypeFromToken();
    return userType?.toLowerCase() === 'doctor';
  }
};

export default authService;

