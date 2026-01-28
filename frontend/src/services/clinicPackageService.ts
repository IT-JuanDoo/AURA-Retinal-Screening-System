import axios from 'axios';
import clinicAuthService from './clinicAuthService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const clinicPackageApi = axios.create({
  baseURL: `${API_BASE_URL}/clinic/packages`,
  headers: {
    'Content-Type': 'application/json',
  },
});

clinicPackageApi.interceptors.request.use((config) => {
  const token = clinicAuthService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ServicePackage {
  id: string;
  packageName: string;
  description?: string;
  analysesIncluded: number;
  price: number;
  validityDays: number;
  isClinicPackage: boolean;
  features?: string;
  isActive: boolean;
}

export interface CurrentPackage {
  id: string;
  packageId: string;
  packageName: string;
  totalAnalyses: number;
  usedAnalyses: number;
  remainingAnalyses: number;
  purchasedAt: string;
  expiresAt?: string;
  isActive: boolean;
  price: number;
  features?: string;
}

export interface PaymentHistory {
  id: string;
  amount: number;
  paymentMethod?: string;
  paymentStatus: string;
  transactionId?: string;
  paidAt?: string;
  packageName: string;
  analysesIncluded: number;
}

export interface MonthlyUsage {
  month: string;
  count: number;
}

const clinicPackageService = {
  async getAvailablePackages(): Promise<ServicePackage[]> {
    const response = await clinicPackageApi.get<ServicePackage[]>('/');
    return response.data;
  },

  async getCurrentPackage(): Promise<CurrentPackage | null> {
    const response = await clinicPackageApi.get<CurrentPackage | null>('/current');
    return response.data;
  },

  async purchasePackage(packageId: string, paymentMethod?: string): Promise<any> {
    const response = await clinicPackageApi.post('/purchase', { packageId, paymentMethod });
    return response.data;
  },

  async getPurchaseHistory(): Promise<PaymentHistory[]> {
    const response = await clinicPackageApi.get<PaymentHistory[]>('/history');
    return response.data;
  },

  async getUsageStats(): Promise<MonthlyUsage[]> {
    const response = await clinicPackageApi.get<MonthlyUsage[]>('/usage');
    return response.data;
  },
};

export default clinicPackageService;
