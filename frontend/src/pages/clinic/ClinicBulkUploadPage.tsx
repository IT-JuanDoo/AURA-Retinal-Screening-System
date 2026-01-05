import { useState, useRef, useCallback, useEffect } from "react";
import clinicImageService, {
  ClinicBulkUploadResponse,
  BatchAnalysisStatus,
} from "../../services/clinicImageService";
import toast from "react-hot-toast";

const ClinicBulkUploadPage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] =
    useState<ClinicBulkUploadResponse | null>(null);
  const [analysisStatus, setAnalysisStatus] =
    useState<BatchAnalysisStatus | null>(null);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);

  // Form options
  const [batchName, setBatchName] = useState("");
  const [patientUserId, setPatientUserId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [imageType, setImageType] = useState<"Fundus" | "OCT" | "">("");
  const [eyeSide, setEyeSide] = useState<"Left" | "Right" | "Both" | "">("");
  const [captureDevice, setCaptureDevice] = useState("");
  const [captureDate, setCaptureDate] = useState("");
  const [autoStartAnalysis, setAutoStartAnalysis] = useState(true);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFiles = (files: FileList | null): File[] => {
    if (!files || files.length === 0) return [];

    const validFiles: File[] = [];
    const validExtensions = [".jpg", ".jpeg", ".png", ".dicom", ".dcm"];
    const maxFileSize = 50 * 1024 * 1024; // 50MB

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

      if (!validExtensions.includes(fileExtension)) {
        toast.error(
          `File ${
            file.name
          } không được hỗ trợ. Chỉ chấp nhận: ${validExtensions.join(", ")}`
        );
        continue;
      }

      if (file.size > maxFileSize) {
        toast.error(`File ${file.name} vượt quá 50MB`);
        continue;
      }

      validFiles.push(file);
    }

    return validFiles;
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    const validFiles = validateFiles(files);
    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      toast.success(`Đã thêm ${validFiles.length} file(s)`);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setUploadResult(null);
    setAnalysisStatus(null);
  };

  const handleBulkUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Vui lòng chọn ít nhất một file");
      return;
    }

    if (selectedFiles.length > 1000) {
      toast.error(
        "Tối đa 1000 ảnh mỗi lần upload. Vui lòng chia nhỏ thành nhiều batch."
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);
    setAnalysisStatus(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 5, 90));
      }, 500);

      const result = await clinicImageService.bulkUploadImages(selectedFiles, {
        patientUserId: patientUserId || undefined,
        doctorId: doctorId || undefined,
        batchName: batchName || undefined,
        autoStartAnalysis,
        imageType: imageType || undefined,
        eyeSide: eyeSide || undefined,
        captureDevice: captureDevice || undefined,
        captureDate: captureDate || undefined,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      setUploadResult(result);
      toast.success(
        `Upload thành công: ${result.successCount}/${result.totalFiles} file(s)`
      );

      if (result.failedCount > 0) {
        toast.error(`${result.failedCount} file(s) upload thất bại`);
      }

      // If analysis was auto-started, start polling for status
      if (result.analysisJobId) {
        startPollingAnalysisStatus(result.analysisJobId);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Upload thất bại");
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const startPollingAnalysisStatus = (jobId: string) => {
    // Clear existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    const poll = async () => {
      try {
        const status = await clinicImageService.getBatchAnalysisStatus(jobId);
        setAnalysisStatus(status);

        if (status.status === "Completed" || status.status === "Failed") {
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
        }
      } catch (error) {
        console.error("Error polling analysis status:", error);
      }
    };

    // Poll immediately
    poll();

    // Then poll every 5 seconds
    const interval = setInterval(poll, 5000);
    setPollingInterval(interval);
  };

  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Bulk Upload Retinal Images (FR-24)
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Upload và phân tích hàng loạt ảnh võng mạc (hỗ trợ ≥100 ảnh mỗi
            batch)
          </p>
        </div>

        {/* Upload Options */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            Tùy chọn Upload
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tên Batch (tùy chọn)
              </label>
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="Ví dụ: Screening Campaign 2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Patient User ID (tùy chọn)
              </label>
              <input
                type="text"
                value={patientUserId}
                onChange={(e) => setPatientUserId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="ID của bệnh nhân"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Doctor ID (tùy chọn)
              </label>
              <input
                type="text"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="ID của bác sĩ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Loại Ảnh
              </label>
              <select
                value={imageType}
                onChange={(e) => setImageType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Tự động phát hiện</option>
                <option value="Fundus">Fundus</option>
                <option value="OCT">OCT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mắt
              </label>
              <select
                value={eyeSide}
                onChange={(e) => setEyeSide(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Không xác định</option>
                <option value="Left">Trái</option>
                <option value="Right">Phải</option>
                <option value="Both">Cả hai</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Thiết bị chụp
              </label>
              <input
                type="text"
                value={captureDevice}
                onChange={(e) => setCaptureDevice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="Ví dụ: Canon CR-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ngày chụp
              </label>
              <input
                type="date"
                value={captureDate}
                onChange={(e) => setCaptureDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoStartAnalysis"
                checked={autoStartAnalysis}
                onChange={(e) => setAutoStartAnalysis(e.target.checked)}
                className="mr-2"
              />
              <label
                htmlFor="autoStartAnalysis"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Tự động bắt đầu phân tích AI sau khi upload
              </label>
            </div>
          </div>
        </div>

        {/* File Upload Area */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-slate-300 dark:border-slate-700"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.dicom,.dcm"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            <div className="space-y-4">
              <div className="text-6xl">📁</div>
              <div>
                <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  Kéo thả file vào đây hoặc click để chọn
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Hỗ trợ: JPG, PNG, DICOM (tối đa 50MB/file, tối đa 1000
                  files/batch)
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Chọn Files
              </button>
            </div>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Đã chọn: {selectedFiles.length} file(s) (
                  {formatFileSize(totalSize)})
                </h3>
                <button
                  onClick={clearAllFiles}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Xóa tất cả
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upload Button */}
        {selectedFiles.length > 0 && (
          <div className="mb-6">
            <button
              onClick={handleBulkUpload}
              disabled={isUploading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isUploading
                ? `Đang upload... ${uploadProgress}%`
                : "Bắt đầu Upload"}
            </button>
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Kết quả Upload
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Tổng số file
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {uploadResult.totalFiles}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Thành công
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {uploadResult.successCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Thất bại
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {uploadResult.failedCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Batch ID
                </p>
                <p className="text-sm font-mono text-slate-900 dark:text-white">
                  {uploadResult.batchId.substring(0, 8)}...
                </p>
              </div>
            </div>

            {uploadResult.failed.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-red-600 mb-2">
                  Files thất bại:
                </h3>
                <ul className="space-y-1">
                  {uploadResult.failed.map((fail, index) => (
                    <li
                      key={index}
                      className="text-sm text-slate-600 dark:text-slate-400"
                    >
                      {fail.filename}: {fail.errorMessage}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {uploadResult.analysisJobId && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Analysis Job ID: {uploadResult.analysisJobId}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Analysis Status */}
        {analysisStatus && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Trạng thái Phân tích AI
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Trạng thái
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      analysisStatus.status === "Completed"
                        ? "text-green-600"
                        : analysisStatus.status === "Failed"
                        ? "text-red-600"
                        : "text-blue-600"
                    }`}
                  >
                    {analysisStatus.status}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        (analysisStatus.processedCount /
                          analysisStatus.totalImages) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Tổng số ảnh
                  </p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {analysisStatus.totalImages}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Đã xử lý
                  </p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {analysisStatus.processedCount}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Thành công
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    {analysisStatus.successCount}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Thất bại
                  </p>
                  <p className="text-xl font-bold text-red-600">
                    {analysisStatus.failedCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicBulkUploadPage;
