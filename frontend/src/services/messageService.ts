import api from "./api";

export interface Message {
  id: string;
  conversationId: string;
  sendById: string;
  sendByType: string;
  sendByName: string;
  sendByAvatar?: string;
  receiverId: string;
  receiverType: string;
  subject?: string;
  content: string;
  attachmentUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface CreateMessage {
  receiverId: string;
  receiverType: string;
  subject?: string;
  content: string;
  attachmentUrl?: string;
}

export interface Conversation {
  conversationId: string;
  otherUserId: string;
  otherUserType: string;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  isOnline: boolean;
}

const messageService = {
  /**
   * Send a message
   */
  async sendMessage(message: CreateMessage): Promise<Message> {
    const response = await api.post<Message>("/messages", message);
    return response.data;
  },

  /**
   * Get messages in a conversation
   */
  async getConversationMessages(
    conversationId: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<Message[]> {
    const response = await api.get<Message[]>(
      `/messages/conversation/${conversationId}?page=${page}&pageSize=${pageSize}`
    );
    return response.data;
  },

  /**
   * Get all conversations for current user
   */
  async getConversations(): Promise<Conversation[]> {
    const response = await api.get<Conversation[]>("/messages/conversations");
    return response.data;
  },

  /**
   * Mark messages as read
   */
  async markAsRead(messageIds: string[]): Promise<void> {
    await api.post("/messages/mark-read", { messageIds });
  },

  /**
   * Get unread message count
   */
  async getUnreadCount(): Promise<number> {
    const response = await api.get<{ unreadCount: number }>(
      "/messages/unread-count"
    );
    return response.data.unreadCount;
  },

  /**
   * Search messages in a conversation (FR-20)
   */
  async searchMessages(
    conversationId: string,
    query: string
  ): Promise<Message[]> {
    const response = await api.get<Message[]>(
      `/messages/conversation/${conversationId}/search?query=${encodeURIComponent(query)}`
    );
    return response.data;
  },
};

export default messageService;

