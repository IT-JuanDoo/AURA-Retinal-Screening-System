using Aura.Application.DTOs.Notifications;

namespace Aura.Application.Services.Notifications;

public interface INotificationService
{
    Task<IEnumerable<NotificationDto>> GetForUserAsync(string? userId);
    Task<NotificationDto> CreateAsync(string? userId, string title, string message, string? type = null, object? data = null);
    Task MarkReadAsync(string? userId, string id);
    Task MarkAllReadAsync(string? userId);
    IAsyncEnumerable<NotificationDto> StreamForUserAsync(string? userId, CancellationToken ct);
}
