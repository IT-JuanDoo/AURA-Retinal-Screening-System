import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import clinicReportService, {
  CreateClinicReportDto,
  ClinicReportDto,
  ReportTemplateDto,
  ClinicInfoDto,
} from "../../services/clinicReportService";
import toast from "react-hot-toast";

const ClinicReportGenerationPage = () => {
  const [templates, setTemplates] = useState<ReportTemplateDto[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplateDto | null>(null);
  const [clinicId, setClinicId] = useState<string>("");
  const [clinicInfo, setClinicInfo] = useState<ClinicInfoDto | null>(null);
  const [reportName, setReportName] = useState<string>("");
  const [periodStart, setPeriodStart] = useState<string>("");
  const [periodEnd, setPeriodEnd] = useState<string>("");
  const [exportFormat, setExportFormat] = useState<string>("PDF");
  const [exportToFile, setExportToFile] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [recentReports, setRecentReports] = useState<ClinicReportDto[]>([]);

  const location = useLocation();

  useEffect(() => {
    loadTemplates();
    loadRecentReports();
  }, [location.pathname]); // Reload when route changes

  useEffect(() => {
    if (selectedTemplate) {
      // Auto-generate report name
      const dateStr = new Date().toLocaleDateString("vi-VN");
      setReportName(`${selectedTemplate.name} - ${dateStr}`);
      
      // Set default period for templates that require it
      if (selectedTemplate.requiresPeriod && !periodStart && !periodEnd) {
        if (selectedTemplate.type === "MonthlySummary") {
          const now = new Date();
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
          setPeriodStart(firstDay.toISOString().split("T")[0]);
          setPeriodEnd(now.toISOString().split("T")[0]);
        } else if (selectedTemplate.type === "AnnualReport") {
          const now = new Date();
          const firstDay = new Date(now.getFullYear(), 0, 1);
          setPeriodStart(firstDay.toISOString().split("T")[0]);
          setPeriodEnd(now.toISOString().split("T")[0]);
        } else {
          // Default to last 30 days
          const end = new Date();
          const start = new Date();
          start.setDate(start.getDate() - 30);
          setPeriodStart(start.toISOString().split("T")[0]);
          setPeriodEnd(end.toISOString().split("T")[0]);
        }
      }
    }
  }, [selectedTemplate]);

  const loadTemplates = async () => {
    try {
      const data = await clinicReportService.getTemplates();
      setTemplates(data);
    } catch (error: any) {
      // Error loading templates
      toast.error("Lỗi khi tải danh sách templates");
    }
  };

  const loadRecentReports = async () => {
    try {
      const reports = await clinicReportService.getReports();
      setRecentReports(reports.slice(0, 10)); // Show last 10 reports
    } catch (error: any) {
      // Error loading recent reports
    }
  };

  const loadClinicInfo = async (id: string) => {
    if (!id) return;
    try {
      setLoading(true);
      const info = await clinicReportService.getClinicInfo(id);
      setClinicInfo(info);
    } catch (error: any) {
      // Error loading clinic info
      toast.error("Không thể tải thông tin clinic");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedTemplate) {
      toast.error("Vui lòng chọn template báo cáo");
      return;
    }

    if (!clinicId) {
      toast.error("Vui lòng nhập Clinic ID");
      return;
    }

    if (!reportName.trim()) {
      toast.error("Vui lòng nhập tên báo cáo");
      return;
    }

    if (selectedTemplate.requiresPeriod && (!periodStart || !periodEnd)) {
      toast.error("Vui lòng chọn khoảng thời gian");
      return;
    }

    try {
      setGenerating(true);
      const dto: CreateClinicReportDto = {
        clinicId,
        reportName: reportName.trim(),
        reportType: selectedTemplate.type,
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
        exportToFile,
        exportFormat: exportToFile ? exportFormat : undefined,
      };

      const report = await clinicReportService.generateReport(dto);
      toast.success("Tạo báo cáo thành công!");
      
      // Refresh recent reports
      await loadRecentReports();
      
      // Navigate to report detail or show success message
      if (report.reportFileUrl) {
        window.open(report.reportFileUrl, "_blank");
      }
    } catch (error: any) {
      // Error generating report
      toast.error(error?.response?.data?.message || "Lỗi khi tạo báo cáo");
    } finally {
      setGenerating(false);
    }
  };

  const getTemplateIcon = (icon: string) => {
    const icons: Record<string, string> = {
      campaign: "📊",
      risk: "⚠️",
      calendar: "📅",
      year: "📆",
      custom: "📝",
    };
    return icons[icon] || "📄";
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Tạo Báo Cáo Clinic (FR-26)
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Tạo báo cáo tổng hợp cho chiến dịch sàng lọc và phân tích rủi ro
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Report Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Template Selection */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                Chọn Template Báo Cáo
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <button
                    key={template.type}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedTemplate?.type === template.type
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getTemplateIcon(template.icon)}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {template.name}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Report Configuration */}
            {selectedTemplate && (
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  Cấu Hình Báo Cáo
                </h2>

                <div className="space-y-4">
                  {/* Clinic ID */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Clinic ID <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={clinicId}
                        onChange={(e) => setClinicId(e.target.value)}
                        onBlur={() => loadClinicInfo(clinicId)}
                        placeholder="Nhập Clinic ID"
                        className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      {loading && (
                        <div className="flex items-center px-4">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                    {clinicInfo && (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        {clinicInfo.clinicName} - {clinicInfo.email}
                      </p>
                    )}
                  </div>

                  {/* Report Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Tên Báo Cáo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="Nhập tên báo cáo"
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Period Selection */}
                  {selectedTemplate.requiresPeriod && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Từ Ngày <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={periodStart}
                          onChange={(e) => setPeriodStart(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Đến Ngày <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={periodEnd}
                          onChange={(e) => setPeriodEnd(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Export Options */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={exportToFile}
                        onChange={(e) => setExportToFile(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Xuất ra file
                      </span>
                    </label>

                    {exportToFile && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Định Dạng File
                        </label>
                        <select
                          value={exportFormat}
                          onChange={(e) => setExportFormat(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="PDF">PDF</option>
                          <option value="CSV">CSV</option>
                          <option value="JSON">JSON</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerateReport}
                    disabled={generating || !clinicId || !reportName.trim()}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {generating ? "Đang tạo..." : "Tạo Báo Cáo"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Recent Reports */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                Báo Cáo Gần Đây
              </h2>
              {recentReports.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Chưa có báo cáo nào
                </p>
              ) : (
                <div className="space-y-3">
                  {recentReports.map((report) => (
                    <div
                      key={report.id}
                      className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                        {report.reportName}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {new Date(report.generatedAt).toLocaleDateString("vi-VN")}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                          {report.reportType}
                        </span>
                        {report.reportFileUrl && (
                          <button
                            onClick={() => window.open(report.reportFileUrl, "_blank")}
                            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            Xem
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicReportGenerationPage;
