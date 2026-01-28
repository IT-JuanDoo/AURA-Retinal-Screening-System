import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ClinicHeader from "../../components/clinic/ClinicHeader";
import clinicAuthService from "../../services/clinicAuthService";
import clinicImageService, {
  BatchAnalysisStatus,
  ClinicAnalysisResult,
  ClinicBulkUploadResponse,
} from "../../services/clinicImageService";
import clinicPackageService from "../../services/clinicPackageService";

interface SelectedImage {
  id: string;
  file: File;
  preview: string;
}

const AI_CORE_BASE_URL = import.meta.env.VITE_AI_CORE_BASE_URL || "http://localhost:8000";

const resolveImageUrl = (path?: string | null) => {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${AI_CORE_BASE_URL}${path}`;
};

const ClinicUploadPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selected, setSelected] = useState<SelectedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [status, setStatus] = useState<BatchAnalysisStatus | null>(null);
  const [results, setResults] = useState<ClinicAnalysisResult[] | null>(null);

  useEffect(() => {
    (async () => {
      const ok = await clinicAuthService.ensureLoggedIn();
      if (!ok) navigate("/login");
    })();
  }, [navigate]);

  const createPreview = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(String(e.target?.result ?? ""));
      reader.readAsDataURL(file);
    });

  const validateFiles = (files: FileList | null) => {
    if (!files?.length) return [];
    const validExtensions = [".jpg", ".jpeg", ".png", ".dicom", ".dcm"];
    const maxFileSize = 50 * 1024 * 1024;
    const out: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      if (!validExtensions.includes(ext)) {
        toast.error(`File ${f.name} không được hỗ trợ (JPG/PNG/DICOM)`);
        continue;
      }
      if (f.size > maxFileSize) {
        toast.error(`File ${f.name} vượt quá 50MB`);
        continue;
      }
      out.push(f);
    }
    return out;
  };

  const addFiles = useCallback(
    async (files: FileList | null) => {
      const valid = validateFiles(files);
      if (valid.length === 0) return;

      const newItems: SelectedImage[] = [];
      for (let i = 0; i < valid.length; i++) {
        const file = valid[i];
        const preview = await createPreview(file);
        newItems.push({ id: `sel-${Date.now()}-${i}`, file, preview });
      }
      setSelected((prev) => [...prev, ...newItems]);
    },
    [setSelected]
  );

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await addFiles(e.target.files);
    e.target.value = "";
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await addFiles(e.dataTransfer.files);
  };

  const removeOne = (id: string) => setSelected((prev) => prev.filter((x) => x.id !== id));
  const clearAll = () => setSelected([]);

  const pollStatus = async (id: string) => {
    const s = await clinicImageService.getBatchAnalysisStatus(id);
    setStatus(s);
    if (s.status === "Completed" || s.status === "Failed") return s;
    return null;
  };

  const startUploadAndAnalyze = async () => {
    if (selected.length === 0) {
      toast.error("Vui lòng chọn ít nhất một ảnh");
      return;
    }

    // Must have clinic package/credits
    try {
      const current = await clinicPackageService.getCurrentPackage();
      if (!current || current.remainingAnalyses <= 0) {
        toast.error("Phòng khám không còn lượt phân tích. Vui lòng mua gói dịch vụ.");
        navigate("/clinic/packages");
        return;
      }
      if (current.remainingAnalyses < selected.length) {
        toast.error(`Chỉ còn ${current.remainingAnalyses} lượt phân tích, không đủ cho ${selected.length} ảnh.`);
        navigate("/clinic/packages");
        return;
      }
    } catch {
      // If current package endpoint fails, still allow user to try (backend will enforce)
    }

    setUploading(true);
    setResults(null);
    setStatus(null);
    setJobId(null);
    setBatchId(null);

    try {
      const files = selected.map((s) => s.file);
      const result: ClinicBulkUploadResponse = await clinicImageService.bulkUploadImages(files, {
        autoStartAnalysis: true,
      });

      setBatchId(result.batchId);
      if (!result.analysisJobId) {
        toast.success("Upload thành công. (Chưa có job phân tích AI)");
        return;
      }

      setJobId(result.analysisJobId);
      toast.success("Upload thành công, đang chạy AI phân tích...");

      // Poll status until completed
      let final: BatchAnalysisStatus | null = null;
      for (let i = 0; i < 60; i++) {
        final = await pollStatus(result.analysisJobId);
        if (final) break;
        await new Promise((r) => setTimeout(r, 2000));
      }

      if (!final) {
        toast("Đang xử lý AI... vui lòng đợi thêm", { duration: 4000 });
        return;
      }

      if (final.status === "Failed") {
        toast.error("Phân tích AI thất bại");
        return;
      }

      const res = await clinicImageService.getBatchAnalysisResults(result.analysisJobId);
      setResults(res);
      toast.success("AI đã phân tích xong");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể upload/phân tích");
    } finally {
      setUploading(false);
    }
  };

  const riskBadge = (risk?: string) => {
    switch (risk) {
      case "Low":
        return "bg-green-50 text-green-700 border-green-200";
      case "Medium":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "High":
      case "Critical":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <ClinicHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Upload ảnh & phân tích AI</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Tải ảnh Fundus/OCT và chạy AI phân tích trực tiếp cho phòng khám.
            </p>
          </div>

          <div
            className={`w-full rounded-2xl border-2 border-dashed transition-all bg-white dark:bg-slate-900 ${
              isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-slate-300 dark:border-slate-700"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.dicom,.dcm"
              multiple
              className="hidden"
              onChange={onPickFiles}
            />
            <div className="p-10 text-center space-y-4">
              <div className="text-slate-600 dark:text-slate-300">
                Kéo thả ảnh vào đây hoặc bấm để chọn (JPG/PNG/DICOM, tối đa 50MB/ảnh)
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                Chọn ảnh
              </button>
            </div>
          </div>

          {selected.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900 dark:text-white">Ảnh đã chọn ({selected.length})</h2>
                <button className="text-sm text-red-600 hover:underline" onClick={clearAll}>
                  Xóa tất cả
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selected.map((img) => (
                  <div key={img.id} className="flex gap-3 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                    <div
                      className="w-20 h-20 rounded-lg bg-slate-200 dark:bg-slate-800 bg-cover bg-center"
                      style={{ backgroundImage: `url(${img.preview})` }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-900 dark:text-white truncate">{img.file.name}</div>
                      <div className="text-xs text-slate-500">{Math.round(img.file.size / 1024)} KB</div>
                    </div>
                    <button className="text-slate-500 hover:text-red-600" onClick={() => removeOne(img.id)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              disabled={uploading || selected.length === 0}
              onClick={startUploadAndAnalyze}
              className="flex-1 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold"
            >
              {uploading ? "Đang upload & phân tích..." : "Upload & phân tích AI"}
            </button>
          </div>

          {(jobId || batchId) && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                {batchId && (
                  <div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Batch:</span> {batchId}
                  </div>
                )}
                {jobId && (
                  <div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Job AI:</span> {jobId}
                  </div>
                )}
                {status && (
                  <div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Trạng thái:</span> {status.status} (
                    {status.processedCount}/{status.totalImages})
                  </div>
                )}
              </div>
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Kết quả AI</h2>
              {results.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-600 dark:text-slate-400">
                  Chưa có kết quả.
                </div>
              ) : (
                results.map((r) => (
                  <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        Image: <span className="font-mono text-sm">{r.imageId.slice(0, 8)}…</span>
                      </div>
                      <div className={`px-3 py-1 rounded-full border text-sm font-semibold w-fit ${riskBadge(r.overallRiskLevel)}`}>
                        {r.overallRiskLevel || "Unknown"} {r.riskScore != null ? `(${r.riskScore})` : ""}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <div className="text-sm text-slate-600 dark:text-slate-400">Ảnh gốc/annotated</div>
                        {resolveImageUrl(r.annotatedImageUrl) ? (
                          <img
                            src={resolveImageUrl(r.annotatedImageUrl)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800"
                          />
                        ) : (
                          <div className="text-sm text-slate-500">Chưa có ảnh annotated</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-slate-600 dark:text-slate-400">Heatmap</div>
                        {resolveImageUrl(r.heatmapUrl) ? (
                          <img
                            src={resolveImageUrl(r.heatmapUrl)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800"
                          />
                        ) : (
                          <div className="text-sm text-slate-500">Chưa có heatmap</div>
                        )}
                      </div>
                    </div>

                    {(r.recommendations || r.healthWarnings) && (
                      <div className="mt-4 space-y-2">
                        {r.healthWarnings && (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                            <b>Cảnh báo:</b> {r.healthWarnings}
                          </div>
                        )}
                        {r.recommendations && (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm">
                            <b>Khuyến nghị:</b> {r.recommendations}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ClinicUploadPage;

