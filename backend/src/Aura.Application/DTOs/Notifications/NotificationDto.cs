namespace Aura.Application.DTOs.Notifications;

public class NotificationDto
{
    public string Id { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Type { get; set; }
    public object? Data { get; set; }
    public bool Read { get; set; }
    public DateTime CreatedAt { get; set; }
}
