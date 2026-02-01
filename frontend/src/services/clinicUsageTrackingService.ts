import axios from "axios";
import clinicAuthService from "./clinicAuthService";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const clinicUsageApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

clinicUsageApi.interceptors.request.use((config) => {
  const token = clinicAuthService.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface UsageStatistics {
  totalImages: number;
  processedImages: number;
  pendingImages: number;
  failedImages: number;
  totalAnalyses: number;
  completedAnalyses: number;
  processingAnalyses: number;
  failedAnalyses: number;
  totalPackages: number;
  activePackages: number;
  expiredPackages?: number;
  totalRemainingAnalyses: number;
  totalUsedAnalyses: number;
  dailyUsage: DailyUsage[];
  packageUsage?: PackageUsage[];
}

export interface DailyUsage {
  date: string;
  imageCount: number;
  analysisCount: number;
  usedCredits: number;
}

export interface PackageUsage {
  packageId: string;
  packageName: string;
  packageType: string;
  totalAnalyses: number;
  remainingAnalyses: number;
  usedAnalyses: number;
  usagePercentage: number;
  purchasedAt?: string;
  expiresAt?: string;
  isActive: boolean;
  isExpired: boolean;
}

export interface ClinicUsageStatistics {
  clinicId: string;
  clinicName: string;
  usageStatistics: UsageStatistics;
  imageAnalysisTracking?: {
    totalImages: number;
    imageCountByDate: Array<{ date: string; count: number }>;
    analysisCountByDate: Array<{ date: string; count: number }>;
  };
  generatedAt: string;
}

const clinicUsageTrackingService = {
  async getClinicUsageStatistics(
    startDate?: string,
    endDate?: string
  ): Promise<ClinicUsageStatistics> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await clinicUsageApi.get<ClinicUsageStatistics>(
      "UsageTracking/clinic",
      { params }
    );
    return response.data;
  },

  async getClinicPackageUsage(): Promise<PackageUsage[]> {
    const response = await clinicUsageApi.get<PackageUsage[]>(
      "UsageTracking/clinic/packages"
    );
    return response.data;
  },
};

export default clinicUsageTrackingService;
