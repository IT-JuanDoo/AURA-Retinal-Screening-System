import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useAdminAuthStore } from "../../store/adminAuthStore";
import AdminHeader from "../../components/admin/AdminHeader";
import StatCard from "../../components/admin/StatCard";
import TabButton from "../../components/admin/TabButton";
import {
  Field,
  TextAreaField,
  ReadOnlyField,
} from "../../components/admin/FormField";
import aiConfigApi, {
  AIConfiguration,
  CreateAIConfigurationDto,
  UpdateAIConfigurationDto,
} from "../../services/aiConfigApi";
import packageApi, {
  ServicePackage,
  CreateServicePackageDto,
  UpdateServicePackageDto,
} from "../../services/packageApi";
import notificationTemplateApi, {
  NotificationTemplate,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
} from "../../services/notificationTemplateApi";
import adminApi from "../../services/adminApi";

type Tab = "ai-config" | "packages" | "templates";

interface AdminUserRow {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  AnalysisComplete: "Hoàn tất phân tích",
  HighRiskAlert: "Cảnh báo rủi ro cao",
  PaymentSuccess: "Thanh toán thành công",
  PackageExpiring: "Gói sắp hết hạn",
  MessageReceived: "Tin nhắn đã nhận",
  SystemAlert: "Cảnh báo hệ thống",
  Custom: "Tùy chỉnh",
};

/** Mô tả đối tượng nhận thông báo theo loại template — admin biết rõ gửi cho ai */
const TEMPLATE_TARGET_AUDIENCE: Record<string, string> = {
  AnalysisComplete:
    "Bệnh nhân (người thực hiện phân tích) — gửi tự động khi phân tích xong.",
  HighRiskAlert:
    "Phòng khám / Bác sĩ được gán — gửi tự động khi có kết quả rủi ro cao.",
  PaymentSuccess:
    "Người dùng vừa thanh toán — gửi tự động sau khi thanh toán thành công.",
  PackageExpiring: "Người dùng có gói sắp hết hạn — gửi tự động theo lịch.",
  MessageReceived: "Người nhận tin nhắn — gửi tự động khi có tin nhắn mới.",
  SystemAlert:
    "Tùy theo cấu hình hệ thống (có thể gửi tới tất cả hoặc nhóm cụ thể).",
  Custom:
    "Tùy chỉnh khi gửi: có thể gửi tới tất cả người dùng hoặc một người dùng cụ thể (khi admin gửi thủ công).",
};

function getTemplateTypeLabel(type: string): string {
  return TEMPLATE_TYPE_LABELS[type] ?? type;
}

function getTemplateTargetAudience(type: string): string {
  return TEMPLATE_TARGET_AUDIENCE[type] ?? "—";
}

export default function AdminSystemPage() {
  const navigate = useNavigate();
  const { isAdminAuthenticated, logoutAdmin } = useAdminAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(
    (searchParams.get("tab") as Tab) || "ai-config",
  );

  // Common state
  const [search, setSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // AI Config state
  const [aiConfigs, setAiConfigs] = useState<AIConfiguration[]>([]);
  const [selectedAiConfig, setSelectedAiConfig] =
    useState<AIConfiguration | null>(null);
  const [isCreatingAiConfig, setIsCreatingAiConfig] = useState(false);
  const [newAiConfig, setNewAiConfig] = useState<CreateAIConfigurationDto>({
    configurationName: "",
    configurationType: "Parameter",
    parameterKey: "",
    parameterValue: "",
    parameterDataType: "String",
    description: "",
    isActive: true,
  });
  const [aiConfigDeleteConfirm, setAiConfigDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
    name: string;
  }>({ isOpen: false, id: null, name: "" });
  const [deletingAiConfig, setDeletingAiConfig] = useState(false);
  const [aiConfigSubTab, setAiConfigSubTab] = useState<
    "all" | "threshold" | "parameter" | "policy" | "retraining"
  >("all");

  // Packages state
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(
    null,
  );
  const [isCreatingPackage, setIsCreatingPackage] = useState(false);
  const [newPackage, setNewPackage] = useState<CreateServicePackageDto>({
    packageName: "",
    packageType: "Individual",
    description: "",
    numberOfAnalyses: 10,
    price: 0,
    currency: "VND",
    validityDays: 30,
    isActive: true,
  });
  const [packageDeleteConfirm, setPackageDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
    name: string;
  }>({ isOpen: false, id: null, name: "" });
  const [deletingPackage, setDeletingPackage] = useState(false);
  const [packageSubTab, setPackageSubTab] = useState<
    "all" | "individual" | "clinic" | "enterprise"
  >("all");

  // Templates state
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<NotificationTemplate | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState<CreateNotificationTemplateDto>(
    {
      templateName: "",
      templateType: "Custom",
      titleTemplate: "",
      contentTemplate: "",
      variables: {},
      isActive: true,
      language: "vi",
    },
  );
  const [templateDeleteConfirm, setTemplateDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
    name: string;
  }>({ isOpen: false, id: null, name: "" });
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const [templateSubTab, setTemplateSubTab] = useState<
    "all" | "analysis" | "alert" | "payment" | "message" | "system" | "custom"
  >("all");
  const [languageFilter, setLanguageFilter] = useState<string>("");
  const [previewData, setPreviewData] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [sendModalTemplate, setSendModalTemplate] =
    useState<NotificationTemplate | null>(null);
  const [sendTargetType, setSendTargetType] = useState<"all" | "user">("user");
  const [sendUserId, setSendUserId] = useState("");
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [sendModalLoading, setSendModalLoading] = useState(false);
  const [sendSending, setSendSending] = useState(false);

  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate("/admin/login");
      return;
    }
    setSearchParams({ tab: activeTab });
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, aiConfigSubTab, packageSubTab, templateSubTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, isActiveFilter, languageFilter]);

  const loadData = async () => {
    if (!isAdminAuthenticated) return;
    setLoading(true);
    try {
      if (activeTab === "ai-config") {
        const configTypeFilter =
          aiConfigSubTab === "all"
            ? undefined
            : aiConfigSubTab.charAt(0).toUpperCase() + aiConfigSubTab.slice(1);
        const data = await aiConfigApi.getAll(
          search || undefined,
          configTypeFilter,
          isActiveFilter ?? undefined,
        );
        setAiConfigs(data);
      } else if (activeTab === "packages") {
        const packageTypeFilter =
          packageSubTab === "all"
            ? undefined
            : packageSubTab === "individual"
              ? "Individual"
              : packageSubTab === "clinic"
                ? "Clinic"
                : "Enterprise";
        const data = await packageApi.getAll(
          search || undefined,
          packageTypeFilter,
          isActiveFilter ?? undefined,
        );
        setPackages(data);
      } else if (activeTab === "templates") {
        const templateTypeFilter =
          templateSubTab === "all"
            ? undefined
            : templateSubTab === "analysis"
              ? "AnalysisComplete"
              : templateSubTab === "alert"
                ? "HighRiskAlert"
                : templateSubTab === "payment"
                  ? "PaymentSuccess"
                  : templateSubTab === "message"
                    ? "MessageReceived"
                    : templateSubTab === "system"
                      ? "SystemAlert"
                      : "Custom";
        const data = await notificationTemplateApi.getAll(
          search || undefined,
          templateTypeFilter,
          isActiveFilter ?? undefined,
          languageFilter || undefined,
        );
        setTemplates(data);
      }
    } catch (e: any) {
      if (e?.response?.status === 401) {
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        logoutAdmin();
        window.location.href = "/admin/login";
        return;
      }
      toast.error(
        e?.response?.data?.message || e?.message || "Không tải được dữ liệu",
      );
    } finally {
      setLoading(false);
    }
  };

  // AI Config handlers
  const toggleAiConfigActive = async (config: AIConfiguration) => {
    const isActive = !config.isActive;
    try {
      await aiConfigApi.setStatus(config.id, isActive);
      setAiConfigs((prev) =>
        prev.map((x) => (x.id === config.id ? { ...x, isActive } : x)),
      );
      if (selectedAiConfig?.id === config.id)
        setSelectedAiConfig({ ...selectedAiConfig, isActive });
      toast.success(isActive ? "Đã kích hoạt cấu hình" : "Đã tắt cấu hình");
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không cập nhật được",
      );
    }
  };

  const saveAiConfig = async () => {
    if (!selectedAiConfig?.id) return;
    setSaving(true);
    try {
      const dto: UpdateAIConfigurationDto = {
        configurationName: selectedAiConfig.configurationName,
        configurationType: selectedAiConfig.configurationType,
        modelVersionId: selectedAiConfig.modelVersionId,
        parameterKey: selectedAiConfig.parameterKey,
        parameterValue: selectedAiConfig.parameterValue,
        parameterDataType: selectedAiConfig.parameterDataType,
        description: selectedAiConfig.description,
        isActive: selectedAiConfig.isActive,
      };
      await aiConfigApi.update(selectedAiConfig.id, dto);
      toast.success("Đã lưu");
      setSelectedAiConfig(null);
      await loadData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  const createAiConfig = async () => {
    if (
      !newAiConfig.configurationName ||
      !newAiConfig.parameterKey ||
      !newAiConfig.parameterValue
    ) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    setSaving(true);
    try {
      await aiConfigApi.create(newAiConfig);
      toast.success("Đã tạo mới");
      setIsCreatingAiConfig(false);
      setNewAiConfig({
        configurationName: "",
        configurationType: "Parameter",
        parameterKey: "",
        parameterValue: "",
        parameterDataType: "String",
        description: "",
        isActive: true,
      });
      await loadData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không tạo được");
    } finally {
      setSaving(false);
    }
  };

  const deleteAiConfig = async () => {
    if (!aiConfigDeleteConfirm.id) return;
    setDeletingAiConfig(true);
    try {
      await aiConfigApi.delete(aiConfigDeleteConfirm.id);
      toast.success("Đã xóa cấu hình");
      setAiConfigDeleteConfirm({ isOpen: false, id: null, name: "" });
      if (selectedAiConfig?.id === aiConfigDeleteConfirm.id)
        setSelectedAiConfig(null);
      await loadData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không xóa được");
    } finally {
      setDeletingAiConfig(false);
    }
  };

  // Package handlers
  const togglePackageActive = async (pkg: ServicePackage) => {
    const isActive = !pkg.isActive;
    try {
      await packageApi.setStatus(pkg.id, isActive);
      setPackages((prev) =>
        prev.map((x) => (x.id === pkg.id ? { ...x, isActive } : x)),
      );
      if (selectedPackage?.id === pkg.id)
        setSelectedPackage({ ...selectedPackage, isActive });
      toast.success(isActive ? "Đã bật gói" : "Đã tắt gói");
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không cập nhật được",
      );
    }
  };

  const savePackage = async () => {
    if (!selectedPackage?.id) return;
    setSaving(true);
    try {
      const dto: UpdateServicePackageDto = {
        packageName: selectedPackage.packageName,
        packageType: selectedPackage.packageType,
        description: selectedPackage.description,
        numberOfAnalyses: selectedPackage.numberOfAnalyses,
        price: selectedPackage.price,
        currency: selectedPackage.currency,
        validityDays: selectedPackage.validityDays,
        isActive: selectedPackage.isActive,
      };
      await packageApi.update(selectedPackage.id, dto);
      toast.success("Đã lưu");
      setSelectedPackage(null);
      await loadData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  const createPackage = async () => {
    if (
      !newPackage.packageName ||
      newPackage.numberOfAnalyses <= 0 ||
      newPackage.price <= 0
    ) {
      toast.error("Vui lòng điền Tên gói, Số lượt và Giá hợp lệ");
      return;
    }
    setSaving(true);
    try {
      await packageApi.create(newPackage);
      toast.success("Đã tạo gói mới");
      setIsCreatingPackage(false);
      setNewPackage({
        packageName: "",
        packageType: "Individual",
        description: "",
        numberOfAnalyses: 10,
        price: 0,
        currency: "VND",
        validityDays: 30,
        isActive: true,
      });
      await loadData();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không tạo được gói",
      );
    } finally {
      setSaving(false);
    }
  };

  const deletePackage = async () => {
    if (!packageDeleteConfirm.id) return;
    setDeletingPackage(true);
    try {
      await packageApi.delete(packageDeleteConfirm.id);
      toast.success("Đã xóa gói");
      setPackageDeleteConfirm({ isOpen: false, id: null, name: "" });
      if (selectedPackage?.id === packageDeleteConfirm.id)
        setSelectedPackage(null);
      await loadData();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không xóa được gói",
      );
    } finally {
      setDeletingPackage(false);
    }
  };

  // Template handlers
  const toggleTemplateActive = async (template: NotificationTemplate) => {
    const isActive = !template.isActive;
    try {
      await notificationTemplateApi.setStatus(template.id, isActive);
      setTemplates((prev) =>
        prev.map((x) => (x.id === template.id ? { ...x, isActive } : x)),
      );
      if (selectedTemplate?.id === template.id)
        setSelectedTemplate({ ...selectedTemplate, isActive });
      toast.success(isActive ? "Đã bật template" : "Đã tắt template");
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không cập nhật được",
      );
    }
  };

  const saveTemplate = async () => {
    if (!selectedTemplate?.id) return;
    setSaving(true);
    try {
      const dto: UpdateNotificationTemplateDto = {
        templateName: selectedTemplate.templateName,
        templateType: selectedTemplate.templateType,
        titleTemplate: selectedTemplate.titleTemplate,
        contentTemplate: selectedTemplate.contentTemplate,
        variables: selectedTemplate.variables
          ? JSON.parse(selectedTemplate.variables)
          : undefined,
        isActive: selectedTemplate.isActive,
        language: selectedTemplate.language,
        note: selectedTemplate.note,
      };
      await notificationTemplateApi.update(selectedTemplate.id, dto);
      toast.success("Đã lưu");
      setSelectedTemplate(null);
      setPreviewData(null);
      await loadData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  const createTemplate = async () => {
    if (
      !newTemplate.templateName ||
      !newTemplate.titleTemplate ||
      !newTemplate.contentTemplate
    ) {
      toast.error(
        "Vui lòng điền đầy đủ Tên template, Mẫu tiêu đề và Mẫu nội dung",
      );
      return;
    }
    setSaving(true);
    try {
      await notificationTemplateApi.create(newTemplate);
      toast.success("Đã tạo template mới");
      setIsCreatingTemplate(false);
      setNewTemplate({
        templateName: "",
        templateType: "Custom",
        titleTemplate: "",
        contentTemplate: "",
        variables: {},
        isActive: true,
        language: "vi",
      });
      await loadData();
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
      const preview = await notificationTemplateApi.preview(
        template.id,
        variables,
      );
      setPreviewData({
        title: preview.previewTitle,
        content: preview.previewContent,
      });
      setSelectedTemplate(template);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không preview được",
      );
    }
  };

  const deleteTemplate = async () => {
    if (!templateDeleteConfirm.id) return;
    setDeletingTemplate(true);
    try {
      await notificationTemplateApi.delete(templateDeleteConfirm.id);
      toast.success("Đã xóa template");
      setTemplateDeleteConfirm({ isOpen: false, id: null, name: "" });
      if (selectedTemplate?.id === templateDeleteConfirm.id) {
        setSelectedTemplate(null);
        setPreviewData(null);
      }
      await loadData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Không xóa được");
    } finally {
      setDeletingTemplate(false);
    }
  };

  const stats = useMemo(() => {
    if (activeTab === "ai-config") {
      const total = aiConfigs.length;
      const active = aiConfigs.filter((c) => c.isActive).length;
      const inactive = total - active;
      const byType = {
        threshold: aiConfigs.filter((c) => c.configurationType === "Threshold")
          .length,
        parameter: aiConfigs.filter((c) => c.configurationType === "Parameter")
          .length,
        policy: aiConfigs.filter((c) => c.configurationType === "Policy")
          .length,
        retraining: aiConfigs.filter(
          (c) => c.configurationType === "Retraining",
        ).length,
      };
      return { total, active, inactive, byType };
    } else if (activeTab === "packages") {
      const total = packages.length;
      const active = packages.filter((r) => r.isActive).length;
      const inactive = total - active;
      const byType = {
        individual: packages.filter((r) => r.packageType === "Individual")
          .length,
        clinic: packages.filter((r) => r.packageType === "Clinic").length,
        enterprise: packages.filter((r) => r.packageType === "Enterprise")
          .length,
      };
      return { total, active, inactive, byType };
    } else {
      const total = templates.length;
      const active = templates.filter((r) => r.isActive).length;
      const inactive = total - active;
      const vi = templates.filter((r) => r.language === "vi").length;
      const en = templates.filter((r) => r.language === "en").length;
      return { total, active, inactive, vi, en };
    }
  }, [aiConfigs, packages, templates, activeTab]);

  if (!isAdminAuthenticated) {
    return null;
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased min-h-screen flex flex-col transition-colors duration-200">
      <AdminHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Cài đặt Hệ thống
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Quản lý cấu hình AI, gói dịch vụ và mẫu thông báo
          </p>
        </div>

        {/* Main Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
          <div className="border-b border-slate-200 dark:border-slate-800">
            <nav className="flex -mb-px">
              <TabButton
                active={activeTab === "ai-config"}
                onClick={() => setActiveTab("ai-config")}
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
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                }
              >
                Cấu hình AI
              </TabButton>
              <TabButton
                active={activeTab === "packages"}
                onClick={() => setActiveTab("packages")}
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
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                }
              >
                Gói dịch vụ
              </TabButton>
              <TabButton
                active={activeTab === "templates"}
                onClick={() => setActiveTab("templates")}
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
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                }
              >
                Mẫu thông báo
              </TabButton>
            </nav>
          </div>

          <div className="p-6">
            {/* Stats Cards */}
            {activeTab === "ai-config" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
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
                  title="Tham số"
                  value={
                    "byType" in stats && stats.byType
                      ? (stats.byType as any).parameter
                      : 0
                  }
                  iconColor="text-purple-500"
                  bgColor="bg-purple-500/10"
                />
              </div>
            )}
            {activeTab === "packages" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <StatCard
                  title="Tổng số gói"
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
                  title="Phòng khám/Doanh nghiệp"
                  value={
                    "byType" in stats && stats.byType
                      ? ((stats.byType as any).clinic || 0) +
                        ((stats.byType as any).enterprise || 0)
                      : 0
                  }
                  iconColor="text-purple-500"
                  bgColor="bg-purple-500/10"
                />
              </div>
            )}
            {activeTab === "templates" && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
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
                  value={"vi" in stats ? stats.vi || 0 : 0}
                  iconColor="text-purple-500"
                  bgColor="bg-purple-500/10"
                />
                <StatCard
                  title="Tiếng Anh"
                  value={"en" in stats ? stats.en || 0 : 0}
                  iconColor="text-orange-500"
                  bgColor="bg-orange-500/10"
                />
              </div>
            )}

            {/* Search and Filter */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                value={
                  isActiveFilter === null
                    ? ""
                    : isActiveFilter
                      ? "true"
                      : "false"
                }
                onChange={(e) =>
                  setIsActiveFilter(
                    e.target.value === "" ? null : e.target.value === "true",
                  )
                }
              >
                <option value="">Tất cả trạng thái</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Đã tắt</option>
              </select>
              {activeTab === "templates" && (
                <select
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                >
                  <option value="">Tất cả ngôn ngữ</option>
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">Tiếng Anh</option>
                </select>
              )}
            </div>

            {/* Content based on tab */}
            {activeTab === "ai-config" && (
              <AIConfigContent
                configs={aiConfigs}
                loading={loading}
                selected={selectedAiConfig}
                onSelect={setSelectedAiConfig}
                onToggleActive={toggleAiConfigActive}
                onSave={saveAiConfig}
                saving={saving}
                isCreating={isCreatingAiConfig}
                onSetIsCreating={setIsCreatingAiConfig}
                newConfig={newAiConfig}
                onNewConfigChange={setNewAiConfig}
                onCreate={createAiConfig}
                onDelete={(id: string, name: string) =>
                  setAiConfigDeleteConfirm({ isOpen: true, id, name })
                }
                subTab={aiConfigSubTab}
                onSubTabChange={setAiConfigSubTab}
                stats={stats}
              />
            )}
            {activeTab === "packages" && (
              <PackagesContent
                packages={packages}
                loading={loading}
                selected={selectedPackage}
                onSelect={setSelectedPackage}
                onToggleActive={togglePackageActive}
                onSave={savePackage}
                saving={saving}
                isCreating={isCreatingPackage}
                onSetIsCreating={setIsCreatingPackage}
                newPackage={newPackage}
                onNewPackageChange={setNewPackage}
                onCreate={createPackage}
                onDelete={(id: string, name: string) =>
                  setPackageDeleteConfirm({ isOpen: true, id, name })
                }
                subTab={packageSubTab}
                onSubTabChange={setPackageSubTab}
                stats={stats}
              />
            )}
            {activeTab === "templates" && (
              <TemplatesContent
                templates={templates}
                loading={loading}
                selected={selectedTemplate}
                onSelect={setSelectedTemplate}
                onToggleActive={toggleTemplateActive}
                onSave={saveTemplate}
                saving={saving}
                isCreating={isCreatingTemplate}
                onSetIsCreating={setIsCreatingTemplate}
                newTemplate={newTemplate}
                onNewTemplateChange={setNewTemplate}
                onCreate={createTemplate}
                onDelete={(id: string, name: string) =>
                  setTemplateDeleteConfirm({ isOpen: true, id, name })
                }
                onPreview={handlePreview}
                onOpenSend={(template: NotificationTemplate) => {
                  setSendModalTemplate(template);
                  setSendTargetType("user");
                  setSendUserId("");
                  setSendModalLoading(true);
                  adminApi
                    .get<AdminUserRow[]>("/admin/users", { params: {} })
                    .then((res) => {
                      const list = res.data || [];
                      setAdminUsers(list);
                      if (list.length) setSendUserId(list[0].id);
                    })
                    .catch(() => setAdminUsers([]))
                    .finally(() => setSendModalLoading(false));
                }}
                previewData={previewData}
                onPreviewDataChange={setPreviewData}
                subTab={templateSubTab}
                onSubTabChange={setTemplateSubTab}
                stats={stats}
              />
            )}
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modals */}
      {aiConfigDeleteConfirm.isOpen && (
        <DeleteConfirmModal
          title="Xác nhận xóa"
          message={`Bạn có chắc muốn xóa cấu hình "${aiConfigDeleteConfirm.name}"? Hành động này không thể hoàn tác.`}
          onConfirm={deleteAiConfig}
          onCancel={() =>
            setAiConfigDeleteConfirm({ isOpen: false, id: null, name: "" })
          }
          deleting={deletingAiConfig}
        />
      )}
      {packageDeleteConfirm.isOpen && (
        <DeleteConfirmModal
          title="Xóa gói dịch vụ"
          message={`Bạn có chắc muốn xóa gói "${packageDeleteConfirm.name}"? Hành động này không thể hoàn tác.`}
          onConfirm={deletePackage}
          onCancel={() =>
            setPackageDeleteConfirm({ isOpen: false, id: null, name: "" })
          }
          deleting={deletingPackage}
        />
      )}
      {templateDeleteConfirm.isOpen && (
        <DeleteConfirmModal
          title="Xác nhận xóa"
          message={`Bạn có chắc muốn xóa template "${templateDeleteConfirm.name}"? Hành động này không thể hoàn tác.`}
          onConfirm={deleteTemplate}
          onCancel={() =>
            setTemplateDeleteConfirm({ isOpen: false, id: null, name: "" })
          }
          deleting={deletingTemplate}
        />
      )}

      {/* Modal gửi thông báo theo template (một user hoặc tất cả) */}
      {sendModalTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !sendSending && setSendModalTemplate(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Gửi thông báo
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Template: {sendModalTemplate.templateName}
              </p>
            </div>
            <div className="px-4 py-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Đối tượng nhận
                </p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sendTarget"
                      checked={sendTargetType === "user"}
                      onChange={() => setSendTargetType("user")}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Một người dùng
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sendTarget"
                      checked={sendTargetType === "all"}
                      onChange={() => setSendTargetType("all")}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Tất cả người dùng
                    </span>
                  </label>
                </div>
              </div>
              {sendTargetType === "user" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Chọn người dùng
                  </label>
                  {sendModalLoading ? (
                    <p className="text-sm text-slate-500">
                      Đang tải danh sách...
                    </p>
                  ) : (
                    <select
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      value={sendUserId}
                      onChange={(e) => setSendUserId(e.target.value)}
                    >
                      <option value="">-- Chọn user --</option>
                      {adminUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {[u.firstName, u.lastName]
                            .filter(Boolean)
                            .join(" ") || u.email}{" "}
                          ({u.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => !sendSending && setSendModalTemplate(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                disabled={sendSending}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={
                  sendSending || (sendTargetType === "user" && !sendUserId)
                }
                onClick={async () => {
                  if (!sendModalTemplate) return;
                  setSendSending(true);
                  try {
                    const res = await notificationTemplateApi.send(
                      sendModalTemplate.id,
                      {
                        targetType: sendTargetType,
                        userId:
                          sendTargetType === "user"
                            ? sendUserId || undefined
                            : undefined,
                      },
                    );
                    toast.success(res.message);
                    setSendModalTemplate(null);
                  } catch (e: any) {
                    toast.error(
                      e?.response?.data?.message || "Gửi thông báo thất bại",
                    );
                  } finally {
                    setSendSending(false);
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 font-medium"
              >
                {sendSending ? "Đang gửi..." : "Gửi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components
function AIConfigContent({
  configs,
  loading,
  selected,
  onSelect,
  onToggleActive,
  onSave,
  saving,
  isCreating,
  onSetIsCreating,
  newConfig,
  onNewConfigChange,
  onCreate,
  onDelete,
  subTab,
  onSubTabChange,
  stats,
}: any) {
  return (
    <>
      {/* Sub-tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 mb-6">
        <nav className="flex -mb-px">
          <TabButton
            active={subTab === "all"}
            onClick={() => onSubTabChange("all")}
          >
            Tất cả ({stats.total})
          </TabButton>
          <TabButton
            active={subTab === "threshold"}
            onClick={() => onSubTabChange("threshold")}
          >
            Ngưỡng ({stats.byType.threshold})
          </TabButton>
          <TabButton
            active={subTab === "parameter"}
            onClick={() => onSubTabChange("parameter")}
          >
            Tham số ({stats.byType.parameter})
          </TabButton>
          <TabButton
            active={subTab === "policy"}
            onClick={() => onSubTabChange("policy")}
          >
            Chính sách ({stats.byType.policy})
          </TabButton>
          <TabButton
            active={subTab === "retraining"}
            onClick={() => onSubTabChange("retraining")}
          >
            Huấn luyện lại ({stats.byType.retraining})
          </TabButton>
        </nav>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => onSetIsCreating(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          + Thêm cấu hình mới
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Tên cấu hình
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Loại
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Khóa tham số
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Giá trị tham số
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
            {loading && configs.length === 0 ? (
              <tr>
                <td
                  className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                  colSpan={6}
                >
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : configs.length === 0 ? (
              <tr>
                <td
                  className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                  colSpan={6}
                >
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              configs.map((config: AIConfiguration) => (
                <tr
                  key={config.id}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selected?.id === config.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                    {config.configurationName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        config.configurationType === "Threshold"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                          : config.configurationType === "Parameter"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : config.configurationType === "Policy"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                      }`}
                    >
                      {config.configurationType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 font-mono">
                    {config.parameterKey}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100 font-mono max-w-xs truncate">
                    {config.parameterValue}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        config.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {config.isActive ? "Hoạt động" : "Đã tắt"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelect({ ...config })}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                      >
                        Sửa
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">
                        |
                      </span>
                      <button
                        onClick={() => onToggleActive(config)}
                        className={
                          config.isActive
                            ? "text-orange-600 hover:text-orange-900"
                            : "text-green-600 hover:text-green-900"
                        }
                      >
                        {config.isActive ? "Tắt" : "Bật"}
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">
                        |
                      </span>
                      <button
                        onClick={() =>
                          onDelete(config.id, config.configurationName)
                        }
                        className="text-red-600 hover:text-red-900 dark:text-red-400"
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

      {/* Create Panel */}
      {isCreating && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Thêm cấu hình AI mới
            </h3>
            <button
              onClick={() => {
                onSetIsCreating(false);
                onNewConfigChange({
                  configurationName: "",
                  configurationType: "Parameter",
                  parameterKey: "",
                  parameterValue: "",
                  parameterDataType: "String",
                  description: "",
                  isActive: true,
                });
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            <Field
              label="Tên cấu hình *"
              value={newConfig.configurationName}
              onChange={(v) =>
                onNewConfigChange({ ...newConfig, configurationName: v })
              }
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Loại cấu hình *
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                value={newConfig.configurationType}
                onChange={(e) =>
                  onNewConfigChange({
                    ...newConfig,
                    configurationType: e.target.value,
                  })
                }
              >
                <option value="Threshold">Ngưỡng</option>
                <option value="Parameter">Tham số</option>
                <option value="Policy">Chính sách</option>
                <option value="Retraining">Huấn luyện lại</option>
              </select>
            </div>
            <Field
              label="ID phiên bản mô hình"
              value={newConfig.modelVersionId || ""}
              onChange={(v) =>
                onNewConfigChange({ ...newConfig, modelVersionId: v })
              }
            />
            <Field
              label="Khóa tham số *"
              value={newConfig.parameterKey}
              onChange={(v) =>
                onNewConfigChange({ ...newConfig, parameterKey: v })
              }
            />
            <TextAreaField
              label="Giá trị tham số *"
              value={newConfig.parameterValue}
              onChange={(v) =>
                onNewConfigChange({ ...newConfig, parameterValue: v })
              }
              rows={3}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Kiểu dữ liệu
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                value={newConfig.parameterDataType || "String"}
                onChange={(e) =>
                  onNewConfigChange({
                    ...newConfig,
                    parameterDataType: e.target.value,
                  })
                }
              >
                <option value="String">Chuỗi (String)</option>
                <option value="Number">Số (Number)</option>
                <option value="Boolean">Đúng/Sai (Boolean)</option>
                <option value="JSON">JSON</option>
              </select>
            </div>
            <TextAreaField
              label="Mô tả"
              value={newConfig.description || ""}
              onChange={(v) =>
                onNewConfigChange({ ...newConfig, description: v })
              }
              rows={3}
            />
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={onCreate}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 font-medium"
              >
                {saving ? "Đang tạo..." : "Tạo mới"}
              </button>
              <button
                onClick={() => {
                  onSetIsCreating(false);
                  onNewConfigChange({
                    configurationName: "",
                    configurationType: "Parameter",
                    parameterKey: "",
                    parameterValue: "",
                    parameterDataType: "String",
                    description: "",
                    isActive: true,
                  });
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg"
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
              Chỉnh sửa cấu hình AI
            </h3>
            <button
              onClick={() => onSelect(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            <ReadOnlyField label="ID" value={selected.id} />
            <Field
              label="Tên cấu hình"
              value={selected.configurationName}
              onChange={(v) => onSelect({ ...selected, configurationName: v })}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Loại cấu hình
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                value={selected.configurationType}
                onChange={(e) =>
                  onSelect({ ...selected, configurationType: e.target.value })
                }
              >
                <option value="Threshold">Ngưỡng</option>
                <option value="Parameter">Tham số</option>
                <option value="Policy">Chính sách</option>
                <option value="Retraining">Huấn luyện lại</option>
              </select>
            </div>
            <Field
              label="ID phiên bản mô hình"
              value={selected.modelVersionId || ""}
              onChange={(v) => onSelect({ ...selected, modelVersionId: v })}
            />
            <Field
              label="Khóa tham số"
              value={selected.parameterKey}
              onChange={(v) => onSelect({ ...selected, parameterKey: v })}
            />
            <TextAreaField
              label="Giá trị tham số"
              value={selected.parameterValue}
              onChange={(v) => onSelect({ ...selected, parameterValue: v })}
              rows={3}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Kiểu dữ liệu
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                value={selected.parameterDataType || "String"}
                onChange={(e) =>
                  onSelect({ ...selected, parameterDataType: e.target.value })
                }
              >
                <option value="String">Chuỗi (String)</option>
                <option value="Number">Số (Number)</option>
                <option value="Boolean">Đúng/Sai (Boolean)</option>
                <option value="JSON">JSON</option>
              </select>
            </div>
            <TextAreaField
              label="Mô tả"
              value={selected.description || ""}
              onChange={(v) => onSelect({ ...selected, description: v })}
              rows={3}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Trạng thái
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                value={selected.isActive ? "true" : "false"}
                onChange={(e) =>
                  onSelect({ ...selected, isActive: e.target.value === "true" })
                }
              >
                <option value="true">Hoạt động</option>
                <option value="false">Đã tắt</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={onSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
              <button
                onClick={() => onSelect(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PackagesContent({
  packages,
  loading,
  selected,
  onSelect,
  onToggleActive,
  onSave,
  saving,
  isCreating,
  onSetIsCreating,
  newPackage,
  onNewPackageChange,
  onCreate,
  onDelete,
  subTab,
  onSubTabChange,
  stats,
}: any) {
  return (
    <>
      {/* Sub-tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 mb-6">
        <nav className="flex -mb-px">
          <TabButton
            active={subTab === "all"}
            onClick={() => onSubTabChange("all")}
          >
            Tất cả ({stats.total})
          </TabButton>
          <TabButton
            active={subTab === "individual"}
            onClick={() => onSubTabChange("individual")}
          >
            Cá nhân ({stats.byType.individual})
          </TabButton>
          <TabButton
            active={subTab === "clinic"}
            onClick={() => onSubTabChange("clinic")}
          >
            Phòng khám ({stats.byType.clinic})
          </TabButton>
          <TabButton
            active={subTab === "enterprise"}
            onClick={() => onSubTabChange("enterprise")}
          >
            Doanh nghiệp ({stats.byType.enterprise})
          </TabButton>
        </nav>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => onSetIsCreating(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          + Thêm gói mới
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Tên gói
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Loại
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Số lượt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Giá / gói
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Hiệu lực
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
            {loading && packages.length === 0 ? (
              <tr>
                <td
                  className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                  colSpan={7}
                >
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : packages.length === 0 ? (
              <tr>
                <td
                  className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                  colSpan={7}
                >
                  Không có gói dịch vụ nào
                </td>
              </tr>
            ) : (
              packages.map((pkg: ServicePackage) => (
                <tr
                  key={pkg.id}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selected?.id === pkg.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                    {pkg.packageName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {pkg.packageType === "Individual"
                      ? "Cá nhân"
                      : pkg.packageType === "Clinic"
                        ? "Phòng khám"
                        : "Doanh nghiệp"}
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
                      {pkg.isActive ? "Hoạt động" : "Đã tắt"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelect({ ...pkg })}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                      >
                        Sửa
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">
                        |
                      </span>
                      <button
                        onClick={() => onToggleActive(pkg)}
                        className={
                          pkg.isActive
                            ? "text-orange-600 hover:text-orange-900"
                            : "text-green-600 hover:text-green-900"
                        }
                      >
                        {pkg.isActive ? "Tắt" : "Bật"}
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">
                        |
                      </span>
                      <button
                        onClick={() => onDelete(pkg.id, pkg.packageName)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400"
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

      {/* Create Panel */}
      {isCreating && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Thêm gói dịch vụ mới
            </h3>
            <button
              onClick={() => {
                onSetIsCreating(false);
                onNewPackageChange({
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
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            <Field
              label="Tên gói *"
              value={newPackage.packageName}
              onChange={(v) =>
                onNewPackageChange({ ...newPackage, packageName: v })
              }
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Loại gói *
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                value={newPackage.packageType}
                onChange={(e) =>
                  onNewPackageChange({
                    ...newPackage,
                    packageType: e.target.value,
                  })
                }
              >
                <option value="Individual">Cá nhân</option>
                <option value="Clinic">Phòng khám/Phòng mạch</option>
                <option value="Enterprise">Doanh nghiệp / Tổ chức lớn</option>
              </select>
            </div>
            <Field
              label="Số lượt phân tích *"
              type="number"
              value={String(newPackage.numberOfAnalyses)}
              onChange={(v) =>
                onNewPackageChange({
                  ...newPackage,
                  numberOfAnalyses: Number(v) || 0,
                })
              }
            />
            <Field
              label="Giá gói (VND) *"
              type="number"
              value={String(newPackage.price)}
              onChange={(v) =>
                onNewPackageChange({ ...newPackage, price: Number(v) || 0 })
              }
            />
            <Field
              label="Tiền tệ"
              value={newPackage.currency || "VND"}
              onChange={(v) =>
                onNewPackageChange({ ...newPackage, currency: v })
              }
            />
            <Field
              label="Hiệu lực (ngày)"
              type="number"
              value={
                newPackage.validityDays !== undefined
                  ? String(newPackage.validityDays)
                  : ""
              }
              onChange={(v) =>
                onNewPackageChange({
                  ...newPackage,
                  validityDays: v ? Number(v) || 0 : undefined,
                })
              }
            />
            <TextAreaField
              label="Mô tả"
              value={newPackage.description || ""}
              onChange={(v) =>
                onNewPackageChange({ ...newPackage, description: v })
              }
              rows={3}
            />
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={onCreate}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 font-medium"
              >
                {saving ? "Đang tạo..." : "Tạo gói"}
              </button>
              <button
                onClick={() => {
                  onSetIsCreating(false);
                  onNewPackageChange({
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
                className="px-4 py-2 border border-slate-300 rounded-lg"
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
              Chỉnh sửa gói dịch vụ
            </h3>
            <button
              onClick={() => onSelect(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            <ReadOnlyField label="ID" value={selected.id} />
            <Field
              label="Tên gói"
              value={selected.packageName}
              onChange={(v) => onSelect({ ...selected, packageName: v })}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Loại gói
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                value={selected.packageType}
                onChange={(e) =>
                  onSelect({ ...selected, packageType: e.target.value })
                }
              >
                <option value="Individual">Cá nhân</option>
                <option value="Clinic">Phòng khám/Phòng mạch</option>
                <option value="Enterprise">Doanh nghiệp / Tổ chức lớn</option>
              </select>
            </div>
            <Field
              label="Số lượt phân tích"
              type="number"
              value={String(selected.numberOfAnalyses)}
              onChange={(v) =>
                onSelect({ ...selected, numberOfAnalyses: Number(v) || 0 })
              }
            />
            <Field
              label="Giá gói (VND)"
              type="number"
              value={String(selected.price)}
              onChange={(v) => onSelect({ ...selected, price: Number(v) || 0 })}
            />
            <Field
              label="Tiền tệ"
              value={selected.currency}
              onChange={(v) => onSelect({ ...selected, currency: v })}
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
                onSelect({
                  ...selected,
                  validityDays: v ? Number(v) || 0 : undefined,
                })
              }
            />
            <TextAreaField
              label="Mô tả"
              value={selected.description || ""}
              onChange={(v) => onSelect({ ...selected, description: v })}
              rows={3}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Trạng thái
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                value={selected.isActive ? "true" : "false"}
                onChange={(e) =>
                  onSelect({ ...selected, isActive: e.target.value === "true" })
                }
              >
                <option value="true">Đang bán</option>
                <option value="false">Đã tắt</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={onSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
              <button
                onClick={() => onSelect(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TemplatesContent({
  templates,
  loading,
  selected,
  onSelect,
  onToggleActive,
  onSave,
  saving,
  isCreating,
  onSetIsCreating,
  newTemplate,
  onNewTemplateChange,
  onCreate,
  onDelete,
  onPreview,
  onOpenSend,
  previewData,
  onPreviewDataChange,
  subTab,
  onSubTabChange,
}: any) {
  return (
    <>
      {/* Sub-tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 mb-6">
        <nav className="flex -mb-px overflow-x-auto">
          <TabButton
            active={subTab === "all"}
            onClick={() => onSubTabChange("all")}
          >
            Tất cả
          </TabButton>
          <TabButton
            active={subTab === "analysis"}
            onClick={() => onSubTabChange("analysis")}
          >
            Hoàn tất phân tích
          </TabButton>
          <TabButton
            active={subTab === "alert"}
            onClick={() => onSubTabChange("alert")}
          >
            Cảnh báo rủi ro cao
          </TabButton>
          <TabButton
            active={subTab === "payment"}
            onClick={() => onSubTabChange("payment")}
          >
            Thanh toán
          </TabButton>
          <TabButton
            active={subTab === "message"}
            onClick={() => onSubTabChange("message")}
          >
            Tin nhắn
          </TabButton>
          <TabButton
            active={subTab === "system"}
            onClick={() => onSubTabChange("system")}
          >
            Cảnh báo hệ thống
          </TabButton>
          <TabButton
            active={subTab === "custom"}
            onClick={() => onSubTabChange("custom")}
          >
            Tùy chỉnh
          </TabButton>
        </nav>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => onSetIsCreating(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          + Tạo template mới
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Tên template
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Loại
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Mẫu tiêu đề
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Ngôn ngữ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
            {loading && templates.length === 0 ? (
              <tr>
                <td
                  className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                  colSpan={6}
                >
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td
                  className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                  colSpan={6}
                >
                  Không có template nào
                </td>
              </tr>
            ) : (
              templates.map((template: NotificationTemplate) => (
                <tr
                  key={template.id}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selected?.id === template.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                    {template.templateName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {getTemplateTypeLabel(template.templateType)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
                    {template.titleTemplate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {template.language === "vi"
                      ? "🇻🇳 Tiếng Việt"
                      : "🇬🇧 Tiếng Anh"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => onToggleActive(template)}
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelect({ ...template })}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                      >
                        Sửa
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">
                        |
                      </span>
                      <button
                        onClick={() => onPreview(template)}
                        className="text-purple-600 hover:text-purple-900 dark:text-purple-400"
                      >
                        Xem trước
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">
                        |
                      </span>
                      {onOpenSend && (
                        <>
                          <button
                            onClick={() => onOpenSend(template)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400"
                          >
                            Gửi
                          </button>
                          <span className="text-slate-300 dark:text-slate-700">
                            |
                          </span>
                        </>
                      )}
                      <button
                        onClick={() =>
                          onDelete(template.id, template.templateName)
                        }
                        className="text-red-600 hover:text-red-900 dark:text-red-400"
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

      {/* Create Panel */}
      {isCreating && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Tạo Notification Template mới
            </h3>
            <button
              onClick={() => {
                onSetIsCreating(false);
                onNewTemplateChange({
                  templateName: "",
                  templateType: "Custom",
                  titleTemplate: "",
                  contentTemplate: "",
                  variables: {},
                  isActive: true,
                  language: "vi",
                });
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            <Field
              label="Tên template *"
              value={newTemplate.templateName}
              onChange={(v) =>
                onNewTemplateChange({ ...newTemplate, templateName: v })
              }
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Loại template *
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                value={newTemplate.templateType}
                onChange={(e) =>
                  onNewTemplateChange({
                    ...newTemplate,
                    templateType: e.target.value,
                  })
                }
              >
                <option value="AnalysisComplete">Hoàn tất phân tích</option>
                <option value="HighRiskAlert">Cảnh báo rủi ro cao</option>
                <option value="PaymentSuccess">Thanh toán thành công</option>
                <option value="PackageExpiring">Gói sắp hết hạn</option>
                <option value="MessageReceived">Tin nhắn đã nhận</option>
                <option value="SystemAlert">Cảnh báo hệ thống</option>
                <option value="Custom">Tùy chỉnh</option>
              </select>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2.5">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Đối tượng nhận
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {getTemplateTargetAudience(newTemplate.templateType)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Ngôn ngữ *
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                value={newTemplate.language}
                onChange={(e) =>
                  onNewTemplateChange({
                    ...newTemplate,
                    language: e.target.value,
                  })
                }
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">Tiếng Anh</option>
              </select>
            </div>
            <Field
              label="Mẫu tiêu đề *"
              value={newTemplate.titleTemplate}
              onChange={(v) =>
                onNewTemplateChange({ ...newTemplate, titleTemplate: v })
              }
              placeholder="Ví dụ: Kết quả phân tích cho {{ userName }}"
            />
            <TextAreaField
              label="Mẫu nội dung *"
              value={newTemplate.contentTemplate}
              onChange={(v) =>
                onNewTemplateChange({ ...newTemplate, contentTemplate: v })
              }
              rows={6}
              placeholder="Ví dụ: Xin chào {{ userName }}, kết quả phân tích của bạn đã sẵn sàng..."
            />
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
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={onCreate}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 font-medium"
              >
                {saving ? "Đang tạo..." : "Tạo template"}
              </button>
              <button
                onClick={() => {
                  onSetIsCreating(false);
                  onNewTemplateChange({
                    templateName: "",
                    templateType: "Custom",
                    titleTemplate: "",
                    contentTemplate: "",
                    variables: {},
                    isActive: true,
                    language: "vi",
                  });
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg"
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
              {previewData ? "Xem trước template" : "Chỉnh sửa template"}
            </h3>
            <button
              onClick={() => {
                onSelect(null);
                onPreviewDataChange(null);
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          {previewData ? (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tiêu đề (xem trước):
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {previewData.title}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nội dung (xem trước):
                </p>
                <p className="text-slate-900 dark:text-white whitespace-pre-wrap">
                  {previewData.content}
                </p>
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => onPreviewDataChange(null)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg"
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
                onChange={(v) => onSelect({ ...selected, templateName: v })}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Loại template
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  value={selected.templateType}
                  onChange={(e) =>
                    onSelect({ ...selected, templateType: e.target.value })
                  }
                >
                  <option value="AnalysisComplete">Hoàn tất phân tích</option>
                  <option value="HighRiskAlert">Cảnh báo rủi ro cao</option>
                  <option value="PaymentSuccess">Thanh toán thành công</option>
                  <option value="PackageExpiring">Gói sắp hết hạn</option>
                  <option value="MessageReceived">Tin nhắn đã nhận</option>
                  <option value="SystemAlert">Cảnh báo hệ thống</option>
                  <option value="Custom">Tùy chỉnh</option>
                </select>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Đối tượng nhận
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {getTemplateTargetAudience(selected.templateType)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Ngôn ngữ
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  value={selected.language}
                  onChange={(e) =>
                    onSelect({ ...selected, language: e.target.value })
                  }
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">Tiếng Anh</option>
                </select>
              </div>
              <Field
                label="Mẫu tiêu đề"
                value={selected.titleTemplate}
                onChange={(v) => onSelect({ ...selected, titleTemplate: v })}
              />
              <TextAreaField
                label="Mẫu nội dung"
                value={selected.contentTemplate}
                onChange={(v) => onSelect({ ...selected, contentTemplate: v })}
                rows={8}
              />
              {selected.note !== undefined && (
                <Field
                  label="Ghi chú"
                  value={selected.note || ""}
                  onChange={(v) => onSelect({ ...selected, note: v })}
                />
              )}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
                >
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
                <button
                  onClick={() => onPreview(selected)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  Xem trước
                </button>
                <button
                  onClick={() => {
                    onSelect(null);
                    onPreviewDataChange(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}

function DeleteConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  deleting,
}: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {title}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? "Đang xóa..." : "Xóa"}
          </button>
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
