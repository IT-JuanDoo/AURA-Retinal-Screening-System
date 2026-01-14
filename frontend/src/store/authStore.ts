import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authService, { UserInfo, LoginCredentials, RegisterCredentials } from '../services/authService';

interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (credentials: RegisterCredentials) => Promise<boolean>;
  googleLogin: (idToken: string) => Promise<boolean>;
  facebookLogin: (accessToken: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  clearError: () => void;
  setError: (error: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(credentials);
          if (response.success && response.user) {
            set({ 
              user: response.user, 
              isAuthenticated: true, 
              isLoading: false 
            });
            return true;
          } else {
            set({ 
              error: response.message || 'Đăng nhập thất bại', 
              isLoading: false 
            });
            return false;
          }
        } catch (error: any) {
          const message = error.response?.data?.message || 'Đăng nhập thất bại';
          set({ error: message, isLoading: false });
          return false;
        }
      },

      register: async (credentials: RegisterCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.register(credentials);
          if (response.success) {
            set({ isLoading: false });
            return true;
          } else {
            set({ 
              error: response.message || 'Đăng ký thất bại', 
              isLoading: false 
            });
            return false;
          }
        } catch (error: any) {
          const message = error.response?.data?.message || 'Đăng ký thất bại';
          set({ error: message, isLoading: false });
          return false;
        }
      },

      googleLogin: async (idToken: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.googleLogin(idToken);
          if (response.success && response.user) {
            set({ 
              user: response.user, 
              isAuthenticated: true, 
              isLoading: false 
            });
            return true;
          } else {
            set({ 
              error: response.message || 'Đăng nhập Google thất bại', 
              isLoading: false 
            });
            return false;
          }
        } catch (error: any) {
          const message = error.response?.data?.message || 'Đăng nhập Google thất bại';
          set({ error: message, isLoading: false });
          return false;
        }
      },

      facebookLogin: async (accessToken: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.facebookLogin(accessToken);
          if (response.success && response.user) {
            set({ 
              user: response.user, 
              isAuthenticated: true, 
              isLoading: false 
            });
            return true;
          } else {
            set({ 
              error: response.message || 'Đăng nhập Facebook thất bại', 
              isLoading: false 
            });
            return false;
          }
        } catch (error: any) {
          const message = error.response?.data?.message || 'Đăng nhập Facebook thất bại';
          set({ error: message, isLoading: false });
          return false;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
        } finally {
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            error: null 
          });
        }
      },

      fetchCurrentUser: async () => {
        if (!authService.isAuthenticated()) {
          set({ user: null, isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await authService.getCurrentUser();
          if (response.success && response.user) {
            set({ 
              user: response.user, 
              isAuthenticated: true, 
              isLoading: false 
            });
          } else {
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false 
            });
          }
        } catch (error) {
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
        }
      },

      clearError: () => set({ error: null }),
      setError: (error: string) => set({ error })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
      onRehydrateStorage: () => (state) => {
        // Re-check token when rehydrating from storage to prevent redirect loops
        if (state) {
          const hasToken = authService.isAuthenticated();
          if (!hasToken && state.isAuthenticated) {
            state.isAuthenticated = false;
            state.user = null;
          } else if (hasToken && !state.isAuthenticated) {
            state.isAuthenticated = true;
          }
        }
      },
    }
  )
);

