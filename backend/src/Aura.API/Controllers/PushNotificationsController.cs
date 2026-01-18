using Aura.Infrastructure.Services.Firebase;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aura.API.Controllers;

/// <summary>
/// Controller for managing Firebase Cloud Messaging push notifications
/// </summary>
[ApiController]
[Route("api/push-notifications")]
[Authorize]
public class PushNotificationsController : ControllerBase
{
    private readonly IFirebaseMessagingService _fcmService;
    private readonly ILogger<PushNotificationsController> _logger;

    public PushNotificationsController(
        IFirebaseMessagingService fcmService,
        ILogger<PushNotificationsController> logger)
    {
        _fcmService = fcmService;
        _logger = logger;
    }

    /// <summary>
    /// Register device token for push notifications
    /// </summary>
    [HttpPost("register-device")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RegisterDevice([FromBody] RegisterDeviceDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        if (string.IsNullOrWhiteSpace(dto.DeviceToken))
        {
            return BadRequest(new { message = "Device token is required" });
        }

        try
        {
            // Subscribe device to user's personal topic
            var subscribed = await _fcmService.SubscribeToTopicAsync(dto.DeviceToken, $"user_{userId}");
            
            // Subscribe to general notifications topic
            await _fcmService.SubscribeToTopicAsync(dto.DeviceToken, "all_users");

            // Subscribe to platform-specific topic
            if (!string.IsNullOrWhiteSpace(dto.Platform))
            {
                await _fcmService.SubscribeToTopicAsync(dto.DeviceToken, $"platform_{dto.Platform.ToLower()}");
            }

            _logger.LogInformation("Device registered for push notifications: UserId={UserId}, Platform={Platform}", 
                userId, dto.Platform);

            return Ok(new { 
                success = true, 
                message = "Device registered successfully",
                topics = new[] { $"user_{userId}", "all_users" }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error registering device for push notifications");
            return BadRequest(new { message = "Failed to register device" });
        }
    }

    /// <summary>
    /// Unregister device from push notifications
    /// </summary>
    [HttpPost("unregister-device")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UnregisterDevice([FromBody] UnregisterDeviceDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        try
        {
            // Unsubscribe from all topics
            await _fcmService.UnsubscribeFromTopicAsync(dto.DeviceToken, $"user_{userId}");
            await _fcmService.UnsubscribeFromTopicAsync(dto.DeviceToken, "all_users");

            _logger.LogInformation("Device unregistered from push notifications: UserId={UserId}", userId);

            return Ok(new { success = true, message = "Device unregistered successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unregistering device");
            return BadRequest(new { message = "Failed to unregister device" });
        }
    }

    /// <summary>
    /// Send test notification to current user
    /// </summary>
    [HttpPost("test")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> SendTestNotification()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        var sent = await _fcmService.SendToTopicAsync(
            $"user_{userId}",
            "🔔 Test Notification",
            "Đây là thông báo test từ AURA. Nếu bạn nhận được, FCM đang hoạt động!",
            new Dictionary<string, string>
            {
                { "type", "test" },
                { "timestamp", DateTime.UtcNow.ToString("O") }
            }
        );

        return Ok(new { 
            success = sent, 
            message = sent ? "Test notification sent" : "Failed to send notification (check FCM configuration)"
        });
    }

    /// <summary>
    /// Subscribe to a topic
    /// </summary>
    [HttpPost("subscribe/{topic}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> SubscribeToTopic(string topic, [FromBody] DeviceTokenDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.DeviceToken))
        {
            return BadRequest(new { message = "Device token is required" });
        }

        var success = await _fcmService.SubscribeToTopicAsync(dto.DeviceToken, topic);
        return Ok(new { success, topic });
    }

    /// <summary>
    /// Unsubscribe from a topic
    /// </summary>
    [HttpPost("unsubscribe/{topic}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UnsubscribeFromTopic(string topic, [FromBody] DeviceTokenDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.DeviceToken))
        {
            return BadRequest(new { message = "Device token is required" });
        }

        var success = await _fcmService.UnsubscribeFromTopicAsync(dto.DeviceToken, topic);
        return Ok(new { success, topic });
    }
}

// DTOs
public class RegisterDeviceDto
{
    public string DeviceToken { get; set; } = string.Empty;
    public string? Platform { get; set; } // "ios", "android", "web"
    public string? DeviceInfo { get; set; }
}

public class UnregisterDeviceDto
{
    public string DeviceToken { get; set; } = string.Empty;
}

public class DeviceTokenDto
{
    public string DeviceToken { get; set; } = string.Empty;
}
