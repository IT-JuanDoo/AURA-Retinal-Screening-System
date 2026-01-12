using System.Text.Json;
using Aura.Application.DTOs.Notifications;
using Aura.Application.Services.Notifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aura.NotificationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notifications;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(INotificationService notifications, ILogger<NotificationsController> logger)
    {
        _notifications = notifications;
        _logger = logger;
    }

    // GET /api/notifications
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> Get()
    {
        var userId = User?.FindFirst("sub")?.Value ?? User?.FindFirst("id")?.Value;
        var arr = await _notifications.GetForUserAsync(userId);
        return Ok(arr);
    }

    // POST /api/notifications (create notification)
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] NotificationDto dto)
    {
        var userId = User?.FindFirst("sub")?.Value ?? User?.FindFirst("id")?.Value;
        var created = await _notifications.CreateAsync(userId, dto.Title, dto.Message, dto.Type, dto.Data);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    // POST /api/notifications/{id}/read
    [HttpPost("{id}/read")]
    [Authorize]
    public async Task<IActionResult> MarkRead(string id)
    {
        var userId = User?.FindFirst("sub")?.Value ?? User?.FindFirst("id")?.Value;
        await _notifications.MarkReadAsync(userId, id);
        return NoContent();
    }

    // POST /api/notifications/mark-all-read
    [HttpPost("mark-all-read")]
    [Authorize]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = User?.FindFirst("sub")?.Value ?? User?.FindFirst("id")?.Value;
        await _notifications.MarkAllReadAsync(userId);
        return NoContent();
    }

    // GET /api/notifications/stream
    [HttpGet("stream")]
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
