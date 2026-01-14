import adminApi from "./adminApi";

export interface AIConfiguration {
  id: string;
  configurationName: string;
  configurationType: string; // Threshold, Parameter, Policy, Retraining
  modelVersionId?: string;
  parameterKey: string;
  parameterValue: string;
  parameterDataType?: string; // Number, String, Boolean, JSON
  description?: string;
  isActive: boolean;
  appliedAt?: string;
  appliedBy?: string;
  createdDate?: string;
  createdBy?: string;
}

export interface CreateAIConfigurationDto {
  configurationName: string;
  configurationType: string;
  modelVersionId?: string;
  parameterKey: string;
  parameterValue: string;
  parameterDataType?: string;
  description?: string;
  isActive?: boolean;
  note?: string;
}

export interface UpdateAIConfigurationDto {
  configurationName?: string;
  configurationType?: string;
  modelVersionId?: string;
  parameterKey?: string;
  parameterValue?: string;
  parameterDataType?: string;
  description?: string;
  isActive?: boolean;
  note?: string;
}

const aiConfigApi = {
  getAll: async (
    search?: string,
    configurationType?: string,
    isActive?: boolean
  ): Promise<AIConfiguration[]> => {
    const params: any = {};
    if (search) params.search = search;
    if (configurationType) params.configurationType = configurationType;
    if (isActive !== undefined) params.isActive = isActive;

    const res = await adminApi.get("/admin/ai-config", { params });
    return res.data;
  },

  getById: async (id: string): Promise<AIConfiguration> => {
    const res = await adminApi.get(`/admin/ai-config/${id}`);
    return res.data;
  },

  create: async (dto: CreateAIConfigurationDto): Promise<AIConfiguration> => {
    const res = await adminApi.post("/admin/ai-config", dto);
    return res.data;
  },

  update: async (
    id: string,
    dto: UpdateAIConfigurationDto
  ): Promise<void> => {
    await adminApi.put(`/admin/ai-config/${id}`, dto);
  },

  setStatus: async (id: string, isActive: boolean): Promise<void> => {
    await adminApi.patch(`/admin/ai-config/${id}/status`, { isActive });
  },

  delete: async (id: string): Promise<void> => {
    await adminApi.delete(`/admin/ai-config/${id}`);
  },
};

export default aiConfigApi;
