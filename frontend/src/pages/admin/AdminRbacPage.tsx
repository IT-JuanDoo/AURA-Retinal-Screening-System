import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAdminAuthStore } from "../../store/adminAuthStore";
import AdminHeader from "../../components/admin/AdminHeader";
import LoadingSpinner from "../../components/admin/LoadingSpinner";
import ConfirmationModal from "../../components/admin/ConfirmationModal";
import EmptyState from "../../components/admin/EmptyState";
import {
  rolesApi,
  permissionsApi,
  Role,
  Permission,
} from "../../services/rbacApi";

export default function AdminRbacPage() {
  const navigate = useNavigate();
  const { isAdminAuthenticated } = useAdminAuthStore();
  const [activeTab, setActiveTab] = useState<"roles" | "permissions">("roles");
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermission, setSelectedPermission] =
    useState<Permission | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [showPermissionForm, setShowPermissionForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(
    null
  );
  const [formData, setFormData] = useState({
    roleName: "",
    description: "",
    permissionName: "",
    permissionDescription: "",
    resourceType: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: "role" | "permission";
    id: string | null;
    name: string;
  }>({
    isOpen: false,
    type: "role",
    id: null,
    name: "",
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate("/admin/login");
      return;
    }
    loadData();
  }, [activeTab, isAdminAuthenticated]);

  useEffect(() => {
    if (selectedRole) {
      loadRolePermissions(selectedRole.id);
    }
  }, [selectedRole]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "roles") {
        const data = await rolesApi.getAll();
        setRoles(data);
      } else {
        const data = await permissionsApi.getAll();
        setPermissions(data);
      }
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không tải được dữ liệu"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadRolePermissions = async (roleId: string) => {
    try {
      const data = await rolesApi.getRolePermissions(roleId);
      setRolePermissions(data);
    } catch (e: any) {
      // Failed to load role permissions
    }
  };

  const handleCreateRole = async () => {
    if (!formData.roleName.trim()) {
      toast.error("Vui lòng nhập tên vai trò");
      return;
    }
    try {
      await rolesApi.create({
        roleName: formData.roleName,
        description: formData.description || undefined,
      });
      toast.success("Đã tạo vai trò thành công");
      setShowRoleForm(false);
      setFormData({
        roleName: "",
        description: "",
        permissionName: "",
        permissionDescription: "",
        resourceType: "",
      });
      await loadData();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không tạo được vai trò"
      );
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;
    try {
      await rolesApi.update(editingRole.id, {
        roleName: formData.roleName || undefined,
        description: formData.description || undefined,
      });
      toast.success("Đã cập nhật vai trò thành công");
      setEditingRole(null);
      setShowRoleForm(false);
      setFormData({
        roleName: "",
        description: "",
        permissionName: "",
        permissionDescription: "",
        resourceType: "",
      });
      await loadData();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không cập nhật được vai trò"
      );
    }
  };

  const handleDeleteRole = async (id: string) => {
    const role = roles.find((r) => r.id === id);
    if (role) {
      setDeleteConfirm({
        isOpen: true,
        type: "role",
        id,
        name: role.roleName,
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    setDeleting(true);
    try {
      if (deleteConfirm.type === "role") {
        await rolesApi.delete(deleteConfirm.id);
        toast.success("Đã xóa vai trò thành công");
        if (selectedRole?.id === deleteConfirm.id) {
          setSelectedRole(null);
        }
      } else {
        await permissionsApi.delete(deleteConfirm.id);
        toast.success("Đã xóa quyền thành công");
        if (selectedPermission?.id === deleteConfirm.id) {
          setSelectedPermission(null);
        }
      }
      setDeleteConfirm({ isOpen: false, type: "role", id: null, name: "" });
      await loadData();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ||
          e?.message ||
          `Không xóa được ${deleteConfirm.type}`
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleCreatePermission = async () => {
    if (!formData.permissionName.trim()) {
      toast.error("Vui lòng nhập tên quyền");
      return;
    }
    try {
      await permissionsApi.create({
        permissionName: formData.permissionName,
        permissionDescription: formData.permissionDescription || undefined,
        resourceType: formData.resourceType || undefined,
      });
      toast.success("Đã tạo quyền thành công");
      setShowPermissionForm(false);
      setFormData({
        roleName: "",
        description: "",
        permissionName: "",
        permissionDescription: "",
        resourceType: "",
      });
      await loadData();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không tạo được quyền"
      );
    }
  };

  const handleUpdatePermission = async () => {
    if (!editingPermission) return;
    try {
      await permissionsApi.update(editingPermission.id, {
        permissionName: formData.permissionName || undefined,
        permissionDescription: formData.permissionDescription || undefined,
        resourceType: formData.resourceType || undefined,
      });
      toast.success("Đã cập nhật quyền thành công");
      setEditingPermission(null);
      setShowPermissionForm(false);
      setFormData({
        roleName: "",
        description: "",
        permissionName: "",
        permissionDescription: "",
        resourceType: "",
      });
      await loadData();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ||
          e?.message ||
          "Không cập nhật được quyền"
      );
    }
  };

  const handleDeletePermission = async (id: string) => {
    const permission = permissions.find((p) => p.id === id);
    if (permission) {
      setDeleteConfirm({
        isOpen: true,
        type: "permission",
        id,
        name: permission.permissionName,
      });
    }
  };

  const handleAssignPermission = async (
    roleId: string,
    permissionId: string
  ) => {
    try {
      await permissionsApi.assignToRole({ roleId, permissionId });
      toast.success("Đã gán quyền cho vai trò thành công");
      if (selectedRole?.id === roleId) {
        await loadRolePermissions(roleId);
      }
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không gán được quyền"
      );
    }
  };

  const handleRemovePermission = async (
    roleId: string,
    permissionId: string
  ) => {
    try {
      await permissionsApi.removeFromRole(roleId, permissionId);
      toast.success("Đã gỡ permission khỏi role thành công");
      if (selectedRole?.id === roleId) {
        await loadRolePermissions(roleId);
      }
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không gỡ được quyền"
      );
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased min-h-screen flex flex-col transition-colors duration-200">
      <AdminHeader />
      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Quản lý Phân quyền (RBAC)
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Quản lý vai trò và quyền trong hệ thống
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
          <div className="border-b border-slate-200 dark:border-slate-800">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("roles")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "roles"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                Vai trò ({roles.length})
              </button>
              <button
                onClick={() => setActiveTab("permissions")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "permissions"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                Quyền ({permissions.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "roles" ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Danh sách vai trò
                  </h2>
                  <button
                    onClick={() => {
                      setEditingRole(null);
                      setFormData({
                        roleName: "",
                        description: "",
                        permissionName: "",
                        permissionDescription: "",
                        resourceType: "",
                      });
                      setShowRoleForm(true);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                  >
                    + Tạo vai trò mới
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-8 text-slate-500">
                    Đang tải...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedRole?.id === role.id
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                        onClick={() => setSelectedRole(role)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {role.roleName}
                          </h3>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingRole(role);
                                setFormData({
                                  roleName: role.roleName,
                                  description: role.description || "",
                                  permissionName: "",
                                  permissionDescription: "",
                                  resourceType: "",
                                });
                                setShowRoleForm(true);
                              }}
                              className="text-blue-500 hover:text-blue-600 text-sm"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRole(role.id);
                              }}
                              className="text-red-500 hover:text-red-600 text-sm"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                        {role.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                            {role.description}
                          </p>
                        )}
                        <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span>{role.userCount} người dùng</span>
                          <span>{role.permissionCount} quyền</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedRole && (
                  <div className="mt-6 p-6 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                      Quyền của vai trò: {selectedRole.roleName}
                    </h3>
                    <div className="space-y-2 mb-4">
                      {rolePermissions.map((perm) => (
                        <div
                          key={perm.id}
                          className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700"
                        >
                          <div>
                            <span className="font-medium text-slate-900 dark:text-white">
                              {perm.permissionName}
                            </span>
                            {perm.permissionDescription && (
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {perm.permissionDescription}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              handleRemovePermission(selectedRole.id, perm.id)
                            }
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          >
                            Gỡ
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignPermission(
                              selectedRole.id,
                              e.target.value
                            );
                            e.target.value = "";
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="">Chọn quyền để gán...</option>
                        {permissions
                          .filter(
                            (p) => !rolePermissions.some((rp) => rp.id === p.id)
                          )
                          .map((perm) => (
                            <option key={perm.id} value={perm.id}>
                              {perm.permissionName}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}

                {showRoleForm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        {editingRole ? "Sửa vai trò" : "Tạo vai trò mới"}
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Tên vai trò
                          </label>
                          <input
                            type="text"
                            value={formData.roleName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                roleName: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50"
                            placeholder="Ví dụ: Admin, Doctor, User"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Mô tả
                          </label>
                          <textarea
                            value={formData.description}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                description: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50"
                            rows={3}
                            placeholder="Mô tả về vai trò này..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={
                              editingRole ? handleUpdateRole : handleCreateRole
                            }
                            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            {editingRole ? "Cập nhật" : "Tạo"}
                          </button>
                          <button
                            onClick={() => {
                              setShowRoleForm(false);
                              setEditingRole(null);
                              setFormData({
                                roleName: "",
                                description: "",
                                permissionName: "",
                                permissionDescription: "",
                                resourceType: "",
                              });
                            }}
                            className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Danh sách quyền
                  </h2>
                  <button
                    onClick={() => {
                      setEditingPermission(null);
                      setFormData({
                        roleName: "",
                        description: "",
                        permissionName: "",
                        permissionDescription: "",
                        resourceType: "",
                      });
                      setShowPermissionForm(true);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                  >
                    + Tạo quyền mới
                  </button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : permissions.length === 0 ? (
                  <EmptyState
                    title="Chưa có quyền nào"
                    message="Bắt đầu tạo quyền đầu tiên để định nghĩa các quyền trong hệ thống"
                    icon="🔑"
                    action={{
                      label: "Tạo quyền mới",
                      onClick: () => {
                        setEditingPermission(null);
                        setFormData({
                          roleName: "",
                          description: "",
                          permissionName: "",
                          permissionDescription: "",
                          resourceType: "",
                        });
                        setShowPermissionForm(true);
                      },
                    }}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {permissions.map((perm) => (
                      <div
                        key={perm.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedPermission?.id === perm.id
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                        onClick={() => setSelectedPermission(perm)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {perm.permissionName}
                          </h3>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPermission(perm);
                                setFormData({
                                  roleName: "",
                                  description: "",
                                  permissionName: perm.permissionName,
                                  permissionDescription:
                                    perm.permissionDescription || "",
                                  resourceType: perm.resourceType || "",
                                });
                                setShowPermissionForm(true);
                              }}
                              className="text-blue-500 hover:text-blue-600 text-sm"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePermission(perm.id);
                              }}
                              className="text-red-500 hover:text-red-600 text-sm"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                        {perm.permissionDescription && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                            {perm.permissionDescription}
                          </p>
                        )}
                        {perm.resourceType && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Tài nguyên: {perm.resourceType}
                          </p>
                        )}
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          {perm.roleCount} vai trò
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showPermissionForm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        {editingPermission
                          ? "Sửa quyền"
                          : "Tạo quyền mới"}
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Tên quyền
                          </label>
                          <input
                            type="text"
                            value={formData.permissionName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                permissionName: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50"
                            placeholder="Ví dụ: users.view, reports.create"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Mô tả
                          </label>
                          <textarea
                            value={formData.permissionDescription}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                permissionDescription: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50"
                            rows={3}
                            placeholder="Mô tả về quyền này..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Loại tài nguyên
                          </label>
                          <input
                            type="text"
                            value={formData.resourceType}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                resourceType: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50"
                            placeholder="Ví dụ: User, Report, Admin"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={
                              editingPermission
                                ? handleUpdatePermission
                                : handleCreatePermission
                            }
                            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            {editingPermission ? "Cập nhật" : "Tạo"}
                          </button>
                          <button
                            onClick={() => {
                              setShowPermissionForm(false);
                              setEditingPermission(null);
                              setFormData({
                                roleName: "",
                                description: "",
                                permissionName: "",
                                permissionDescription: "",
                                resourceType: "",
                              });
                            }}
                            className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() =>
          setDeleteConfirm({
            isOpen: false,
            type: "role",
            id: null,
            name: "",
          })
        }
        onConfirm={confirmDelete}
        title={`Xóa ${deleteConfirm.type === "role" ? "vai trò" : "quyền"}`}
        message={`Bạn có chắc muốn xóa ${
          deleteConfirm.type === "role" ? "vai trò" : "quyền"
        } "${deleteConfirm.name}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
