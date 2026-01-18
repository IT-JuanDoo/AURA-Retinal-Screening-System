using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Aura.Infrastructure.Services.Firebase;

/// <summary>
/// Firebase Cloud Messaging Service Implementation
/// Sử dụng FCM V1 API với Service Account authentication
/// </summary>
public class FirebaseMessagingService : IFirebaseMessagingService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<FirebaseMessagingService>? _logger;
    private readonly HttpClient _httpClient;
    private readonly string? _projectId;
    private readonly string? _serviceAccountPath;
    private readonly bool _isConfigured;
    private string? _accessToken;
    private DateTime _tokenExpiry = DateTime.MinValue;

    // FCM V1 API endpoint
    private const string FCM_V1_URL = "https://fcm.googleapis.com/v1/projects/{0}/messages:send";
    
    // Google OAuth2 token endpoint
    private const string GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

    public FirebaseMessagingService(IConfiguration configuration, ILogger<FirebaseMessagingService>? logger = null)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClient = new HttpClient();

        // Load Firebase configuration
        _projectId = configuration["Firebase:ProjectId"];
        _serviceAccountPath = configuration["Firebase:ServiceAccountPath"];

        // Check if service account file exists
        _isConfigured = !string.IsNullOrWhiteSpace(_serviceAccountPath) && 
                        !string.IsNullOrWhiteSpace(_projectId) &&
                        File.Exists(_serviceAccountPath);

        if (_isConfigured)
        {
            _logger?.LogInformation("Firebase Cloud Messaging initialized with project: {ProjectId}", _projectId);
        }
        else
        {
            _logger?.LogWarning("Firebase Cloud Messaging not configured. Push notifications will be logged only.");
            _logger?.LogWarning("To enable FCM, set Firebase:ServiceAccountPath to your service account JSON file path");
        }
    }

    /// <summary>
    /// Get access token using service account credentials
    /// </summary>
    private async Task<string?> GetAccessTokenAsync()
    {
        if (!_isConfigured) return null;

        // Return cached token if still valid
        if (!string.IsNullOrEmpty(_accessToken) && DateTime.UtcNow < _tokenExpiry)
        {
            return _accessToken;
        }

        try
        {
            // Read service account JSON
            var serviceAccountJson = await File.ReadAllTextAsync(_serviceAccountPath!);
            var serviceAccount = JsonSerializer.Deserialize<ServiceAccountCredentials>(serviceAccountJson);

            if (serviceAccount == null)
            {
                _logger?.LogError("Failed to parse service account JSON");
                return null;
            }

            // Create JWT for Google OAuth
            var jwt = CreateJwt(serviceAccount);

            // Exchange JWT for access token
            var tokenRequest = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
                new KeyValuePair<string, string>("assertion", jwt)
            });

            var response = await _httpClient.PostAsync(GOOGLE_TOKEN_URL, tokenRequest);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger?.LogError("Failed to get access token: {Response}", responseContent);
                return null;
            }

            var tokenResponse = JsonSerializer.Deserialize<TokenResponse>(responseContent);
            _accessToken = tokenResponse?.AccessToken;
            _tokenExpiry = DateTime.UtcNow.AddSeconds((tokenResponse?.ExpiresIn ?? 3600) - 60); // Refresh 1 min early

            _logger?.LogDebug("FCM access token refreshed, expires at {Expiry}", _tokenExpiry);

            return _accessToken;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting FCM access token");
            return null;
        }
    }

    /// <summary>
    /// Create JWT for service account authentication
    /// </summary>
    private string CreateJwt(ServiceAccountCredentials credentials)
    {
        var header = new { alg = "RS256", typ = "JWT" };
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var payload = new
        {
            iss = credentials.ClientEmail,
            scope = "https://www.googleapis.com/auth/firebase.messaging",
            aud = GOOGLE_TOKEN_URL,
            iat = now,
            exp = now + 3600
        };

        var headerJson = JsonSerializer.Serialize(header);
        var payloadJson = JsonSerializer.Serialize(payload);

        var headerBase64 = Base64UrlEncode(Encoding.UTF8.GetBytes(headerJson));
        var payloadBase64 = Base64UrlEncode(Encoding.UTF8.GetBytes(payloadJson));

        var unsignedToken = $"{headerBase64}.{payloadBase64}";

        // Sign with RSA private key
        using var rsa = System.Security.Cryptography.RSA.Create();
        rsa.ImportFromPem(credentials.PrivateKey);
        
        var signature = rsa.SignData(
            Encoding.UTF8.GetBytes(unsignedToken),
            System.Security.Cryptography.HashAlgorithmName.SHA256,
            System.Security.Cryptography.RSASignaturePadding.Pkcs1
        );

        return $"{unsignedToken}.{Base64UrlEncode(signature)}";
    }

    private static string Base64UrlEncode(byte[] data)
    {
        return Convert.ToBase64String(data)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }

    public async Task<bool> SendToDeviceAsync(string deviceToken, string title, string body, Dictionary<string, string>? data = null)
    {
        if (!_isConfigured)
        {
            _logger?.LogInformation("[FCM MOCK] SendToDevice: Token={Token}, Title={Title}, Body={Body}",
                deviceToken?.Substring(0, Math.Min(20, deviceToken?.Length ?? 0)) + "...", title, body);
            return true;
        }

        var accessToken = await GetAccessTokenAsync();
        if (string.IsNullOrEmpty(accessToken))
        {
            _logger?.LogWarning("Cannot send FCM - no access token");
            return false;
        }

        try
        {
            var message = new FcmV1Message
            {
                Message = new FcmMessageBody
                {
                    Token = deviceToken,
                    Notification = new FcmNotification
                    {
                        Title = title,
                        Body = body
                    },
                    Data = data,
                    Android = new FcmAndroidConfig
                    {
                        Priority = "high",
                        Notification = new FcmAndroidNotification
                        {
                            Sound = "default",
                            ClickAction = "OPEN_APP"
                        }
                    },
                    Apns = new FcmApnsConfig
                    {
                        Payload = new FcmApnsPayload
                        {
                            Aps = new FcmAps
                            {
                                Sound = "default",
                                Badge = 1
                            }
                        }
                    }
                }
            };

            return await SendFcmMessageAsync(message);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error sending FCM notification to device");
            return false;
        }
    }

    public async Task<int> SendToMultipleDevicesAsync(IEnumerable<string> deviceTokens, string title, string body, Dictionary<string, string>? data = null)
    {
        var tokens = deviceTokens.ToList();
        
        if (!_isConfigured)
        {
            _logger?.LogInformation("[FCM MOCK] SendToMultipleDevices: Count={Count}, Title={Title}", tokens.Count, title);
            return tokens.Count;
        }

        var successCount = 0;
        foreach (var token in tokens)
        {
            if (await SendToDeviceAsync(token, title, body, data))
            {
                successCount++;
            }
        }

        _logger?.LogInformation("FCM sent to {Success}/{Total} devices", successCount, tokens.Count);
        return successCount;
    }

    public async Task<bool> SendToTopicAsync(string topic, string title, string body, Dictionary<string, string>? data = null)
    {
        if (!_isConfigured)
        {
            _logger?.LogInformation("[FCM MOCK] SendToTopic: Topic={Topic}, Title={Title}", topic, title);
            return true;
        }

        var accessToken = await GetAccessTokenAsync();
        if (string.IsNullOrEmpty(accessToken))
        {
            _logger?.LogWarning("Cannot send FCM - no access token");
            return false;
        }

        try
        {
            var message = new FcmV1Message
            {
                Message = new FcmMessageBody
                {
                    Topic = topic,
                    Notification = new FcmNotification
                    {
                        Title = title,
                        Body = body
                    },
                    Data = data
                }
            };

            return await SendFcmMessageAsync(message);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error sending FCM notification to topic: {Topic}", topic);
            return false;
        }
    }

    private async Task<bool> SendFcmMessageAsync(FcmV1Message message)
    {
        var accessToken = await GetAccessTokenAsync();
        if (string.IsNullOrEmpty(accessToken)) return false;

        var url = string.Format(FCM_V1_URL, _projectId);
        var json = JsonSerializer.Serialize(message, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        });

        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (response.IsSuccessStatusCode)
        {
            _logger?.LogInformation("FCM notification sent successfully");
            return true;
        }

        _logger?.LogError("FCM send failed: {StatusCode} - {Response}", response.StatusCode, responseBody);
        return false;
    }

    public async Task<bool> SubscribeToTopicAsync(string deviceToken, string topic)
    {
        if (!_isConfigured)
        {
            _logger?.LogInformation("[FCM MOCK] SubscribeToTopic: Token={Token}, Topic={Topic}",
                deviceToken?.Substring(0, Math.Min(20, deviceToken?.Length ?? 0)) + "...", topic);
            return true;
        }

        var accessToken = await GetAccessTokenAsync();
        if (string.IsNullOrEmpty(accessToken)) return false;

        try
        {
            var url = $"https://iid.googleapis.com/iid/v1/{deviceToken}/rel/topics/{topic}";
            var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                _logger?.LogInformation("Device subscribed to topic: {Topic}", topic);
                return true;
            }

            _logger?.LogError("FCM subscribe failed: {StatusCode}", response.StatusCode);
            return false;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error subscribing to topic: {Topic}", topic);
            return false;
        }
    }

    public async Task<bool> UnsubscribeFromTopicAsync(string deviceToken, string topic)
    {
        if (!_isConfigured)
        {
            _logger?.LogInformation("[FCM MOCK] UnsubscribeFromTopic: Token={Token}, Topic={Topic}",
                deviceToken?.Substring(0, Math.Min(20, deviceToken?.Length ?? 0)) + "...", topic);
            return true;
        }

        var accessToken = await GetAccessTokenAsync();
        if (string.IsNullOrEmpty(accessToken)) return false;

        try
        {
            var url = $"https://iid.googleapis.com/iid/v1/{deviceToken}/rel/topics/{topic}";
            var request = new HttpRequestMessage(HttpMethod.Delete, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                _logger?.LogInformation("Device unsubscribed from topic: {Topic}", topic);
                return true;
            }

            _logger?.LogError("FCM unsubscribe failed: {StatusCode}", response.StatusCode);
            return false;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error unsubscribing from topic: {Topic}", topic);
            return false;
        }
    }

    public async Task<bool> SendHighRiskAlertAsync(string userId, string analysisId, string riskLevel)
    {
        var title = "⚠️ Cảnh báo Rủi ro Cao";
        var body = $"Kết quả phân tích của bạn cho thấy mức rủi ro {riskLevel}. Vui lòng tham khảo ý kiến bác sĩ.";
        
        var data = new Dictionary<string, string>
        {
            { "type", "high_risk_alert" },
            { "userId", userId },
            { "analysisId", analysisId },
            { "riskLevel", riskLevel },
            { "action", "view_analysis" }
        };

        return await SendToTopicAsync($"user_{userId}", title, body, data);
    }

    public async Task<bool> SendAnalysisCompleteAsync(string userId, string analysisId, string status)
    {
        var title = "✅ Phân tích Hoàn thành";
        var body = status == "Success" 
            ? "Kết quả phân tích võng mạc của bạn đã sẵn sàng. Nhấn để xem chi tiết."
            : "Phân tích đã hoàn thành. Vui lòng kiểm tra kết quả.";
        
        var data = new Dictionary<string, string>
        {
            { "type", "analysis_complete" },
            { "userId", userId },
            { "analysisId", analysisId },
            { "status", status },
            { "action", "view_analysis" }
        };

        return await SendToTopicAsync($"user_{userId}", title, body, data);
    }

    // DTO Classes for FCM V1 API
    private class ServiceAccountCredentials
    {
        [JsonPropertyName("type")]
        public string? Type { get; set; }
        
        [JsonPropertyName("project_id")]
        public string? ProjectId { get; set; }
        
        [JsonPropertyName("private_key_id")]
        public string? PrivateKeyId { get; set; }
        
        [JsonPropertyName("private_key")]
        public string? PrivateKey { get; set; }
        
        [JsonPropertyName("client_email")]
        public string? ClientEmail { get; set; }
        
        [JsonPropertyName("client_id")]
        public string? ClientId { get; set; }
    }

    private class TokenResponse
    {
        [JsonPropertyName("access_token")]
        public string? AccessToken { get; set; }
        
        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }
        
        [JsonPropertyName("token_type")]
        public string? TokenType { get; set; }
    }

    private class FcmV1Message
    {
        public FcmMessageBody? Message { get; set; }
    }

    private class FcmMessageBody
    {
        public string? Token { get; set; }
        public string? Topic { get; set; }
        public FcmNotification? Notification { get; set; }
        public Dictionary<string, string>? Data { get; set; }
        public FcmAndroidConfig? Android { get; set; }
        public FcmApnsConfig? Apns { get; set; }
    }

    private class FcmNotification
    {
        public string? Title { get; set; }
        public string? Body { get; set; }
        public string? Image { get; set; }
    }

    private class FcmAndroidConfig
    {
        public string? Priority { get; set; }
        public FcmAndroidNotification? Notification { get; set; }
    }

    private class FcmAndroidNotification
    {
        public string? Sound { get; set; }
        public string? ClickAction { get; set; }
    }

    private class FcmApnsConfig
    {
        public FcmApnsPayload? Payload { get; set; }
    }

    private class FcmApnsPayload
    {
        public FcmAps? Aps { get; set; }
    }

    private class FcmAps
    {
        public string? Sound { get; set; }
        public int? Badge { get; set; }
    }
}
