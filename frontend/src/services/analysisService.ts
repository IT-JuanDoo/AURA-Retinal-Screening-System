import api from './api';

export interface AnalysisRequest {
  imageIds: string[];
}

export interface AnalysisResponse {
  analysisId: string;
  imageId: string;
  status: 'Processing' | 'Completed' | 'Failed';
  startedAt?: string;
  completedAt?: string;
}

export interface AnalysisResult {
  id: string;
  imageId: string;
  analysisStatus: string;
  overallRiskLevel?: 'Low' | 'Medium' | 'High' | 'Critical';
  riskScore?: number;
  
  // Cardiovascular Risk
  hypertensionRisk?: 'Low' | 'Medium' | 'High';
  hypertensionScore?: number;
  
  // Diabetes Risk
  diabetesRisk?: 'Low' | 'Medium' | 'High';
  diabetesScore?: number;
  diabeticRetinopathyDetected: boolean;
  diabeticRetinopathySeverity?: string;
  
  // Stroke Risk
  strokeRisk?: 'Low' | 'Medium' | 'High';
  strokeScore?: number;
  
  // Vascular Abnormalities
  vesselTortuosity?: number;
  vesselWidthVariation?: number;
  microaneurysmsCount: number;
  hemorrhagesDetected: boolean;
  exudatesDetected: boolean;
  
  // Annotated Images
  annotatedImageUrl?: string;
  heatmapUrl?: string;
  
  // AI Confidence
  aiConfidenceScore?: number;
  
  // Recommendations
  recommendations?: string;
  healthWarnings?: string;
  
  // Processing Info
  processingTimeSeconds?: number;
  analysisStartedAt?: string;
  analysisCompletedAt?: string;
  
  // Additional Data
  detailedFindings?: Record<string, any>;
}

const analysisService = {
  /**
   * Start analysis for one or more images
   */
  async startAnalysis(request: AnalysisRequest): Promise<AnalysisResponse | AnalysisResponse[]> {
    const response = await api.post<AnalysisResponse | AnalysisResponse[]>(
      '/analysis/start',
      request
    );
    return response.data;
  },

  /**
   * Get analysis result by analysis ID
   */
  async getAnalysisResult(analysisId: string): Promise<AnalysisResult> {
    const response = await api.get<AnalysisResult>(`/analysis/${analysisId}`);
    return response.data;
  },

  /**
   * Get all analysis results for current user
   */
  async getUserAnalysisResults(): Promise<AnalysisResult[]> {
    const response = await api.get<AnalysisResult[]>('/analysis');
    return response.data;
  },
};

export default analysisService;

