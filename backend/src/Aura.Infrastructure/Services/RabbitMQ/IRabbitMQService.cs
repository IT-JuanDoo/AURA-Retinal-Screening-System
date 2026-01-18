namespace Aura.Infrastructure.Services.RabbitMQ;

/// <summary>
/// Interface for RabbitMQ Service
/// </summary>
public interface IRabbitMQService : IDisposable
{
    /// <summary>
    /// Publish message to exchange
    /// </summary>
    void Publish<T>(string exchange, string routingKey, T message);

    /// <summary>
    /// Consume messages from queue
    /// </summary>
    void Consume<T>(string queue, Func<T, Task> handler);
}
