import api from './api';

// =============================================================================
// FR-29: High-Risk Patient Alert System Types
// =============================================================================

export interface HighRiskAlert {
  id: string;
  patientUserId: string;
  patientName?: string;
  patientEmail?: string;
  clinicId?: string;
  clinicName?: string;
  doctorId?: string;
  doctorName?: string;
  analysisResultId: string;
  imageId: string;
  overallRiskLevel: 'High' | 'Critical';
  riskScore?: number;
  hypertensionRisk?: 'Low' | 'Medium' | 'High';
  hypertensionScore?: number;
  diabetesRisk?: 'Low' | 'Medium' | 'High';
  diabetesScore?: number;
  strokeRisk?: 'Low' | 'Medium' | 'High';
  strokeScore?: number;
  diabeticRetinopathyDetected: boolean;
  diabeticRetinopathySeverity?: string;
  healthWarnings?: string;
  detectedAt: string;
  isAcknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface PatientRiskTrend {
  patientUserId: string;
  patientName?: string;
  trendPoints: RiskTrendPoint[];
  currentRiskLevel: string;
  currentRiskScore?: number;
  trendDirection: 'Improving' | 'Stable' | 'Worsening';
  daysSinceLastAnalysis: number;
  totalAnalyses: number;
}

export interface RiskTrendPoint {
  analysisDate: string;
  riskLevel: string;
  riskScore?: number;
  analysisResultId: string;
}

export interface ClinicAlertSummary {
  clinicId: string;
  clinicName: string;
  totalHighRiskPatients: number;
  totalCriticalRiskPatients: number;
  unacknowledgedAlerts: number;
  recentAlerts: HighRiskAlert[];
  lastAlertDate: string;
}

export interface AbnormalTrend {
  patientUserId: string;
  patientName?: string;
  trendType: 'RapidDeterioration' | 'SuddenSpike' | 'ConsistentHigh';
  description: string;
  previousRiskScore?: number;
  currentRiskScore?: number;
  previousRiskLevel?: string;
  currentRiskLevel?: string;
  daysBetweenAnalyses: number;
  detectedAt: string;
  trendHistory: RiskTrendPoint[];
}

// =============================================================================
// Alert Service
// =============================================================================

const alertService = {
  /**
   * Get all high-risk alerts for the current clinic
   */
  async getClinicAlerts(
    unacknowledgedOnly: boolean = false,
    limit: number = 50
  ): Promise<HighRiskAlert[]> {
    try {
      const response = await api.get<HighRiskAlert[]>('/api/alerts/clinic', {
        params: { unacknowledgedOnly, limit },
      });
      return response.data;
    } catch (error) {
      // Error fetching clinic alerts
      throw error;
    }
  },

  /**
   * Get alert summary for the current clinic
   */
  async getClinicAlertSummary(): Promise<ClinicAlertSummary> {
    try {
      const response = await api.get<ClinicAlertSummary>('/api/alerts/clinic/summary');
      return response.data;
    } catch (error) {
      // Error fetching clinic alert summary
      throw error;
    }
  },

  /**
   * Get all high-risk alerts for the current doctor
   */
  async getDoctorAlerts(
    unacknowledgedOnly: boolean = false,
    limit: number = 50
  ): Promise<HighRiskAlert[]> {
    try {
      const response = await api.get<HighRiskAlert[]>('/api/alerts/doctor', {
        params: { unacknowledgedOnly, limit },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get risk trend for a patient
   */
  async getPatientRiskTrend(
    patientUserId: string,
    days: number = 90
  ): Promise<PatientRiskTrend> {
    try {
      const response = await api.get<PatientRiskTrend>(
        `/api/alerts/patient/${patientUserId}/trend`,
        { params: { days } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Detect abnormal trends for patients in the current clinic
   */
  async detectAbnormalTrends(days: number = 30): Promise<AbnormalTrend[]> {
    try {
      const response = await api.get<AbnormalTrend[]>('/api/alerts/clinic/abnormal-trends', {
        params: { days },
      });
      return response.data;
    } catch (error) {
      // Error detecting abnormal trends
      throw error;
    }
  },

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      await api.post(`/api/alerts/${alertId}/acknowledge`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get high-risk patients for the current clinic
   */
  async getHighRiskPatients(riskLevel?: 'High' | 'Critical'): Promise<HighRiskAlert[]> {
    try {
      const response = await api.get<HighRiskAlert[]>('/api/alerts/clinic/high-risk-patients', {
        params: riskLevel ? { riskLevel } : {},
      });
      return response.data;
    } catch (error) {
      // Error fetching high-risk patients
      throw error;
    }
  },
};

export default alertService;
