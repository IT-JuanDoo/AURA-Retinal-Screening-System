using Aura.Application.DTOs.Messages;
using Aura.Application.Services.Messages;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Aura.API.Hubs;
using System.Security.Claims;

namespace Aura.API.Controllers;

/// <summary>
/// Controller for messaging system (FR-10)
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly IMessageService _messageService;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly ILogger<MessagesController> _logger;

    public MessagesController(
        IMessageService messageService,
        IHubContext<ChatHub> hubContext,
        ILogger<MessagesController> logger)
    {
        _messageService = messageService;
        _hubContext = hubContext;
        _logger = logger;
    }

    /// <summary>
    /// Send a message
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(MessageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SendMessage([FromBody] CreateMessageDto dto)
    {
        var senderId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var senderType = User.FindFirstValue("user_type") ?? "User";

        if (string.IsNullOrEmpty(senderId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        try
        {
            var message = await _messageService.SendMessageAsync(senderId, senderType, dto);

            // Send real-time notification via SignalR
            await _hubContext.Clients.Group(dto.ReceiverId).SendAsync("ReceiveMessage", message);
            await _hubContext.Clients.Group(message.ConversationId).SendAsync("ReceiveMessage", message);

            _logger.LogInformation("Message sent from {SenderId} to {ReceiverId}", senderId, dto.ReceiverId);

            return Ok(message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending message");
            return StatusCode(500, new { message = "Failed to send message", error = ex.Message });
        }
    }

    /// <summary>
    /// Get messages in a conversation
    /// </summary>
    [HttpGet("conversation/{conversationId}")]
    [ProducesResponseType(typeof(List<MessageDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConversationMessages(
        string conversationId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        try
        {
            var messages = await _messageService.GetConversationMessagesAsync(userId, conversationId, page, pageSize);
            return Ok(messages);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting conversation messages");
            return StatusCode(500, new { message = "Failed to get messages", error = ex.Message });
        }
    }

    /// <summary>
    /// Get all conversations for current user
    /// </summary>
    [HttpGet("conversations")]
    [ProducesResponseType(typeof(List<ConversationDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConversations()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userType = User.FindFirstValue("user_type") ?? "User";

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        try
        {
            var conversations = await _messageService.GetUserConversationsAsync(userId, userType);
            return Ok(conversations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting conversations");
            return StatusCode(500, new { message = "Failed to get conversations", error = ex.Message });
        }
    }

    /// <summary>
    /// Mark messages as read
    /// </summary>
    [HttpPost("mark-read")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> MarkAsRead([FromBody] MarkReadDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        try
        {
            await _messageService.MarkMessagesAsReadAsync(userId, dto.MessageIds);

            // Notify via SignalR
            foreach (var messageId in dto.MessageIds)
            {
                await _hubContext.Clients.All.SendAsync("MessageRead", new
                {
                    MessageId = messageId,
                    ReadBy = userId,
                    ReadAt = DateTime.UtcNow
                });
            }

            return Ok(new { message = "Messages marked as read" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking messages as read");
            return StatusCode(500, new { message = "Failed to mark messages as read", error = ex.Message });
        }
    }

    /// <summary>
    /// Get unread message count
    /// </summary>
    [HttpGet("unread-count")]
    [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        try
        {
            var count = await _messageService.GetUnreadCountAsync(userId);
            return Ok(new { unreadCount = count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting unread count");
            return StatusCode(500, new { message = "Failed to get unread count", error = ex.Message });
        }
    }

    /// <summary>
    /// Search messages in a conversation (FR-20)
    /// </summary>
    [HttpGet("conversation/{conversationId}/search")]
    [ProducesResponseType(typeof(List<MessageDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SearchMessages(
        string conversationId,
        [FromQuery] string query)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        if (string.IsNullOrWhiteSpace(query))
        {
            return Ok(new List<MessageDto>());
        }

        try
        {
            var messages = await _messageService.SearchMessagesAsync(userId, conversationId, query);
            return Ok(messages);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching messages");
            return StatusCode(500, new { message = "Failed to search messages", error = ex.Message });
        }
    }
}

