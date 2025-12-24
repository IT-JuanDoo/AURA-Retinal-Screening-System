using System.Text.Json;

namespace Aura.Core.Entities;

public class Notification
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string? UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Type { get; set; }
    // Store arbitrary payload as JSON string
    public string? DataJson { get; set; }
    public bool Read { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public T? GetData<T>() where T : class
    {
        if (string.IsNullOrEmpty(DataJson)) return default;
        try
        {
            return JsonSerializer.Deserialize<T>(DataJson);
        }
        catch
        {
            return default;
        }
    }

    public void SetData<T>(T data)
    {
        if (data == null)
        {
            DataJson = null;
            return;
        }

        DataJson = JsonSerializer.Serialize(data);
    }
}
