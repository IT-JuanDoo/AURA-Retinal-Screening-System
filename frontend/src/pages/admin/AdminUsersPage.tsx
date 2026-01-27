import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useAdminAuthStore } from "../../store/adminAuthStore";
import AdminHeader from "../../components/admin/AdminHeader";
import StatCard from "../../components/admin/StatCard";
import TabButton from "../../components/admin/TabButton";
import { Field } from "../../components/admin/FormField";
import adminApi from "../../services/adminApi";
import clinicApi, { Clinic, UpdateClinicDto } from "../../services/clinicApi";
import { rolesApi, Role } from "../../services/rbacApi";

type Tab = "users" | "doctors" | "clinics";

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { isAdminAuthenticated, logoutAdmin } = useAdminAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(
    (searchParams.get("tab") as Tab) || "users"
  );

  // Common state for users/doctors
  const [search, setSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  // Clinics state
  const [clinicRows, setClinicRows] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [actionNote, setActionNote] = useState("");

  const endpoint = useMemo(() => {
    if (activeTab === "users") return "/admin/users";
    if (activeTab === "doctors") return "/admin/doctors";
    return "/admin/users";
  }, [activeTab]);

  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate("/admin/login");
      return;
    }
    setSearchParams({ tab: activeTab });
    if (activeTab === "clinics") {
      loadClinics();
    } else {
      load();
      loadAllRoles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "clinics") {
        loadClinics();
      } else {
        load();
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, isActiveFilter]);

  useEffect(() => {
    if (selected?.id && (activeTab === "users" || activeTab === "doctors")) {
      loadUserRoles(selected.id);
    } else {
      setUserRoles([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, activeTab]);

  const load = async () => {
    if (!isAdminAuthenticated) return;
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
      toast.error(e?.response?.data?.message || e?.message || "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const loadClinics = async () => {
    if (!isAdminAuthenticated) return;
    setLoading(true);
    try {
      const data = await clinicApi.getAll(
        search || undefined,
        undefined,
        isActiveFilter ?? undefined
      );
      setClinicRows(data);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        logoutAdmin();
        window.location.href = "/admin/login";
        return;
      }
      toast.error(e?.response?.data?.message || e?.message || "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  };

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
      if (e?.response?.status === 404 || e?.response?.status === 403) {
        setUserRoles([]);
        return;
      }
      console.error("Failed to load user roles:", e);
      setUserRoles([]);
    }
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    try {
      const role = allRoles.find((r) => r.id === roleId);
      const roleName = role?.roleName || "role";
      await rolesApi.assignToUser({ userId, roleId, isPrimary: false });
      toast.success(`Đã gán role "${roleName}" thành công!`);
      await loadUserRoles(userId);
      await load();
      if (roleName === "Doctor") {
        setSelected(null);
        setUserRoles([]);
        toast.success("Người dùng đã được chuyển sang danh sách Bác sĩ", { duration: 4000 });
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không thể gán role. Vui lòng thử lại.");
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
      toast.success(`Đã gỡ role "${roleName}" thành công!`);
      await loadUserRoles(userId);
      await load();
      if (roleName === "Doctor") {
        toast.success("Người dùng đã được chuyển về danh sách Người dùng", { duration: 4000 });
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không thể gỡ role. Vui lòng thử lại.");
    }
  };

  const toggleActive = async (row: any) => {
    const isActive = !row.isActive;
    try {
      await adminApi.patch(`${endpoint}/${row.id}/status`, { isActive });
      setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, isActive } : x)));
      if (selected?.id === row.id) setSelected({ ...selected, isActive });
      toast.success(isActive ? "Đã bật tài khoản" : "Đã tắt tài khoản");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không cập nhật được");
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

  // Clinic handlers
  const handleApprove = async (clinic: Clinic) => {
    try {
      await clinicApi.approve(clinic.id, actionNote || undefined);
      toast.success("Đã approve clinic thành công");
      setActionNote("");
      setSelectedClinic(null);
      await loadClinics();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không approve được");
    }
  };

  const handleReject = async (clinic: Clinic) => {
    try {
      await clinicApi.reject(clinic.id, actionNote || undefined);
      toast.success("Đã reject clinic thành công");
      setActionNote("");
      setSelectedClinic(null);
      await loadClinics();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không reject được");
    }
  };

  const handleSuspend = async (clinic: Clinic) => {
    try {
      await clinicApi.suspend(clinic.id, actionNote || undefined);
      toast.success("Đã suspend clinic thành công");
      setActionNote("");
      setSelectedClinic(null);
      await loadClinics();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không suspend được");
    }
  };

  const handleActivate = async (clinic: Clinic) => {
    try {
      await clinicApi.activate(clinic.id, actionNote || undefined);
      toast.success("Đã activate clinic thành công");
      setActionNote("");
      setSelectedClinic(null);
      await loadClinics();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không activate được");
    }
  };

  const saveClinic = async () => {
    if (!selectedClinic?.id) return;
    setSaving(true);
    try {
      const dto: UpdateClinicDto = {
        clinicName: selectedClinic.clinicName,
        email: selectedClinic.email,
        phone: selectedClinic.phone,
        address: selectedClinic.address,
        verificationStatus: selectedClinic.verificationStatus,
        isActive: selectedClinic.isActive,
      };
      await clinicApi.update(selectedClinic.id, dto);
      toast.success("Đã lưu");
      setSelectedClinic(null);
      await loadClinics();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    if (activeTab === "clinics") {
      const total = clinicRows.length;
      const pending = clinicRows.filter((r) => r.verificationStatus === "Pending").length;
      const approved = clinicRows.filter((r) => r.verificationStatus === "Approved").length;
      const suspended = clinicRows.filter((r) => r.verificationStatus === "Suspended").length;
      const rejected = clinicRows.filter((r) => r.verificationStatus === "Rejected").length;
      return { total, pending, approved, suspended, rejected };
    } else {
      const total = rows.length;
      const active = rows.filter((r) => r.isActive).length;
      const inactive = total - active;
      return { total, active, inactive };
    }
  }, [rows, clinicRows, activeTab]);

  if (!isAdminAuthenticated) {
    return null;
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased min-h-screen flex flex-col transition-colors duration-200">
      <AdminHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Quản lý Người dùng
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Quản lý người dùng, bác sĩ và phòng khám trong hệ thống
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
          <div className="border-b border-slate-200 dark:border-slate-800">
            <nav className="flex -mb-px">
              <TabButton
                active={activeTab === "users"}
                onClick={() => setActiveTab("users")}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
              >
                Người dùng
              </TabButton>
              <TabButton
                active={activeTab === "doctors"}
                onClick={() => setActiveTab("doctors")}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              >
                Bác sĩ
              </TabButton>
              <TabButton
                active={activeTab === "clinics"}
                onClick={() => setActiveTab("clinics")}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
              >
                Phòng khám
              </TabButton>
            </nav>
          </div>

          <div className="p-6">
            {/* Stats Cards */}
            {activeTab === "clinics" ? (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
                <StatCard title="Tổng số" value={stats.total} iconColor="text-blue-500" bgColor="bg-blue-500/10" />
                <StatCard title="Chờ duyệt" value={stats.pending ?? 0} iconColor="text-yellow-500" bgColor="bg-yellow-500/10" />
                <StatCard title="Đã duyệt" value={stats.approved ?? 0} iconColor="text-green-500" bgColor="bg-green-500/10" />
                <StatCard title="Đã tạm dừng" value={stats.suspended ?? 0} iconColor="text-red-500" bgColor="bg-red-500/10" />
                <StatCard title="Đã từ chối" value={stats.rejected ?? 0} iconColor="text-gray-500" bgColor="bg-gray-500/10" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <StatCard title="Tổng số" value={stats.total} iconColor="text-blue-500" bgColor="bg-blue-500/10" />
                <StatCard title="Đang hoạt động" value={stats.active ?? 0} iconColor="text-green-500" bgColor="bg-green-500/10" />
                <StatCard title="Đã tắt" value={stats.inactive ?? 0} iconColor="text-red-500" bgColor="bg-red-500/10" />
              </div>
            )}

            {/* Search and Filter */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder={activeTab === "clinics" ? "Tìm kiếm theo tên, email, địa chỉ..." : "Tìm theo email, tên, username..."}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                value={isActiveFilter === null ? "" : isActiveFilter ? "true" : "false"}
                onChange={(e) => setIsActiveFilter(e.target.value === "" ? null : e.target.value === "true")}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Đã tắt</option>
              </select>
            </div>

            {/* Content based on tab */}
            {activeTab === "clinics" ? (
              <ClinicsContent
                rows={clinicRows}
                loading={loading}
                selected={selectedClinic}
                onSelect={setSelectedClinic}
                onApprove={handleApprove}
                onReject={handleReject}
                onSuspend={handleSuspend}
                onActivate={handleActivate}
                onSave={saveClinic}
                saving={saving}
                actionNote={actionNote}
                onActionNoteChange={setActionNote}
              />
            ) : (
              <UsersDoctorsContent
                rows={rows}
                loading={loading}
                selected={selected}
                onSelect={setSelected}
                onToggleActive={toggleActive}
                onSave={save}
                saving={saving}
                tab={activeTab}
                allRoles={allRoles}
                userRoles={userRoles}
                onAssignRole={handleAssignRole}
                onRemoveRole={handleRemoveRole}
                navigate={navigate}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Component for Users/Doctors tab content
function UsersDoctorsContent({
  rows,
  loading,
  selected,
  onSelect,
  onToggleActive,
  onSave,
  saving,
  tab,
  allRoles,
  userRoles,
  onAssignRole,
  onRemoveRole,
  navigate,
}: any) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Tên</th>
              {tab === "doctors" && <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Giấy phép</th>}
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Hoạt động</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
            {loading && rows.length === 0 ? (
              <tr>
                <td className="px-6 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={tab === "doctors" ? 6 : 5}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-6 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={tab === "doctors" ? 6 : 5}>
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              rows.map((r: any) => (
                <tr key={r.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selected?.id === r.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{r.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                    {`${r.firstName || ""} ${r.lastName || ""}`.trim() || r.username || "-"}
                  </td>
                  {tab === "doctors" && <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{r.licenseNumber || "-"}</td>}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${r.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}`}>
                      {r.isActive ? "Hoạt động" : "Đã tắt"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button onClick={() => onSelect({ ...r })} className="text-blue-600 hover:text-blue-900 dark:text-blue-400">Sửa</button>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <button onClick={() => onToggleActive(r)} className={r.isActive ? "text-orange-600 hover:text-orange-900" : "text-green-600 hover:text-green-900"}>
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

      {/* Edit Panel */}
      {selected && (
        <div className="mt-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Chỉnh sửa thông tin</h3>
            <button onClick={() => onSelect(null)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            <Field label="ID" value={selected.id} onChange={() => {}} readOnly />
            <Field label="Username" value={selected.username || ""} onChange={(v: string) => onSelect({ ...selected, username: v })} />
            <Field label="Họ" value={selected.firstName || ""} onChange={(v: string) => onSelect({ ...selected, firstName: v })} />
            <Field label="Tên" value={selected.lastName || ""} onChange={(v: string) => onSelect({ ...selected, lastName: v })} />
            <Field label="Email" value={selected.email || ""} onChange={(v: string) => onSelect({ ...selected, email: v })} />
            {tab === "doctors" && (
              <>
                <Field label="Số giấy phép" value={selected.licenseNumber || ""} onChange={(v: string) => onSelect({ ...selected, licenseNumber: v })} />
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Đã xác thực</label>
                  <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" value={selected.isVerified ? "true" : "false"} onChange={(e) => onSelect({ ...selected, isVerified: e.target.value === "true" })}>
                    <option value="false">Chưa xác thực</option>
                    <option value="true">Đã xác thực</option>
                  </select>
                </div>
              </>
            )}
            {tab === "users" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email đã xác thực</label>
                <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" value={selected.isEmailVerified ? "true" : "false"} onChange={(e) => onSelect({ ...selected, isEmailVerified: e.target.value === "true" })}>
                  <option value="false">Chưa xác thực</option>
                  <option value="true">Đã xác thực</option>
                </select>
              </div>
            )}
            {(tab === "users" || tab === "doctors") && selected?.id && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-md font-semibold mb-3">🔐 Phân quyền (Roles)</h4>
                {allRoles.length === 0 ? (
                  <p className="text-sm text-slate-500 mb-2">Chưa có roles. Vui lòng tạo roles tại trang <button onClick={() => navigate("/admin/rbac")} className="text-blue-500 underline">Quản lý RBAC</button>.</p>
                ) : (
                  <>
                    <p className="text-sm text-slate-600 mb-2">Roles hiện tại: {userRoles.length > 0 ? userRoles.join(", ") : "Chưa có"}</p>
                    {userRoles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {userRoles.map((roleName: string) => (
                          <span key={roleName} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
                            {roleName}
                            <button onClick={() => onRemoveRole(selected.id, roleName)} className="text-blue-600 hover:text-blue-800">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <select className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white dark:bg-slate-800" onChange={(e) => { if (e.target.value) { onAssignRole(selected.id, e.target.value); e.target.value = ""; } }} defaultValue="">
                      <option value="">Chọn role để gán...</option>
                      {allRoles.filter((r: Role) => !userRoles.includes(r.roleName)).map((role: Role) => (
                        <option key={role.id} value={role.id}>{role.roleName} {role.description ? `- ${role.description}` : ""}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            )}
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={onSave} disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 font-medium">
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
              <button onClick={() => onSelect(null)} disabled={saving} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 dark:text-slate-300 hover:bg-slate-50">
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Component for Clinics tab content
function ClinicsContent({
  rows,
  loading,
  selected,
  onSelect,
  onApprove,
  onReject,
  onSuspend,
  onActivate,
  onSave,
  saving,
  actionNote,
  onActionNoteChange,
}: any) {
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      Approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      Suspended: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      Rejected: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.Pending}`}>{status}</span>;
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Tên phòng khám</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Địa chỉ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Trạng thái</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
            {loading && rows.length === 0 ? (
              <tr>
                <td className="px-6 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={5}>Đang tải dữ liệu...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-6 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={5}>Không có clinic nào</td>
              </tr>
            ) : (
              rows.map((clinic: Clinic) => (
                <tr key={clinic.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selected?.id === clinic.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{clinic.clinicName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{clinic.email}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{clinic.address}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(clinic.verificationStatus)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => onSelect(clinic)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400">Xem/Sửa</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit/Approve Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {selected.verificationStatus === "Pending" ? "Duyệt Clinic" : "Chi tiết Clinic"}
              </h3>
              <button onClick={() => { onSelect(null); onActionNoteChange(""); }} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tên phòng khám</label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" value={selected.clinicName} onChange={(e) => onSelect({ ...selected, clinicName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                  <input type="email" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" value={selected.email} onChange={(e) => onSelect({ ...selected, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Số điện thoại</label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" value={selected.phone || ""} onChange={(e) => onSelect({ ...selected, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Trạng thái</label>
                  {getStatusBadge(selected.verificationStatus)}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Địa chỉ</label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" value={selected.address} onChange={(e) => onSelect({ ...selected, address: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Ghi chú (tùy chọn)</label>
                <textarea className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" rows={3} value={actionNote} onChange={(e) => onActionNoteChange(e.target.value)} placeholder="Nhập ghi chú cho hành động..." />
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                {selected.verificationStatus === "Pending" && (
                  <>
                    <button onClick={() => onApprove(selected)} className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium">Duyệt</button>
                    <button onClick={() => onReject(selected)} className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium">Từ chối</button>
                  </>
                )}
                {selected.verificationStatus === "Approved" && (
                  <button onClick={() => onSuspend(selected)} className="flex-1 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 font-medium">Tạm dừng</button>
                )}
                {(selected.verificationStatus === "Suspended" || selected.verificationStatus === "Rejected") && (
                  <button onClick={() => onActivate(selected)} className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium">Kích hoạt</button>
                )}
                <button onClick={onSave} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 font-medium">
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>
                <button onClick={() => { onSelect(null); onActionNoteChange(""); }} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 dark:text-slate-300 hover:bg-slate-50">Hủy</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

