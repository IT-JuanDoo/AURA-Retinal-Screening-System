namespace Aura.Core.Entities;

/// <summary>
/// Message entity for patient-doctor communication (FR-10)
/// </summary>
public class Message
{
    public string Id { get; set; } = string.Empty;
    public string ConversationId { get; set; } = string.Empty;
    public string SendById { get; set; } = string.Empty;
    public string SendByType { get; set; } = string.Empty; // User, Doctor, Admin
    public string ReceiverId { get; set; } = string.Empty;
    public string ReceiverType { get; set; } = string.Empty; // User, Doctor, Admin
    public string? Subject { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? AttachmentUrl { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime? CreatedDate { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsDeleted { get; set; }
    public string? Note { get; set; }
}

