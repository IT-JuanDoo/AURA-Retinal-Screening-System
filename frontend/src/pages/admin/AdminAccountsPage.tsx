import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import adminApi from "../../services/adminApi";
import { useAdminAuthStore } from "../../store/adminAuthStore";

type Tab = "users" | "doctors" | "clinics";

export default function AdminAccountsPage() {
  const { admin, logoutAdmin } = useAdminAuthStore();
  const [tab, setTab] = useState<Tab>("users");
  const [search, setSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const endpoint = useMemo(() => {
    if (tab === "users") return "/admin/users";
    if (tab === "doctors") return "/admin/doctors";
    return "/admin/clinics";
  }, [tab]);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (isActiveFilter !== null) params.isActive = isActiveFilter;

      const res = await adminApi.get(endpoint, { params });
      setRows(res.data || []);
    } catch (e: any) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Auto search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, isActiveFilter]);

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

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-text-main dark:text-white">
              Admin Account Management
            </h1>
            <p className="text-sm text-text-secondary dark:text-gray-400">
              {admin ? `Xin chào, ${admin.firstName || admin.email}` : "FR-31"}
            </p>
          </div>
          <button
            onClick={logoutAdmin}
            className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <TabButton active={tab === "users"} onClick={() => setTab("users")}>
            Users
          </TabButton>
          <TabButton
            active={tab === "doctors"}
            onClick={() => setTab("doctors")}
          >
            Doctors
          </TabButton>
          <TabButton
            active={tab === "clinics"}
            onClick={() => setTab("clinics")}
          >
            Clinics
          </TabButton>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          <input
            className="flex-1 min-w-[200px] rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tìm theo email/tên/username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && load()}
          />
          <select
            className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            value={
              isActiveFilter === null
                ? "all"
                : isActiveFilter
                ? "active"
                : "inactive"
            }
            onChange={(e) => {
              const value = e.target.value;
              setIsActiveFilter(value === "all" ? null : value === "active");
            }}
          >
            <option value="all">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã tắt</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Đang tải..." : "Tải lại"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white dark:bg-surface-dark rounded-2xl shadow-soft overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5 text-text-secondary dark:text-gray-300">
                <tr>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Tên</th>
                  {tab === "doctors" && (
                    <th className="text-left p-3">License</th>
                  )}
                  {tab === "clinics" && (
                    <th className="text-left p-3">Status</th>
                  )}
                  <th className="text-left p-3">Active</th>
                  <th className="text-left p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  <tr>
                    <td
                      className="p-4 text-center text-text-secondary dark:text-gray-400"
                      colSpan={tab === "doctors" || tab === "clinics" ? 5 : 4}
                    >
                      Đang tải...
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <td className="p-3">{r.email}</td>
                      <td className="p-3">
                        {tab === "clinics"
                          ? r.clinicName
                          : `${r.firstName || ""} ${r.lastName || ""}`.trim() ||
                            r.username ||
                            "-"}
                      </td>
                      {tab === "doctors" && (
                        <td className="p-3 text-xs text-text-secondary dark:text-gray-400">
                          {r.licenseNumber || "-"}
                        </td>
                      )}
                      {tab === "clinics" && (
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              r.verificationStatus === "Approved"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : r.verificationStatus === "Pending"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : r.verificationStatus === "Rejected"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                            }`}
                          >
                            {r.verificationStatus || "Pending"}
                          </span>
                        </td>
                      )}
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            r.isActive
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {r.isActive ? "Hoạt động" : "Đã tắt"}
                        </span>
                      </td>
                      <td className="p-3 flex gap-2">
                        <button
                          className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-sm"
                          onClick={() => setSelected({ ...r })}
                        >
                          Sửa
                        </button>
                        <button
                          className={`px-3 py-1 rounded-lg text-sm ${
                            r.isActive
                              ? "bg-orange-500 text-white hover:bg-orange-600"
                              : "bg-green-500 text-white hover:bg-green-600"
                          }`}
                          onClick={() => toggleActive(r)}
                        >
                          {r.isActive ? "Tắt" : "Bật"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td
                      className="p-4 text-center text-text-secondary dark:text-gray-400"
                      colSpan={tab === "doctors" || tab === "clinics" ? 5 : 4}
                    >
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-soft p-5">
            <h2 className="text-lg font-semibold text-text-main dark:text-white mb-3">
              {selected ? "Chỉnh sửa" : "Chi tiết"}
            </h2>
            {!selected ? (
              <div className="text-sm text-text-secondary dark:text-gray-400">
                <p className="mb-2">
                  Chọn 1 dòng trong bảng để xem và chỉnh sửa thông tin.
                </p>
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">
                    Hướng dẫn:
                  </p>
                  <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
                    <li>Click "Sửa" để chỉnh sửa thông tin</li>
                    <li>Click "Bật/Tắt" để thay đổi trạng thái hoạt động</li>
                    <li>Sử dụng bộ lọc để tìm kiếm nhanh</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
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
                      <div className="text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                        Trạng thái xác thực
                      </div>
                      <select
                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
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
                      onChange={(v) =>
                        setSelected({ ...selected, username: v })
                      }
                    />
                    <Field
                      label="Họ"
                      value={selected.firstName || ""}
                      onChange={(v) =>
                        setSelected({ ...selected, firstName: v })
                      }
                    />
                    <Field
                      label="Tên"
                      value={selected.lastName || ""}
                      onChange={(v) =>
                        setSelected({ ...selected, lastName: v })
                      }
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
                          <div className="text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                            Đã xác thực
                          </div>
                          <select
                            className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
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
                        <div className="text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                          Email đã xác thực
                        </div>
                        <select
                          className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
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

                <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-white/10">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 font-medium"
                  >
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                  <button
                    onClick={() => setSelected(null)}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "px-4 py-2 rounded-xl bg-blue-600 text-white"
          : "px-4 py-2 rounded-xl bg-white dark:bg-surface-dark text-text-main dark:text-white shadow-soft"
      }
    >
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
      <div className="text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
        {label}
      </div>
      <input
        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
        {label}
      </div>
      <input
        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2"
        value={value}
        readOnly
      />
    </div>
  );
}
