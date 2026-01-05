import api from "./api";

export interface ClinicBulkUploadResponse {
  batchId: string;
  totalFiles: number;
  successCount: number;
  failedCount: number;
  successfullyUploaded: Array<{
    id: string;
    originalFilename: string;
    cloudinaryUrl: string;
    fileSize: number;
    imageType: string;
    uploadStatus: string;
    uploadedAt: string;
  }>;
  failed: Array<{
    filename: string;
    errorMessage: string;
  }>;
  analysisJobId?: string;
  uploadedAt: string;
}

export interface BatchAnalysisStatus {
  jobId: string;
  batchId: string;
  status: "Queued" | "Processing" | "Completed" | "Failed";
  totalImages: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  imageIds: string[];
}

export interface QueueAnalysisRequest {
  imageIds: string[];
  batchId?: string;
}

const clinicImageService = {
  /**
   * Bulk upload retinal images for clinic (FR-24)
   * @param files Array of File objects
   * @param options Upload options
   */
  async bulkUploadImages(
    files: File[],
    options?: {
      patientUserId?: string;
      doctorId?: string;
      batchName?: string;
      autoStartAnalysis?: boolean;
      imageType?: string;
      eyeSide?: string;
      captureDevice?: string;
      captureDate?: string;
    }
  ): Promise<ClinicBulkUploadResponse> {
    const formData = new FormData();

    // Append all files
    files.forEach((file) => {
      formData.append("files", file);
    });

    // Append options
    if (options?.patientUserId) {
      formData.append("patientUserId", options.patientUserId);
    }
    if (options?.doctorId) {
      formData.append("doctorId", options.doctorId);
    }
    if (options?.batchName) {
      formData.append("batchName", options.batchName);
    }
    if (options?.autoStartAnalysis !== undefined) {
      formData.append("autoStartAnalysis", options.autoStartAnalysis.toString());
    }
    if (options?.imageType) {
      formData.append("imageType", options.imageType);
    }
    if (options?.eyeSide) {
      formData.append("eyeSide", options.eyeSide);
    }
    if (options?.captureDevice) {
      formData.append("captureDevice", options.captureDevice);
    }
    if (options?.captureDate) {
      formData.append("captureDate", options.captureDate);
    }

    const response = await api.post<ClinicBulkUploadResponse>(
      "/clinic/images/bulk-upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 300000, // 5 minutes timeout for large uploads
      }
    );

    return response.data;
  },

  /**
   * Get status of a batch analysis job
   */
  async getBatchAnalysisStatus(jobId: string): Promise<BatchAnalysisStatus> {
    const response = await api.get<BatchAnalysisStatus>(
      `/clinic/images/analysis/${jobId}/status`
    );
    return response.data;
  },

  /**
   * Queue a batch of already-uploaded images for AI analysis
   */
  async queueBatchAnalysis(
    request: QueueAnalysisRequest
  ): Promise<BatchAnalysisStatus> {
    const response = await api.post<BatchAnalysisStatus>(
      "/clinic/images/queue-analysis",
      request
    );
    return response.data;
  },
};

export default clinicImageService;

