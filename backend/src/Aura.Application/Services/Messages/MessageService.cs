using Aura.Application.DTOs.Messages;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Aura.Application.Services.Messages;

public class MessageService : IMessageService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<MessageService>? _logger;
    private readonly string _connectionString;

    public MessageService(IConfiguration configuration, ILogger<MessageService>? logger = null)
    {
        _configuration = configuration;
        _logger = logger;
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Database connection string not found");
    }

    public async Task<MessageDto> SendMessageAsync(string senderId, string senderType, CreateMessageDto message)
    {
        var messageId = Guid.NewGuid().ToString();
        var conversationId = await GetOrCreateConversationIdAsync(
            senderId, senderType, message.ReceiverId, message.ReceiverType);

        using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var sql = @"
            INSERT INTO messages (
                Id, ConversationId, SendById, SendByType, ReceiverId, ReceiverType,
                Subject, Content, AttachmentUrl, IsRead, CreatedDate, IsDeleted
            ) VALUES (
                @Id, @ConversationId, @SendById, @SendByType, @ReceiverId, @ReceiverType,
                @Subject, @Content, @AttachmentUrl, @IsRead, @CreatedDate, @IsDeleted
            )";

        using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("Id", messageId);
        command.Parameters.AddWithValue("ConversationId", conversationId);
        command.Parameters.AddWithValue("SendById", senderId);
        command.Parameters.AddWithValue("SendByType", senderType);
        command.Parameters.AddWithValue("ReceiverId", message.ReceiverId);
        command.Parameters.AddWithValue("ReceiverType", message.ReceiverType);
        command.Parameters.AddWithValue("Subject", (object?)message.Subject ?? DBNull.Value);
        command.Parameters.AddWithValue("Content", message.Content);
        command.Parameters.AddWithValue("AttachmentUrl", (object?)message.AttachmentUrl ?? DBNull.Value);
        command.Parameters.AddWithValue("IsRead", false);
        command.Parameters.AddWithValue("CreatedDate", DateTime.UtcNow.Date);
        command.Parameters.AddWithValue("IsDeleted", false);

        await command.ExecuteNonQueryAsync();

        // Return message with proper CreatedAt timestamp
        var result = await GetMessageByIdAsync(messageId);
        result.CreatedAt = DateTime.UtcNow; // Use current timestamp for real-time messaging
        return result;
    }

    public async Task<List<MessageDto>> GetConversationMessagesAsync(
        string userId, string conversationId, int page = 1, int pageSize = 50)
    {
        using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var offset = (page - 1) * pageSize;
        var sql = @"
            SELECT m.Id, m.ConversationId, m.SendById, m.SendByType, m.ReceiverId, m.ReceiverType,
                   m.Subject, m.Content, m.AttachmentUrl, m.IsRead, m.ReadAt, 
                   COALESCE(m.CreatedDate::timestamp, CURRENT_TIMESTAMP) as CreatedAt
            FROM messages m
            WHERE m.ConversationId = @ConversationId 
              AND m.IsDeleted = false
              AND (m.SendById = @UserId OR m.ReceiverId = @UserId)
            ORDER BY CreatedAt DESC
            LIMIT @PageSize OFFSET @Offset";

        using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("ConversationId", conversationId);
        command.Parameters.AddWithValue("UserId", userId);
        command.Parameters.AddWithValue("PageSize", pageSize);
        command.Parameters.AddWithValue("Offset", offset);

        var messages = new List<MessageDto>();
        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var message = new MessageDto
            {
                Id = reader.GetString(0),
                ConversationId = reader.GetString(1),
                SendById = reader.GetString(2),
                SendByType = reader.GetString(3),
                ReceiverId = reader.GetString(4),
                ReceiverType = reader.GetString(5),
                Subject = reader.IsDBNull(6) ? null : reader.GetString(6),
                Content = reader.GetString(7),
                AttachmentUrl = reader.IsDBNull(8) ? null : reader.GetString(8),
                IsRead = reader.GetBoolean(9),
                ReadAt = reader.IsDBNull(10) ? null : reader.GetDateTime(10),
                CreatedAt = reader.GetDateTime(11)
            };

            // Get sender name
            message.SendByName = await GetUserNameAsync(message.SendById, message.SendByType);
            message.SendByAvatar = await GetUserAvatarAsync(message.SendById, message.SendByType);

            messages.Add(message);
        }

        return messages.OrderBy(m => m.CreatedAt).ToList();
    }

    public async Task<List<ConversationDto>> GetUserConversationsAsync(string userId, string userType)
    {
        using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var sql = @"
            SELECT DISTINCT 
                m.ConversationId,
                CASE 
                    WHEN m.SendById = @UserId THEN m.ReceiverId
                    ELSE m.SendById
                END as OtherUserId,
                CASE 
                    WHEN m.SendById = @UserId THEN m.ReceiverType
                    ELSE m.SendByType
                END as OtherUserType,
                MAX(COALESCE(m.CreatedDate::timestamp, CURRENT_TIMESTAMP)) as LastMessageAt
            FROM messages m
            WHERE (m.SendById = @UserId OR m.ReceiverId = @UserId)
              AND m.IsDeleted = false
            GROUP BY m.ConversationId, OtherUserId, OtherUserType
            ORDER BY LastMessageAt DESC";

        using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("UserId", userId);

        var conversations = new List<ConversationDto>();
        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var conversationId = reader.GetString(0);
            var otherUserId = reader.GetString(1);
            var otherUserType = reader.GetString(2);
            var lastMessageAt = reader.IsDBNull(3) ? null : (DateTime?)reader.GetDateTime(3);

            // Get last message
            var lastMessage = await GetLastMessageAsync(conversationId);
            
            // Get unread count
            var unreadCount = await GetUnreadCountForConversationAsync(userId, conversationId);

            // Get other user info
            var otherUserName = await GetUserNameAsync(otherUserId, otherUserType);
            var otherUserAvatar = await GetUserAvatarAsync(otherUserId, otherUserType);

            conversations.Add(new ConversationDto
            {
                ConversationId = conversationId,
                OtherUserId = otherUserId,
                OtherUserType = otherUserType,
                OtherUserName = otherUserName,
                OtherUserAvatar = otherUserAvatar,
                LastMessage = lastMessage,
                LastMessageAt = lastMessageAt,
                UnreadCount = unreadCount,
                IsOnline = false // TODO: Implement online status tracking
            });
        }

        return conversations;
    }

    public async Task MarkMessagesAsReadAsync(string userId, List<string> messageIds)
    {
        if (messageIds == null || messageIds.Count == 0)
            return;

        using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var sql = @"
            UPDATE messages 
            SET IsRead = true, ReadAt = CURRENT_TIMESTAMP
            WHERE Id = ANY(@MessageIds) 
              AND ReceiverId = @UserId
              AND IsRead = false";

        using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("MessageIds", messageIds.ToArray());
        command.Parameters.AddWithValue("UserId", userId);

        await command.ExecuteNonQueryAsync();
    }

    public async Task<int> GetUnreadCountAsync(string userId)
    {
        using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var sql = @"
            SELECT COUNT(*) 
            FROM messages 
            WHERE ReceiverId = @UserId 
              AND IsRead = false 
              AND IsDeleted = false";

        using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("UserId", userId);

        var result = await command.ExecuteScalarAsync();
        return Convert.ToInt32(result ?? 0);
    }

    public async Task<string> GetOrCreateConversationIdAsync(
        string userId1, string userType1, string userId2, string userType2)
    {
        // Generate consistent conversation ID
        var ids = new[] { userId1, userId2 }.OrderBy(x => x).ToArray();
        var types = new[] { userType1, userType2 }.OrderBy(x => x).ToArray();
        var conversationId = $"conv_{ids[0]}_{ids[1]}_{types[0]}_{types[1]}";

        // Check if conversation exists
        using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var checkSql = @"
            SELECT DISTINCT ConversationId 
            FROM messages 
            WHERE ConversationId = @ConversationId 
            LIMIT 1";

        using var checkCommand = new NpgsqlCommand(checkSql, connection);
        checkCommand.Parameters.AddWithValue("ConversationId", conversationId);

        var existing = await checkCommand.ExecuteScalarAsync();
        if (existing != null)
            return conversationId;

        // Conversation will be created when first message is sent
        return conversationId;
    }

    public async Task<List<MessageDto>> SearchMessagesAsync(string userId, string conversationId, string searchQuery)
    {
        if (string.IsNullOrWhiteSpace(searchQuery))
        {
            return new List<MessageDto>();
        }

        using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var sql = @"
            SELECT m.Id, m.ConversationId, m.SendById, m.SendByType, m.ReceiverId, m.ReceiverType,
                   m.Subject, m.Content, m.AttachmentUrl, m.IsRead, m.ReadAt, 
                   COALESCE(m.CreatedDate::timestamp, CURRENT_TIMESTAMP) as CreatedAt
            FROM messages m
            WHERE m.ConversationId = @ConversationId 
              AND m.IsDeleted = false
              AND (m.SendById = @UserId OR m.ReceiverId = @UserId)
              AND (LOWER(m.Content) LIKE LOWER(@SearchQuery) OR LOWER(m.Subject) LIKE LOWER(@SearchQuery))
            ORDER BY CreatedAt DESC
            LIMIT 100";

        using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("ConversationId", conversationId);
        command.Parameters.AddWithValue("UserId", userId);
        command.Parameters.AddWithValue("SearchQuery", $"%{searchQuery}%");

        var messages = new List<MessageDto>();
        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var message = new MessageDto
            {
                Id = reader.GetString(0),
                ConversationId = reader.GetString(1),
                SendById = reader.GetString(2),
                SendByType = reader.GetString(3),
                ReceiverId = reader.GetString(4),
                ReceiverType = reader.GetString(5),
                Subject = reader.IsDBNull(6) ? null : reader.GetString(6),
                Content = reader.GetString(7),
                AttachmentUrl = reader.IsDBNull(8) ? null : reader.GetString(8),
                IsRead = reader.GetBoolean(9),
                ReadAt = reader.IsDBNull(10) ? null : reader.GetDateTime(10),
                CreatedAt = reader.GetDateTime(11)
            };

            // Get sender name
            message.SendByName = await GetUserNameAsync(message.SendById, message.SendByType);
            message.SendByAvatar = await GetUserAvatarAsync(message.SendById, message.SendByType);

            messages.Add(message);
        }

        return messages.OrderBy(m => m.CreatedAt).ToList();
    }

    private async Task<MessageDto> GetMessageByIdAsync(string messageId)
    {
        using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var sql = @"
            SELECT Id, ConversationId, SendById, SendByType, ReceiverId, ReceiverType,
                   Subject, Content, AttachmentUrl, IsRead, ReadAt, 
                   COALESCE(CreatedDate::timestamp, CURRENT_TIMESTAMP) as CreatedAt
            FROM messages
            WHERE Id = @Id";

        using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("Id", messageId);

        using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            throw new InvalidOperationException("Message not found");

        var createdAtValue = reader.IsDBNull(11) ? DateTime.UtcNow : reader.GetDateTime(11);
        var message = new MessageDto
        {
            Id = reader.GetString(0),
            ConversationId = reader.GetString(1),
            SendById = reader.GetString(2),
            SendByType = reader.GetString(3),
            ReceiverId = reader.GetString(4),
            ReceiverType = reader.GetString(5),
            Subject = reader.IsDBNull(6) ? null : reader.GetString(6),
            Content = reader.GetString(7),
            AttachmentUrl = reader.IsDBNull(8) ? null : reader.GetString(8),
            IsRead = reader.GetBoolean(9),
            ReadAt = reader.IsDBNull(10) ? null : reader.GetDateTime(10),
            CreatedAt = createdAtValue
        };

        message.SendByName = await GetUserNameAsync(message.SendById, message.SendByType);
        message.SendByAvatar = await GetUserAvatarAsync(message.SendById, message.SendByType);

        return message;
    }

    private async Task<string> GetUserNameAsync(string userId, string userType)
    {
        using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        string sql;
        if (userType == "Doctor")
        {
            sql = "SELECT COALESCE(FirstName || ' ' || LastName, Email) FROM doctors WHERE Id = @Id";
        }
        else
        {
            sql = "SELECT COALESCE(FirstName || ' ' || LastName, Email) FROM users WHERE Id = @Id";
        }

        using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("Id", userId);

        var result = await command.ExecuteScalarAsync();
        return result?.ToString() ?? "Unknown";
    }

    private async Task<string?> GetUserAvatarAsync(string userId, string userType)
    {
        using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        string sql;
        if (userType == "Doctor")
        {
            sql = "SELECT ProfileImageUrl FROM doctors WHERE Id = @Id";
        }
        else
        {
            sql = "SELECT ProfileImageUrl FROM users WHERE Id = @Id";
        }

        using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("Id", userId);

        var result = await command.ExecuteScalarAsync();
        return result?.ToString();
    }

    private async Task<string?> GetLastMessageAsync(string conversationId)
    {
        using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var sql = @"
            SELECT Content 
            FROM messages 
            WHERE ConversationId = @ConversationId 
              AND IsDeleted = false
            ORDER BY COALESCE(CreatedDate::timestamp, CURRENT_TIMESTAMP) DESC 
            LIMIT 1";

        using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("ConversationId", conversationId);

        var result = await command.ExecuteScalarAsync();
        return result?.ToString();
    }

    private async Task<int> GetUnreadCountForConversationAsync(string userId, string conversationId)
    {
        using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var sql = @"
            SELECT COUNT(*) 
            FROM messages 
            WHERE ConversationId = @ConversationId 
              AND ReceiverId = @UserId 
              AND IsRead = false 
              AND IsDeleted = false";

        using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("ConversationId", conversationId);
        command.Parameters.AddWithValue("UserId", userId);

        var result = await command.ExecuteScalarAsync();
        return Convert.ToInt32(result ?? 0);
    }
}

