import api from './api';

export interface UpdateUserProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  gender?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  dob?: string; // ISO date string
  profileImageUrl?: string;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  gender?: string;
  address?: string;
  profileImageUrl?: string;
  // ... other fields
}

const userService = {
  /**
   * Update current user's profile (uses /me endpoint)
   */
  async updateProfile(payload: UpdateUserProfilePayload): Promise<UserProfileResponse> {
    try {
      const response = await api.put<UserProfileResponse>('/users/me', payload);
      return response.data;
    } catch (error: any) {
      console.error('Update profile error:', error);
      console.error('Request URL:', '/users/me');
      console.error('Payload:', payload);
      throw error;
    }
  },

  /**
   * Update user profile by ID (for admin or self)
   */
  async updateProfileById(userId: string, payload: UpdateUserProfilePayload): Promise<UserProfileResponse> {
    const response = await api.put<UserProfileResponse>(`/users/${userId}`, payload);
    return response.data;
  },

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<UserProfileResponse> {
    const response = await api.get<UserProfileResponse>(`/users/${userId}`);
    return response.data;
  },
};

export default userService;

