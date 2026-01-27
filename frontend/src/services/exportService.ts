import api from './api';

export interface ExportRequest {
  analysisId: string;
  format: 'pdf' | 'csv' | 'json';
  includeImages?: boolean;
  includeRecommendations?: boolean;
}

export interface ExportHistoryItem {
  id: string;
  analysisId: string;
  userId: string;
  exportFormat: string;
  fileUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
  downloadCount: number;
  createdAt: string;
  expiresAt?: string;
  isExpired?: boolean;
}

export interface BatchExportRequest {
  analysisIds: string[];
  format: 'pdf' | 'csv' | 'json';
  includeImages?: boolean;
}

const exportService = {
  /**
   * Export analysis result to PDF
   */
  async exportToPdf(analysisId: string): Promise<ExportHistoryItem> {
    const response = await api.post<ExportHistoryItem>(
      `/analysis/${analysisId}/export/pdf`,
      {},
      { timeout: 60000 } // 60 seconds for PDF generation
    );
    return response.data;
  },

  /**
   * Export analysis result to CSV
   */
  async exportToCsv(analysisId: string): Promise<ExportHistoryItem> {
    const response = await api.post<ExportHistoryItem>(
      `/analysis/${analysisId}/export/csv`,
      {},
      { timeout: 30000 }
    );
    return response.data;
  },

  /**
   * Export analysis result to JSON
   */
  async exportToJson(analysisId: string): Promise<ExportHistoryItem> {
    const response = await api.post<ExportHistoryItem>(
      `/analysis/${analysisId}/export/json`,
      {},
      { timeout: 30000 }
    );
    return response.data;
  },

  /**
   * Batch export multiple analyses
   */
  async batchExport(request: BatchExportRequest): Promise<ExportHistoryItem[]> {
    const response = await api.post<ExportHistoryItem[]>(
      '/analysis/export/batch',
      request,
      { timeout: 120000 } // 2 minutes for batch
    );
    return response.data;
  },

  /**
   * Get export history for current user
   */
  async getExportHistory(limit: number = 20, offset: number = 0): Promise<ExportHistoryItem[]> {
    const response = await api.get<ExportHistoryItem[]>('/analysis/exports', {
      params: { limit, offset },
    });
    return response.data;
  },

  /**
   * Get single export by ID
   */
  async getExportById(exportId: string): Promise<ExportHistoryItem> {
    const response = await api.get<ExportHistoryItem>(`/analysis/exports/${exportId}`);
    return response.data;
  },

  /**
   * Download export file
   */
  async downloadExport(exportId: string): Promise<Blob> {
    const response = await api.get(`/analysis/exports/${exportId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Track download (for analytics)
   */
  async trackDownload(exportId: string): Promise<void> {
    await api.post(`/analysis/exports/${exportId}/track-download`);
  },

  /**
   * Helper: Download file directly
   */
  downloadFile(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Helper: Get file extension from format
   */
  getFileExtension(format: string): string {
    switch (format.toLowerCase()) {
      case 'pdf':
        return '.pdf';
      case 'csv':
        return '.csv';
      case 'json':
        return '.json';
      default:
        return '';
    }
  },

  /**
   * Helper: Format file size
   */
  formatFileSize(bytes?: number): string {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  },
};

export default exportService;
