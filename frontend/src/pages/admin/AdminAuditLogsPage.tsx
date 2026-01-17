import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAdminAuthStore } from "../../store/adminAuthStore";
import AdminHeader from "../../components/admin/AdminHeader";
import auditApi, { AuditLog, AuditLogFilter } from "../../services/auditApi";

export default function AdminAuditLogsPage() {
  const navigate = useNavigate();
  const { isAdminAuthenticated, logoutAdmin } = useAdminAuthStore();

  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [filters, setFilters] = useState<AuditLogFilter>({
    page: 1,
    pageSize: 50,
  });

  const load = async () => {
    if (!isAdminAuthenticated) {
      toast.error("Vui lòng đăng nhập lại");
      return;
    }

    setLoading(true);
    try {
      const response = await auditApi.getAll({ ...filters, page, pageSize });
      setLogs(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
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
  }, [page, filters]);

  const handleExport = async (format: "json" | "csv") => {
    try {
      const data = await auditApi.export(filters, format);
      if (format === "csv") {
        const blob = data as Blob;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Đã xuất file CSV");
      } else {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Đã xuất file JSON");
      }
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không xuất được file"
      );
    }
  };

  const formatJson = (jsonStr?: string) => {
    if (!jsonStr) return "N/A";
    try {
      const obj = JSON.parse(jsonStr);
      return JSON.stringify(obj, null, 2);
    } catch {
      return jsonStr;
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased min-h-screen flex flex-col transition-colors duration-200">
      <AdminHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Audit Logs Viewer
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Xem và quản lý nhật ký audit trail của hệ thống
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Bộ lọc
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Action Type
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="Ví dụ: Create, Update, Delete"
                value={filters.actionType || ""}
                onChange={(e) =>
                  setFilters({ ...filters, actionType: e.target.value || undefined })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Resource Type
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="Ví dụ: User, Package, Config"
                value={filters.resourceType || ""}
                onChange={(e) =>
                  setFilters({ ...filters, resourceType: e.target.value || undefined })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                User ID
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                value={filters.userId || ""}
                onChange={(e) =>
                  setFilters({ ...filters, userId: e.target.value || undefined })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Admin ID
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                value={filters.adminId || ""}
                onChange={(e) =>
                  setFilters({ ...filters, adminId: e.target.value || undefined })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Từ ngày
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                value={filters.startDate || ""}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value || undefined })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Đến ngày
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                value={filters.endDate || ""}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value || undefined })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                IP Address
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="192.168.1.1"
                value={filters.ipAddress || ""}
                onChange={(e) =>
                  setFilters({ ...filters, ipAddress: e.target.value || undefined })
                }
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => {
                  setFilters({ page: 1, pageSize: 50 });
                  setPage(1);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 mb-6 flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Tổng: <span className="font-semibold text-slate-900 dark:text-white">{total.toLocaleString("vi-VN")}</span> logs
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport("csv")}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Xuất CSV
            </button>
            <button
              onClick={() => handleExport("json")}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Xuất JSON
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-700 disabled:opacity-60 transition-colors text-sm font-medium"
            >
              {loading ? "Đang tải..." : "Tải lại"}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Người thực hiện
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                {loading && logs.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={6}>
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={6}>
                      Không có audit log nào
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        selected?.id === log.id
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        {log.createdDate
                          ? new Date(log.createdDate).toLocaleString("vi-VN")
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        {log.adminId
                          ? `Admin: ${log.adminId.substring(0, 8)}...`
                          : log.userId
                          ? `User: ${log.userId.substring(0, 8)}...`
                          : log.doctorId
                          ? `Doctor: ${log.doctorId.substring(0, 8)}...`
                          : "System"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {log.actionType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        {log.resourceType}
                        {log.resourceId && (
                          <span className="text-slate-500 dark:text-slate-400 ml-1">
                            ({log.resourceId.substring(0, 8)}...)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-mono">
                        {log.ipAddress || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelected(log)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Trang {page} / {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Trước
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {selected && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Chi tiết Audit Log
                </h3>
                <button
                  onClick={() => setSelected(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      ID
                    </label>
                    <p className="text-sm text-slate-900 dark:text-slate-100 font-mono">
                      {selected.id}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Thời gian
                    </label>
                    <p className="text-sm text-slate-900 dark:text-slate-100">
                      {selected.createdDate
                        ? new Date(selected.createdDate).toLocaleString("vi-VN")
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Action Type
                    </label>
                    <p className="text-sm text-slate-900 dark:text-slate-100">
                      {selected.actionType}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Resource Type
                    </label>
                    <p className="text-sm text-slate-900 dark:text-slate-100">
                      {selected.resourceType}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Resource ID
                    </label>
                    <p className="text-sm text-slate-900 dark:text-slate-100 font-mono">
                      {selected.resourceId || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      IP Address
                    </label>
                    <p className="text-sm text-slate-900 dark:text-slate-100 font-mono">
                      {selected.ipAddress || "N/A"}
                    </p>
                  </div>
                </div>

                {selected.oldValues && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Giá trị cũ (Old Values)
                    </label>
                    <pre className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono overflow-x-auto">
                      {formatJson(selected.oldValues)}
                    </pre>
                  </div>
                )}

                {selected.newValues && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Giá trị mới (New Values)
                    </label>
                    <pre className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono overflow-x-auto">
                      {formatJson(selected.newValues)}
                    </pre>
                  </div>
                )}

                {selected.userAgent && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      User Agent
                    </label>
                    <p className="text-sm text-slate-900 dark:text-slate-100 break-all">
                      {selected.userAgent}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setSelected(null)}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Đóng
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
