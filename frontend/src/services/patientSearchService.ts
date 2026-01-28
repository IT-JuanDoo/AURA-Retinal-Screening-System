import api from './api';

export interface PatientSearchParams {
  searchQuery?: string;
  riskLevel?: string;
  clinicId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
}

export interface PatientSearchResult {
  userId: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  dob?: string;
  gender?: string;
  profileImageUrl?: string;
  assignedAt: string;
  clinicId?: string;
  clinicName?: string;
  analysisCount: number;
  medicalNotesCount: number;
  latestRiskLevel?: string;
  latestRiskScore?: number;
  latestAnalysisDate?: string;
}

export interface PatientSearchResponse {
  patients: PatientSearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const patientSearchService = {
  /**
   * Search and filter patients assigned to the current doctor
   * Note: This endpoint should only return patients, not doctors
   */
  async searchPatients(params: PatientSearchParams): Promise<PatientSearchResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.searchQuery) {
      queryParams.append('searchQuery', params.searchQuery);
    }
    if (params.riskLevel) {
      queryParams.append('riskLevel', params.riskLevel);
    }
    if (params.clinicId) {
      queryParams.append('clinicId', params.clinicId);
    }
    if (params.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params.pageSize) {
      queryParams.append('pageSize', params.pageSize.toString());
    }
    if (params.sortBy) {
      queryParams.append('sortBy', params.sortBy);
    }
    if (params.sortDirection) {
      queryParams.append('sortDirection', params.sortDirection);
    }
    
    // Explicitly request only patients, not doctors
    queryParams.append('userType', 'patient');

    const response = await api.get<PatientSearchResponse>(
      `/doctors/patients/search?${queryParams.toString()}`
    );
    
    // Additional client-side filtering to ensure no doctors are returned
    const filteredPatients = response.data.patients.filter((patient: any) => {
      // Filter out any results that have doctor-specific fields
      return !patient.licenseNumber && !patient.specialization;
    });
    
    return {
      ...response.data,
      patients: filteredPatients,
      totalCount: filteredPatients.length,
      totalPages: Math.ceil(filteredPatients.length / (params.pageSize || 20)),
    };
  },
};

export default patientSearchService;
