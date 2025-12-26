import { create } from "zustand";
import { persist } from "zustand/middleware";
import adminService, { AdminLoginResponse } from "../services/adminService";

type AdminProfile = AdminLoginResponse["admin"];

interface AdminAuthState {
  admin: AdminProfile | null;
  isAdminAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  loginAdmin: (email: string, password: string) => Promise<boolean>;
  logoutAdmin: () => void;
  clearError: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => {
      // Initialize from localStorage token on first load
      const hasToken = adminService.isAuthenticated();
      
      return {
        admin: null,
        isAdminAuthenticated: hasToken,
        isLoading: false,
        error: null,

        loginAdmin: async (email: string, password: string) => {
          set({ isLoading: true, error: null });
          try {
            const res = await adminService.login(email, password);
            if (res?.accessToken) {
              set({
                admin: res.admin,
                isAdminAuthenticated: true,
                isLoading: false,
              });
              return true;
            } else {
              set({ error: "Không nhận được token từ server", isLoading: false, isAdminAuthenticated: false });
              return false;
            }
          } catch (e: any) {
            const msg =
              e?.response?.data?.message ||
              e?.message ||
              "Đăng nhập admin thất bại";
            set({ error: msg, isLoading: false, isAdminAuthenticated: false });
            return false;
          }
        },

        logoutAdmin: () => {
          adminService.logout();
          set({ admin: null, isAdminAuthenticated: false });
        },

        clearError: () => set({ error: null }),
      };
    },
    {
      name: "admin-auth-storage",
      partialize: (s) => ({
        admin: s.admin,
        isAdminAuthenticated: s.isAdminAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Re-check token when rehydrating from storage
        if (state) {
          const hasToken = adminService.isAuthenticated();
          if (!hasToken && state.isAdminAuthenticated) {
            state.isAdminAuthenticated = false;
            state.admin = null;
          } else if (hasToken && !state.isAdminAuthenticated) {
            state.isAdminAuthenticated = true;
          }
        }
      },
    }
  )
);
