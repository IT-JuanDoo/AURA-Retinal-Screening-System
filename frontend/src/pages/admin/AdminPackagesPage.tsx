import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAdminAuthStore } from "../../store/adminAuthStore";
import AdminHeader from "../../components/admin/AdminHeader";
import packageApi, {
  ServicePackage,
  CreateServicePackageDto,
  UpdateServicePackageDto,
} from "../../services/packageApi";

type Tab = "all" | "individual" | "clinic" | "enterprise";

export default function AdminPackagesPage() {
  const navigate = useNavigate();
  const { isAdminAuthenticated, logoutAdmin } = useAdminAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ServicePackage[]>([]);
  const [selected, setSelected] = useState<ServicePackage | null>(null);
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newItem, setNewItem] = useState<CreateServicePackageDto>({
    packageName: "",
    packageType: "Individual",
    description: "",
    numberOfAnalyses: 10,
    price: 0,
    currency: "VND",
    validityDays: 30,
    isActive: true,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
    name: string;
  }>({
    isOpen: false,
    id: null,
    name: "",
  });
  const [deleting, setDeleting] = useState(false);

  const packageTypeFilter = useMemo(() => {
    if (activeTab === "all") return undefined;
    if (activeTab === "individual") return "Individual";
    if (activeTab === "clinic") return "Clinic";
    return "Enterprise";
  }, [activeTab]);

  const load = async () => {
    if (!isAdminAuthenticated) {
      toast.error("Vui lòng đăng nhập lại");
      return;
    }

    setLoading(true);
    try {
      const data = await packageApi.getAll(
        search || undefined,
        packageTypeFilter,
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

  const toggleActive = async (pkg: ServicePackage) => {
    const isActive = !pkg.isActive;
    try {
      await packageApi.setStatus(pkg.id, isActive);
      setRows((prev) =>
        prev.map((x) => (x.id === pkg.id ? { ...x, isActive } : x))
      );
      if (selected?.id === pkg.id) setSelected({ ...selected, isActive });
      toast.success(isActive ? "Đã bật gói" : "Đã tắt gói");
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
      const dto: UpdateServicePackageDto = {
        packageName: selected.packageName,
        packageType: selected.packageType,
        description: selected.description,
        numberOfAnalyses: selected.numberOfAnalyses,
        price: selected.price,
        currency: selected.currency,
        validityDays: selected.validityDays,
        isActive: selected.isActive,
      };
      await packageApi.update(selected.id, dto);
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
    if (!newItem.packageName || newItem.numberOfAnalyses <= 0 || newItem.price <= 0) {
      toast.error("Vui lòng điền Tên gói, Số lượt và Giá hợp lệ");
      return;
    }
    setSaving(true);
    try {
      await packageApi.create(newItem);
      toast.success("Đã tạo gói mới");
      setIsCreating(false);
      setNewItem({
        packageName: "",
        packageType: "Individual",
        description: "",
        numberOfAnalyses: 10,
        price: 0,
        currency: "VND",
        validityDays: 30,
        isActive: true,
      });
      await load();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không tạo được gói"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirm({ isOpen: true, id, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    setDeleting(true);
    try {
      await packageApi.delete(deleteConfirm.id);
      toast.success("Đã xóa gói");
      setDeleteConfirm({ isOpen: false, id: null, name: "" });
      if (selected?.id === deleteConfirm.id) setSelected(null);
      await load();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không xóa được gói"
      );
    } finally {
      setDeleting(false);
    }
  };

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.isActive).length;
    const inactive = total - active;
    const byType = {
      individual: rows.filter((r) => r.packageType === "Individual").length,
      clinic: rows.filter((r) => r.packageType === "Clinic").length,
      enterprise: rows.filter((r) => r.packageType === "Enterprise").length,
    };
    return { total, active, inactive, byType };
  }, [rows]);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased min-h-screen flex flex-col transition-colors duration-200">
      <AdminHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Quản lý Gói dịch vụ & Pricing
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Cấu hình các gói dịch vụ, mô hình billing và giá cho hệ thống AURA
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Tổng số gói"
            value={stats.total}
            iconColor="text-blue-500"
            bgColor="bg-blue-500/10"
            iconPath="M4 6h16M4 12h16M4 18h16"
          />
          <StatCard
            title="Đang hoạt động"
            value={stats.active}
            iconColor="text-green-500"
            bgColor="bg-green-500/10"
            iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <StatCard
            title="Đã tắt"
            value={stats.inactive}
            iconColor="text-red-500"
            bgColor="bg-red-500/10"
            iconPath="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <StatCard
            title="Gói cho Clinic/Enterprise"
            value={stats.byType.clinic + stats.byType.enterprise}
            iconColor="text-purple-500"
            bgColor="bg-purple-500/10"
            iconPath="M3 7h18M3 12h18M3 17h18"
          />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
          <div className="border-b border-slate-200 dark:border-slate-800">
            <nav className="flex -mb-px">
              <TabButton
                active={activeTab === "all"}
                onClick={() => setActiveTab("all")}
              >
                Tất cả ({stats.total})
              </TabButton>
              <TabButton
                active={activeTab === "individual"}
                onClick={() => setActiveTab("individual")}
              >
                Cá nhân ({stats.byType.individual})
              </TabButton>
              <TabButton
                active={activeTab === "clinic"}
                onClick={() => setActiveTab("clinic")}
              >
                Phòng khám ({stats.byType.clinic})
              </TabButton>
              <TabButton
                active={activeTab === "enterprise"}
                onClick={() => setActiveTab("enterprise")}
              >
                Enterprise ({stats.byType.enterprise})
              </TabButton>
            </nav>
          </div>

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
                    placeholder="Tìm theo tên gói, mô tả..."
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
                <option value="active">Đang bán</option>
                <option value="inactive">Đã tắt</option>
              </select>
              <button
                onClick={() => {
                  setIsCreating(true);
                  setSelected(null);
                  setNewItem({
                    packageName: "",
                    packageType: "Individual",
                    description: "",
                    numberOfAnalyses: 10,
                    price: 0,
                    currency: "VND",
                    validityDays: 30,
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
                Thêm gói
              </button>
              <button
                onClick={load}
                disabled={loading}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? "Đang tải..." : "Tải lại"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Tên gói
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Loại
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Số lượt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Giá / gói
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Hiệu lực
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
                    <td
                      className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                      colSpan={7}
                    >
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                      colSpan={7}
                    >
                      Không có gói dịch vụ nào
                    </td>
                  </tr>
                ) : (
                  rows.map((pkg) => (
                    <tr
                      key={pkg.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        selected?.id === pkg.id
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                        {pkg.packageName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {pkg.packageType === "Individual"
                          ? "Cá nhân"
                          : pkg.packageType === "Clinic"
                          ? "Phòng khám"
                          : "Enterprise"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        {pkg.numberOfAnalyses.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        {pkg.price.toLocaleString("vi-VN")} {pkg.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        {pkg.validityDays
                          ? `${pkg.validityDays} ngày`
                          : "Không giới hạn"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            pkg.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {pkg.isActive ? "Đang bán" : "Đã tắt"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelected({ ...pkg })}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          >
                            Sửa
                          </button>
                          <span className="text-slate-300 dark:text-slate-700">
                            |
                          </span>
                          <button
                            onClick={() => toggleActive(pkg)}
                            className={`transition-colors ${
                              pkg.isActive
                                ? "text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                                : "text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            }`}
                          >
                            {pkg.isActive ? "Tắt" : "Bật"}
                          </button>
                          <span className="text-slate-300 dark:text-slate-700">
                            |
                          </span>
                          <button
                            onClick={() =>
                              handleDelete(pkg.id, pkg.packageName)
                            }
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                          >
                            Xóa
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

        {isCreating && (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Thêm gói dịch vụ mới
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewItem({
                    packageName: "",
                    packageType: "Individual",
                    description: "",
                    numberOfAnalyses: 10,
                    price: 0,
                    currency: "VND",
                    validityDays: 30,
                    isActive: true,
                  });
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              <Field
                label="Tên gói *"
                value={newItem.packageName}
                onChange={(v) =>
                  setNewItem({ ...newItem, packageName: v })
                }
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Loại gói *
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newItem.packageType}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      packageType: e.target.value,
                    })
                  }
                >
                  <option value="Individual">Cá nhân</option>
                  <option value="Clinic">Phòng khám/Phòng mạch</option>
                  <option value="Enterprise">Enterprise / Tổ chức lớn</option>
                </select>
              </div>
              <Field
                label="Số lượt phân tích *"
                type="number"
                value={String(newItem.numberOfAnalyses)}
                onChange={(v) =>
                  setNewItem({
                    ...newItem,
                    numberOfAnalyses: Number(v) || 0,
                  })
                }
              />
              <Field
                label="Giá gói (VND) *"
                type="number"
                value={String(newItem.price)}
                onChange={(v) =>
                  setNewItem({ ...newItem, price: Number(v) || 0 })
                }
              />
              <Field
                label="Tiền tệ"
                value={newItem.currency || "VND"}
                onChange={(v) => setNewItem({ ...newItem, currency: v })}
              />
              <Field
                label="Hiệu lực (ngày, để trống nếu không giới hạn)"
                type="number"
                value={
                  newItem.validityDays !== undefined
                    ? String(newItem.validityDays)
                    : ""
                }
                onChange={(v) =>
                  setNewItem({
                    ...newItem,
                    validityDays: v ? Number(v) || 0 : undefined,
                  })
                }
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Mô tả
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={newItem.description || ""}
                  onChange={(e) =>
                    setNewItem({ ...newItem, description: e.target.value })
                  }
                  placeholder="Ví dụ: Gói 100 lượt phân tích/năm cho phòng khám..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={create}
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {saving ? "Đang tạo..." : "Tạo gói"}
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewItem({
                      packageName: "",
                      packageType: "Individual",
                      description: "",
                      numberOfAnalyses: 10,
                      price: 0,
                      currency: "VND",
                      validityDays: 30,
                      isActive: true,
                    });
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

        {selected && (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Chỉnh sửa gói dịch vụ
              </h3>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              <ReadOnlyField label="ID" value={selected.id} />
              <Field
                label="Tên gói"
                value={selected.packageName}
                onChange={(v) =>
                  setSelected({ ...selected, packageName: v })
                }
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Loại gói
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selected.packageType}
                  onChange={(e) =>
                    setSelected({ ...selected, packageType: e.target.value })
                  }
                >
                  <option value="Individual">Cá nhân</option>
                  <option value="Clinic">Phòng khám/Phòng mạch</option>
                  <option value="Enterprise">Enterprise / Tổ chức lớn</option>
                </select>
              </div>
              <Field
                label="Số lượt phân tích"
                type="number"
                value={String(selected.numberOfAnalyses)}
                onChange={(v) =>
                  setSelected({
                    ...selected,
                    numberOfAnalyses: Number(v) || 0,
                  })
                }
              />
              <Field
                label="Giá gói (VND)"
                type="number"
                value={String(selected.price)}
                onChange={(v) =>
                  setSelected({ ...selected, price: Number(v) || 0 })
                }
              />
              <Field
                label="Tiền tệ"
                value={selected.currency}
                onChange={(v) =>
                  setSelected({ ...selected, currency: v })
                }
              />
              <Field
                label="Hiệu lực (ngày)"
                type="number"
                value={
                  selected.validityDays !== undefined
                    ? String(selected.validityDays)
                    : ""
                }
                onChange={(v) =>
                  setSelected({
                    ...selected,
                    validityDays: v ? Number(v) || 0 : undefined,
                  })
                }
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Mô tả
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={selected.description || ""}
                  onChange={(e) =>
                    setSelected({ ...selected, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Trạng thái
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selected.isActive ? "true" : "false"}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      isActive: e.target.value === "true",
                    })
                  }
                >
                  <option value="true">Đang bán</option>
                  <option value="false">Đã tắt</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
                <button
                  onClick={() => setSelected(null)}
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

      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Xóa gói dịch vụ
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Bạn có chắc muốn xóa gói "{deleteConfirm.name}"? Hành động này
              không thể hoàn tác.
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? "Đang xóa..." : "Xóa"}
              </button>
              <button
                onClick={() =>
                  setDeleteConfirm({ isOpen: false, id: null, name: "" })
                }
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
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
      className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
        active
          ? "border-blue-500 text-blue-600 dark:text-blue-400"
          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({
  title,
  value,
  iconColor,
  bgColor,
  iconPath,
}: {
  title: string;
  value: number;
  iconColor: string;
  bgColor: string;
  iconPath: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {title}
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {value.toLocaleString("vi-VN")}
          </p>
        </div>
        <div
          className={`size-12 rounded-lg ${bgColor} flex items-center justify-center`}
        >
          <svg
            className={`w-6 h-6 ${iconColor}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={iconPath}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {label}
      </label>
      <input
        type={type}
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

