using Aura.Application.DTOs.Images;
using Aura.Application.Services.Analysis;
using Aura.Application.Services.Images;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aura.API.Controllers;

/// <summary>
/// Controller for clinic bulk image upload and management (FR-24)
/// </summary>
[ApiController]
[Route("api/clinic/images")]
[Authorize] // Require authentication
public class ClinicImagesController : ControllerBase
{
    private readonly IImageService _imageService;
    private readonly IAnalysisQueueService _analysisQueueService;
    private readonly ILogger<ClinicImagesController> _logger;

    public ClinicImagesController(
        IImageService imageService,
        IAnalysisQueueService analysisQueueService,
        ILogger<ClinicImagesController> logger)
    {
        _imageService = imageService;
        _analysisQueueService = analysisQueueService;
        _logger = logger;
    }

    /// <summary>
    /// Bulk upload retinal images for clinic (FR-24)
    /// Supports uploading multiple images (≥100 images per batch as per NFR-2)
    /// </summary>
    [HttpPost("bulk-upload")]
    [ProducesResponseType(typeof(ClinicBulkUploadResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [RequestSizeLimit(500_000_000)] // 500MB max request size
    public async Task<IActionResult> BulkUploadImages(
        [FromForm] List<IFormFile> files,
        [FromForm] string? patientUserId = null,
        [FromForm] string? doctorId = null,
        [FromForm] string? batchName = null,
        [FromForm] bool autoStartAnalysis = true,
        [FromForm] string? imageType = null,
        [FromForm] string? eyeSide = null,
        [FromForm] string? captureDevice = null,
        [FromForm] DateTime? captureDate = null)
    {
        // Get clinic ID from claims (assuming it's stored in a claim)
        var clinicId = User.FindFirstValue("clinic_id") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        
        if (string.IsNullOrEmpty(clinicId))
        {
            // Try to get from role or other claim
            clinicId = User.FindFirstValue("ClinicId");
        }

        if (string.IsNullOrEmpty(clinicId))
        {
            _logger.LogWarning("Clinic ID not found in user claims");
            return Unauthorized(new { message = "Clinic ID not found. Please ensure you are logged in as a clinic account." });
        }

        if (files == null || files.Count == 0)
        {
            return BadRequest(new { message = "No files uploaded" });
        }

        // Validate file count (NFR-2: ≥100 images per batch)
        if (files.Count > 1000)
        {
            return BadRequest(new { message = "Maximum 1000 images per batch. Please split into multiple batches." });
        }

        _logger.LogInformation("Bulk upload request from clinic {ClinicId}, Files: {Count}", clinicId, files.Count);

        try
        {
            // Prepare file data
            var fileData = new List<(Stream FileStream, string Filename, ImageUploadDto? Metadata)>();

            // Prepare common metadata
            var commonMetadata = new ImageUploadDto
            {
                ImageType = imageType,
                EyeSide = eyeSide,
                CaptureDevice = captureDevice,
                CaptureDate = captureDate
            };

            foreach (var file in files)
            {
                if (file.Length > 0)
                {
                    var stream = file.OpenReadStream();
                    fileData.Add((stream, file.FileName, null)); // Individual metadata can be added later if needed
                }
            }

            // Prepare bulk upload options
            var options = new ClinicBulkUploadDto
            {
                PatientUserId = patientUserId,
                DoctorId = doctorId,
                BatchName = batchName,
                CommonMetadata = commonMetadata,
                AutoStartAnalysis = autoStartAnalysis
            };

            // Perform bulk upload
            var result = await _imageService.BulkUploadForClinicAsync(clinicId, fileData, options);

            // Dispose streams
            foreach (var (stream, _, _) in fileData)
            {
                await stream.DisposeAsync();
            }

            // If auto-start analysis is enabled, queue the batch for analysis
            if (autoStartAnalysis && result.SuccessfullyUploaded.Count > 0)
            {
                try
                {
                    var imageIds = result.SuccessfullyUploaded.Select(img => img.Id).ToList();
                    var jobId = await _analysisQueueService.QueueBatchAnalysisAsync(clinicId, imageIds, result.BatchId);
                    result.AnalysisJobId = jobId;

                    _logger.LogInformation("Queued batch analysis job {JobId} for batch {BatchId}", jobId, result.BatchId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to queue batch analysis for batch {BatchId}", result.BatchId);
                    // Don't fail the upload if analysis queueing fails
                }
            }

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid bulk upload request from clinic {ClinicId}", clinicId);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during bulk upload for clinic {ClinicId}", clinicId);
            return StatusCode(500, new { message = "Failed to upload images", error = ex.Message });
        }
    }

    /// <summary>
    /// Get status of a batch analysis job
    /// </summary>
    [HttpGet("analysis/{jobId}/status")]
    [ProducesResponseType(typeof(BatchAnalysisStatusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBatchAnalysisStatus(string jobId)
    {
        var clinicId = User.FindFirstValue("clinic_id") ?? 
                       User.FindFirstValue("ClinicId") ?? 
                       User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(clinicId))
        {
            return Unauthorized(new { message = "Clinic ID not found" });
        }

        try
        {
            var status = await _analysisQueueService.GetBatchAnalysisStatusAsync(jobId);
            if (status == null)
            {
                return NotFound(new { message = "Analysis job not found" });
            }

            return Ok(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting batch analysis status for job {JobId}", jobId);
            return StatusCode(500, new { message = "Failed to get analysis status", error = ex.Message });
        }
    }

    /// <summary>
    /// Queue a batch of already-uploaded images for AI analysis
    /// </summary>
    [HttpPost("queue-analysis")]
    [ProducesResponseType(typeof(BatchAnalysisStatusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> QueueBatchAnalysis([FromBody] QueueAnalysisRequest request)
    {
        var clinicId = User.FindFirstValue("clinic_id") ?? 
                       User.FindFirstValue("ClinicId") ?? 
                       User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(clinicId))
        {
            return Unauthorized(new { message = "Clinic ID not found" });
        }

        if (request.ImageIds == null || request.ImageIds.Count == 0)
        {
            return BadRequest(new { message = "Image IDs list cannot be empty" });
        }

        try
        {
            var jobId = await _analysisQueueService.QueueBatchAnalysisAsync(
                clinicId, 
                request.ImageIds, 
                request.BatchId);

            var status = await _analysisQueueService.GetBatchAnalysisStatusAsync(jobId);
            return Ok(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error queueing batch analysis for clinic {ClinicId}", clinicId);
            return StatusCode(500, new { message = "Failed to queue analysis", error = ex.Message });
        }
    }

    public class QueueAnalysisRequest
    {
        public List<string> ImageIds { get; set; } = new();
        public string? BatchId { get; set; }
    }
}

