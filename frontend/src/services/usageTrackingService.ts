import api from './api';

// =============================================================================
// FR-27: Image Analysis and Package Usage Tracking Types
// =============================================================================

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
  expiredPackages: number;
  totalRemainingAnalyses: number;
  totalUsedAnalyses: number;
  dailyUsage: DailyUsage[];
  packageUsage: PackageUsage[];
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

export interface ImageAnalysisTracking {
  totalImages: number;
  imagesByType: number;
  imagesByStatus: number;
  imageCountByDate: ImageCountByDate[];
  analysisCountByDate: AnalysisCountByDate[];
}

export interface ImageCountByDate {
  date: string;
  count: number;
  fundusCount: number;
  octCount: number;
}

export interface AnalysisCountByDate {
  date: string;
  count: number;
  completedCount: number;
  failedCount: number;
}

export interface ClinicUsageStatistics {
  clinicId: string;
  clinicName: string;
  usageStatistics: UsageStatistics;
  imageAnalysisTracking: ImageAnalysisTracking;
  generatedAt: string;
}

export interface UserUsageStatistics {
  userId: string;
  userName?: string;
  usageStatistics: UsageStatistics;
  imageAnalysisTracking: ImageAnalysisTracking;
  generatedAt: string;
}

// =============================================================================
// Usage Tracking Service
// =============================================================================

const usageTrackingService = {
  /**
   * Get usage statistics for the current clinic
   */
  async getClinicUsageStatistics(
    startDate?: string,
    endDate?: string
  ): Promise<ClinicUsageStatistics> {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await api.get<ClinicUsageStatistics>('/api/UsageTracking/clinic', {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching clinic usage statistics:', error);
      throw error;
    }
  },

  /**
   * Get usage statistics for the current user
   */
  async getUserUsageStatistics(
    startDate?: string,
    endDate?: string
  ): Promise<UserUsageStatistics> {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await api.get<UserUsageStatistics>('/api/UsageTracking/user', {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user usage statistics:', error);
      throw error;
    }
  },

  /**
   * Get package usage details for the current clinic
   */
  async getClinicPackageUsage(): Promise<PackageUsage[]> {
    try {
      const response = await api.get<PackageUsage[]>('/api/UsageTracking/clinic/packages');
      return response.data;
    } catch (error) {
      console.error('Error fetching clinic package usage:', error);
      throw error;
    }
  },

  /**
   * Get package usage details for the current user
   */
  async getUserPackageUsage(): Promise<PackageUsage[]> {
    try {
      const response = await api.get<PackageUsage[]>('/api/UsageTracking/user/packages');
      return response.data;
    } catch (error) {
      console.error('Error fetching user package usage:', error);
      throw error;
    }
  },
};

export default usageTrackingService;
