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

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const hubUrl = `${apiUrl}/hubs/chat`;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => authToken,
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount < this.maxReconnectAttempts) {
            return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
          }
          return null;
        },
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Connection event handlers
    this.connection.onclose((error) => {
      console.log("SignalR connection closed", error);
      this.reconnectAttempts++;
    });

    this.connection.onreconnecting((error) => {
      console.log("SignalR reconnecting...", error);
    });

    this.connection.onreconnected((connectionId) => {
      console.log("SignalR reconnected", connectionId);
      this.reconnectAttempts = 0;
    });

    try {
      await this.connection.start();
      console.log("SignalR connected");
    } catch (error) {
      console.error("SignalR connection error:", error);
      throw error;
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
  async markMessageRead(conversationId: string, messageId: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke("MarkMessageRead", conversationId, messageId);
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
  onMessageRead(callback: (data: { messageId: string; readBy: string; readAt: string }) => void): void {
    if (this.connection) {
      this.connection.on("MessageRead", callback);
    }
  }

  /**
   * Subscribe to typing indicators
   */
  onUserTyping(callback: (data: { userId: string; isTyping: boolean }) => void): void {
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

