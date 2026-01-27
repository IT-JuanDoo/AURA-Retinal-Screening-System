import api from './api';

export interface CreateAssignmentRequest {
  userId: string;
  clinicId?: string;
  notes?: string;
}

const patientAssignmentService = {
  async createAssignment(request: CreateAssignmentRequest): Promise<void> {
    await api.post('/patient-assignments', request);
  },
};

export default patientAssignmentService;

