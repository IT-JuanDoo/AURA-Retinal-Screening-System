using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace Aura.API.Hubs;

/// <summary>
/// SignalR Hub for real-time messaging (FR-10)
/// </summary>
public class ChatHub : Hub
{
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(ILogger<ChatHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? Context.User?.FindFirstValue("sub")
            ?? Context.User?.FindFirstValue("id");
        var userType = Context.User?.FindFirstValue("user_type") ?? "User";

        if (string.IsNullOrEmpty(userId))
        {
            _logger.LogWarning("Unauthenticated connection attempt to chat hub from {ConnectionId}", Context.ConnectionId);
            Context.Abort(); // Close connection if not authenticated
            return;
        }

        // Add user to group for their user ID
        await Groups.AddToGroupAsync(Context.ConnectionId, userId);
        _logger.LogInformation("User {UserId} ({UserType}) connected to chat hub", userId, userType);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);
            _logger.LogInformation("User {UserId} disconnected from chat hub", userId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Join a conversation group
    /// </summary>
    public async Task JoinConversation(string conversationId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, conversationId);
        _logger.LogDebug("User joined conversation {ConversationId}", conversationId);
    }

    /// <summary>
    /// Leave a conversation group
    /// </summary>
    public async Task LeaveConversation(string conversationId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, conversationId);
        _logger.LogDebug("User left conversation {ConversationId}", conversationId);
    }

    /// <summary>
    /// Send message to specific user
    /// </summary>
    public async Task SendMessageToUser(string receiverId, object message)
    {
        var senderId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(senderId))
        {
            await Clients.Caller.SendAsync("Error", "User not authenticated");
            return;
        }

        // Send to receiver's group
        await Clients.Group(receiverId).SendAsync("ReceiveMessage", message);
        
        // Also send to sender for confirmation
        await Clients.Caller.SendAsync("MessageSent", message);
    }

    /// <summary>
    /// Send message to conversation
    /// </summary>
    public async Task SendMessageToConversation(string conversationId, object message)
    {
        var senderId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(senderId))
        {
            await Clients.Caller.SendAsync("Error", "User not authenticated");
            return;
        }

        // Send to all users in the conversation
        await Clients.Group(conversationId).SendAsync("ReceiveMessage", message);
    }

    /// <summary>
    /// Notify message read status
    /// </summary>
    public async Task MarkMessageRead(string conversationId, string messageId)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return;

        // Notify other users in conversation
        await Clients.Group(conversationId).SendAsync("MessageRead", new
        {
            MessageId = messageId,
            ReadBy = userId,
            ReadAt = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Send typing indicator
    /// </summary>
    public async Task SendTyping(string conversationId, bool isTyping)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return;

        await Clients.GroupExcept(conversationId, Context.ConnectionId)
            .SendAsync("UserTyping", new
            {
                UserId = userId,
                IsTyping = isTyping
            });
    }
}

