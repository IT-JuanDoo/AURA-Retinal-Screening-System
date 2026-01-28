import api from './api';

export interface CreateAssignmentRequest {
  userId: string;
  clinicId?: string;
  notes?: string;
}

const patientAssignmentService = {
  async createAssignment(request: CreateAssignmentRequest): Promise<void> {
    try {
      // Validate required field
      if (!request.userId || request.userId.trim() === '') {
        throw new Error('UserId là bắt buộc');
      }
      
      // Build payload - only include fields that have valid values
      // DO NOT include undefined or null values - backend expects either value or field not present
      const payload: Record<string, string> = {
        userId: request.userId.trim(),
      };
      
      // Only include clinicId if it's a valid non-empty string (UUID format expected)
      if (request.clinicId && typeof request.clinicId === 'string' && request.clinicId.trim() !== '') {
        const trimmedClinicId = request.clinicId.trim();
        // Basic UUID validation (optional but helpful)
        if (trimmedClinicId.length >= 10) { // At least some reasonable length
          payload.clinicId = trimmedClinicId;
        }
      }
      
      // Only include notes if it's provided and non-empty
      if (request.notes && typeof request.notes === 'string' && request.notes.trim() !== '') {
        payload.notes = request.notes.trim();
      }
      
      console.log('Creating assignment with payload:', JSON.stringify(payload, null, 2));
      
      const response = await api.post('/patient-assignments', payload);
      console.log('Assignment created successfully:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('Create assignment error:', error);
      console.error('Error response:', error?.response?.data);
      console.error('Request payload:', request);
      console.error('Status:', error?.response?.status);
      console.error('Status text:', error?.response?.statusText);
      
      // Re-throw with more context
      throw error;
    }
  },
};

export default patientAssignmentService;

