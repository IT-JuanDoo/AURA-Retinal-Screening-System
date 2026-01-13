using Aura.Application.DTOs.Analysis;
using Aura.Application.DTOs.Export;
using Aura.Application.Services.Analysis;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Globalization;
using System.IO;
using System.Text;
using System.Text.Json;
using Npgsql;

namespace Aura.Application.Services.Export;

/// <summary>
/// Service xử lý export báo cáo phân tích (FR-7)
/// Hỗ trợ export PDF, CSV, JSON với đa ngôn ngữ (vi/en)
/// </summary>
public class ExportService : IExportService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<ExportService>? _logger;
    private readonly string _connectionString;
    private readonly IAnalysisService _analysisService;
    private readonly Cloudinary? _cloudinary;

    // Constants
    private const int DefaultExpirationDays = 30;
    private const string CloudinaryFolder = "aura/exported-reports";

    public ExportService(
        IConfiguration configuration,
        IAnalysisService analysisService,
        ILogger<ExportService>? logger = null)
    {
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _analysisService = analysisService ?? throw new ArgumentNullException(nameof(analysisService));
        _logger = logger;
        
        _connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? throw new InvalidOperationException("Database connection string 'DefaultConnection' not found");

        // Initialize Cloudinary
        _cloudinary = CreateCloudinaryClient();

        // Set QuestPDF license (free for Community use)
        QuestPDF.Settings.License = LicenseType.Community;
    }

    private Cloudinary? CreateCloudinaryClient()
    {
        var cloudName = _configuration["Cloudinary:CloudName"];
        var apiKey = _configuration["Cloudinary:ApiKey"];
        var apiSecret = _configuration["Cloudinary:ApiSecret"];

        if (!string.IsNullOrWhiteSpace(cloudName) && 
            !string.IsNullOrWhiteSpace(apiKey) && 
            !string.IsNullOrWhiteSpace(apiSecret))
        {
            var account = new Account(cloudName, apiKey, apiSecret);
            _logger?.LogInformation("Cloudinary initialized successfully for export service");
            return new Cloudinary(account);
        }
        
        _logger?.LogWarning("Cloudinary credentials not configured. Exports will use placeholder URLs.");
        return null;
    }

    #region Single Export

    public async Task<ExportResponseDto> ExportToPdfAsync(
        string analysisResultId, 
        string userId, 
        string requestedByType, 
        bool includeImages = true,
        bool includePatientInfo = true,
        string language = "vi")
    {
        ValidateExportRequest(analysisResultId, userId, requestedByType);

        try
        {
            _logger?.LogInformation("Starting PDF export for analysis {AnalysisId} by user {UserId}", 
                analysisResultId, userId);

            // Get analysis result
            var analysisResult = await GetAnalysisResultOrThrowAsync(analysisResultId, userId);
            
            // Get user info if needed
            var userInfo = includePatientInfo ? await GetUserInfoAsync(userId) : null;

            // Generate PDF
            var pdfBytes = GeneratePdf(analysisResult, userInfo, includeImages, language);
            var fileName = GenerateFileName(analysisResultId, "pdf");

            // Upload to cloud storage
            var fileUrl = await UploadExportFileAsync(pdfBytes, fileName, "PDF");

            // Save to database
            var exportId = await SaveExportRecordAsync(
                analysisResultId, "PDF", fileName, fileUrl, pdfBytes.Length, userId, requestedByType);

            _logger?.LogInformation("PDF export completed successfully. ExportId: {ExportId}, Size: {Size} bytes", 
                exportId, pdfBytes.Length);

            return CreateExportResponse(exportId, analysisResultId, "PDF", fileName, fileUrl, pdfBytes.Length);
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error exporting to PDF for analysis {AnalysisId}", analysisResultId);
            throw new InvalidOperationException($"Failed to export PDF: {ex.Message}", ex);
        }
    }

    public async Task<ExportResponseDto> ExportToCsvAsync(
        string analysisResultId, 
        string userId, 
        string requestedByType,
        string language = "vi")
    {
        ValidateExportRequest(analysisResultId, userId, requestedByType);

        try
        {
            _logger?.LogInformation("Starting CSV export for analysis {AnalysisId} by user {UserId}", 
                analysisResultId, userId);

            var analysisResult = await GetAnalysisResultOrThrowAsync(analysisResultId, userId);
            
            var csvBytes = GenerateCsv(new[] { analysisResult }, language);
            var fileName = GenerateFileName(analysisResultId, "csv");

            var fileUrl = await UploadExportFileAsync(csvBytes, fileName, "CSV");

            var exportId = await SaveExportRecordAsync(
                analysisResultId, "CSV", fileName, fileUrl, csvBytes.Length, userId, requestedByType);

            _logger?.LogInformation("CSV export completed. ExportId: {ExportId}", exportId);

            return CreateExportResponse(exportId, analysisResultId, "CSV", fileName, fileUrl, csvBytes.Length);
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error exporting to CSV for analysis {AnalysisId}", analysisResultId);
            throw new InvalidOperationException($"Failed to export CSV: {ex.Message}", ex);
        }
    }

    public async Task<ExportResponseDto> ExportToJsonAsync(
        string analysisResultId, 
        string userId, 
        string requestedByType)
    {
        ValidateExportRequest(analysisResultId, userId, requestedByType);

        try
        {
            _logger?.LogInformation("Starting JSON export for analysis {AnalysisId} by user {UserId}", 
                analysisResultId, userId);

            var analysisResult = await GetAnalysisResultOrThrowAsync(analysisResultId, userId);
            
            var jsonOptions = new JsonSerializerOptions 
            { 
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
            var jsonBytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(analysisResult, jsonOptions));
            var fileName = GenerateFileName(analysisResultId, "json");

            var fileUrl = await UploadExportFileAsync(jsonBytes, fileName, "JSON");

            var exportId = await SaveExportRecordAsync(
                analysisResultId, "JSON", fileName, fileUrl, jsonBytes.Length, userId, requestedByType);

            _logger?.LogInformation("JSON export completed. ExportId: {ExportId}", exportId);

            return CreateExportResponse(exportId, analysisResultId, "JSON", fileName, fileUrl, jsonBytes.Length);
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error exporting to JSON for analysis {AnalysisId}", analysisResultId);
            throw new InvalidOperationException($"Failed to export JSON: {ex.Message}", ex);
        }
    }

    #endregion

    #region Batch Export

    public async Task<BatchExportResponseDto> ExportBatchToCsvAsync(
        List<string> analysisResultIds,
        string userId,
        string requestedByType,
        string language = "vi")
    {
        if (analysisResultIds == null || analysisResultIds.Count == 0)
            throw new ArgumentException("At least one analysis result ID is required", nameof(analysisResultIds));

        var response = new BatchExportResponseDto
        {
            TotalRequested = analysisResultIds.Count
        };

        var validResults = new List<AnalysisResultDto>();
        
        // Collect all valid results
        foreach (var resultId in analysisResultIds.Distinct())
        {
            try
            {
                var result = await _analysisService.GetAnalysisResultAsync(resultId, userId);
                if (result != null)
                {
                    validResults.Add(result);
                }
                else
                {
                    response.FailedExports.Add(new ExportErrorDto
                    {
                        AnalysisResultId = resultId,
                        ErrorMessage = "Analysis result not found"
                    });
                }
            }
            catch (Exception ex)
            {
                response.FailedExports.Add(new ExportErrorDto
                {
                    AnalysisResultId = resultId,
                    ErrorMessage = ex.Message
                });
            }
        }

        if (validResults.Count > 0)
        {
            try
            {
                var csvBytes = GenerateCsv(validResults, language);
                var batchId = Guid.NewGuid().ToString("N")[..8];
                var fileName = $"batch_export_{batchId}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";

                var fileUrl = await UploadExportFileAsync(csvBytes, fileName, "CSV");

                var exportId = await SaveExportRecordAsync(
                    null, "CSV", fileName, fileUrl, csvBytes.Length, userId, requestedByType);

                response.SuccessfulExports.Add(CreateExportResponse(
                    exportId, null, "CSV", fileName, fileUrl, csvBytes.Length));
                response.SuccessCount = validResults.Count;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error creating batch CSV export");
                foreach (var result in validResults)
                {
                    response.FailedExports.Add(new ExportErrorDto
                    {
                        AnalysisResultId = result.Id,
                        ErrorMessage = "Batch export failed: " + ex.Message
                    });
                }
            }
        }

        response.FailedCount = response.FailedExports.Count;
        return response;
    }

    #endregion

    #region Export History

    public async Task<List<ExportResponseDto>> GetExportHistoryAsync(string userId, int limit = 50, int offset = 0)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("UserId is required", nameof(userId));

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT Id, ResultId, ReportType, FilePath, FileUrl, FileSize, 
                       ExportedAt, ExpiresAt, DownloadCount
                FROM exported_reports
                WHERE RequestedBy = @UserId AND IsDeleted = false
                ORDER BY ExportedAt DESC
                LIMIT @Limit OFFSET @Offset";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("UserId", userId);
            command.Parameters.AddWithValue("Limit", Math.Min(limit, 100)); // Max 100
            command.Parameters.AddWithValue("Offset", Math.Max(offset, 0));

            var exports = new List<ExportResponseDto>();
            using var reader = await command.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                exports.Add(new ExportResponseDto
                {
                    ExportId = reader.GetString(0),
                    AnalysisResultId = reader.IsDBNull(1) ? null : reader.GetString(1),
                    ReportType = reader.GetString(2),
                    FileName = reader.IsDBNull(3) ? string.Empty : Path.GetFileName(reader.GetString(3)),
                    FileUrl = reader.IsDBNull(4) ? string.Empty : reader.GetString(4),
                    FileSize = reader.IsDBNull(5) ? 0 : reader.GetInt64(5),
                    ExportedAt = reader.GetDateTime(6),
                    ExpiresAt = reader.IsDBNull(7) ? null : reader.GetDateTime(7),
                    DownloadCount = reader.IsDBNull(8) ? 0 : reader.GetInt32(8)
                });
            }

            return exports;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting export history for user {UserId}", userId);
            throw;
        }
    }

    public async Task<ExportResponseDto?> GetExportByIdAsync(string exportId, string userId)
    {
        if (string.IsNullOrWhiteSpace(exportId))
            throw new ArgumentException("ExportId is required", nameof(exportId));

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT Id, ResultId, ReportType, FilePath, FileUrl, FileSize, 
                       ExportedAt, ExpiresAt, DownloadCount
                FROM exported_reports
                WHERE Id = @ExportId AND RequestedBy = @UserId AND IsDeleted = false";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("ExportId", exportId);
            command.Parameters.AddWithValue("UserId", userId);

            using var reader = await command.ExecuteReaderAsync();
            
            if (!await reader.ReadAsync())
                return null;

            return new ExportResponseDto
            {
                ExportId = reader.GetString(0),
                AnalysisResultId = reader.IsDBNull(1) ? null : reader.GetString(1),
                ReportType = reader.GetString(2),
                FileName = reader.IsDBNull(3) ? string.Empty : Path.GetFileName(reader.GetString(3)),
                FileUrl = reader.IsDBNull(4) ? string.Empty : reader.GetString(4),
                FileSize = reader.IsDBNull(5) ? 0 : reader.GetInt64(5),
                ExportedAt = reader.GetDateTime(6),
                ExpiresAt = reader.IsDBNull(7) ? null : reader.GetDateTime(7),
                DownloadCount = reader.IsDBNull(8) ? 0 : reader.GetInt32(8)
            };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting export {ExportId}", exportId);
            throw;
        }
    }

    public async Task<bool> IncrementDownloadCountAsync(string exportId, string userId)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                UPDATE exported_reports
                SET DownloadCount = DownloadCount + 1,
                    LastDownloadedAt = @Now
                WHERE Id = @ExportId AND RequestedBy = @UserId AND IsDeleted = false";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("ExportId", exportId);
            command.Parameters.AddWithValue("UserId", userId);
            command.Parameters.AddWithValue("Now", DateTime.UtcNow);

            var rowsAffected = await command.ExecuteNonQueryAsync();
            return rowsAffected > 0;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error incrementing download count for export {ExportId}", exportId);
            return false;
        }
    }

    public async Task<bool> DeleteExportAsync(string exportId, string userId)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                UPDATE exported_reports
                SET IsDeleted = true, 
                    UpdatedDate = @UpdatedDate,
                    UpdatedBy = @UserId
                WHERE Id = @ExportId AND RequestedBy = @UserId AND IsDeleted = false";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("ExportId", exportId);
            command.Parameters.AddWithValue("UserId", userId);
            command.Parameters.AddWithValue("UpdatedDate", DateTime.UtcNow.Date);

            var rowsAffected = await command.ExecuteNonQueryAsync();
            
            if (rowsAffected > 0)
            {
                _logger?.LogInformation("Export {ExportId} deleted by user {UserId}", exportId, userId);
            }
            
            return rowsAffected > 0;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error deleting export {ExportId}", exportId);
            throw;
        }
    }

    public async Task<int> CleanupExpiredExportsAsync()
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                UPDATE exported_reports
                SET IsDeleted = true, 
                    UpdatedDate = @Now
                WHERE ExpiresAt < @Now AND IsDeleted = false";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("Now", DateTime.UtcNow);

            var rowsAffected = await command.ExecuteNonQueryAsync();
            
            if (rowsAffected > 0)
            {
                _logger?.LogInformation("Cleaned up {Count} expired exports", rowsAffected);
            }
            
            return rowsAffected;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error cleaning up expired exports");
            return 0;
        }
    }

    #endregion

    #region Private Methods - Validation

    private static void ValidateExportRequest(string analysisResultId, string userId, string requestedByType)
    {
        if (string.IsNullOrWhiteSpace(analysisResultId))
            throw new ArgumentException("AnalysisResultId is required", nameof(analysisResultId));
        
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("UserId is required", nameof(userId));
        
        if (!RequesterTypes.IsValid(requestedByType))
            throw new ArgumentException($"Invalid requester type: {requestedByType}", nameof(requestedByType));
    }

    private async Task<AnalysisResultDto> GetAnalysisResultOrThrowAsync(string analysisResultId, string userId)
    {
        var result = await _analysisService.GetAnalysisResultAsync(analysisResultId, userId);
        
        if (result == null)
        {
            throw new InvalidOperationException($"Analysis result '{analysisResultId}' not found or access denied");
        }
        
        return result;
    }

    #endregion

    #region Private Methods - PDF Generation

    private byte[] GeneratePdf(AnalysisResultDto result, UserInfoForExport? userInfo, bool includeImages, string language)
    {
        var labels = GetLabels(language);
        
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(1.5f, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(11));

                // Header with logo and title
                page.Header().Element(c => ComposeHeader(c, labels));

                // Main content
                page.Content().Element(c => ComposeContent(c, result, userInfo, labels, includeImages));

                // Footer
                page.Footer().Element(c => ComposeFooter(c, labels));
            });
        });

        return document.GeneratePdf();
    }

    private void ComposeHeader(IContainer container, ExportLabels labels)
    {
        container.Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem().Column(col2 =>
                {
                    col2.Item()
                        .Text("AURA")
                        .FontSize(28)
                        .Bold()
                        .FontColor(Colors.Blue.Darken2);
                        
                    col2.Item()
                        .Text(labels.SystemName)
                        .FontSize(10)
                        .FontColor(Colors.Grey.Darken1);
                });
                
                row.ConstantItem(150).AlignRight().Column(col2 =>
                {
                    col2.Item()
                        .Text(labels.ReportTitle)
                        .FontSize(14)
                        .Bold()
                        .FontColor(Colors.Grey.Darken3);
                        
                    col2.Item()
                        .Text($"{labels.ExportDate}: {DateTime.UtcNow:dd/MM/yyyy HH:mm}")
                        .FontSize(9)
                        .FontColor(Colors.Grey.Medium);
                });
            });
            
            col.Item().PaddingTop(10).LineHorizontal(1).LineColor(Colors.Blue.Darken2);
        });
    }

    private void ComposeContent(IContainer container, AnalysisResultDto result, UserInfoForExport? userInfo, ExportLabels labels, bool includeImages)
    {
        container.PaddingVertical(15).Column(column =>
        {
            column.Spacing(12);

            // Analysis Info Section
            column.Item().Element(c => ComposeAnalysisInfo(c, result, labels));
            
            // Patient Info Section (if available)
            if (userInfo != null)
            {
                column.Item().Element(c => ComposePatientInfo(c, userInfo, labels));
            }

            // Risk Assessment Section
            column.Item().Element(c => ComposeRiskAssessment(c, result, labels));

            // Detailed Findings Section
            column.Item().Element(c => ComposeDetailedFindings(c, result, labels));

            // Vascular Abnormalities Section
            column.Item().Element(c => ComposeVascularFindings(c, result, labels));

            // Recommendations Section
            if (!string.IsNullOrEmpty(result.Recommendations) || !string.IsNullOrEmpty(result.HealthWarnings))
            {
                column.Item().Element(c => ComposeRecommendations(c, result, labels));
            }
        });
    }

    private void ComposeAnalysisInfo(IContainer container, AnalysisResultDto result, ExportLabels labels)
    {
        container.Background(Colors.Grey.Lighten4).Padding(10).Column(col =>
        {
            col.Item().Text($"{labels.AnalysisId}: {result.Id}").FontSize(10);
            col.Item().Text($"{labels.ImageId}: {result.ImageId}").FontSize(10);
            col.Item().Text($"{labels.AnalysisDate}: {result.AnalysisCompletedAt?.ToString("dd/MM/yyyy HH:mm:ss") ?? "N/A"}").FontSize(10);
            col.Item().Text($"{labels.ProcessingTime}: {result.ProcessingTimeSeconds ?? 0}s").FontSize(10);
            col.Item().Text($"{labels.Status}: {result.AnalysisStatus}").FontSize(10);
        });
    }

    private void ComposePatientInfo(IContainer container, UserInfoForExport userInfo, ExportLabels labels)
    {
        container.Column(col =>
        {
            col.Item().Text(labels.PatientInfo).FontSize(14).Bold().FontColor(Colors.Blue.Darken2);
            col.Item().PaddingTop(5).Background(Colors.Blue.Lighten5).Padding(10).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text($"{labels.PatientName}: {userInfo.FullName}").FontSize(10);
                    c.Item().Text($"{labels.Email}: {userInfo.Email}").FontSize(10);
                });
                row.RelativeItem().Column(c =>
                {
                    if (!string.IsNullOrEmpty(userInfo.Phone))
                        c.Item().Text($"{labels.Phone}: {userInfo.Phone}").FontSize(10);
                    if (userInfo.DateOfBirth.HasValue)
                        c.Item().Text($"{labels.DateOfBirth}: {userInfo.DateOfBirth:dd/MM/yyyy}").FontSize(10);
                });
            });
        });
    }

    private void ComposeRiskAssessment(IContainer container, AnalysisResultDto result, ExportLabels labels)
    {
        var riskColor = GetRiskColor(result.OverallRiskLevel);
        
        container.Column(col =>
        {
            col.Item().Text(labels.RiskAssessment).FontSize(14).Bold().FontColor(Colors.Blue.Darken2);
            
            col.Item().PaddingTop(5).Row(row =>
            {
                row.RelativeItem().Background(riskColor).Padding(15).Column(c =>
                {
                    c.Item().AlignCenter().Text(labels.OverallRisk).FontSize(10).FontColor(Colors.White);
                    c.Item().AlignCenter().Text(result.OverallRiskLevel ?? "N/A").FontSize(20).Bold().FontColor(Colors.White);
                });
                
                row.ConstantItem(20);
                
                row.RelativeItem().Background(Colors.Grey.Lighten3).Padding(15).Column(c =>
                {
                    c.Item().AlignCenter().Text(labels.RiskScore).FontSize(10);
                    c.Item().AlignCenter().Text($"{result.RiskScore?.ToString("F1") ?? "N/A"}/100").FontSize(20).Bold();
                });
                
                row.ConstantItem(20);
                
                row.RelativeItem().Background(Colors.Grey.Lighten3).Padding(15).Column(c =>
                {
                    c.Item().AlignCenter().Text(labels.AiConfidence).FontSize(10);
                    c.Item().AlignCenter().Text($"{result.AiConfidenceScore?.ToString("F1") ?? "N/A"}%").FontSize(20).Bold();
                });
            });
        });
    }

    private void ComposeDetailedFindings(IContainer container, AnalysisResultDto result, ExportLabels labels)
    {
        container.Column(col =>
        {
            col.Item().Text(labels.DetailedFindings).FontSize(14).Bold().FontColor(Colors.Blue.Darken2);
            
            col.Item().PaddingTop(5).Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(2);
                    columns.RelativeColumn(1);
                    columns.RelativeColumn(1);
                });
                
                // Header
                table.Header(header =>
                {
                    header.Cell().Background(Colors.Blue.Darken2).Padding(5)
                        .Text(labels.Condition).FontColor(Colors.White).Bold();
                    header.Cell().Background(Colors.Blue.Darken2).Padding(5)
                        .Text(labels.RiskLevel).FontColor(Colors.White).Bold();
                    header.Cell().Background(Colors.Blue.Darken2).Padding(5)
                        .Text(labels.Score).FontColor(Colors.White).Bold();
                });
                
                // Hypertension
                AddTableRow(table, labels.Hypertension, result.HypertensionRisk, result.HypertensionScore);
                
                // Diabetes
                AddTableRow(table, labels.Diabetes, result.DiabetesRisk, result.DiabetesScore);
                
                // Stroke
                AddTableRow(table, labels.Stroke, result.StrokeRisk, result.StrokeScore);
                
                // Diabetic Retinopathy
                if (result.DiabeticRetinopathyDetected)
                {
                    AddTableRow(table, labels.DiabeticRetinopathy, 
                        result.DiabeticRetinopathySeverity ?? labels.Detected, null);
                }
            });
        });
    }

    private void AddTableRow(TableDescriptor table, string condition, string? risk, decimal? score)
    {
        var bgColor = Colors.White;
        
        table.Cell().Background(bgColor).BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5)
            .Text(condition);
        table.Cell().Background(bgColor).BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5)
            .Text(risk ?? "N/A");
        table.Cell().Background(bgColor).BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5)
            .Text(score?.ToString("F1") ?? "N/A");
    }

    private void ComposeVascularFindings(IContainer container, AnalysisResultDto result, ExportLabels labels)
    {
        container.Column(col =>
        {
            col.Item().Text(labels.VascularFindings).FontSize(14).Bold().FontColor(Colors.Blue.Darken2);
            
            col.Item().PaddingTop(5).Background(Colors.Grey.Lighten4).Padding(10).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text($"• {labels.VesselTortuosity}: {result.VesselTortuosity?.ToString("F2") ?? "N/A"}").FontSize(10);
                    c.Item().Text($"• {labels.VesselWidthVariation}: {result.VesselWidthVariation?.ToString("F2") ?? "N/A"}").FontSize(10);
                });
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text($"• {labels.MicroaneurysmsCount}: {result.MicroaneurysmsCount}").FontSize(10);
                    c.Item().Text($"• {labels.HemorrhagesDetected}: {(result.HemorrhagesDetected ? labels.Yes : labels.No)}").FontSize(10);
                    c.Item().Text($"• {labels.ExudatesDetected}: {(result.ExudatesDetected ? labels.Yes : labels.No)}").FontSize(10);
                });
            });
        });
    }

    private void ComposeRecommendations(IContainer container, AnalysisResultDto result, ExportLabels labels)
    {
        container.Column(col =>
        {
            if (!string.IsNullOrEmpty(result.Recommendations))
            {
                col.Item().Text(labels.Recommendations).FontSize(14).Bold().FontColor(Colors.Blue.Darken2);
                col.Item().PaddingTop(5).Background(Colors.Green.Lighten5).Padding(10)
                    .Text(result.Recommendations).FontSize(10);
            }
            
            if (!string.IsNullOrEmpty(result.HealthWarnings))
            {
                col.Item().PaddingTop(10).Text(labels.HealthWarnings).FontSize(14).Bold().FontColor(Colors.Red.Darken2);
                col.Item().PaddingTop(5).Background(Colors.Red.Lighten5).Padding(10)
                    .Text(result.HealthWarnings).FontSize(10).FontColor(Colors.Red.Darken3);
            }
        });
    }

    private void ComposeFooter(IContainer container, ExportLabels labels)
    {
        container.Column(col =>
        {
            col.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten1);
            col.Item().PaddingTop(5).Row(row =>
            {
                row.RelativeItem().Text(labels.Disclaimer).FontSize(7).FontColor(Colors.Grey.Medium);
                row.ConstantItem(100).AlignRight().Text(x =>
                {
                    x.Span(labels.Page).FontSize(8);
                    x.CurrentPageNumber().FontSize(8);
                    x.Span(" / ").FontSize(8);
                    x.TotalPages().FontSize(8);
                });
            });
        });
    }

    private static string GetRiskColor(string? riskLevel)
    {
        return riskLevel?.ToLower() switch
        {
            "low" => Colors.Green.Darken1,
            "medium" => Colors.Orange.Darken1,
            "high" => Colors.Red.Medium,
            "critical" => Colors.Red.Darken3,
            _ => Colors.Grey.Medium
        };
    }

    #endregion

    #region Private Methods - CSV Generation

    private byte[] GenerateCsv(IEnumerable<AnalysisResultDto> results, string language)
    {
        var labels = GetLabels(language);
        
        using var memoryStream = new MemoryStream();
        using var writer = new StreamWriter(memoryStream, new UTF8Encoding(true)); // UTF-8 with BOM for Excel
        using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true
        });

        // Write headers
        var headers = new[]
        {
            labels.AnalysisId, labels.ImageId, labels.Status, labels.OverallRisk, labels.RiskScore,
            labels.Hypertension, "Hypertension Score", labels.Diabetes, "Diabetes Score",
            labels.DiabeticRetinopathy, "DR Severity", labels.Stroke, "Stroke Score",
            labels.VesselTortuosity, labels.VesselWidthVariation, labels.MicroaneurysmsCount,
            labels.HemorrhagesDetected, labels.ExudatesDetected, labels.AiConfidence,
            labels.AnalysisDate, labels.ProcessingTime, labels.Recommendations, labels.HealthWarnings
        };

        foreach (var header in headers)
        {
            csv.WriteField(header);
        }
        csv.NextRecord();

        // Write data rows
        foreach (var result in results)
        {
            csv.WriteField(result.Id);
            csv.WriteField(result.ImageId);
            csv.WriteField(result.AnalysisStatus);
            csv.WriteField(result.OverallRiskLevel ?? "N/A");
            csv.WriteField(result.RiskScore?.ToString("F2") ?? "N/A");
            csv.WriteField(result.HypertensionRisk ?? "N/A");
            csv.WriteField(result.HypertensionScore?.ToString("F2") ?? "N/A");
            csv.WriteField(result.DiabetesRisk ?? "N/A");
            csv.WriteField(result.DiabetesScore?.ToString("F2") ?? "N/A");
            csv.WriteField(result.DiabeticRetinopathyDetected ? labels.Yes : labels.No);
            csv.WriteField(result.DiabeticRetinopathySeverity ?? "N/A");
            csv.WriteField(result.StrokeRisk ?? "N/A");
            csv.WriteField(result.StrokeScore?.ToString("F2") ?? "N/A");
            csv.WriteField(result.VesselTortuosity?.ToString("F2") ?? "N/A");
            csv.WriteField(result.VesselWidthVariation?.ToString("F2") ?? "N/A");
            csv.WriteField(result.MicroaneurysmsCount);
            csv.WriteField(result.HemorrhagesDetected ? labels.Yes : labels.No);
            csv.WriteField(result.ExudatesDetected ? labels.Yes : labels.No);
            csv.WriteField(result.AiConfidenceScore?.ToString("F2") ?? "N/A");
            csv.WriteField(result.AnalysisCompletedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "N/A");
            csv.WriteField(result.ProcessingTimeSeconds?.ToString() ?? "N/A");
            csv.WriteField(result.Recommendations ?? "");
            csv.WriteField(result.HealthWarnings ?? "");
            csv.NextRecord();
        }

        writer.Flush();
        return memoryStream.ToArray();
    }

    #endregion

    #region Private Methods - File Upload

    private async Task<string> UploadExportFileAsync(byte[] fileBytes, string fileName, string reportType)
    {
        if (_cloudinary == null)
        {
            _logger?.LogWarning("Cloudinary not configured, returning placeholder URL");
            return $"https://storage.aura-health.com/exports/{fileName}";
        }

        try
        {
            using var stream = new MemoryStream(fileBytes);

            var uploadParams = new RawUploadParams
            {
                File = new FileDescription(fileName, stream),
                Folder = CloudinaryFolder,
                PublicId = Path.GetFileNameWithoutExtension(fileName)
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);

            if (uploadResult.StatusCode == System.Net.HttpStatusCode.OK)
            {
                _logger?.LogInformation("Successfully uploaded {ReportType} to Cloudinary: {Url}", 
                    reportType, uploadResult.SecureUrl);
                return uploadResult.SecureUrl.ToString();
            }

            _logger?.LogError("Cloudinary upload failed: {Error}", uploadResult.Error?.Message);
            throw new InvalidOperationException($"Cloud upload failed: {uploadResult.Error?.Message}");
        }
        catch (Exception ex) when (ex is not InvalidOperationException)
        {
            _logger?.LogError(ex, "Error uploading file to cloud storage");
            throw new InvalidOperationException("Failed to upload export file to cloud storage", ex);
        }
    }

    #endregion

    #region Private Methods - Database

    private async Task<string> SaveExportRecordAsync(
        string? resultId, 
        string reportType, 
        string fileName,
        string fileUrl, 
        long fileSize, 
        string requestedBy, 
        string requestedByType)
    {
        var exportId = Guid.NewGuid().ToString();
        var now = DateTime.UtcNow;
        var expiresAt = now.AddDays(DefaultExpirationDays);

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                INSERT INTO exported_reports 
                (Id, ResultId, ReportType, FilePath, FileUrl, FileSize, RequestedBy, RequestedByType, 
                 ExportedAt, ExpiresAt, DownloadCount, CreatedDate, CreatedBy, IsDeleted)
                VALUES 
                (@Id, @ResultId, @ReportType, @FilePath, @FileUrl, @FileSize, @RequestedBy, @RequestedByType,
                 @ExportedAt, @ExpiresAt, 0, @CreatedDate, @CreatedBy, false)";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("Id", exportId);
            command.Parameters.AddWithValue("ResultId", resultId ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("ReportType", reportType);
            command.Parameters.AddWithValue("FilePath", fileName);
            command.Parameters.AddWithValue("FileUrl", fileUrl);
            command.Parameters.AddWithValue("FileSize", fileSize);
            command.Parameters.AddWithValue("RequestedBy", requestedBy);
            command.Parameters.AddWithValue("RequestedByType", requestedByType);
            command.Parameters.AddWithValue("ExportedAt", now);
            command.Parameters.AddWithValue("ExpiresAt", expiresAt);
            command.Parameters.AddWithValue("CreatedDate", now.Date);
            command.Parameters.AddWithValue("CreatedBy", requestedBy);

            await command.ExecuteNonQueryAsync();
            
            return exportId;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error saving export record to database");
            throw new InvalidOperationException("Failed to save export record", ex);
        }
    }

    private async Task<UserInfoForExport?> GetUserInfoAsync(string userId)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT FullName, Email, PhoneNumber, Dob 
                FROM users 
                WHERE Id = @UserId AND IsActive = true";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("UserId", userId);

            using var reader = await command.ExecuteReaderAsync();
            
            if (!await reader.ReadAsync())
                return null;

            return new UserInfoForExport
            {
                FullName = reader.IsDBNull(0) ? "N/A" : reader.GetString(0),
                Email = reader.IsDBNull(1) ? "N/A" : reader.GetString(1),
                Phone = reader.IsDBNull(2) ? null : reader.GetString(2),
                DateOfBirth = reader.IsDBNull(3) ? null : reader.GetDateTime(3)
            };
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Could not retrieve user info for export");
            return null;
        }
    }

    #endregion

    #region Private Methods - Helpers

    private static string GenerateFileName(string analysisId, string extension)
    {
        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
        var shortId = analysisId.Length > 8 ? analysisId[..8] : analysisId;
        return $"aura_report_{shortId}_{timestamp}.{extension}";
    }

    private static ExportResponseDto CreateExportResponse(
        string exportId, string? analysisResultId, string reportType, 
        string fileName, string fileUrl, long fileSize)
    {
        return new ExportResponseDto
        {
            ExportId = exportId,
            AnalysisResultId = analysisResultId,
            ReportType = reportType,
            FileName = fileName,
            FileUrl = fileUrl,
            FileSize = fileSize,
            ExportedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(DefaultExpirationDays),
            DownloadCount = 0
        };
    }

    private static ExportLabels GetLabels(string language)
    {
        return language.ToLower() == "en" ? ExportLabels.English : ExportLabels.Vietnamese;
    }

    #endregion

    #region Helper Classes

    private class UserInfoForExport
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public DateTime? DateOfBirth { get; set; }
    }

    private class ExportLabels
    {
        // System
        public string SystemName { get; set; } = string.Empty;
        public string ReportTitle { get; set; } = string.Empty;
        public string ExportDate { get; set; } = string.Empty;
        public string Page { get; set; } = string.Empty;
        public string Disclaimer { get; set; } = string.Empty;

        // Analysis Info
        public string AnalysisId { get; set; } = string.Empty;
        public string ImageId { get; set; } = string.Empty;
        public string AnalysisDate { get; set; } = string.Empty;
        public string ProcessingTime { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;

        // Patient Info
        public string PatientInfo { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string DateOfBirth { get; set; } = string.Empty;

        // Risk Assessment
        public string RiskAssessment { get; set; } = string.Empty;
        public string OverallRisk { get; set; } = string.Empty;
        public string RiskLevel { get; set; } = string.Empty;
        public string RiskScore { get; set; } = string.Empty;
        public string AiConfidence { get; set; } = string.Empty;

        // Detailed Findings
        public string DetailedFindings { get; set; } = string.Empty;
        public string Condition { get; set; } = string.Empty;
        public string Score { get; set; } = string.Empty;
        public string Hypertension { get; set; } = string.Empty;
        public string Diabetes { get; set; } = string.Empty;
        public string Stroke { get; set; } = string.Empty;
        public string DiabeticRetinopathy { get; set; } = string.Empty;
        public string Detected { get; set; } = string.Empty;

        // Vascular Findings
        public string VascularFindings { get; set; } = string.Empty;
        public string VesselTortuosity { get; set; } = string.Empty;
        public string VesselWidthVariation { get; set; } = string.Empty;
        public string MicroaneurysmsCount { get; set; } = string.Empty;
        public string HemorrhagesDetected { get; set; } = string.Empty;
        public string ExudatesDetected { get; set; } = string.Empty;

        // Recommendations
        public string Recommendations { get; set; } = string.Empty;
        public string HealthWarnings { get; set; } = string.Empty;

        // Common
        public string Yes { get; set; } = string.Empty;
        public string No { get; set; } = string.Empty;

        public static ExportLabels Vietnamese => new()
        {
            SystemName = "Hệ thống Sàng lọc Sức khỏe Võng mạc",
            ReportTitle = "BÁO CÁO PHÂN TÍCH",
            ExportDate = "Ngày xuất",
            Page = "Trang ",
            Disclaimer = "Báo cáo này được tạo tự động bởi hệ thống AURA. Kết quả chỉ mang tính tham khảo và không thay thế chẩn đoán của bác sĩ chuyên khoa.",
            
            AnalysisId = "Mã phân tích",
            ImageId = "Mã hình ảnh",
            AnalysisDate = "Ngày phân tích",
            ProcessingTime = "Thời gian xử lý",
            Status = "Trạng thái",
            
            PatientInfo = "THÔNG TIN BỆNH NHÂN",
            PatientName = "Họ tên",
            Email = "Email",
            Phone = "Điện thoại",
            DateOfBirth = "Ngày sinh",
            
            RiskAssessment = "ĐÁNH GIÁ RỦI RO",
            OverallRisk = "Rủi ro tổng thể",
            RiskLevel = "Mức độ",
            RiskScore = "Điểm rủi ro",
            AiConfidence = "Độ tin cậy AI",
            
            DetailedFindings = "CHI TIẾT KẾT QUẢ",
            Condition = "Tình trạng",
            Score = "Điểm",
            Hypertension = "Tăng huyết áp",
            Diabetes = "Tiểu đường",
            Stroke = "Đột quỵ",
            DiabeticRetinopathy = "Bệnh võng mạc ĐTĐ",
            Detected = "Đã phát hiện",
            
            VascularFindings = "BẤT THƯỜNG MẠCH MÁU",
            VesselTortuosity = "Độ xoắn mạch máu",
            VesselWidthVariation = "Biến thiên độ rộng",
            MicroaneurysmsCount = "Số phình vi mạch",
            HemorrhagesDetected = "Xuất huyết",
            ExudatesDetected = "Xuất tiết",
            
            Recommendations = "KHUYẾN NGHỊ",
            HealthWarnings = "CẢNH BÁO SỨC KHỎE",
            
            Yes = "Có",
            No = "Không"
        };

        public static ExportLabels English => new()
        {
            SystemName = "Retinal Health Screening System",
            ReportTitle = "ANALYSIS REPORT",
            ExportDate = "Export Date",
            Page = "Page ",
            Disclaimer = "This report is automatically generated by AURA system. Results are for reference only and do not replace diagnosis by medical specialists.",
            
            AnalysisId = "Analysis ID",
            ImageId = "Image ID",
            AnalysisDate = "Analysis Date",
            ProcessingTime = "Processing Time",
            Status = "Status",
            
            PatientInfo = "PATIENT INFORMATION",
            PatientName = "Full Name",
            Email = "Email",
            Phone = "Phone",
            DateOfBirth = "Date of Birth",
            
            RiskAssessment = "RISK ASSESSMENT",
            OverallRisk = "Overall Risk",
            RiskLevel = "Risk Level",
            RiskScore = "Risk Score",
            AiConfidence = "AI Confidence",
            
            DetailedFindings = "DETAILED FINDINGS",
            Condition = "Condition",
            Score = "Score",
            Hypertension = "Hypertension",
            Diabetes = "Diabetes",
            Stroke = "Stroke",
            DiabeticRetinopathy = "Diabetic Retinopathy",
            Detected = "Detected",
            
            VascularFindings = "VASCULAR ABNORMALITIES",
            VesselTortuosity = "Vessel Tortuosity",
            VesselWidthVariation = "Vessel Width Variation",
            MicroaneurysmsCount = "Microaneurysms Count",
            HemorrhagesDetected = "Hemorrhages",
            ExudatesDetected = "Exudates",
            
            Recommendations = "RECOMMENDATIONS",
            HealthWarnings = "HEALTH WARNINGS",
            
            Yes = "Yes",
            No = "No"
        };
    }

    #endregion
}
