import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import adminApi from "../../services/adminApi";
import { useAdminAuthStore } from "../../store/adminAuthStore";
import { rolesApi, Role } from "../../services/rbacApi";

type Tab = "users" | "doctors" | "clinics";

export default function AdminAccountsPage() {
  const navigate = useNavigate();
  const { admin, logoutAdmin, isAdminAuthenticated } = useAdminAuthStore();
  const [tab, setTab] = useState<Tab>("users");
  const [search, setSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newItem, setNewItem] = useState<any>({});
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  const endpoint = useMemo(() => {
    if (tab === "users") return "/admin/users";
    if (tab === "doctors") return "/admin/doctors";
    return "/admin/clinics";
  }, [tab]);

  const load = async () => {
    if (!isAdminAuthenticated) {
      toast.error("Vui lòng đăng nhập lại");
      return;
    }

    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (isActiveFilter !== null) params.isActive = isActiveFilter;

      const res = await adminApi.get(endpoint, { params });
      setRows(res.data || []);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        logoutAdmin();
        window.location.href = "/admin/login";
        return;
      }
      toast.error(
        e?.response?.data?.message || e?.message || "Không tải được dữ liệu"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelected(null);
    setSearch("");
    setIsActiveFilter(null);
    load();
    loadAllRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (selected?.id && (tab === "users" || tab === "doctors")) {
      loadUserRoles(selected.id);
    } else {
      setUserRoles([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, tab]);

  // Auto search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, isActiveFilter]);

  const loadAllRoles = async () => {
    try {
      const roles = await rolesApi.getAll();
      setAllRoles(roles);
    } catch (e: any) {
      console.error("Failed to load roles:", e);
    }
  };

  const loadUserRoles = async (userId: string) => {
    try {
      const roles = await rolesApi.getUserRoles(userId);
      setUserRoles(roles);
    } catch (e: any) {
      // If user not found (e.g., moved to doctors table), clear roles
      if (e?.response?.status === 404 || e?.response?.status === 403) {
        setUserRoles([]);
        // Don't show error toast as this is expected when user is moved to another table
        return;
      }
      console.error("Failed to load user roles:", e);
      setUserRoles([]);
    }
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    try {
      // Get role name for better notification
      const role = allRoles.find((r) => r.id === roleId);
      const roleName = role?.roleName || "role";

      await rolesApi.assignToUser({ userId, roleId, isPrimary: false });

      // Show success message with role name
      toast.success(`Đã gán role "${roleName}" thành công!`);

      // Reload user roles
      await loadUserRoles(userId);

      // Reload the main list to reflect changes
      await load();

      // If role is "Doctor", user will be moved to doctors table
      // Close the edit panel and show info message
      if (roleName === "Doctor") {
        setSelected(null);
        setUserRoles([]);
        toast.success("Người dùng đã được chuyển sang danh sách Bác sĩ", {
          duration: 4000,
        });
      }
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ||
          e?.message ||
          "Không thể gán role. Vui lòng thử lại."
      );
    }
  };

  const handleRemoveRole = async (userId: string, roleName: string) => {
    try {
      const role = allRoles.find((r) => r.roleName === roleName);
      if (!role) {
        toast.error("Không tìm thấy role");
        return;
      }

      await rolesApi.removeFromUser(userId, role.id);

      // Show success message with role name
      toast.success(`Đã gỡ role "${roleName}" thành công!`);

      // Reload user roles
      await loadUserRoles(userId);

      // Reload the main list to reflect changes
      await load();

      // If removing "Doctor" role, user will be restored to users table
      if (roleName === "Doctor") {
        toast.success("Người dùng đã được chuyển về danh sách Người dùng", {
          duration: 4000,
        });
      }
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ||
          e?.message ||
          "Không thể gỡ role. Vui lòng thử lại."
      );
    }
  };

  const toggleActive = async (row: any) => {
    const isActive = !row.isActive;
    try {
      await adminApi.patch(`${endpoint}/${row.id}/status`, { isActive });
      setRows((prev) =>
        prev.map((x) => (x.id === row.id ? { ...x, isActive } : x))
      );
      if (selected?.id === row.id) setSelected({ ...selected, isActive });
      toast.success(isActive ? "Đã bật tài khoản" : "Đã tắt tài khoản");
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không cập nhật được"
      );
    }
  };

  const save = async () => {
    if (!selected?.id) return;
    setSaving(true);
    try {
      await adminApi.put(`${endpoint}/${selected.id}`, selected);
      toast.success("Đã lưu");
      setSelected(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  const create = async () => {
    if (tab === "clinics") {
      if (
        !newItem.id ||
        !newItem.clinicName ||
        !newItem.email ||
        !newItem.address
      ) {
        toast.error(
          "Vui lòng điền đầy đủ: ID, Tên phòng khám, Email và Địa chỉ"
        );
        return;
      }
    }
    setSaving(true);
    try {
      await adminApi.post(endpoint, newItem);
      toast.success("Đã tạo mới");
      setIsCreating(false);
      setNewItem({});
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không tạo được");
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [rows]);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased min-h-screen flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="size-8 text-blue-500 flex items-center justify-center bg-blue-500/10 rounded-lg">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                </svg>
              </div>
              <h2 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">
                AURA Admin
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/admin/rbac")}
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
              >
                Phân quyền (RBAC)
              </button>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Xin chào,{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {admin?.firstName || admin?.email || "Admin"}
                </span>
              </div>
              <button
                onClick={logoutAdmin}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-medium"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Quản lý Tài khoản
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Quản lý người dùng, bác sĩ và phòng khám trong hệ thống
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Tổng số
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                  {stats.total}
                </p>
              </div>
              <div className="size-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Đang hoạt động
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {stats.active}
                </p>
              </div>
              <div className="size-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Đã tắt
                </p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {stats.inactive}
                </p>
              </div>
              <div className="size-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
          <div className="border-b border-slate-200 dark:border-slate-800">
            <nav className="flex -mb-px">
              <TabButton
                active={tab === "users"}
                onClick={() => setTab("users")}
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                }
              >
                Người dùng
              </TabButton>
              <TabButton
                active={tab === "doctors"}
                onClick={() => setTab("doctors")}
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                }
              >
                Bác sĩ
              </TabButton>
              <TabButton
                active={tab === "clinics"}
                onClick={() => setTab("clinics")}
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                }
              >
                Phòng khám
              </TabButton>
            </nav>
          </div>

          {/* Search and Filter */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tìm theo email, tên, username..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && load()}
                  />
                </div>
              </div>
              <select
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={
                  isActiveFilter === null
                    ? "all"
                    : isActiveFilter
                    ? "active"
                    : "inactive"
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setIsActiveFilter(
                    value === "all" ? null : value === "active"
                  );
                }}
              >
                <option value="all">Tất cả</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Đã tắt</option>
              </select>
              {tab === "clinics" && (
                <button
                  onClick={() => {
                    setIsCreating(true);
                    setSelected(null);
                    setNewItem({
                      id: `clinic-${Date.now()}`,
                      clinicName: "",
                      email: "",
                      phone: "",
                      address: "",
                      city: "",
                      province: "",
                      country: "Vietnam",
                      clinicType: "Clinic",
                      verificationStatus: "Pending",
                      isActive: true,
                    });
                  }}
                  className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Thêm mới
                </button>
              )}
              <button
                onClick={load}
                disabled={loading}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Đang tải...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Tải lại
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Tên
                  </th>
                  {tab === "doctors" && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Giấy phép
                    </th>
                  )}
                  {tab === "clinics" && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Trạng thái
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Hoạt động
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                {loading && rows.length === 0 ? (
                  <tr>
                    <td
                      className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                      colSpan={tab === "doctors" || tab === "clinics" ? 6 : 5}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <svg
                          className="animate-spin h-8 w-8 text-blue-500"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span>Đang tải dữ liệu...</span>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                      colSpan={tab === "doctors" || tab === "clinics" ? 6 : 5}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <svg
                          className="w-12 h-12 text-slate-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                          />
                        </svg>
                        <span>Không có dữ liệu</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        selected?.id === r.id
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                        {r.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        {tab === "clinics"
                          ? r.clinicName
                          : `${r.firstName || ""} ${r.lastName || ""}`.trim() ||
                            r.username ||
                            "-"}
                      </td>
                      {tab === "doctors" && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          {r.licenseNumber || "-"}
                        </td>
                      )}
                      {tab === "clinics" && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              r.verificationStatus === "Approved"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : r.verificationStatus === "Pending"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : r.verificationStatus === "Rejected"
                                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {r.verificationStatus || "Pending"}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            r.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {r.isActive ? "Hoạt động" : "Đã tắt"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelected({ ...r })}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          >
                            Sửa
                          </button>
                          <span className="text-slate-300 dark:text-slate-700">
                            |
                          </span>
                          <button
                            onClick={() => toggleActive(r)}
                            className={`transition-colors ${
                              r.isActive
                                ? "text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                                : "text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            }`}
                          >
                            {r.isActive ? "Tắt" : "Bật"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Panel */}
        {isCreating && tab === "clinics" && (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Thêm phòng khám mới
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewItem({});
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              <Field
                label="ID (tự động tạo)"
                value={newItem.id || ""}
                onChange={(v) => setNewItem({ ...newItem, id: v })}
              />
              <Field
                label="Tên phòng khám *"
                value={newItem.clinicName || ""}
                onChange={(v) => setNewItem({ ...newItem, clinicName: v })}
              />
              <Field
                label="Email *"
                value={newItem.email || ""}
                onChange={(v) => setNewItem({ ...newItem, email: v })}
              />
              <Field
                label="Số điện thoại"
                value={newItem.phone || ""}
                onChange={(v) => setNewItem({ ...newItem, phone: v })}
              />
              <Field
                label="Địa chỉ *"
                value={newItem.address || ""}
                onChange={(v) => setNewItem({ ...newItem, address: v })}
              />
              <Field
                label="Thành phố"
                value={newItem.city || ""}
                onChange={(v) => setNewItem({ ...newItem, city: v })}
              />
              <Field
                label="Tỉnh/Thành phố"
                value={newItem.province || ""}
                onChange={(v) => setNewItem({ ...newItem, province: v })}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Loại phòng khám
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newItem.clinicType || "Clinic"}
                  onChange={(e) =>
                    setNewItem({ ...newItem, clinicType: e.target.value })
                  }
                >
                  <option value="Hospital">Hospital - Bệnh viện</option>
                  <option value="Clinic">Clinic - Phòng khám</option>
                  <option value="Medical Center">
                    Medical Center - Trung tâm y tế
                  </option>
                  <option value="Other">Other - Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Trạng thái xác thực
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newItem.verificationStatus || "Pending"}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      verificationStatus: e.target.value,
                    })
                  }
                >
                  <option value="Pending">Pending - Đang chờ</option>
                  <option value="Approved">Approved - Đã duyệt</option>
                  <option value="Rejected">Rejected - Từ chối</option>
                  <option value="Suspended">Suspended - Tạm dừng</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={create}
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {saving ? "Đang tạo..." : "Tạo mới"}
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewItem({});
                  }}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Panel */}
        {selected && (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Chỉnh sửa thông tin
              </h3>
              <button
                onClick={() => {
                  setSelected(null);
                  setUserRoles([]);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              <ReadOnlyField label="ID" value={selected.id} />
              {tab === "clinics" ? (
                <>
                  <Field
                    label="Tên phòng khám"
                    value={selected.clinicName || ""}
                    onChange={(v) =>
                      setSelected({ ...selected, clinicName: v })
                    }
                  />
                  <Field
                    label="Email"
                    value={selected.email || ""}
                    onChange={(v) => setSelected({ ...selected, email: v })}
                  />
                  <Field
                    label="Số điện thoại"
                    value={selected.phone || ""}
                    onChange={(v) => setSelected({ ...selected, phone: v })}
                  />
                  <Field
                    label="Địa chỉ"
                    value={selected.address || ""}
                    onChange={(v) => setSelected({ ...selected, address: v })}
                  />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Trạng thái xác thực
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selected.verificationStatus || "Pending"}
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          verificationStatus: e.target.value,
                        })
                      }
                    >
                      <option value="Pending">Pending - Đang chờ</option>
                      <option value="Approved">Approved - Đã duyệt</option>
                      <option value="Rejected">Rejected - Từ chối</option>
                      <option value="Suspended">Suspended - Tạm dừng</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <Field
                    label="Username"
                    value={selected.username || ""}
                    onChange={(v) => setSelected({ ...selected, username: v })}
                  />
                  <Field
                    label="Họ"
                    value={selected.firstName || ""}
                    onChange={(v) => setSelected({ ...selected, firstName: v })}
                  />
                  <Field
                    label="Tên"
                    value={selected.lastName || ""}
                    onChange={(v) => setSelected({ ...selected, lastName: v })}
                  />
                  <Field
                    label="Email"
                    value={selected.email || ""}
                    onChange={(v) => setSelected({ ...selected, email: v })}
                  />
                  {tab === "doctors" && (
                    <>
                      <Field
                        label="Số giấy phép"
                        value={selected.licenseNumber || ""}
                        onChange={(v) =>
                          setSelected({ ...selected, licenseNumber: v })
                        }
                      />
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Đã xác thực
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={selected.isVerified ? "true" : "false"}
                          onChange={(e) =>
                            setSelected({
                              ...selected,
                              isVerified: e.target.value === "true",
                            })
                          }
                        >
                          <option value="false">Chưa xác thực</option>
                          <option value="true">Đã xác thực</option>
                        </select>
                      </div>
                    </>
                  )}
                  {tab === "users" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Email đã xác thực
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selected.isEmailVerified ? "true" : "false"}
                        onChange={(e) =>
                          setSelected({
                            ...selected,
                            isEmailVerified: e.target.value === "true",
                          })
                        }
                      >
                        <option value="false">Chưa xác thực</option>
                        <option value="true">Đã xác thực</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Phân quyền (Roles) - hiển thị cho users và doctors */}
              {(tab === "users" || tab === "doctors") && selected?.id && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-md font-semibold text-slate-900 dark:text-white mb-3">
                    🔐 Phân quyền (Roles)
                  </h4>
                  {allRoles.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                      Chưa có roles trong hệ thống. Vui lòng tạo roles tại trang{" "}
                      <button
                        onClick={() => navigate("/admin/rbac")}
                        className="text-blue-500 hover:text-blue-600 underline"
                      >
                        Quản lý RBAC
                      </button>
                      .
                    </p>
                  ) : (
                    <>
                      <div className="mb-3">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          Roles hiện tại:{" "}
                          {userRoles.length > 0
                            ? userRoles.join(", ")
                            : "Chưa có"}
                        </p>
                        {userRoles.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {userRoles.map((roleName) => (
                              <span
                                key={roleName}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm"
                              >
                                {roleName}
                                <button
                                  onClick={() =>
                                    handleRemoveRole(selected.id, roleName)
                                  }
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <select
                          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50"
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignRole(selected.id, e.target.value);
                              e.target.value = "";
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="">Chọn role để gán...</option>
                          {allRoles
                            .filter((r) => !userRoles.includes(r.roleName))
                            .map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.roleName}{" "}
                                {role.description
                                  ? `- ${role.description}`
                                  : ""}
                              </option>
                            ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Nút xóa cho doctors */}
              {tab === "doctors" && selected?.id && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={async () => {
                      if (
                        !confirm(
                          "Bạn có chắc muốn xóa bác sĩ này? Bác sĩ sẽ được chuyển về danh sách Người dùng."
                        )
                      ) {
                        return;
                      }
                      try {
                        // Gỡ role Doctor để restore về users
                        const doctorRole = allRoles.find(
                          (r) => r.roleName === "Doctor"
                        );
                        if (doctorRole) {
                          await rolesApi.removeFromUser(
                            selected.id,
                            doctorRole.id
                          );
                          toast.success(
                            "Đã xóa bác sĩ. Người dùng đã được chuyển về danh sách Người dùng",
                            {
                              duration: 4000,
                            }
                          );
                          setSelected(null);
                          setUserRoles([]);
                          await load();
                        } else {
                          toast.error("Không tìm thấy role Doctor");
                        }
                      } catch (e: any) {
                        toast.error(
                          e?.response?.data?.message ||
                            e?.message ||
                            "Không thể xóa bác sĩ. Vui lòng thử lại."
                        );
                      }
                    }}
                    className="w-full px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
                  >
                    🗑️ Xóa bác sĩ (Chuyển về Người dùng)
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
                <button
                  onClick={() => {
                    setSelected(null);
                    setUserRoles([]);
                  }}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
        active
          ? "border-blue-500 text-blue-600 dark:text-blue-400"
          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {label}
      </label>
      <input
        type="text"
        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {label}
      </label>
      <input
        type="text"
        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-not-allowed"
        value={value}
        readOnly
      />
    </div>
  );
}
