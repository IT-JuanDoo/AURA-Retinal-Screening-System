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
  analysisId: string;
  validationStatus: 'Validated' | 'Corrected' | 'NeedsReview';
  correctedRiskLevel?: string;
  correctedRiskScore?: number;
  validationNotes?: string;
}

export interface AIFeedbackRequest {
  resultId: string;
  feedbackType: 'Correct' | 'Incorrect' | 'PartiallyCorrect' | 'NeedsReview';
  originalRiskLevel?: string;
  correctedRiskLevel?: string;
  feedbackNotes?: string;
  useForTraining?: boolean;
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
   * Validate analysis result (FR-15)
   */
  async validateAnalysis(analysisId: string, data: {
    isAccurate: boolean;
    doctorNotes?: string;
    correctedRiskLevel?: string;
  }): Promise<any> {
    const request: ValidateAnalysisRequest = {
      analysisId,
      validationStatus: data.isAccurate ? 'Validated' : 'Corrected',
      correctedRiskLevel: data.correctedRiskLevel,
      validationNotes: data.doctorNotes,
    };
    const response = await api.post<any>(`/doctors/analyses/${analysisId}/validate`, request);
    return response.data;
  },

  /**
   * Submit AI feedback (FR-19)
   */
  async submitAiFeedback(feedback: {
    analysisId: string;
    feedbackType: string;
    feedbackContent: string;
    rating?: number;
  }): Promise<void> {
    const request: AIFeedbackRequest = {
      resultId: feedback.analysisId,
      feedbackType: feedback.feedbackType as AIFeedbackRequest['feedbackType'],
      feedbackNotes: feedback.feedbackContent,
      useForTraining: true,
    };
    await api.post('/doctors/ai-feedback', request);
  },

  /**
   * Update current doctor profile
   */
  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    gender?: string;
    specialization?: string;
    yearsOfExperience?: number;
    qualification?: string;
    hospitalAffiliation?: string;
    bio?: string;
    profileImageUrl?: string;
  }): Promise<DoctorDto> {
    const response = await api.put<DoctorDto>('/doctors/me', data);
    return response.data;
  },
};

export default doctorService;
