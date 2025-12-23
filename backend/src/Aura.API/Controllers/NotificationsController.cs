using System.Text.Json;
using Aura.Application.DTOs.Notifications;
using Aura.Application.Services.Notifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Aura.API.Controllers;

[ApiController]
[Route("api")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notifications;

    public NotificationsController(INotificationService notifications)
    {
        _notifications = notifications;
    }

    // GET /api/notifications
    [HttpGet("notifications")]
    [Authorize]
    public async Task<IActionResult> Get()
    {
        var userId = User?.FindFirst("sub")?.Value ?? User?.FindFirst("id")?.Value;
        var arr = await _notifications.GetForUserAsync(userId);
        return Ok(arr);
    }

    // POST /api/notifications (create test notification)
    [HttpPost("notifications")]
    // For demo purposes allow this for authenticated users; adjust as needed
    [Authorize]
    public async Task<IActionResult> Create([FromBody] NotificationDto dto)
    {
        var userId = User?.FindFirst("sub")?.Value ?? User?.FindFirst("id")?.Value;
        var created = await _notifications.CreateAsync(userId, dto.Title, dto.Message, dto.Type, dto.Data);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    // POST /api/notifications/{id}/read
    [HttpPost("notifications/{id}/read")]
    [Authorize]
    public async Task<IActionResult> MarkRead(string id)
    {
        var userId = User?.FindFirst("sub")?.Value ?? User?.FindFirst("id")?.Value;
        await _notifications.MarkReadAsync(userId, id);
        return NoContent();
    }

    // POST /api/notifications/mark-all-read
    [HttpPost("notifications/mark-all-read")]
    [Authorize]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = User?.FindFirst("sub")?.Value ?? User?.FindFirst("id")?.Value;
        await _notifications.MarkAllReadAsync(userId);
        return NoContent();
    }

    // GET /api/notifications/stream
    [HttpGet("notifications/stream")]
    [Authorize]
    public async Task Stream(CancellationToken ct)
    {
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Content-Type", "text/event-stream");

        var userId = User?.FindFirst("sub")?.Value ?? User?.FindFirst("id")?.Value;

        await foreach (var n in _notifications.StreamForUserAsync(userId, ct))
        {
            var json = JsonSerializer.Serialize(n);
            await Response.WriteAsync($"data: {json}\n\n", ct);
            await Response.Body.FlushAsync(ct);
        }
    }
}
