import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAdminAuthStore } from "../../store/adminAuthStore";
import AdminHeader from "../../components/admin/AdminHeader";
import notificationTemplateApi, {
  NotificationTemplate,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
} from "../../services/notificationTemplateApi";

type Tab = "all" | "analysis" | "alert" | "payment" | "message" | "system" | "custom";

export default function AdminNotificationTemplatesPage() {
  const navigate = useNavigate();
  const { isAdminAuthenticated, logoutAdmin } = useAdminAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | null>(null);
  const [languageFilter, setLanguageFilter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<NotificationTemplate[]>([]);
  const [selected, setSelected] = useState<NotificationTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newItem, setNewItem] = useState<CreateNotificationTemplateDto>({
    templateName: "",
    templateType: "Custom",
    titleTemplate: "",
    contentTemplate: "",
    variables: {},
    isActive: true,
    language: "vi",
  });
  const [previewData, setPreviewData] = useState<{
    title: string;
    content: string;
  } | null>(null);
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

  const templateTypeFilter = useMemo(() => {
    if (activeTab === "all") return undefined;
    if (activeTab === "analysis") return "AnalysisComplete";
    if (activeTab === "alert") return "HighRiskAlert";
    if (activeTab === "payment") return "PaymentSuccess";
    if (activeTab === "message") return "MessageReceived";
    if (activeTab === "system") return "SystemAlert";
    return "Custom";
  }, [activeTab]);

  const load = async () => {
    if (!isAdminAuthenticated) {
      toast.error("Vui lòng đăng nhập lại");
      return;
    }

    setLoading(true);
    try {
      const data = await notificationTemplateApi.getAll(
        search || undefined,
        templateTypeFilter,
        isActiveFilter ?? undefined,
        languageFilter || undefined
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
  }, [search, isActiveFilter, languageFilter]);

  const toggleActive = async (template: NotificationTemplate) => {
    const isActive = !template.isActive;
    try {
      await notificationTemplateApi.setStatus(template.id, isActive);
      setRows((prev) =>
        prev.map((x) => (x.id === template.id ? { ...x, isActive } : x))
      );
      if (selected?.id === template.id) setSelected({ ...selected, isActive });
      toast.success(isActive ? "Đã bật template" : "Đã tắt template");
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
      const dto: UpdateNotificationTemplateDto = {
        templateName: selected.templateName,
        templateType: selected.templateType,
        titleTemplate: selected.titleTemplate,
        contentTemplate: selected.contentTemplate,
        variables: selected.variables
          ? JSON.parse(selected.variables)
          : undefined,
        isActive: selected.isActive,
        language: selected.language,
        note: selected.note,
      };
      await notificationTemplateApi.update(selected.id, dto);
      toast.success("Đã lưu");
      setSelected(null);
      setPreviewData(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  const create = async () => {
    if (!newItem.templateName || !newItem.titleTemplate || !newItem.contentTemplate) {
      toast.error("Vui lòng điền đầy đủ Tên template, Title Template và Content Template");
      return;
    }
    setSaving(true);
    try {
      await notificationTemplateApi.create(newItem);
      toast.success("Đã tạo template mới");
      setIsCreating(false);
      setNewItem({
        templateName: "",
        templateType: "Custom",
        titleTemplate: "",
        contentTemplate: "",
        variables: {},
        isActive: true,
        language: "vi",
      });
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không tạo được");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async (template: NotificationTemplate) => {
    try {
      const variables = template.variables
        ? JSON.parse(template.variables)
        : undefined;
      const preview = await notificationTemplateApi.preview(template.id, variables);
      setPreviewData({
        title: preview.previewTitle,
        content: preview.previewContent,
      });
      setSelected(template);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không preview được"
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    setDeleting(true);
    try {
      await notificationTemplateApi.delete(deleteConfirm.id);
      toast.success("Đã xóa template");
      setDeleteConfirm({ isOpen: false, id: null, name: "" });
      if (selected?.id === deleteConfirm.id) {
        setSelected(null);
        setPreviewData(null);
      }
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không xóa được");
    } finally {
      setDeleting(false);
    }
  };

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.isActive).length;
    const inactive = total - active;
    const vi = rows.filter((r) => r.language === "vi").length;
    const en = rows.filter((r) => r.language === "en").length;
    return { total, active, inactive, vi, en };
  }, [rows]);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased min-h-screen flex flex-col transition-colors duration-200">
      <AdminHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Quản lý Notification Templates
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Tạo và quản lý notification templates, communication policies
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <StatCard
            title="Tổng số"
            value={stats.total}
            iconColor="text-blue-500"
            bgColor="bg-blue-500/10"
          />
          <StatCard
            title="Đang hoạt động"
            value={stats.active}
            iconColor="text-green-500"
            bgColor="bg-green-500/10"
          />
          <StatCard
            title="Đã tắt"
            value={stats.inactive}
            iconColor="text-red-500"
            bgColor="bg-red-500/10"
          />
          <StatCard
            title="Tiếng Việt"
            value={stats.vi}
            iconColor="text-purple-500"
            bgColor="bg-purple-500/10"
          />
          <StatCard
            title="English"
            value={stats.en}
            iconColor="text-orange-500"
            bgColor="bg-orange-500/10"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
          <div className="border-b border-slate-200 dark:border-slate-800">
            <nav className="flex -mb-px overflow-x-auto">
              <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")}>
                Tất cả
              </TabButton>
              <TabButton
                active={activeTab === "analysis"}
                onClick={() => setActiveTab("analysis")}
              >
                Analysis Complete
              </TabButton>
              <TabButton
                active={activeTab === "alert"}
                onClick={() => setActiveTab("alert")}
              >
                High Risk Alert
              </TabButton>
              <TabButton
                active={activeTab === "payment"}
                onClick={() => setActiveTab("payment")}
              >
                Payment
              </TabButton>
              <TabButton
                active={activeTab === "message"}
                onClick={() => setActiveTab("message")}
              >
                Message
              </TabButton>
              <TabButton
                active={activeTab === "system"}
                onClick={() => setActiveTab("system")}
              >
                System Alert
              </TabButton>
              <TabButton
                active={activeTab === "custom"}
                onClick={() => setActiveTab("custom")}
              >
                Custom
              </TabButton>
            </nav>
          </div>

          <div className="p-6">
            {/* Search and Filter */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên, title, content..."
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
              >
                <option value="">Tất cả ngôn ngữ</option>
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
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
              <button
                onClick={() => {
                  setIsCreating(true);
                  setSelected(null);
                  setPreviewData(null);
                }}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors text-sm font-medium"
              >
                + Tạo mới
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tên template
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Loại
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Title Template
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Ngôn ngữ
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
                        colSpan={6}
                      >
                        Đang tải dữ liệu...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                        colSpan={6}
                      >
                        Không có template nào
                      </td>
                    </tr>
                  ) : (
                    rows.map((template) => (
                      <tr
                        key={template.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                          selected?.id === template.id
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : ""
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                          {template.templateName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {template.templateType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
                          {template.titleTemplate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          {template.language === "vi" ? "🇻🇳 Tiếng Việt" : "🇬🇧 English"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleActive(template)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              template.isActive
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                            }`}
                          >
                            {template.isActive ? "Hoạt động" : "Đã tắt"}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelected(template);
                                setPreviewData(null);
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handlePreview(template)}
                              className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                            >
                              Preview
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  isOpen: true,
                                  id: template.id,
                                  name: template.templateName,
                                })
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
        </div>

        {/* Create Panel */}
        {isCreating && (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Tạo Notification Template mới
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewItem({
                    templateName: "",
                    templateType: "Custom",
                    titleTemplate: "",
                    contentTemplate: "",
                    variables: {},
                    isActive: true,
                    language: "vi",
                  });
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              <Field
                label="Tên template *"
                value={newItem.templateName}
                onChange={(v) => setNewItem({ ...newItem, templateName: v })}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Loại template *
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  value={newItem.templateType}
                  onChange={(e) => setNewItem({ ...newItem, templateType: e.target.value })}
                >
                  <option value="AnalysisComplete">AnalysisComplete</option>
                  <option value="HighRiskAlert">HighRiskAlert</option>
                  <option value="PaymentSuccess">PaymentSuccess</option>
                  <option value="PackageExpiring">PackageExpiring</option>
                  <option value="MessageReceived">MessageReceived</option>
                  <option value="SystemAlert">SystemAlert</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Ngôn ngữ *
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  value={newItem.language}
                  onChange={(e) => setNewItem({ ...newItem, language: e.target.value })}
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </div>
              <Field
                label="Title Template *"
                value={newItem.titleTemplate}
                onChange={(v) => setNewItem({ ...newItem, titleTemplate: v })}
                placeholder="Ví dụ: Kết quả phân tích cho {{ userName }}"
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Content Template *
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  rows={6}
                  value={newItem.contentTemplate}
                  onChange={(e) => setNewItem({ ...newItem, contentTemplate: e.target.value })}
                  placeholder="Ví dụ: Xin chào {{ userName }}, kết quả phân tích của bạn đã sẵn sàng..."
                />
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <p className="font-medium mb-1">Cách sử dụng variables:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">
                      {"{{ userName }}"}
                    </code>{" "}
                    - Tên người dùng
                  </li>
                  <li>
                    <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">
                      {"{{ analysisId }}"}
                    </code>{" "}
                    - ID phân tích
                  </li>
                  <li>
                    <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">
                      {"{{ result }}"}
                    </code>{" "}
                    - Kết quả
                  </li>
                  <li>
                    <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">
                      {"{{ date }}"}
                    </code>{" "}
                    - Ngày tháng
                  </li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={create}
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {saving ? "Đang tạo..." : "Tạo template"}
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewItem({
                      templateName: "",
                      templateType: "Custom",
                      titleTemplate: "",
                      contentTemplate: "",
                      variables: {},
                      isActive: true,
                      language: "vi",
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

        {/* Edit/Preview Panel */}
        {(selected || previewData) && (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {previewData ? "Preview Template" : "Chỉnh sửa Template"}
              </h3>
              <button
                onClick={() => {
                  setSelected(null);
                  setPreviewData(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            {previewData ? (
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Preview Title:
                  </p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {previewData.title}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Preview Content:
                  </p>
                  <p className="text-slate-900 dark:text-white whitespace-pre-wrap">
                    {previewData.content}
                  </p>
                </div>
                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setPreviewData(null);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Quay lại chỉnh sửa
                  </button>
                </div>
              </div>
            ) : selected ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                <Field
                  label="Tên template"
                  value={selected.templateName}
                  onChange={(v) => setSelected({ ...selected, templateName: v })}
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Loại template
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    value={selected.templateType}
                    onChange={(e) => setSelected({ ...selected, templateType: e.target.value })}
                  >
                    <option value="AnalysisComplete">AnalysisComplete</option>
                    <option value="HighRiskAlert">HighRiskAlert</option>
                    <option value="PaymentSuccess">PaymentSuccess</option>
                    <option value="PackageExpiring">PackageExpiring</option>
                    <option value="MessageReceived">MessageReceived</option>
                    <option value="SystemAlert">SystemAlert</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Ngôn ngữ
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    value={selected.language}
                    onChange={(e) => setSelected({ ...selected, language: e.target.value })}
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <Field
                  label="Title Template"
                  value={selected.titleTemplate}
                  onChange={(v) => setSelected({ ...selected, titleTemplate: v })}
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Content Template
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    rows={8}
                    value={selected.contentTemplate}
                    onChange={(e) =>
                      setSelected({ ...selected, contentTemplate: e.target.value })
                    }
                  />
                </div>
                {selected.note !== undefined && (
                  <Field
                    label="Ghi chú"
                    value={selected.note || ""}
                    onChange={(v) => setSelected({ ...selected, note: v })}
                  />
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
                    onClick={() => handlePreview(selected)}
                    className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors font-medium"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => {
                      setSelected(null);
                      setPreviewData(null);
                    }}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Xác nhận xóa
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Bạn có chắc muốn xóa template <strong>"{deleteConfirm.name}"</strong>? Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {deleting ? "Đang xóa..." : "Xóa"}
                </button>
                <button
                  onClick={() =>
                    setDeleteConfirm({ isOpen: false, id: null, name: "" })
                  }
                  disabled={deleting}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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

function StatCard({
  title,
  value,
  iconColor,
  bgColor,
}: {
  title: string;
  value: number;
  iconColor: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
          <p className={`text-3xl font-bold ${iconColor} mt-2`}>{value}</p>
        </div>
        <div className={`size-12 rounded-lg ${bgColor} flex items-center justify-center`}>
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
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
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
      className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-blue-500 text-blue-600 dark:text-blue-400"
          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
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
        placeholder={placeholder}
      />
    </div>
  );
}
