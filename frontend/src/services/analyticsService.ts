import adminApi from "./adminApi";

export interface DailyUsageDto {
  date: string;
  analysisCount: number;
  imageUploadCount: number;
  userRegistrations: number;
}

export interface UsageStatisticsDto {
  totalUsers: number;
  activeUsers: number;
  totalDoctors: number;
  activeDoctors: number;
  totalClinics: number;
  activeClinics: number;
  totalAnalyses: number;
  completedAnalyses: number;
  processingAnalyses: number;
  failedAnalyses: number;
  totalBulkBatches: number;
  completedBatches: number;
  dailyUsage: DailyUsageDto[];
}

export interface ErrorByTypeDto {
  errorType: string;
  count: number;
  percentage: number;
}

export interface DailyErrorRateDto {
  date: string;
  errorCount: number;
  requestCount: number;
  errorRate: number;
}

export interface ErrorRateDto {
  overallErrorRate: number;
  totalErrors: number;
  totalRequests: number;
  errorsByType: ErrorByTypeDto[];
  dailyErrorRates: DailyErrorRateDto[];
}

export interface DailyImageCountDto {
  date: string;
  uploaded: number;
  processed: number;
  failed: number;
}

export interface ImageCountDto {
  totalImages: number;
  uploadedImages: number;
  processedImages: number;
  failedImages: number;
  processingImages: number;
  dailyImageCounts: DailyImageCountDto[];
}

export interface RiskDistributionByDateDto {
  date: string;
  lowRisk: number;
  mediumRisk: number;
  highRisk: number;
  criticalRisk: number;
}

export interface RiskDistributionDto {
  lowRisk: number;
  mediumRisk: number;
  highRisk: number;
  criticalRisk: number;
  lowRiskPercentage: number;
  mediumRiskPercentage: number;
  highRiskPercentage: number;
  criticalRiskPercentage: number;
  distributionByDate: RiskDistributionByDateDto[];
}

export interface SystemAnalyticsDto {
  usageStatistics: UsageStatisticsDto;
  errorRate: ErrorRateDto;
  imageCount: ImageCountDto;
  riskDistribution: RiskDistributionDto;
  generatedAt: string;
}

class AnalyticsService {
  async getSystemAnalytics(
    startDate?: string,
    endDate?: string
  ): Promise<SystemAnalyticsDto> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await adminApi.get("/admin/analytics/system", { params });
    return response.data;
  }

  async getUsageStatistics(
    startDate?: string,
    endDate?: string
  ): Promise<UsageStatisticsDto> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await adminApi.get("/admin/analytics/usage", { params });
    return response.data;
  }

  async getErrorRates(
    startDate?: string,
    endDate?: string
  ): Promise<ErrorRateDto> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await adminApi.get("/admin/analytics/errors", { params });
    return response.data;
  }

  async getImageCounts(
    startDate?: string,
    endDate?: string
  ): Promise<ImageCountDto> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await adminApi.get("/admin/analytics/images", { params });
    return response.data;
  }

  async getRiskDistribution(
    startDate?: string,
    endDate?: string
  ): Promise<RiskDistributionDto> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await adminApi.get(
      "/admin/analytics/risk-distribution",
      { params }
    );
    return response.data;
  }
}

export default new AnalyticsService();

