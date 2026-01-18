using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using System.Text;
using System.Text.Json;

using RabbitMQ.Client.Events;

namespace Aura.Infrastructure.Services.RabbitMQ;

/// <summary>
/// RabbitMQ Service for message queue operations
/// </summary>
public class RabbitMQService : IRabbitMQService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<RabbitMQService>? _logger;
    private IConnection? _connection;
    private IModel? _channel;

    public RabbitMQService(IConfiguration configuration, ILogger<RabbitMQService>? logger = null)
    {
        _configuration = configuration;
        _logger = logger;
        InitializeConnection();
    }

    private void InitializeConnection()
    {
        try
        {
            var hostName = _configuration["RabbitMQ:HostName"] ?? "rabbitmq";
            var userName = _configuration["RabbitMQ:UserName"] ?? "aura_user";
            var password = _configuration["RabbitMQ:Password"] ?? "aura_rabbitmq_2024";
            var port = int.TryParse(_configuration["RabbitMQ:Port"], out var p) ? p : 5672;
            var virtualHost = _configuration["RabbitMQ:VirtualHost"] ?? "/";

            var factory = new ConnectionFactory
            {
                HostName = hostName,
                UserName = userName,
                Password = password,
                Port = port,
                VirtualHost = virtualHost,
                AutomaticRecoveryEnabled = true,
                NetworkRecoveryInterval = TimeSpan.FromSeconds(10)
            };

            _connection = factory.CreateConnection();
            _channel = _connection.CreateModel();
            
            // Declare exchanges and queues
            DeclareExchangesAndQueues();
            
            _logger?.LogInformation("RabbitMQ connection established: {HostName}:{Port}", hostName, port);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to initialize RabbitMQ connection");
            throw;
        }
    }

    private void DeclareExchangesAndQueues()
    {
        if (_channel == null) return;

        // Exchange for analysis jobs
        _channel.ExchangeDeclare("analysis.exchange", ExchangeType.Topic, durable: true);

        // Exchange for notifications
        _channel.ExchangeDeclare("notifications.exchange", ExchangeType.Fanout, durable: true);

        // Queue for analysis jobs
        _channel.QueueDeclare("analysis.queue", durable: true, exclusive: false, autoDelete: false);
        _channel.QueueBind("analysis.queue", "analysis.exchange", "analysis.start");

        // Queue for notifications
        _channel.QueueDeclare("notifications.queue", durable: true, exclusive: false, autoDelete: false);
        _channel.QueueBind("notifications.queue", "notifications.exchange", "");

        // Queue for email sending
        _channel.QueueDeclare("email.queue", durable: true, exclusive: false, autoDelete: false);
        _channel.QueueBind("email.queue", "notifications.exchange", "");
    }

    /// <summary>
    /// Publish message to exchange
    /// </summary>
    public void Publish<T>(string exchange, string routingKey, T message)
    {
        if (_channel == null || _channel.IsClosed)
        {
            InitializeConnection();
        }

        if (_channel == null) return;

        try
        {
            var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(message));
            var properties = _channel.CreateBasicProperties();
            properties.Persistent = true;
            properties.Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds());

            _channel.BasicPublish(
                exchange: exchange,
                routingKey: routingKey,
                basicProperties: properties,
                body: body);

            _logger?.LogDebug("Message published to {Exchange} with routing key {RoutingKey}", exchange, routingKey);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error publishing message to {Exchange}", exchange);
            throw;
        }
    }

    /// <summary>
    /// Consume messages from queue
    /// </summary>
    public void Consume<T>(string queue, Func<T, Task> handler)
    {
        if (_channel == null || _channel.IsClosed)
        {
            InitializeConnection();
        }

        if (_channel == null) return;

        var consumer = new EventingBasicConsumer(_channel);
        consumer.Received += async (model, ea) =>
        {
            try
            {
                var body = ea.Body.ToArray();
                var message = Encoding.UTF8.GetString(body);
                var obj = JsonSerializer.Deserialize<T>(message);

                if (obj != null)
                {
                    await handler(obj);
                    _channel?.BasicAck(ea.DeliveryTag, false);
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error processing message from queue {Queue}", queue);
                _channel?.BasicNack(ea.DeliveryTag, false, true); // Requeue message
            }
        };

        _channel.BasicConsume(queue: queue, autoAck: false, consumer: consumer);
        _logger?.LogInformation("Started consuming from queue: {Queue}", queue);
    }

    public void Dispose()
    {
        _channel?.Close();
        _channel?.Dispose();
        _connection?.Close();
        _connection?.Dispose();
    }
}
