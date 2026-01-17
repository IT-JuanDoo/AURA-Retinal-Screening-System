import adminApi from "./adminApi";

export interface Clinic {
  id: string;
  clinicName: string;
  email: string;
  phone?: string;
  address: string;
  verificationStatus: string; // 'Pending', 'Approved', 'Rejected', 'Suspended'
  isActive: boolean;
}

export interface UpdateClinicDto {
  clinicName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  websiteUrl?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  clinicType?: string;
  verificationStatus?: string;
  isActive?: boolean;
  note?: string;
}

export interface ActionNoteDto {
  note?: string;
}

const clinicApi = {
  getAll: async (
    search?: string,
    verificationStatus?: string,
    isActive?: boolean
  ): Promise<Clinic[]> => {
    const params: any = {};
    if (search) params.search = search;
    if (verificationStatus) params.verificationStatus = verificationStatus;
    if (isActive !== undefined) params.isActive = isActive;

    const res = await adminApi.get("/admin/clinics", { params });
    return res.data;
  },

  getById: async (id: string): Promise<Clinic> => {
    const res = await adminApi.get(`/admin/clinics/${id}`);
    return res.data;
  },

  approve: async (id: string, note?: string): Promise<void> => {
    await adminApi.post(`/admin/clinics/${id}/approve`, { note });
  },

  reject: async (id: string, note?: string): Promise<void> => {
    await adminApi.post(`/admin/clinics/${id}/reject`, { note });
  },

  suspend: async (id: string, note?: string): Promise<void> => {
    await adminApi.post(`/admin/clinics/${id}/suspend`, { note });
  },

  activate: async (id: string, note?: string): Promise<void> => {
    await adminApi.post(`/admin/clinics/${id}/activate`, { note });
  },

  update: async (id: string, dto: UpdateClinicDto): Promise<void> => {
    await adminApi.put(`/admin/clinics/${id}`, dto);
  },
};

export default clinicApi;
