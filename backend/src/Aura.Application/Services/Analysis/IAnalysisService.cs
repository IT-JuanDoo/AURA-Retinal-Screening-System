using Aura.Application.DTOs.Analysis;

namespace Aura.Application.Services.Analysis;

public interface IAnalysisService
{
    Task<AnalysisResponseDto> StartAnalysisAsync(string userId, string imageId);
    Task<List<AnalysisResponseDto>> StartMultipleAnalysisAsync(string userId, List<string> imageIds);
    Task<AnalysisResultDto?> GetAnalysisResultAsync(string analysisId, string userId);
    
    /// <summary>
    /// Get all analysis results for a user (FR-6)
    /// </summary>
    Task<List<AnalysisResultDto>> GetUserAnalysisResultsAsync(string userId);
}

