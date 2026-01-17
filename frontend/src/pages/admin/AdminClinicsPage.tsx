import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAdminAuthStore } from "../../store/adminAuthStore";
import AdminHeader from "../../components/admin/AdminHeader";
import StatCard from "../../components/admin/StatCard";
import TabButton from "../../components/admin/TabButton";
import clinicApi, { Clinic, UpdateClinicDto } from "../../services/clinicApi";

type Tab = "all" | "pending" | "approved" | "suspended" | "rejected";

export default function AdminClinicsPage() {
  const navigate = useNavigate();
  const { isAdminAuthenticated, logoutAdmin } = useAdminAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Clinic[]>([]);
  const [selected, setSelected] = useState<Clinic | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionNote, setActionNote] = useState("");

  const verificationStatusFilter = useMemo(() => {
    if (activeTab === "all") return undefined;
    if (activeTab === "pending") return "Pending";
    if (activeTab === "approved") return "Approved";
    if (activeTab === "suspended") return "Suspended";
    return "Rejected";
  }, [activeTab]);

  const load = async () => {
    if (!isAdminAuthenticated) {
      toast.error("Vui lòng đăng nhập lại");
      return;
    }

    setLoading(true);
    try {
      const data = await clinicApi.getAll(
        search || undefined,
        verificationStatusFilter,
        isActiveFilter ?? undefined
      );
      setRows(data);
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
    if (!isAdminAuthenticated) {
      navigate("/admin/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, isActiveFilter]);

  const handleApprove = async (clinic: Clinic) => {
    try {
      await clinicApi.approve(clinic.id, actionNote || undefined);
      toast.success("Đã approve clinic thành công");
      setActionNote("");
      setSelected(null);
      await load();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không approve được"
      );
    }
  };

  const handleReject = async (clinic: Clinic) => {
    try {
      await clinicApi.reject(clinic.id, actionNote || undefined);
      toast.success("Đã reject clinic thành công");
      setActionNote("");
      setSelected(null);
      await load();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không reject được"
      );
    }
  };

  const handleSuspend = async (clinic: Clinic) => {
    try {
      await clinicApi.suspend(clinic.id, actionNote || undefined);
      toast.success("Đã suspend clinic thành công");
      setActionNote("");
      setSelected(null);
      await load();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không suspend được"
      );
    }
  };

  const handleActivate = async (clinic: Clinic) => {
    try {
      await clinicApi.activate(clinic.id, actionNote || undefined);
      toast.success("Đã activate clinic thành công");
      setActionNote("");
      setSelected(null);
      await load();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không activate được"
      );
    }
  };

  const save = async () => {
    if (!selected?.id) return;
    setSaving(true);
    try {
      const dto: UpdateClinicDto = {
        clinicName: selected.clinicName,
        email: selected.email,
        phone: selected.phone,
        address: selected.address,
        verificationStatus: selected.verificationStatus,
        isActive: selected.isActive,
      };
      await clinicApi.update(selected.id, dto);
      toast.success("Đã lưu");
      setSelected(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((r) => r.verificationStatus === "Pending").length;
    const approved = rows.filter((r) => r.verificationStatus === "Approved").length;
    const suspended = rows.filter((r) => r.verificationStatus === "Suspended").length;
    const rejected = rows.filter((r) => r.verificationStatus === "Rejected").length;
    return { total, pending, approved, suspended, rejected };
  }, [rows]);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      Approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      Suspended: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      Rejected: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          colors[status] || colors.Pending
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased min-h-screen flex flex-col transition-colors duration-200">
      <AdminHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Quản lý Phòng khám
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Approval, Suspension và quản lý phòng khám
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <StatCard title="Tổng số" value={stats.total} iconColor="text-blue-500" bgColor="bg-blue-500/10" />
          <StatCard title="Chờ duyệt" value={stats.pending} iconColor="text-yellow-500" bgColor="bg-yellow-500/10" />
          <StatCard title="Đã duyệt" value={stats.approved} iconColor="text-green-500" bgColor="bg-green-500/10" />
          <StatCard title="Đã tạm dừng" value={stats.suspended} iconColor="text-red-500" bgColor="bg-red-500/10" />
          <StatCard title="Đã từ chối" value={stats.rejected} iconColor="text-gray-500" bgColor="bg-gray-500/10" />
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
          <div className="border-b border-slate-200 dark:border-slate-800">
            <nav className="flex -mb-px overflow-x-auto">
              <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")}>
                Tất cả
              </TabButton>
              <TabButton active={activeTab === "pending"} onClick={() => setActiveTab("pending")}>
                Chờ duyệt ({stats.pending})
              </TabButton>
              <TabButton active={activeTab === "approved"} onClick={() => setActiveTab("approved")}>
                Đã duyệt ({stats.approved})
              </TabButton>
              <TabButton active={activeTab === "suspended"} onClick={() => setActiveTab("suspended")}>
                Đã tạm dừng ({stats.suspended})
              </TabButton>
              <TabButton active={activeTab === "rejected"} onClick={() => setActiveTab("rejected")}>
                Đã từ chối ({stats.rejected})
              </TabButton>
            </nav>
          </div>

          <div className="p-6">
            {/* Search and Filter */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên, email, địa chỉ..."
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                value={isActiveFilter === null ? "" : isActiveFilter ? "true" : "false"}
                onChange={(e) =>
                  setIsActiveFilter(e.target.value === "" ? null : e.target.value === "true")
                }
              >
                <option value="">Tất cả trạng thái</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Đã tắt</option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tên phòng khám
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Địa chỉ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                  {loading && rows.length === 0 ? (
                    <tr>
                      <td className="px-6 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={5}>
                        Đang tải dữ liệu...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td className="px-6 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={5}>
                        Không có clinic nào
                      </td>
                    </tr>
                  ) : (
                    rows.map((clinic) => (
                      <tr
                        key={clinic.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                          selected?.id === clinic.id
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : ""
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                          {clinic.clinicName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          {clinic.email}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                          {clinic.address}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(clinic.verificationStatus)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setSelected(clinic)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors mr-3"
                          >
                            Xem/Sửa
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Edit/Approve Modal */}
        {selected && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {selected.verificationStatus === "Pending"
                    ? "Duyệt Clinic"
                    : "Chi tiết Clinic"}
                </h3>
                <button
                  onClick={() => {
                    setSelected(null);
                    setActionNote("");
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Tên phòng khám
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      value={selected.clinicName}
                      onChange={(e) =>
                        setSelected({ ...selected, clinicName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      value={selected.email}
                      onChange={(e) => setSelected({ ...selected, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      value={selected.phone || ""}
                      onChange={(e) => setSelected({ ...selected, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Trạng thái
                    </label>
                    {getStatusBadge(selected.verificationStatus)}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Địa chỉ
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      value={selected.address}
                      onChange={(e) => setSelected({ ...selected, address: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Ghi chú (tùy chọn)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    rows={3}
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="Nhập ghi chú cho hành động..."
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  {selected.verificationStatus === "Pending" && (
                    <>
                      <button
                        onClick={() => handleApprove(selected)}
                        className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium"
                      >
                        Duyệt
                      </button>
                      <button
                        onClick={() => handleReject(selected)}
                        className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
                      >
                        Từ chối
                      </button>
                    </>
                  )}
                  {selected.verificationStatus === "Approved" && (
                    <button
                      onClick={() => handleSuspend(selected)}
                      className="flex-1 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors font-medium"
                    >
                      Tạm dừng
                    </button>
                  )}
                  {(selected.verificationStatus === "Suspended" ||
                    selected.verificationStatus === "Rejected") && (
                    <button
                      onClick={() => handleActivate(selected)}
                      className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium"
                    >
                      Kích hoạt
                    </button>
                  )}
                  <button
                    onClick={save}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors font-medium"
                  >
                    {saving ? "Đang lưu..." : "Lưu"}
                  </button>
                  <button
                    onClick={() => {
                      setSelected(null);
                      setActionNote("");
                    }}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

