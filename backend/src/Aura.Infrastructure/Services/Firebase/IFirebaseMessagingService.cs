namespace Aura.Infrastructure.Services.Firebase;

/// <summary>
/// Interface for Firebase Cloud Messaging service
/// Gửi push notifications đến mobile/web clients
/// </summary>
public interface IFirebaseMessagingService
{
    /// <summary>
    /// Gửi notification đến một device cụ thể
    /// </summary>
    Task<bool> SendToDeviceAsync(string deviceToken, string title, string body, Dictionary<string, string>? data = null);

    /// <summary>
    /// Gửi notification đến nhiều devices
    /// </summary>
    Task<int> SendToMultipleDevicesAsync(IEnumerable<string> deviceTokens, string title, string body, Dictionary<string, string>? data = null);

    /// <summary>
    /// Gửi notification đến một topic (tất cả users đã subscribe topic đó)
    /// </summary>
    Task<bool> SendToTopicAsync(string topic, string title, string body, Dictionary<string, string>? data = null);

    /// <summary>
    /// Subscribe device token to a topic
    /// </summary>
    Task<bool> SubscribeToTopicAsync(string deviceToken, string topic);

    /// <summary>
    /// Unsubscribe device token from a topic
    /// </summary>
    Task<bool> UnsubscribeFromTopicAsync(string deviceToken, string topic);

    /// <summary>
    /// Gửi notification cho high-risk analysis results
    /// </summary>
    Task<bool> SendHighRiskAlertAsync(string userId, string analysisId, string riskLevel);

    /// <summary>
    /// Gửi notification khi analysis hoàn thành
    /// </summary>
    Task<bool> SendAnalysisCompleteAsync(string userId, string analysisId, string status);
}
