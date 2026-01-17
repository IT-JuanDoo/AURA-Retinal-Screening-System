import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAdminAuthStore } from "../../store/adminAuthStore";
import AdminHeader from "../../components/admin/AdminHeader";
import complianceApi, {
  ComplianceReport,
  PrivacySettings,
  UpdatePrivacySettingsDto,
} from "../../services/complianceApi";

export default function AdminCompliancePage() {
  const navigate = useNavigate();
  const { isAdminAuthenticated, logoutAdmin } = useAdminAuthStore();

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "privacy">("dashboard");

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await complianceApi.getReport();
      setReport(data);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        logoutAdmin();
        window.location.href = "/admin/login";
        return;
      }
      toast.error(
        e?.response?.data?.message || e?.message || "Không tải được compliance report"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPrivacySettings = async () => {
    try {
      const data = await complianceApi.getPrivacySettings();
      setPrivacySettings(data);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không tải được privacy settings"
      );
    }
  };

  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate("/admin/login");
      return;
    }
    loadReport();
    loadPrivacySettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePrivacySettings = async () => {
    if (!privacySettings) return;
    setSaving(true);
    try {
      const dto: UpdatePrivacySettingsDto = {
        enableAuditLogging: privacySettings.enableAuditLogging,
        auditLogRetentionDays: privacySettings.auditLogRetentionDays,
        anonymizeOldLogs: privacySettings.anonymizeOldLogs,
        requireConsentForDataSharing: privacySettings.requireConsentForDataSharing,
        enableGdprCompliance: privacySettings.enableGdprCompliance,
        dataRetentionDays: privacySettings.dataRetentionDays,
        allowDataExport: privacySettings.allowDataExport,
        requireTwoFactorForSensitiveActions: privacySettings.requireTwoFactorForSensitiveActions,
      };
      await complianceApi.updatePrivacySettings(dto);
      toast.success("Đã lưu privacy settings");
      await loadPrivacySettings();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Không lưu được privacy settings"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased min-h-screen flex flex-col transition-colors duration-200">
      <AdminHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Compliance & Privacy Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Quản lý tuân thủ dữ liệu, audit logging và privacy settings
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
          <div className="border-b border-slate-200 dark:border-slate-800">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "dashboard"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                Compliance Dashboard
              </button>
              <button
                onClick={() => setActiveTab("privacy")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "privacy"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                Privacy Settings
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "dashboard" ? (
              <div className="space-y-6">
                {loading ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    Đang tải compliance report...
                  </div>
                ) : report ? (
                  <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <StatCard
                        title="Tổng Audit Logs"
                        value={report.totalAuditLogs.toLocaleString("vi-VN")}
                        iconColor="text-blue-500"
                        bgColor="bg-blue-500/10"
                      />
                      <StatCard
                        title="Logs (30 ngày)"
                        value={report.logsLast30Days.toLocaleString("vi-VN")}
                        iconColor="text-green-500"
                        bgColor="bg-green-500/10"
                      />
                      <StatCard
                        title="Logs (7 ngày)"
                        value={report.logsLast7Days.toLocaleString("vi-VN")}
                        iconColor="text-purple-500"
                        bgColor="bg-purple-500/10"
                      />
                      <StatCard
                        title="Unique Users"
                        value={report.uniqueUsers.toLocaleString("vi-VN")}
                        iconColor="text-orange-500"
                        bgColor="bg-orange-500/10"
                      />
                    </div>

                    {/* Action Type Distribution */}
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        Phân bố theo Action Type
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(report.actionTypeCounts).map(([action, count]) => (
                          <div key={action} className="flex items-center justify-between">
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {action}
                            </span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {count.toLocaleString("vi-VN")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Resource Type Distribution */}
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        Phân bố theo Resource Type
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(report.resourceTypeCounts).map(([resource, count]) => (
                          <div key={resource} className="flex items-center justify-between">
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {resource}
                            </span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {count.toLocaleString("vi-VN")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Compliance Issues */}
                    {report.issues.length > 0 && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-300 mb-4">
                          ⚠️ Compliance Issues
                        </h3>
                        <div className="space-y-3">
                          {report.issues.map((issue, idx) => (
                            <div
                              key={idx}
                              className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-slate-900 dark:text-white">
                                    {issue.issueType}
                                  </p>
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                    {issue.description}
                                  </p>
                                </div>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    issue.severity === "High"
                                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                      : issue.severity === "Medium"
                                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                  }`}
                                >
                                  {issue.severity}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        onClick={loadReport}
                        disabled={loading}
                        className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors font-medium"
                      >
                        {loading ? "Đang tải..." : "Tải lại"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    Không có dữ liệu compliance report
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {privacySettings ? (
                  <>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                      Cài đặt Privacy & Compliance
                    </h3>

                    <div className="space-y-4">
                      <SettingToggle
                        label="Bật Audit Logging"
                        description="Ghi lại tất cả các thao tác trong hệ thống"
                        value={privacySettings.enableAuditLogging}
                        onChange={(v) =>
                          setPrivacySettings({ ...privacySettings, enableAuditLogging: v })
                        }
                      />
                      <SettingNumber
                        label="Thời gian lưu Audit Logs (ngày)"
                        description="Số ngày lưu trữ audit logs trước khi xóa"
                        value={privacySettings.auditLogRetentionDays}
                        onChange={(v) =>
                          setPrivacySettings({
                            ...privacySettings,
                            auditLogRetentionDays: v,
                          })
                        }
                      />
                      <SettingToggle
                        label="Ẩn danh hóa logs cũ"
                        description="Tự động ẩn danh hóa thông tin nhạy cảm trong logs cũ"
                        value={privacySettings.anonymizeOldLogs}
                        onChange={(v) =>
                          setPrivacySettings({ ...privacySettings, anonymizeOldLogs: v })
                        }
                      />
                      <SettingToggle
                        label="Yêu cầu đồng ý chia sẻ dữ liệu"
                        description="Yêu cầu người dùng đồng ý trước khi chia sẻ dữ liệu"
                        value={privacySettings.requireConsentForDataSharing}
                        onChange={(v) =>
                          setPrivacySettings({
                            ...privacySettings,
                            requireConsentForDataSharing: v,
                          })
                        }
                      />
                      <SettingToggle
                        label="Bật GDPR Compliance"
                        description="Tuân thủ các quy định GDPR về bảo vệ dữ liệu"
                        value={privacySettings.enableGdprCompliance}
                        onChange={(v) =>
                          setPrivacySettings({ ...privacySettings, enableGdprCompliance: v })
                        }
                      />
                      <SettingNumber
                        label="Thời gian lưu trữ dữ liệu (ngày)"
                        description="Số ngày lưu trữ dữ liệu người dùng (GDPR: tối đa 7 năm = 2555 ngày)"
                        value={privacySettings.dataRetentionDays}
                        onChange={(v) =>
                          setPrivacySettings({ ...privacySettings, dataRetentionDays: v })
                        }
                      />
                      <SettingToggle
                        label="Cho phép xuất dữ liệu"
                        description="Cho phép người dùng xuất dữ liệu của họ"
                        value={privacySettings.allowDataExport}
                        onChange={(v) =>
                          setPrivacySettings({ ...privacySettings, allowDataExport: v })
                        }
                      />
                      <SettingToggle
                        label="Yêu cầu 2FA cho thao tác nhạy cảm"
                        description="Yêu cầu xác thực 2 yếu tố cho các thao tác quan trọng"
                        value={privacySettings.requireTwoFactorForSensitiveActions}
                        onChange={(v) =>
                          setPrivacySettings({
                            ...privacySettings,
                            requireTwoFactorForSensitiveActions: v,
                          })
                        }
                      />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={savePrivacySettings}
                        disabled={saving}
                        className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        {saving ? "Đang lưu..." : "Lưu cài đặt"}
                      </button>
                      <button
                        onClick={loadPrivacySettings}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        Hủy
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    Đang tải privacy settings...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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
  value: string;
  iconColor: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {title}
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {value}
          </p>
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function SettingToggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
      <div className="flex-1">
        <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
          {label}
        </label>
        <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer ml-4">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
      </label>
    </div>
  );
}

function SettingNumber({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
      <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
        {label}
      </label>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{description}</p>
      <input
        type="number"
        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        min={0}
      />
    </div>
  );
}
