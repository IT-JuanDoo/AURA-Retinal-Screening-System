import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../store/authStore";
import { Link, useLocation } from "react-router-dom";
import messageService, { Message, Conversation, CreateMessage } from "../../services/messageService";
import signalRService from "../../services/signalRService";
import toast from "react-hot-toast";

const ChatPage = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize SignalR connection
  useEffect(() => {
    const initSignalR = async () => {
      if (!user) {
        console.log("Chat: No user, skipping SignalR connection");
        return;
      }

      // Check if token exists - wait a bit for auth to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("Chat: No token found in localStorage");
        // Don't show error immediately, might be loading
        return;
      }

      try {
        console.log("Chat: Connecting to SignalR...");
        await signalRService.connect(token);
        console.log("Chat: SignalR connected successfully");
        
        // Set up message listeners
        signalRService.onReceiveMessage((message: Message) => {
          if (selectedConversation?.conversationId === message.conversationId) {
            setMessages((prev) => [...prev, message]);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          }
          loadConversations();
          loadUnreadCount();
        });

        signalRService.onMessageRead((data) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === data.messageId
                ? { ...msg, isRead: true, readAt: data.readAt }
                : msg
            )
          );
        });

        signalRService.onUserTyping((data) => {
          setOtherUserTyping(data.isTyping);
        });

        signalRService.onError((error) => {
          console.error("Chat: SignalR error:", error);
          toast.error(`Chat error: ${error}`);
        });
      } catch (error: any) {
        console.error("Chat: Failed to connect to SignalR:", error);
        const errorMessage = error?.message || "Không thể kết nối chat. Vui lòng thử lại.";
        
        // Only show error if it's not a token issue (might be temporary)
        if (!errorMessage.includes("No authentication token")) {
          toast.error(errorMessage);
        }
        
        // If authentication error, suggest login
        if (errorMessage.includes("xác thực") || errorMessage.includes("đăng nhập") || errorMessage.includes("Unauthorized")) {
          setTimeout(() => {
            if (window.confirm("Phiên đăng nhập đã hết hạn. Bạn có muốn đăng nhập lại không?")) {
              window.location.href = "/login";
            }
          }, 2000);
        }
      }
    };

    // Delay initialization to ensure auth is ready
    const timer = setTimeout(() => {
      initSignalR();
    }, 1000);

    return () => {
      clearTimeout(timer);
      signalRService.removeAllListeners();
      if (selectedConversation) {
        signalRService.leaveConversation(selectedConversation.conversationId);
      }
    };
  }, [user]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [newMessage]);

  const loadConversations = async () => {
    try {
      const convs = await messageService.getConversations();
      setConversations(convs);
    } catch (error: any) {
      console.error("Failed to load conversations:", error);
      // Only show error if it's not a 404 (might be backend not ready)
      if (error?.response?.status !== 404) {
        toast.error("Không thể tải danh sách cuộc trò chuyện");
      }
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await messageService.getUnreadCount();
      setUnreadCount(count);
    } catch (error: any) {
      console.error("Failed to load unread count:", error);
      // Only show error if it's not a 404 (might be backend not ready)
      if (error?.response?.status !== 404) {
        // Silently fail for unread count
      }
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const msgs = await messageService.getConversationMessages(conversationId);
      setMessages(msgs);
      
      const unreadIds = msgs.filter((m) => !m.isRead && m.receiverId === user?.id).map((m) => m.id);
      if (unreadIds.length > 0) {
        await messageService.markAsRead(unreadIds);
        signalRService.markMessageRead(conversationId, unreadIds[0]);
      }
      
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (error) {
      console.error("Failed to load messages:", error);
      toast.error("Không thể tải tin nhắn");
    }
  };

  // Search messages in conversation
  const handleSearchMessages = async (query: string) => {
    if (!selectedConversation || !query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await messageService.searchMessages(selectedConversation.conversationId, query);
      setSearchResults(results);
      
      // Highlight first result
      if (results.length > 0) {
        setHighlightedMessageId(results[0].id);
        // Scroll to first result
        setTimeout(() => {
          const element = document.getElementById(`message-${results[0].id}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      }
    } catch (error) {
      console.error("Failed to search messages:", error);
      toast.error("Không thể tìm kiếm tin nhắn");
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (messageSearchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearchMessages(messageSearchQuery);
      }, 500);
    } else {
      setSearchResults([]);
      setHighlightedMessageId(null);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [messageSearchQuery, selectedConversation]);

  const handleSelectConversation = async (conversation: Conversation) => {
    if (selectedConversation) {
      await signalRService.leaveConversation(selectedConversation.conversationId);
    }
    
    setSelectedConversation(conversation);
    await signalRService.joinConversation(conversation.conversationId);
    await loadMessages(conversation.conversationId);
    loadUnreadCount();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    try {
      const messageData: CreateMessage = {
        receiverId: selectedConversation.otherUserId,
        receiverType: selectedConversation.otherUserType,
        content: newMessage.trim(),
      };

      await messageService.sendMessage(messageData);
      setNewMessage("");
      setIsTyping(false);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Gửi tin nhắn thất bại");
    }
  };

  const handleTyping = () => {
    if (!selectedConversation) return;

    if (!isTyping) {
      setIsTyping(true);
      signalRService.sendTyping(selectedConversation.conversationId, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      signalRService.sendTyping(selectedConversation.conversationId, false);
    }, 1000);
  };

  useEffect(() => {
    loadConversations();
    loadUnreadCount();
  }, [location.pathname]); // Reload when route changes

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = date.getHours();
    const minutesInHour = date.getMinutes();

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    if (date.toDateString() === now.toDateString()) {
      return `${hours.toString().padStart(2, "0")}:${minutesInHour.toString().padStart(2, "0")}`;
    }
    if (minutes < 1440) return "Hôm qua";
    return date.toLocaleDateString("vi-VN");
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.otherUserName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-600 dark:text-slate-400">Vui lòng đăng nhập để sử dụng chat</p>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-8 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">ophthalmology</span>
          </div>
          <h2 className="text-slate-900 dark:text-white text-xl font-bold">AURA</h2>
        </div>
        <div className="flex flex-1 justify-end gap-8">
          <nav className="flex items-center gap-6 hidden md:flex">
            <Link to="/dashboard" className="text-slate-600 dark:text-slate-400 hover:text-primary font-medium text-sm transition-colors">
              Trang chủ
            </Link>
            <Link to="/dashboard" className="text-slate-600 dark:text-slate-400 hover:text-primary font-medium text-sm transition-colors">
              Bệnh nhân
            </Link>
            <Link to="/chat" className="text-primary font-bold text-sm">
              Tư vấn
            </Link>
            <Link to="/dashboard" className="text-slate-600 dark:text-slate-400 hover:text-primary font-medium text-sm transition-colors">
              Báo cáo
            </Link>
          </nav>
          <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-700 pl-6">
            <button className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-full transition-colors relative">
              <span className="material-symbols-outlined">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <div className="w-9 h-9 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center ring-2 ring-primary/20">
              {user.profileImageUrl ? (
                <img src={user.profileImageUrl} alt={user.firstName} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-slate-600 dark:text-slate-300 text-sm">
                  {user.firstName?.charAt(0).toUpperCase() || "U"}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Conversation List */}
        <aside className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tin nhắn</h2>
              <button className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors">
                <span className="material-symbols-outlined text-xl">edit_square</span>
              </button>
            </div>
            {/* Search Bar */}
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border-none rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                placeholder="Tìm kiếm bệnh nhân..."
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                {searchQuery ? "Không tìm thấy" : "Chưa có cuộc trò chuyện nào"}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = selectedConversation?.conversationId === conv.conversationId;
                const isUnread = conv.unreadCount > 0;
                
                return (
                  <div
                    key={conv.conversationId}
                    onClick={() => handleSelectConversation(conv)}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-l-4 ${
                      isActive
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                        {conv.otherUserAvatar ? (
                          <img
                            src={conv.otherUserAvatar}
                            alt={conv.otherUserName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-slate-600 dark:text-slate-300">
                            {conv.otherUserName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {conv.isOnline && (
                        <span className="absolute bottom-0 right-0 block w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-900 bg-green-500"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <p className={`text-sm truncate ${isUnread ? "font-bold" : "font-medium"} text-slate-900 dark:text-white`}>
                          {conv.otherUserName}
                        </p>
                        {conv.lastMessageAt && (
                          <span className={`text-xs ${isUnread ? "text-primary font-bold" : "text-slate-400"}`}>
                            {formatTime(conv.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm truncate ${isUnread ? "font-bold text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                        {conv.lastMessage || "Chưa có tin nhắn"}
                      </p>
                    </div>
                    {isUnread && (
                      <div className="shrink-0 w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Center: Chat Area */}
        <main className="flex-1 flex flex-col bg-background-light dark:bg-background-dark relative">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="flex flex-col bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {selectedConversation.otherUserName}
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold uppercase tracking-wide">
                          {selectedConversation.otherUserType === "Doctor" ? "Bác sĩ" : "Bệnh nhân"}
                        </span>
                      </h3>
                      {selectedConversation.isOnline && (
                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                          Đang hoạt động
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Gọi điện">
                      <span className="material-symbols-outlined">call</span>
                    </button>
                    <button className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Gọi video">
                      <span className="material-symbols-outlined">videocam</span>
                    </button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <button className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </div>
                </div>
                
                {/* Message Search Bar */}
                <div className="px-6 pb-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-slate-400 text-[18px]">
                        {isSearching ? "hourglass_empty" : "search"}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                      placeholder="Tìm kiếm trong cuộc trò chuyện..."
                    />
                    {messageSearchQuery && (
                      <button
                        onClick={() => {
                          setMessageSearchQuery("");
                          setSearchResults([]);
                          setHighlightedMessageId(null);
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <span className="material-symbols-outlined text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-[18px]">
                          close
                        </span>
                      </button>
                    )}
                  </div>
                  {searchResults.length > 0 && (
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Tìm thấy {searchResults.length} kết quả
                    </div>
                  )}
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-[#131d27]">
                {/* Today Divider */}
                {messages.length > 0 && (
                  <div className="flex justify-center">
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                      Hôm nay, {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                )}

                {(messageSearchQuery ? searchResults : messages).map((message) => {
                  const isOwn = message.sendById === user.id;
                  const isHighlighted = highlightedMessageId === message.id;
                  const searchMatch = messageSearchQuery 
                    ? message.content.toLowerCase().includes(messageSearchQuery.toLowerCase())
                    : false;
                  
                  return (
                    <div
                      id={`message-${message.id}`}
                      key={message.id}
                      className={`flex gap-4 max-w-[80%] group ${isOwn ? "ml-auto flex-row-reverse" : ""} ${
                        isHighlighted ? "animate-pulse" : ""
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center shrink-0 self-end mb-1 overflow-hidden">
                        {isOwn ? (
                          user.profileImageUrl ? (
                            <img src={user.profileImageUrl} alt={user.firstName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-slate-600 dark:text-slate-300 text-xs">
                              {user.firstName?.charAt(0).toUpperCase() || "U"}
                            </span>
                          )
                        ) : (
                          selectedConversation.otherUserAvatar ? (
                            <img
                              src={selectedConversation.otherUserAvatar}
                              alt={selectedConversation.otherUserName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-slate-600 dark:text-slate-300 text-xs">
                              {selectedConversation.otherUserName.charAt(0).toUpperCase()}
                            </span>
                          )
                        )}
                      </div>

                      {/* Message Content */}
                      <div className={`flex flex-col gap-1 ${isOwn ? "items-end" : ""}`}>
                        <div
                          className={`p-4 rounded-2xl shadow-sm ${
                            isOwn
                              ? "rounded-br-none bg-primary text-white shadow-primary/20"
                              : "rounded-bl-none bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
                          } ${isHighlighted ? "ring-2 ring-primary ring-offset-2" : ""}`}
                        >
                          {message.attachmentUrl && (
                            <div className="mb-3 flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group/file">
                              <div className="bg-red-100 dark:bg-red-900/30 text-red-600 p-2 rounded-lg shrink-0">
                                <span className="material-symbols-outlined">picture_as_pdf</span>
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                  {message.attachmentUrl.split("/").pop()}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatMessageTime(message.createdAt)}
                                </span>
                              </div>
                              <div className="ml-auto opacity-0 group-hover/file:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-slate-400">download</span>
                              </div>
                            </div>
                          )}
                          <p className={`text-sm leading-relaxed ${isOwn ? "" : "text-slate-700 dark:text-slate-200"}`}>
                            {searchMatch && messageSearchQuery ? (
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: message.content.replace(
                                    new RegExp(`(${messageSearchQuery})`, "gi"),
                                    '<mark class="bg-yellow-300 dark:bg-yellow-600">$1</mark>'
                                  ),
                                }}
                              />
                            ) : (
                              message.content
                            )}
                          </p>
                        </div>
                        <span className={`text-[10px] text-slate-400 mr-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? "" : "ml-1"}`}>
                          {isOwn
                            ? message.isRead
                              ? `Đã xem ${formatMessageTime(message.readAt || message.createdAt)}`
                              : "Đã gửi"
                            : formatMessageTime(message.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Typing Indicator */}
                {otherUserTyping && (
                  <div className="flex gap-4 max-w-[80%]">
                    <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      {selectedConversation.otherUserAvatar ? (
                        <img
                          src={selectedConversation.otherUserAvatar}
                          alt={selectedConversation.otherUserName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-slate-600 dark:text-slate-300 text-xs">
                          {selectedConversation.otherUserName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="p-4 rounded-2xl rounded-bl-none bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {selectedConversation.otherUserName} đang nhập...
                      </p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-end gap-3 max-w-4xl mx-auto">
                  <button className="p-3 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0">
                    <span className="material-symbols-outlined text-[24px]">add_circle</span>
                  </button>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center p-2 border border-transparent focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                    <textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="w-full bg-transparent border-none text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:ring-0 resize-none max-h-32 py-2 px-3"
                      placeholder="Nhập tin nhắn tư vấn..."
                      rows={1}
                    />
                    <div className="flex items-center gap-1 pr-2">
                      <button className="p-1.5 text-slate-400 hover:text-primary rounded-full transition-colors">
                        <span className="material-symbols-outlined text-[20px]">image</span>
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-primary rounded-full transition-colors">
                        <span className="material-symbols-outlined text-[20px]">sentiment_satisfied</span>
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="p-3 bg-primary hover:bg-blue-600 text-white rounded-full shadow-lg shadow-blue-500/30 transition-all shrink-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  </button>
                </div>
                <div className="text-center mt-2">
                  <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">lock</span>
                    Tin nhắn được bảo mật End-to-End theo tiêu chuẩn HIPAA.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">chat_bubble_outline</span>
                <p className="text-slate-500 dark:text-slate-400">Chọn một cuộc trò chuyện để bắt đầu</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e2e8f0;
          border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
        }
      `}</style>
    </div>
  );
};

export default ChatPage;
