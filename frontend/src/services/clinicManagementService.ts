import axios from 'axios';
import clinicAuthService from './clinicAuthService';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance for clinic management
const clinicApi = axios.create({
  baseURL: `${API_BASE_URL}/clinic`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to include auth token
clinicApi.interceptors.request.use((config) => {
  const token = clinicAuthService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Types
export interface ClinicDashboardStats {
  totalDoctors: number;
  activeDoctors: number;
  totalPatients: number;
  activePatients: number;
  totalAnalyses: number;
  pendingAnalyses: number;
  completedAnalyses: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  criticalAlerts: number;
  remainingAnalyses: number;
  packageExpiresAt?: string;
}

export interface ClinicActivity {
  id: string;
  type: string;
  title: string;
  description?: string;
  relatedEntityId?: string;
  createdAt: string;
}

export interface ClinicDoctor {
  id: string;
  doctorId: string;
  fullName: string;
  email: string;
  phone?: string;
  specialization?: string;
  licenseNumber?: string;
  isPrimary: boolean;
  isActive: boolean;
  joinedAt: string;
  patientCount: number;
  analysisCount: number;
}

export interface AddDoctorData {
  email: string;
  fullName: string;
  phone?: string;
  specialization?: string;
  licenseNumber?: string;
  isPrimary?: boolean;
  password?: string;
}

export interface ClinicPatient {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  isActive: boolean;
  registeredAt: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  analysisCount: number;
  latestRiskLevel?: string;
  lastAnalysisDate?: string;
}

export interface RegisterPatientData {
  email: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  assignedDoctorId?: string;
  password?: string;
}

const clinicManagementService = {
  // Dashboard
  async getDashboardStats(): Promise<ClinicDashboardStats> {
    const response = await clinicApi.get<ClinicDashboardStats>('/dashboard/stats');
    return response.data;
  },

  async getRecentActivity(limit: number = 10): Promise<ClinicActivity[]> {
    const response = await clinicApi.get<ClinicActivity[]>('/dashboard/activity', {
      params: { limit },
    });
    return response.data;
  },

  // Doctors
  async getDoctors(search?: string, isActive?: boolean): Promise<ClinicDoctor[]> {
    const params: Record<string, string | boolean> = {};
    if (search != null && search !== '') params.search = search;
    if (isActive != null) params.isActive = isActive;
    const response = await clinicApi.get<ClinicDoctor[]>('/doctors', { params });
    return response.data;
  },

  async getDoctor(doctorId: string): Promise<ClinicDoctor> {
    const response = await clinicApi.get<ClinicDoctor>(`/doctors/${doctorId}`);
    return response.data;
  },

  async addDoctor(data: AddDoctorData): Promise<ClinicDoctor> {
    // Avoid sending empty strings for optional fields (can trigger backend validation)
    const body: Record<string, unknown> = {
      email: data.email.trim(),
      fullName: data.fullName.trim(),
      isPrimary: data.isPrimary ?? false,
    };
    if (data.phone != null && String(data.phone).trim() !== '') body.phone = String(data.phone).trim();
    if (data.specialization != null && String(data.specialization).trim() !== '') body.specialization = String(data.specialization).trim();
    if (data.licenseNumber != null && String(data.licenseNumber).trim() !== '') body.licenseNumber = String(data.licenseNumber).trim();
    if (data.password != null && String(data.password).trim() !== '') body.password = String(data.password).trim();
    const response = await clinicApi.post<ClinicDoctor>('/doctors', body);
    return response.data;
  },

  async updateDoctor(doctorId: string, data: { isPrimary?: boolean; isActive?: boolean }): Promise<void> {
    await clinicApi.put(`/doctors/${doctorId}`, data);
  },

  async removeDoctor(doctorId: string): Promise<void> {
    await clinicApi.delete(`/doctors/${doctorId}`);
  },

  async setPrimaryDoctor(doctorId: string): Promise<void> {
    await clinicApi.put(`/doctors/${doctorId}/set-primary`);
  },

  // Patients
  async getPatients(params?: {
    search?: string;
    doctorId?: string;
    riskLevel?: string;
    isActive?: boolean;
  }): Promise<ClinicPatient[]> {
    const response = await clinicApi.get<ClinicPatient[]>('/patients', { params });
    return response.data;
  },

  async getPatient(patientId: string): Promise<ClinicPatient> {
    const response = await clinicApi.get<ClinicPatient>(`/patients/${patientId}`);
    return response.data;
  },

  async registerPatient(data: RegisterPatientData): Promise<ClinicPatient> {
    const body: Record<string, unknown> = {
      email: data.email.trim(),
      fullName: data.fullName.trim(),
    };
    if (data.phone != null && String(data.phone).trim() !== '') body.phone = String(data.phone).trim();
    if (data.dateOfBirth != null && String(data.dateOfBirth).trim() !== '') body.dateOfBirth = data.dateOfBirth;
    if (data.gender != null && String(data.gender).trim() !== '') body.gender = data.gender;
    if (data.address != null && String(data.address).trim() !== '') body.address = data.address;
    if (data.assignedDoctorId != null && String(data.assignedDoctorId).trim() !== '') body.assignedDoctorId = data.assignedDoctorId;
    if (data.password != null && String(data.password).trim() !== '') body.password = String(data.password).trim();
    const response = await clinicApi.post<ClinicPatient>('/patients', body);
    return response.data;
  },

  async updatePatient(patientId: string, data: { isActive?: boolean }): Promise<void> {
    await clinicApi.put(`/patients/${patientId}`, data);
  },

  async removePatient(patientId: string): Promise<void> {
    await clinicApi.delete(`/patients/${patientId}`);
  },

  async assignDoctorToPatient(patientId: string, doctorId: string, isPrimary: boolean = true): Promise<void> {
    await clinicApi.post(`/patients/${patientId}/assign-doctor`, { doctorId, isPrimary });
  },
};

export default clinicManagementService;
