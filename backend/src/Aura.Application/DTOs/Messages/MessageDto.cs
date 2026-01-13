namespace Aura.Application.DTOs.Messages;

public class MessageDto
{
    public string Id { get; set; } = string.Empty;
    public string ConversationId { get; set; } = string.Empty;
    public string SendById { get; set; } = string.Empty;
    public string SendByType { get; set; } = string.Empty;
    public string SendByName { get; set; } = string.Empty;
    public string? SendByAvatar { get; set; }
    public string ReceiverId { get; set; } = string.Empty;
    public string ReceiverType { get; set; } = string.Empty;
    public string? Subject { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? AttachmentUrl { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateMessageDto
{
    public string ReceiverId { get; set; } = string.Empty;
    public string ReceiverType { get; set; } = string.Empty; // User, Doctor
    public string? Subject { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? AttachmentUrl { get; set; }
}

public class ConversationDto
{
    public string ConversationId { get; set; } = string.Empty;
    public string OtherUserId { get; set; } = string.Empty;
    public string OtherUserType { get; set; } = string.Empty;
    public string OtherUserName { get; set; } = string.Empty;
    public string? OtherUserAvatar { get; set; }
    public string? LastMessage { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public int UnreadCount { get; set; }
    public bool IsOnline { get; set; }
}

public class MarkReadDto
{
    public List<string> MessageIds { get; set; } = new();
}

