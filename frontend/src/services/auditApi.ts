import adminApi from "./adminApi";

export interface AuditLog {
  id: string;
  userId?: string;
  doctorId?: string;
  adminId?: string;
  actionType: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: string;
  newValues?: string;
  ipAddress?: string;
  userAgent?: string;
  createdDate?: string;
  createdBy?: string;
}

export interface AuditLogFilter {
  userId?: string;
  doctorId?: string;
  adminId?: string;
  actionType?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
  ipAddress?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogListResponse {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const auditApi = {
  getAll: async (filter?: AuditLogFilter): Promise<AuditLogListResponse> => {
    const params: any = {};
    if (filter?.userId) params.userId = filter.userId;
    if (filter?.doctorId) params.doctorId = filter.doctorId;
    if (filter?.adminId) params.adminId = filter.adminId;
    if (filter?.actionType) params.actionType = filter.actionType;
    if (filter?.resourceType) params.resourceType = filter.resourceType;
    if (filter?.resourceId) params.resourceId = filter.resourceId;
    if (filter?.startDate) params.startDate = filter.startDate;
    if (filter?.endDate) params.endDate = filter.endDate;
    if (filter?.ipAddress) params.ipAddress = filter.ipAddress;
    if (filter?.page) params.page = filter.page;
    if (filter?.pageSize) params.pageSize = filter.pageSize;

    const res = await adminApi.get("/admin/audit-logs", { params });
    return res.data;
  },

  getById: async (id: string): Promise<AuditLog> => {
    const res = await adminApi.get(`/admin/audit-logs/${id}`);
    return res.data;
  },

  export: async (
    filter?: AuditLogFilter,
    format: "json" | "csv" = "json"
  ): Promise<Blob | AuditLog[]> => {
    const params: any = { format };
    if (filter?.userId) params.userId = filter.userId;
    if (filter?.doctorId) params.doctorId = filter.doctorId;
    if (filter?.adminId) params.adminId = filter.adminId;
    if (filter?.actionType) params.actionType = filter.actionType;
    if (filter?.resourceType) params.resourceType = filter.resourceType;
    if (filter?.startDate) params.startDate = filter.startDate;
    if (filter?.endDate) params.endDate = filter.endDate;

    const res = await adminApi.get("/admin/audit-logs/export", {
      params,
      responseType: format === "csv" ? "blob" : "json",
    });
    return res.data;
  },
};

export default auditApi;
