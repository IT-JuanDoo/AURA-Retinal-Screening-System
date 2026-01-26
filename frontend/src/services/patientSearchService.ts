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

    const response = await api.get<PatientSearchResponse>(
      `/doctors/patients/search?${queryParams.toString()}`
    );
    return response.data;
  },
};

export default patientSearchService;
