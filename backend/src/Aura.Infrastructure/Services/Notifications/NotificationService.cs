using System.Collections.Concurrent;
using System.Threading.Channels;
using Aura.Application.DTOs.Notifications;
using Aura.Application.Services.Notifications;
using Aura.Core.Entities;

namespace Aura.Infrastructure.Services.Notifications;

public class NotificationService : INotificationService
{
    // In-memory store: userId -> list of notifications (newest first)
    private readonly ConcurrentDictionary<string, ConcurrentQueue<Notification>> _store = new();

    // Per-user channel for real-time delivery
    private readonly ConcurrentDictionary<string, Channel<NotificationDto>> _channels = new();

    private Channel<NotificationDto> GetOrCreateChannel(string userId)
    {
        return _channels.GetOrAdd(userId ?? "__global__", _ => Channel.CreateUnbounded<NotificationDto>());
    }

    public async Task<NotificationDto> CreateAsync(string? userId, string title, string message, string? type = null, object? data = null)
    {
        var n = new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
            Type = type,
            Read = false,
            CreatedAt = DateTime.UtcNow
        };

        if (data != null) n.SetData(data);

        var queue = _store.GetOrAdd(userId ?? string.Empty, _ => new ConcurrentQueue<Notification>());
        queue.Enqueue(n);

        // push to channel
        var dto = Map(n);
        var ch = GetOrCreateChannel(userId ?? "__global__");
        await ch.Writer.WriteAsync(dto);

        return dto;
    }

    public Task<IEnumerable<NotificationDto>> GetForUserAsync(string? userId)
    {
        var key = userId ?? string.Empty;
        if (_store.TryGetValue(key, out var q))
        {
            // snapshot
            var arr = q.ToArray().Reverse().Select(Map).ToList();
            return Task.FromResult<IEnumerable<NotificationDto>>(arr);
        }

        return Task.FromResult<IEnumerable<NotificationDto>>(Array.Empty<NotificationDto>());
    }

    public Task MarkReadAsync(string? userId, string id)
    {
        var key = userId ?? string.Empty;
        if (_store.TryGetValue(key, out var q))
        {
            var arr = q.ToArray();
            for (int i = 0; i < arr.Length; i++)
            {
                if (arr[i].Id == id)
                {
                    arr[i].Read = true;
                }
            }

            // rebuild queue preserving order
            var newQ = new ConcurrentQueue<Notification>(arr);
            _store[key] = newQ;
        }
        return Task.CompletedTask;
    }

    public Task MarkAllReadAsync(string? userId)
    {
        var key = userId ?? string.Empty;
        if (_store.TryGetValue(key, out var q))
        {
            var arr = q.ToArray();
            foreach (var item in arr) item.Read = true;
            var newQ = new ConcurrentQueue<Notification>(arr);
            _store[key] = newQ;
        }
        return Task.CompletedTask;
    }

    public async IAsyncEnumerable<NotificationDto> StreamForUserAsync(string? userId, [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        // subscribe to channel
        var ch = GetOrCreateChannel(userId ?? "__global__");
        var reader = ch.Reader;

        // Optionally send recent notifications immediately
        var initial = await GetForUserAsync(userId);
        foreach (var n in initial)
        {
            yield return n;
        }

        while (await reader.WaitToReadAsync(ct))
        {
            while (reader.TryRead(out var n))
            {
                // filter by user
                if ((n.UserId ?? string.Empty) == (userId ?? string.Empty) || (n.UserId == null && userId == null))
                {
                    yield return n;
                }
            }
        }
    }

    private static NotificationDto Map(Notification n) => new NotificationDto
    {
        Id = n.Id,
        UserId = n.UserId,
        Title = n.Title,
        Message = n.Message,
        Type = n.Type,
        Data = string.IsNullOrEmpty(n.DataJson) ? null : System.Text.Json.JsonSerializer.Deserialize<object>(n.DataJson),
        Read = n.Read,
        CreatedAt = n.CreatedAt
    };
}
