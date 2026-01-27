import api from './api';

export interface MedicalNote {
  id: string;
  patientUserId: string;
  doctorId: string;
  analysisId?: string;
  noteType: string;
  noteContent: string;
  clinicalObservations?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  followUpDate?: string;
  severity?: string;
  isPrivate: boolean;
  attachmentUrls?: string[];
  createdAt: string;
  updatedAt?: string;
  doctorName?: string;
  patientName?: string;
}

export interface CreateMedicalNoteDto {
  patientUserId: string;
  analysisId?: string;
  noteType: string;
  noteContent: string;
  clinicalObservations?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  followUpDate?: string;
  severity?: string;
  isPrivate?: boolean;
  attachmentUrls?: string[];
}

export interface MedicalNotesParams {
  patientUserId?: string;
  doctorId?: string;
  noteType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

const medicalNotesService = {
  /**
   * Create a new medical note
   */
  async createNote(note: CreateMedicalNoteDto): Promise<MedicalNote> {
    const response = await api.post<MedicalNote>('/medical-notes', note);
    return response.data;
  },

  /**
   * Update an existing medical note
   */
  async updateNote(noteId: string, note: Partial<CreateMedicalNoteDto>): Promise<MedicalNote> {
    const response = await api.put<MedicalNote>(`/medical-notes/${noteId}`, note);
    return response.data;
  },

  /**
   * Delete a medical note
   */
  async deleteNote(noteId: string): Promise<void> {
    await api.delete(`/medical-notes/${noteId}`);
  },

  /**
   * Get medical notes (for doctor)
   */
  async getNotes(params?: MedicalNotesParams): Promise<MedicalNote[]> {
    const response = await api.get<MedicalNote[]>('/medical-notes', { params });
    return response.data;
  },

  /**
   * Get single note by ID
   */
  async getNoteById(noteId: string): Promise<MedicalNote> {
    const response = await api.get<MedicalNote>(`/medical-notes/${noteId}`);
    return response.data;
  },

  /**
   * Get notes for a specific patient (for patient view - only non-private notes)
   */
  async getMyNotes(): Promise<MedicalNote[]> {
    const response = await api.get<MedicalNote[]>('/medical-notes/my-notes');
    return response.data;
  },

  /**
   * Get notes for a specific patient
   */
  async getPatientNotes(patientUserId: string): Promise<MedicalNote[]> {
    return this.getNotes({ patientUserId });
  },

  /**
   * Helper: Format note type
   */
  formatNoteType(type: string): string {
    switch (type.toLowerCase()) {
      case 'diagnosis':
        return 'Chẩn đoán';
      case 'followup':
        return 'Theo dõi';
      case 'treatment':
        return 'Điều trị';
      case 'observation':
        return 'Quan sát';
      case 'prescription':
        return 'Đơn thuốc';
      case 'referral':
        return 'Chuyển viện';
      default:
        return type;
    }
  },

  /**
   * Helper: Format severity
   */
  formatSeverity(severity?: string): { label: string; color: string } {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return { label: 'Nghiêm trọng', color: 'red' };
      case 'high':
        return { label: 'Cao', color: 'orange' };
      case 'medium':
        return { label: 'Trung bình', color: 'yellow' };
      case 'low':
        return { label: 'Thấp', color: 'green' };
      default:
        return { label: 'Bình thường', color: 'gray' };
    }
  },

  /**
   * Get note type options
   */
  getNoteTypeOptions(): { value: string; label: string }[] {
    return [
      { value: 'Diagnosis', label: 'Chẩn đoán' },
      { value: 'FollowUp', label: 'Theo dõi' },
      { value: 'Treatment', label: 'Điều trị' },
      { value: 'Observation', label: 'Quan sát' },
      { value: 'Prescription', label: 'Đơn thuốc' },
      { value: 'Referral', label: 'Chuyển viện' },
      { value: 'Other', label: 'Khác' },
    ];
  },

  /**
   * Get severity options
   */
  getSeverityOptions(): { value: string; label: string }[] {
    return [
      { value: 'Low', label: 'Thấp' },
      { value: 'Medium', label: 'Trung bình' },
      { value: 'High', label: 'Cao' },
      { value: 'Critical', label: 'Nghiêm trọng' },
    ];
  },
};

export default medicalNotesService;
