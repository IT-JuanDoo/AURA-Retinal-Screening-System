import * as signalR from "@microsoft/signalr";
import { Message } from "./messageService";

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Initialize SignalR connection
   */
  async connect(token?: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    // Get token from localStorage if not provided
    const authToken = token || localStorage.getItem("token");
    if (!authToken) {
      throw new Error("No authentication token available");
    }

    // In Docker, VITE_API_URL is /api, so SignalR should use /hubs/chat (not /api/hubs/chat)
    // SignalR hub is proxied separately through nginx at /hubs
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const hubUrl = apiUrl.startsWith("/")
      ? `${window.location.origin}/hubs/chat` // Use relative path for Docker
      : `${apiUrl}/hubs/chat`; // Use full URL for local dev

    // SignalR: accessTokenFactory automatically adds token to:
    // 1. Authorization header (for negotiation and LongPolling)
    // 2. Query string as access_token (for WebSocket, handled by backend OnMessageReceived)
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => {
          // Return token - SignalR will add it to Authorization header and query string
          return authToken;
        },
        skipNegotiation: false,
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext: signalR.RetryContext) => {
          if (retryContext.previousRetryCount < this.maxReconnectAttempts) {
            return Math.min(
              1000 * Math.pow(2, retryContext.previousRetryCount),
              30000
            );
          }
          return null;
        },
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Connection event handlers
    this.connection.onclose((error?: Error) => {
      this.reconnectAttempts++;
    });

    this.connection.onreconnecting((error?: Error) => {
      // Reconnecting...
    });

    this.connection.onreconnected((connectionId?: string) => {
      this.reconnectAttempts = 0;
    });

    try {
      await this.connection.start();
      this.reconnectAttempts = 0;
    } catch (error: any) {
      
      // Provide more detailed error message
      let errorMessage = "Không thể kết nối chat";
      if (error?.message) {
        if (error.message.includes("401") || error.message.includes("Unauthorized")) {
          errorMessage = "Lỗi xác thực. Vui lòng đăng nhập lại.";
        } else if (error.message.includes("404") || error.message.includes("Not Found")) {
          errorMessage = "Không tìm thấy dịch vụ chat. Vui lòng kiểm tra kết nối.";
        } else if (error.message.includes("Failed to start")) {
          errorMessage = "Không thể khởi động kết nối chat. Vui lòng thử lại.";
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Disconnect SignalR
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }

  /**
   * Join a conversation
   */
  async joinConversation(conversationId: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke("JoinConversation", conversationId);
    }
  }

  /**
   * Leave a conversation
   */
  async leaveConversation(conversationId: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke("LeaveConversation", conversationId);
    }
  }

  /**
   * Send typing indicator
   */
  async sendTyping(conversationId: string, isTyping: boolean): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke("SendTyping", conversationId, isTyping);
    }
  }

  /**
   * Mark message as read
   */
  async markMessageRead(
    conversationId: string,
    messageId: string
  ): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke(
        "MarkMessageRead",
        conversationId,
        messageId
      );
    }
  }

  /**
   * Subscribe to receive messages
   */
  onReceiveMessage(callback: (message: Message) => void): void {
    if (this.connection) {
      this.connection.on("ReceiveMessage", callback);
    }
  }

  /**
   * Subscribe to message read events
   */
  onMessageRead(
    callback: (data: {
      messageId: string;
      readBy: string;
      readAt: string;
    }) => void
  ): void {
    if (this.connection) {
      this.connection.on("MessageRead", callback);
    }
  }

  /**
   * Subscribe to typing indicators
   */
  onUserTyping(
    callback: (data: { userId: string; isTyping: boolean }) => void
  ): void {
    if (this.connection) {
      this.connection.on("UserTyping", callback);
    }
  }

  /**
   * Subscribe to errors
   */
  onError(callback: (error: string) => void): void {
    if (this.connection) {
      this.connection.on("Error", callback);
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    if (this.connection) {
      this.connection.off("ReceiveMessage");
      this.connection.off("MessageRead");
      this.connection.off("UserTyping");
      this.connection.off("Error");
    }
  }

  /**
   * Get connection state
   */
  getState(): signalR.HubConnectionState | null {
    return this.connection?.state ?? null;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }
}

export const signalRService = new SignalRService();
export default signalRService;
