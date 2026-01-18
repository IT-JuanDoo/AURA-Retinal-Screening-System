using Aura.Application.Services.Analysis;
using Aura.Application.Services.Export;
using Hangfire;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Aura.API.Services.BackgroundJobs;

/// <summary>
/// Background Worker Service cho Analysis Queue Processing
/// Sử dụng Hangfire để xử lý analysis jobs từ RabbitMQ
/// </summary>
public class AnalysisQueueWorker
{
    private readonly IAnalysisQueueService _queueService;
    private readonly IExportService? _exportService;
    private readonly ILogger<AnalysisQueueWorker> _logger;
    private readonly IConfiguration _configuration;

    public AnalysisQueueWorker(
        IAnalysisQueueService queueService,
        ILogger<AnalysisQueueWorker> logger,
        IConfiguration configuration,
        IExportService? exportService = null)
    {
        _queueService = queueService ?? throw new ArgumentNullException(nameof(queueService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _exportService = exportService;
    }

    /// <summary>
    /// Process queued analysis jobs from RabbitMQ
    /// Được gọi bởi Hangfire recurring job (mỗi 5 phút)
    /// 
    /// Giá trị: Xử lý async jobs, giảm blocking cho API
    /// </summary>
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 30, 60, 120 })]
    public async Task ProcessAnalysisQueueAsync()
    {
        _logger.LogInformation("[Hangfire] Starting analysis queue processing...");

        try
        {
            // =====================================================================
            // HANGFIRE + RABBITMQ: Process queued analysis jobs
            // Giá trị: Async processing, không block API, reliable retry
            // =====================================================================
            await _queueService.ProcessQueuedJobsAsync();

            var processedCount = 0; // TODO: Return from ProcessQueuedJobsAsync
            _logger.LogInformation("[Hangfire] Analysis queue processing completed. Processed: {Count}", processedCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Hangfire] Error processing analysis queue");
            throw; // Hangfire will retry automatically
        }
    }

    /// <summary>
    /// Cleanup expired export files
    /// Recurring job chạy mỗi ngày lúc 2:00 AM
    /// 
    /// Giá trị: Tự động cleanup, tiết kiệm storage costs
    /// </summary>
    [AutomaticRetry(Attempts = 2)]
    public async Task CleanupExpiredExportsAsync()
    {
        _logger.LogInformation("[Hangfire] Starting cleanup of expired exports...");

        try
        {
            if (_exportService == null)
            {
                _logger.LogWarning("[Hangfire] ExportService not available, skipping cleanup");
                return;
            }

            // =====================================================================
            // HANGFIRE: Automated cleanup job
            // Giá trị: Auto cleanup, không cần manual intervention
            // =====================================================================
            var deletedCount = await _exportService.CleanupExpiredExportsAsync();
            
            _logger.LogInformation("[Hangfire] Cleanup completed. Deleted {Count} expired exports", deletedCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Hangfire] Error cleaning up expired exports");
            throw; // Hangfire will retry automatically
        }
    }

    /// <summary>
    /// Process email queue from RabbitMQ
    /// Recurring job chạy mỗi 10 phút
    /// 
    /// Giá trị: Async email sending, không block API, reliable delivery
    /// </summary>
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 10, 30, 60 })]
    public async Task ProcessEmailQueueAsync()
    {
        _logger.LogInformation("[Hangfire] Processing email queue...");

        try
        {
            // =====================================================================
            // HANGFIRE + RABBITMQ: Process email queue
            // Giá trị: Async email sending, reliable delivery với retry
            // =====================================================================
            // TODO: Consume email jobs from RabbitMQ "email.queue"
            // For now, this is a placeholder that can be extended
            
            await Task.CompletedTask;

            _logger.LogInformation("[Hangfire] Email queue processing completed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Hangfire] Error processing email queue");
            throw; // Hangfire will retry automatically
        }
    }
}
