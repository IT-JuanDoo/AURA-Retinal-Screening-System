using Aura.Application.DTOs.Analysis;
using Aura.Application.Services.Analysis;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aura.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnalysisController : ControllerBase
{
    private readonly IAnalysisService _analysisService;
    private readonly ILogger<AnalysisController> _logger;

    public AnalysisController(IAnalysisService analysisService, ILogger<AnalysisController> logger)
    {
        _analysisService = analysisService;
        _logger = logger;
    }

    /// <summary>
    /// Start analysis for a single image
    /// </summary>
    [HttpPost("start")]
    [ProducesResponseType(typeof(AnalysisResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> StartAnalysis([FromBody] AnalysisRequestDto request)
    {
        if (request.ImageIds == null || request.ImageIds.Count == 0)
        {
            return BadRequest(new { message = "At least one image ID is required" });
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        try
        {
            if (request.ImageIds.Count == 1)
            {
                var result = await _analysisService.StartAnalysisAsync(userId, request.ImageIds[0]);
                return Ok(result);
            }
            else
            {
                var results = await _analysisService.StartMultipleAnalysisAsync(userId, request.ImageIds);
                return Ok(results);
            }
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid analysis request");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting analysis");
            return StatusCode(500, new { message = "Failed to start analysis" });
        }
    }

    /// <summary>
    /// Get analysis result by analysis ID
    /// </summary>
    [HttpGet("{analysisId}")]
    [ProducesResponseType(typeof(AnalysisResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetAnalysisResult(string analysisId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        try
        {
            var result = await _analysisService.GetAnalysisResultAsync(analysisId, userId);
            
            if (result == null)
            {
                return NotFound(new { message = "Analysis result not found" });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting analysis result: {AnalysisId}", analysisId);
            return StatusCode(500, new { message = "Failed to get analysis result" });
        }
    }

    /// <summary>
    /// Get all analysis results for current user
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<AnalysisResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetUserAnalysisResults()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        // TODO: Implement GetUserAnalysisResultsAsync in AnalysisService
        return Ok(new List<AnalysisResultDto>());
    }
}

