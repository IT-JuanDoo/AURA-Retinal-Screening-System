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

const doctorService = {
  /**
   * Get current doctor profile
   */
  async getCurrentDoctor(): Promise<DoctorDto> {
    const response = await api.get<DoctorDto>('/doctors/me');
    return response.data;
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
};

export default doctorService;
