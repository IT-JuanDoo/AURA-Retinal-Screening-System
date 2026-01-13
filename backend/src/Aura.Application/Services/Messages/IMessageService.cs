using Aura.Application.DTOs.Messages;

namespace Aura.Application.Services.Messages;

public interface IMessageService
{
    Task<MessageDto> SendMessageAsync(string senderId, string senderType, CreateMessageDto message);
    Task<List<MessageDto>> GetConversationMessagesAsync(string userId, string conversationId, int page = 1, int pageSize = 50);
    Task<List<ConversationDto>> GetUserConversationsAsync(string userId, string userType);
    Task MarkMessagesAsReadAsync(string userId, List<string> messageIds);
    Task<int> GetUnreadCountAsync(string userId);
    Task<string> GetOrCreateConversationIdAsync(string userId1, string userType1, string userId2, string userType2);
    Task<List<MessageDto>> SearchMessagesAsync(string userId, string conversationId, string searchQuery);
}

