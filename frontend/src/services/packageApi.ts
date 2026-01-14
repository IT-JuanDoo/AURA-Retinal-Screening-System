import adminApi from "./adminApi";

export interface ServicePackage {
  id: string;
  packageName: string;
  packageType: string; // Individual, Clinic, Enterprise
  description?: string;
  numberOfAnalyses: number;
  price: number;
  currency: string;
  validityDays?: number;
  isActive: boolean;
  createdDate?: string;
  createdBy?: string;
}

export interface CreateServicePackageDto {
  packageName: string;
  packageType: string;
  description?: string;
  numberOfAnalyses: number;
  price: number;
  currency?: string;
  validityDays?: number;
  isActive?: boolean;
  note?: string;
}

export interface UpdateServicePackageDto {
  packageName?: string;
  packageType?: string;
  description?: string;
  numberOfAnalyses?: number;
  price?: number;
  currency?: string;
  validityDays?: number;
  isActive?: boolean;
  note?: string;
}

const packageApi = {
  getAll: async (
    search?: string,
    packageType?: string,
    isActive?: boolean
  ): Promise<ServicePackage[]> => {
    const params: any = {};
    if (search) params.search = search;
    if (packageType) params.packageType = packageType;
    if (isActive !== undefined) params.isActive = isActive;

    const res = await adminApi.get("/admin/packages", { params });
    return res.data;
  },

  getById: async (id: string): Promise<ServicePackage> => {
    const res = await adminApi.get(`/admin/packages/${id}`);
    return res.data;
  },

  create: async (dto: CreateServicePackageDto): Promise<ServicePackage> => {
    const res = await adminApi.post("/admin/packages", dto);
    return res.data;
  },

  update: async (id: string, dto: UpdateServicePackageDto): Promise<void> => {
    await adminApi.put(`/admin/packages/${id}`, dto);
  },

  setStatus: async (id: string, isActive: boolean): Promise<void> => {
    await adminApi.patch(`/admin/packages/${id}/status`, { isActive });
  },

  delete: async (id: string): Promise<void> => {
    await adminApi.delete(`/admin/packages/${id}`);
  },
};

export default packageApi;

