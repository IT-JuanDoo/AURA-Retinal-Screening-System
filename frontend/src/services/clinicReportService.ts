import api from "./api";

export interface CreateClinicReportDto {
  clinicId: string;
  reportName: string;
  reportType: string; // "ScreeningCampaign", "RiskDistribution", "MonthlySummary", "AnnualReport", "Custom"
  periodStart?: string; // ISO date string
  periodEnd?: string; // ISO date string
  exportToFile?: boolean;
  exportFormat?: string; // "PDF", "CSV", "JSON"
}

export interface ClinicReportDto {
  id: string;
  clinicId: string;
  reportName: string;
  reportType: string;
  periodStart?: string;
  periodEnd?: string;
  totalPatients: number;
  totalAnalyses: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  reportData?: Record<string, any>;
  reportFileUrl?: string;
  generatedAt: string;
}

export interface ReportTemplateDto {
  type: string;
  name: string;
  description: string;
  icon: string;
  requiresPeriod: boolean;
}

export interface ClinicInfoDto {
  id: string;
  clinicName: string;
  email: string;
  phone?: string;
  address: string;
}

const clinicReportService = {
  /**
   * Generate a new clinic report
   */
  generateReport: async (dto: CreateClinicReportDto): Promise<ClinicReportDto> => {
    const res = await api.post("/clinic/reports/generate", dto);
    return res.data;
  },

  /**
   * Get a clinic report by ID
   */
  getReport: async (reportId: string): Promise<ClinicReportDto> => {
    const res = await api.get(`/clinic/reports/${reportId}`);
    return res.data;
  },

  /**
   * Get all clinic reports
   */
  getReports: async (clinicId?: string, reportType?: string): Promise<ClinicReportDto[]> => {
    const params: any = {};
    if (clinicId) params.clinicId = clinicId;
    if (reportType) params.reportType = reportType;
    const res = await api.get("/clinic/reports", { params });
    return res.data;
  },

  /**
   * Get available report templates
   */
  getTemplates: async (): Promise<ReportTemplateDto[]> => {
    const res = await api.get("/clinic/reports/templates");
    return res.data;
  },

  /**
   * Get clinic information
   */
  getClinicInfo: async (clinicId: string): Promise<ClinicInfoDto> => {
    const res = await api.get(`/clinic/reports/clinic/${clinicId}`);
    return res.data;
  },

  /**
   * Export report to file
   */
  exportReport: async (reportId: string, format: string): Promise<{ fileUrl: string; format: string }> => {
    const res = await api.post(`/clinic/reports/${reportId}/export`, null, {
      params: { format },
    });
    return res.data;
  },
};

export default clinicReportService;
