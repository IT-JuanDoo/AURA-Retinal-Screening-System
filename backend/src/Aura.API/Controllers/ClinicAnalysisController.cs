using Aura.Application.DTOs.Analysis;
using Aura.Application.Services.Analysis;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aura.API.Controllers;

/// <summary>
/// Clinic analysis: giống patient - start analysis với imageIds, lấy kết quả theo analysisId.
/// </summary>
[ApiController]
[Route("api/clinic/analysis")]
[Authorize]
public class ClinicAnalysisController : ControllerBase
{
    private readonly IAnalysisService _analysisService;
    private readonly ILogger<ClinicAnalysisController> _logger;

    public ClinicAnalysisController(IAnalysisService analysisService, ILogger<ClinicAnalysisController> logger)
    {
        _analysisService = analysisService;
        _logger = logger;
    }

    private string? GetClinicId()
    {
        return User.FindFirstValue("clinic_id")
            ?? User.FindFirstValue("ClinicId")
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
    }

    /// <summary>
    /// Bắt đầu phân tích (giống patient POST /api/analysis/start). Trả về analysisId để frontend redirect.
    /// </summary>
    [HttpPost("start")]
    [ProducesResponseType(typeof(AnalysisResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(List<AnalysisResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> StartAnalysis([FromBody] AnalysisRequestDto request)
    {
        if (request.ImageIds == null || request.ImageIds.Count == 0)
            return BadRequest(new { message = "Cần ít nhất một ID hình ảnh" });

        var clinicId = GetClinicId();
        if (string.IsNullOrEmpty(clinicId))
            return Unauthorized(new { message = "Chưa xác thực phòng khám" });

        try
        {
            if (request.ImageIds.Count == 1)
            {
                var result = await _analysisService.StartAnalysisAsync(clinicId, request.ImageIds[0]);
                _logger.LogInformation("Clinic {ClinicId} started analysis {AnalysisId}", clinicId, result.AnalysisId);
                return Ok(result);
            }

            var results = await _analysisService.StartMultipleAnalysisAsync(clinicId, request.ImageIds);
            _logger.LogInformation("Clinic {ClinicId} started {Count} analyses", clinicId, results.Count);
            return Ok(results);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Clinic {ClinicId} start analysis: {Message}", clinicId, ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Clinic {ClinicId} start analysis failed", clinicId);
            return StatusCode(500, new { message = "Không thể bắt đầu phân tích", error = ex.Message });
        }
    }

    /// <summary>
    /// Lấy kết quả phân tích theo analysisId (giống patient GET /api/analysis/:id). Verify ảnh thuộc clinic.
    /// </summary>
    [HttpGet("result/{analysisId}")]
    [ProducesResponseType(typeof(AnalysisResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetAnalysisResult(string analysisId)
    {
        var clinicId = GetClinicId();
        if (string.IsNullOrEmpty(clinicId))
            return Unauthorized(new { message = "Chưa xác thực phòng khám" });

        try
        {
            var result = await _analysisService.GetAnalysisResultAsync(analysisId, clinicId);
            if (result == null)
                return NotFound(new { message = "Không tìm thấy kết quả phân tích" });
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Clinic {ClinicId} get result {AnalysisId} failed", clinicId, analysisId);
            return StatusCode(500, new { message = "Không thể lấy kết quả phân tích" });
        }
    }
}
