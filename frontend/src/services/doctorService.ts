import api from './api';

export interface DoctorDto {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  gender?: string;
  licenseNumber: string;
  specialization?: string;
  yearsOfExperience?: number;
  qualification?: string;
  hospitalAffiliation?: string;
  profileImageUrl?: string;
  bio?: string;
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface DoctorStatisticsDto {
  totalPatients: number;
  activeAssignments: number;
  totalAnalyses: number;
  pendingAnalyses: number;
  medicalNotesCount: number;
  lastActivityDate?: string;
}

export interface DoctorAnalysisItem {
  id: string;
  imageId: string;
  patientUserId: string;
  patientName?: string;
  analysisStatus: string;
  overallRiskLevel?: string;
  riskScore?: number;
  diabeticRetinopathyDetected: boolean;
  aiConfidenceScore?: number;
  analysisCompletedAt?: string;
  createdAt?: string;
  isValidated: boolean;
  validatedBy?: string;
  validatedAt?: string;
}

export interface ValidateAnalysisRequest {
  isAccurate: boolean;
  doctorNotes?: string;
  correctedRiskLevel?: string;
  correctedFindings?: string;
}

const doctorService = {
  /**
   * Get current doctor profile
   * Returns null if user is not a doctor (404)
   */
  async getCurrentDoctor(): Promise<DoctorDto | null> {
    try {
      const response = await api.get<DoctorDto>('/doctors/me');
      return response.data;
    } catch (error: any) {
      // 404 means user is not a doctor - this is normal, not an error
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Get doctor statistics
   */
  async getStatistics(): Promise<DoctorStatisticsDto> {
    const response = await api.get<DoctorStatisticsDto>('/doctors/statistics');
    return response.data;
  },

  /**
   * Get assigned patients list
   */
  async getPatients(activeOnly: boolean = true): Promise<any[]> {
    const response = await api.get<any[]>('/doctors/patients', {
      params: { activeOnly },
    });
    return response.data;
  },

  /**
   * Get patient details
   */
  async getPatient(patientId: string): Promise<any> {
    const response = await api.get<any>(`/doctors/patients/${patientId}`);
    return response.data;
  },

  /**
   * Get analyses for doctor's patients
   */
  async getAnalyses(params?: {
    patientUserId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<DoctorAnalysisItem[]> {
    const response = await api.get<DoctorAnalysisItem[]>('/doctors/analyses', { params });
    return response.data;
  },

  /**
   * Get single analysis details
   */
  async getAnalysisById(analysisId: string): Promise<any> {
    const response = await api.get<any>(`/doctors/analyses/${analysisId}`);
    return response.data;
  },

  /**
   * Validate analysis result
   */
  async validateAnalysis(analysisId: string, request: ValidateAnalysisRequest): Promise<any> {
    const response = await api.post<any>(`/doctors/analyses/${analysisId}/validate`, request);
    return response.data;
  },

  /**
   * Submit AI feedback
   */
  async submitAiFeedback(feedback: {
    analysisId: string;
    feedbackType: string;
    feedbackContent: string;
    rating?: number;
  }): Promise<void> {
    await api.post('/doctors/ai-feedback', feedback);
  },
};

export default doctorService;
