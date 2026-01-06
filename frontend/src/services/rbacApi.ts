import adminApi from "./adminApi";

export interface Role {
  id: string;
  roleName: string;
  description?: string;
  createdDate: string;
  userCount: number;
  permissionCount: number;
}

export interface Permission {
  id: string;
  permissionName: string;
  permissionDescription?: string;
  resourceType?: string;
  createdDate: string;
  roleCount: number;
}

export interface CreateRoleDto {
  roleName: string;
  description?: string;
}

export interface UpdateRoleDto {
  roleName?: string;
  description?: string;
}

export interface CreatePermissionDto {
  permissionName: string;
  permissionDescription?: string;
  resourceType?: string;
}

export interface UpdatePermissionDto {
  permissionName?: string;
  permissionDescription?: string;
  resourceType?: string;
}

export interface AssignRoleDto {
  userId: string;
  roleId: string;
  isPrimary?: boolean;
}

export interface AssignPermissionDto {
  roleId: string;
  permissionId: string;
}

const rolesApi = {
  getAll: async (): Promise<Role[]> => {
    const res = await adminApi.get("/roles");
    return res.data;
  },

  getById: async (id: string): Promise<Role> => {
    const res = await adminApi.get(`/roles/${id}`);
    return res.data;
  },

  create: async (dto: CreateRoleDto): Promise<Role> => {
    const res = await adminApi.post("/roles", dto);
    return res.data;
  },

  update: async (id: string, dto: UpdateRoleDto): Promise<Role> => {
    const res = await adminApi.put(`/roles/${id}`, dto);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await adminApi.delete(`/roles/${id}`);
  },

  assignToUser: async (dto: AssignRoleDto): Promise<void> => {
    await adminApi.post("/roles/assign", dto);
  },

  removeFromUser: async (userId: string, roleId: string): Promise<void> => {
    await adminApi.delete(`/roles/users/${userId}/roles/${roleId}`);
  },

  getUserRoles: async (userId: string): Promise<string[]> => {
    const res = await adminApi.get(`/roles/users/${userId}/roles`);
    return res.data;
  },

  getUserPermissions: async (userId: string): Promise<string[]> => {
    const res = await adminApi.get(`/roles/users/${userId}/permissions`);
    return res.data;
  },

  getRolePermissions: async (roleId: string): Promise<Permission[]> => {
    const res = await adminApi.get(`/roles/${roleId}/permissions`);
    return res.data;
  },
};

const permissionsApi = {
  getAll: async (): Promise<Permission[]> => {
    const res = await adminApi.get("/permissions");
    return res.data;
  },

  getById: async (id: string): Promise<Permission> => {
    const res = await adminApi.get(`/permissions/${id}`);
    return res.data;
  },

  create: async (dto: CreatePermissionDto): Promise<Permission> => {
    const res = await adminApi.post("/permissions", dto);
    return res.data;
  },

  update: async (id: string, dto: UpdatePermissionDto): Promise<Permission> => {
    const res = await adminApi.put(`/permissions/${id}`, dto);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await adminApi.delete(`/permissions/${id}`);
  },

  assignToRole: async (dto: AssignPermissionDto): Promise<void> => {
    await adminApi.post("/permissions/assign", dto);
  },

  removeFromRole: async (roleId: string, permissionId: string): Promise<void> => {
    await adminApi.delete(`/permissions/roles/${roleId}/permissions/${permissionId}`);
  },

  getRolePermissions: async (roleId: string): Promise<Permission[]> => {
    const res = await adminApi.get(`/permissions/roles/${roleId}`);
    return res.data;
  },
};

export { rolesApi, permissionsApi };

