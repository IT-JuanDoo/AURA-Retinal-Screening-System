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

// Revenue Dashboard DTOs
export interface DailyRevenueDto {
  date: string;
  revenue: number;
  transactionCount: number;
  subscriptionCount: number;
}

export interface MonthlyRevenueDto {
  year: number;
  month: number;
  revenue: number;
  transactionCount: number;
  growthRate: number;
}

export interface RevenueBySourceDto {
  clinicSubscriptions: number;
  individualAnalyses: number;
  bulkAnalysisPackages: number;
  premiumFeatures: number;
  other: number;
}

export interface RevenueDashboardDto {
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  dailyRevenue: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalTransactions: number;
  averageTransactionValue: number;
  dailyRevenueList: DailyRevenueDto[];
  monthlyRevenueList: MonthlyRevenueDto[];
  revenueBySource: RevenueBySourceDto;
}

// AI Performance Dashboard DTOs
export interface DailyAiPerformanceDto {
  date: string;
  analysesProcessed: number;
  averageAccuracy: number;
  averageConfidenceScore: number;
  averageProcessingTimeSeconds: number;
  successfulAnalyses: number;
  failedAnalyses: number;
}

export interface AiModelMetricsDto {
  fundusModelAccuracy: number;
  octModelAccuracy: number;
  fundusAnalysesCount: number;
  octAnalysesCount: number;
  fundusAverageConfidence: number;
  octAverageConfidence: number;
}

export interface AiAccuracyByRiskLevelDto {
  lowRiskAccuracy: number;
  mediumRiskAccuracy: number;
  highRiskAccuracy: number;
  criticalRiskAccuracy: number;
  lowRiskCount: number;
  mediumRiskCount: number;
  highRiskCount: number;
  criticalRiskCount: number;
}

export interface AiPerformanceDashboardDto {
  averageAccuracy: number;
  averageConfidenceScore: number;
  averageProcessingTimeSeconds: number;
  totalAnalysesProcessed: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  successRate: number;
  dailyPerformance: DailyAiPerformanceDto[];
  modelMetrics: AiModelMetricsDto;
  accuracyByRiskLevel: AiAccuracyByRiskLevelDto;
}

// System Health Dashboard DTOs
export interface SystemStatusDto {
  overallStatus: string;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  diskUsagePercent: number;
  networkLatencyMs: number;
  lastUpdated: string;
}

export interface DatabaseHealthDto {
  status: string;
  responseTimeMs: number;
  activeConnections: number;
  maxConnections: number;
  totalQueries: number;
  averageQueryTimeMs: number;
  slowQueries: number;
}

export interface EndpointHealthDto {
  endpoint: string;
  method: string;
  requestCount: number;
  averageResponseTimeMs: number;
  errorCount: number;
  errorRate: number;
}

export interface ApiHealthDto {
  status: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTimeMs: number;
  requestsPerSecond: number;
  endpointHealth: EndpointHealthDto[];
}

export interface AiServiceHealthDto {
  status: string;
  averageResponseTimeMs: number;
  queueLength: number;
  activeWorkers: number;
  maxWorkers: number;
  queueProcessingRate: number;
  lastHealthCheck: string;
}

export interface SystemMetricDto {
  timestamp: string;
  metricName: string;
  value: number;
  unit: string;
}

export interface AlertDto {
  id: string;
  severity: string;
  title: string;
  message: string;
  createdAt: string;
  isResolved: boolean;
}

export interface IncidentDto {
  startTime: string;
  endTime?: string;
  duration: string;
  severity: string;
  description: string;
}

export interface UptimeDto {
  uptimePercentage: number;
  totalUptime: string;
  totalDowntime: string;
  incidentsCount: number;
  lastIncident: string;
  recentIncidents: IncidentDto[];
}

export interface SystemHealthDashboardDto {
  systemStatus: SystemStatusDto;
  databaseHealth: DatabaseHealthDto;
  apiHealth: ApiHealthDto;
  aiServiceHealth: AiServiceHealthDto;
  systemMetrics: SystemMetricDto[];
  activeAlerts: AlertDto[];
  uptime: UptimeDto;
}

// Global Dashboard DTO
export interface GlobalDashboardDto {
  systemAnalytics: SystemAnalyticsDto;
  revenueDashboard: RevenueDashboardDto;
  aiPerformanceDashboard: AiPerformanceDashboardDto;
  systemHealthDashboard: SystemHealthDashboardDto;
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

  async getRevenueDashboard(
    startDate?: string,
    endDate?: string
  ): Promise<RevenueDashboardDto> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await adminApi.get("/admin/analytics/revenue", { params });
    return response.data;
  }

  async getAiPerformanceDashboard(
    startDate?: string,
    endDate?: string
  ): Promise<AiPerformanceDashboardDto> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await adminApi.get("/admin/analytics/ai-performance", { params });
    return response.data;
  }

  async getSystemHealthDashboard(): Promise<SystemHealthDashboardDto> {
    const response = await adminApi.get("/admin/analytics/system-health");
    return response.data;
  }

  async getGlobalDashboard(
    startDate?: string,
    endDate?: string
  ): Promise<GlobalDashboardDto> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await adminApi.get("/admin/analytics/global", { params });
    return response.data;
  }
}

export default new AnalyticsService();

