import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import adminService from "./adminService";

// Use relative path /api to leverage Vite proxy when running locally
// Or use full URL if VITE_API_URL is set (for production/Docker)
const API_URL = import.meta.env.VITE_API_URL || "/api";

const adminApi = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

adminApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = adminService.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

adminApi.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      adminService.logout();
      // Redirect to login page if not already there
      if (window.location.pathname !== "/admin/login") {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(error);
  }
);

export default adminApi;
