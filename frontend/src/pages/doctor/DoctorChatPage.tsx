import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../store/authStore";
import { useLocation, useSearchParams } from "react-router-dom";
import messageService, { Message, Conversation, CreateMessage } from "../../services/messageService";
import signalRService from "../../services/signalRService";
import toast from "react-hot-toast";
import DoctorHeader from "../../components/doctor/DoctorHeader";
import doctorService from "../../services/doctorService";

const DoctorChatPage = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [patients, setPatients] = useState<Array<{userId: string; firstName?: string; lastName?: string; email: string; profileImageUrl?: string}>>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle patient query parameter to start new conversation
  useEffect(() => {
    const patientId = searchParams.get('patient');
    if (patientId && conversations.length > 0) {
      // Check if there's already a conversation with this patient
      const existingConv = conversations.find(c => c.otherUserId === patientId);
      if (existingConv) {
        handleSelectConversation(existingConv);
      }
    }
  }, [searchParams, conversations]);

  // Initialize SignalR connection
  useEffect(() => {
    const initSignalR = async () => {
      if (!user) {
        setConnectionStatus('disconnected');
        return;
      }

      // Check if token exists
      const token = localStorage.getItem("token");
      if (!token) {
        setConnectionStatus('error');
        return;
      }

      try {
        setConnectionStatus('connecting');
        await signalRService.connect(token);
        setConnectionStatus('connected');
        
        // Set up message listeners
        signalRService.onReceiveMessage((message: Message) => {
          if (selectedConversation?.conversationId === message.conversationId) {
            setMessages((prev) => [...prev, message]);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          }
          loadConversations();
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
          toast.error(`Lỗi chat: ${error}`);
        });
      } catch (error: any) {
        setConnectionStatus('error');
        const errorMessage = error?.message || "Không thể kết nối chat. Vui lòng thử lại.";
        toast.error(errorMessage);
      }
    };

    // Delay initialization to ensure auth is ready
    const timer = setTimeout(() => {
      initSignalR();
    }, 500);

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
      setLoading(true);
      const convs = await messageService.getConversations();
      setConversations(convs);
    } catch (error: any) {
      // Failed to load conversations
      if (error?.response?.status !== 404) {
        toast.error("Không thể tải danh sách cuộc trò chuyện");
      }
    } finally {
      setLoading(false);
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
      // Failed to load messages
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
      
      if (results.length > 0) {
        setHighlightedMessageId(results[0].id);
        setTimeout(() => {
          const element = document.getElementById(`message-${results[0].id}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      }
    } catch (error) {
      // Failed to search messages
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
    setMessageSearchQuery("");
    setSearchResults([]);
    setHighlightedMessageId(null);
    
    if (signalRService.isConnected()) {
      await signalRService.joinConversation(conversation.conversationId);
    }
    await loadMessages(conversation.conversationId);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    try {
      const messageData: CreateMessage = {
        receiverId: selectedConversation.otherUserId,
        receiverType: selectedConversation.otherUserType,
        content: newMessage.trim(),
      };

      const sentMessage = await messageService.sendMessage(messageData);
      
      // Add message to local state immediately for better UX
      setMessages((prev) => [...prev, sentMessage]);
      setNewMessage("");
      setIsTyping(false);
      
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Reload conversations to update last message
      loadConversations();
    } catch (error: any) {
      // Failed to send message
      toast.error(error?.response?.data?.message || "Gửi tin nhắn thất bại");
    }
  };

  const handleTyping = () => {
    if (!selectedConversation || !signalRService.isConnected()) return;

    if (!isTyping) {
      setIsTyping(true);
      signalRService.sendTyping(selectedConversation.conversationId, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (signalRService.isConnected()) {
        signalRService.sendTyping(selectedConversation.conversationId, false);
      }
    }, 1000);
  };

  const handleRetryConnection = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        setConnectionStatus('connecting');
        await signalRService.connect(token);
        setConnectionStatus('connected');
        toast.success("Đã kết nối lại chat thành công!");
      } catch (error) {
        setConnectionStatus('error');
        toast.error("Không thể kết nối lại. Vui lòng tải lại trang.");
      }
    }
  };

  useEffect(() => {
    loadConversations();
  }, [location.pathname]);

  // Load patients for new chat modal
  const loadPatients = async () => {
    setLoadingPatients(true);
    try {
      // Try to get assigned patients first
      let data = await doctorService.getPatients(true);
      
      // If no assigned patients, get patients from analyses
      if (data.length === 0) {
        const analysesData = await doctorService.getAnalyses();
        // Extract unique patients from analyses
        const patientMap = new Map<string, {userId: string; firstName?: string; lastName?: string; email: string; profileImageUrl?: string}>();
        analysesData.forEach((analysis: any) => {
          if (analysis.patientUserId && !patientMap.has(analysis.patientUserId)) {
            patientMap.set(analysis.patientUserId, {
              userId: analysis.patientUserId,
              firstName: analysis.patientName?.split(' ')[0],
              lastName: analysis.patientName?.split(' ').slice(1).join(' '),
              email: analysis.patientName || analysis.patientUserId,
              profileImageUrl: undefined
            });
          }
        });
        data = Array.from(patientMap.values());
      }
      
      setPatients(data);
    } catch (error) {
      // Failed to load patients
      toast.error('Không thể tải danh sách bệnh nhân');
    } finally {
      setLoadingPatients(false);
    }
  };

  // Start new conversation with a patient
  const handleStartNewChat = async (patientId: string, patientName: string) => {
    try {
      // Check if conversation already exists
      const existingConv = conversations.find(c => c.otherUserId === patientId);
      if (existingConv) {
        await handleSelectConversation(existingConv);
        setShowNewChatModal(false);
        return;
      }

      // Create new conversation with initial greeting
      toast.loading('Đang tạo cuộc trò chuyện...', { id: 'new-chat' });
      await messageService.startConversation(
        patientId,
        'User',
        `Xin chào ${patientName}, tôi là bác sĩ. Tôi có thể giúp gì cho bạn?`
      );
      
      toast.success('Đã tạo cuộc trò chuyện mới', { id: 'new-chat' });
      setShowNewChatModal(false);
      
      // Reload conversations - the new one will appear in the list
      await loadConversations();
    } catch (error) {
      // Failed to start new chat
      toast.error('Không thể tạo cuộc trò chuyện mới', { id: 'new-chat' });
    }
  };

  // Open new chat modal
  const handleOpenNewChatModal = () => {
    setShowNewChatModal(true);
    if (patients.length === 0) {
      loadPatients();
    }
  };

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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <DoctorHeader />
        <div className="flex items-center justify-center py-20">
          <p className="text-slate-600 dark:text-slate-400">Vui lòng đăng nhập để sử dụng chat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950">
      <DoctorHeader />

      {/* Connection Status Banner */}
      {connectionStatus !== 'connected' && (
        <div className={`px-4 py-2 text-center text-sm ${
          connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
          connectionStatus === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
          'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
        }`}>
          {connectionStatus === 'connecting' && (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Đang kết nối chat...
            </span>
          )}
          {connectionStatus === 'error' && (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Không thể kết nối chat realtime.
              <button onClick={handleRetryConnection} className="underline font-medium hover:no-underline">
                Thử lại
              </button>
            </span>
          )}
          {connectionStatus === 'disconnected' && (
            <span>Chat đang offline. Tin nhắn vẫn được gửi qua API.</span>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Conversation List */}
        <aside className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tin nhắn bệnh nhân</h2>
              <div className="flex items-center gap-2">
                {connectionStatus === 'connected' && (
                  <span className="w-2 h-2 bg-green-500 rounded-full" title="Đã kết nối"></span>
                )}
                <button
                  onClick={handleOpenNewChatModal}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Tạo cuộc trò chuyện mới"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Search Bar */}
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border-none rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                placeholder="Tìm kiếm bệnh nhân..."
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-slate-500">Đang tải...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                {searchQuery ? "Không tìm thấy bệnh nhân" : "Chưa có cuộc trò chuyện nào"}
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
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500"
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
                          <span className="text-slate-600 dark:text-slate-300 font-medium">
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
                          <span className={`text-xs ${isUnread ? "text-blue-600 font-bold" : "text-slate-400"}`}>
                            {formatTime(conv.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm truncate ${isUnread ? "font-bold text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                        {conv.lastMessage || "Chưa có tin nhắn"}
                      </p>
                    </div>
                    {isUnread && (
                      <div className="shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{conv.unreadCount > 9 ? '9+' : conv.unreadCount}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Center: Chat Area */}
        <main className="flex-1 flex flex-col bg-white dark:bg-slate-900 relative">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="flex flex-col border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                      {selectedConversation.otherUserAvatar ? (
                        <img src={selectedConversation.otherUserAvatar} alt={selectedConversation.otherUserName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          {selectedConversation.otherUserName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {selectedConversation.otherUserName}
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wide">
                          Bệnh nhân
                        </span>
                      </h3>
                      {selectedConversation.isOnline ? (
                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                          Đang hoạt động
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400">Offline</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Gọi điện">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </button>
                    <button className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Xem hồ sơ bệnh nhân">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Message Search Bar */}
                <div className="px-6 pb-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      {isSearching ? (
                        <svg className="animate-spin h-4 w-4 text-slate-400" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="text"
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
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
                        <svg className="w-4 h-4 text-slate-400 hover:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
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
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-slate-950">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-slate-500 dark:text-slate-400">Chưa có tin nhắn nào</p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Bắt đầu cuộc trò chuyện với bệnh nhân</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Search No Results Message */}
                    {messageSearchQuery && searchResults.length === 0 && !isSearching && (
                      <div className="flex justify-center py-4">
                        <span className="text-sm text-slate-500 dark:text-slate-400 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-2 rounded-lg">
                          Không tìm thấy tin nhắn chứa "{messageSearchQuery}"
                        </span>
                      </div>
                    )}
                    
                    {/* Today Divider */}
                    <div className="flex justify-center">
                      <span className="text-xs font-medium text-slate-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm">
                        {new Date().toLocaleDateString("vi-VN", { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                    </div>

                    {/* Always show all messages, highlight matching ones */}
                    {messages.map((message) => {
                      const isOwn = message.sendById === user.id;
                      // Highlight if it's in search results
                      const isInSearchResults = searchResults.some(r => r.id === message.id);
                      const isHighlighted = highlightedMessageId === message.id || (messageSearchQuery && isInSearchResults);
                      const searchMatch = messageSearchQuery 
                        ? message.content.toLowerCase().includes(messageSearchQuery.toLowerCase())
                        : false;
                      
                      return (
                        <div
                          id={`message-${message.id}`}
                          key={message.id}
                          className={`flex gap-3 max-w-[75%] group ${isOwn ? "ml-auto flex-row-reverse" : ""} ${
                            isHighlighted ? "animate-pulse" : ""
                          }`}
                        >
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center shrink-0 self-end mb-1 overflow-hidden">
                            {isOwn ? (
                              user.profileImageUrl ? (
                                <img src={user.profileImageUrl} alt={user.firstName} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-slate-600 dark:text-slate-300 text-xs font-medium">
                                  {user.firstName?.charAt(0).toUpperCase() || "B"}
                                </span>
                              )
                            ) : (
                              selectedConversation.otherUserAvatar ? (
                                <img src={selectedConversation.otherUserAvatar} alt={selectedConversation.otherUserName} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-slate-600 dark:text-slate-300 text-xs font-medium">
                                  {selectedConversation.otherUserName.charAt(0).toUpperCase()}
                                </span>
                              )
                            )}
                          </div>

                          {/* Message Content */}
                          <div className={`flex flex-col gap-1 ${isOwn ? "items-end" : ""}`}>
                            <div
                              className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                                isOwn
                                  ? "rounded-br-sm bg-blue-600 text-white"
                                  : "rounded-bl-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                              } ${isHighlighted ? "ring-2 ring-yellow-400" : ""}`}
                            >
                              <p className={`text-sm leading-relaxed ${isOwn ? "" : "text-slate-700 dark:text-slate-200"}`}>
                                {searchMatch && messageSearchQuery ? (
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: message.content.replace(
                                        new RegExp(`(${messageSearchQuery})`, "gi"),
                                        '<mark class="bg-yellow-300 dark:bg-yellow-600 px-0.5 rounded">$1</mark>'
                                      ),
                                    }}
                                  />
                                ) : (
                                  message.content
                                )}
                              </p>
                            </div>
                            <span className={`text-[10px] text-slate-400 px-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                              {isOwn
                                ? message.isRead
                                  ? `Đã xem ${formatMessageTime(message.readAt || message.createdAt)}`
                                  : `Đã gửi ${formatMessageTime(message.createdAt)}`
                                : formatMessageTime(message.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Typing Indicator */}
                    {otherUserTyping && (
                      <div className="flex gap-3 max-w-[75%]">
                        <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                          {selectedConversation.otherUserAvatar ? (
                            <img src={selectedConversation.otherUserAvatar} alt={selectedConversation.otherUserName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-slate-600 dark:text-slate-300 text-xs font-medium">
                              {selectedConversation.otherUserName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-end gap-3 max-w-4xl mx-auto">
                  <button className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0" title="Đính kèm file">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center p-2 border border-transparent focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
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
                      placeholder="Nhập tin nhắn tư vấn cho bệnh nhân..."
                      rows={1}
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-500/30 transition-all shrink-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                <div className="text-center mt-2">
                  <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Tin nhắn được bảo mật theo tiêu chuẩn y tế HIPAA
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
              <div className="text-center">
                <svg className="w-20 h-20 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Chào mừng đến Tư vấn</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">Chọn một cuộc trò chuyện để bắt đầu tư vấn bệnh nhân</p>
                <button
                  onClick={handleOpenNewChatModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Tạo cuộc trò chuyện mới
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-slate-900/50 transition-opacity"
              onClick={() => setShowNewChatModal(false)}
            ></div>

            {/* Modal panel */}
            <div className="relative inline-block w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Tạo cuộc trò chuyện mới
                  </h3>
                  <button
                    onClick={() => setShowNewChatModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Chọn bệnh nhân để bắt đầu tư vấn
                </p>
              </div>

              {/* Patient list */}
              <div className="max-h-96 overflow-y-auto">
                {loadingPatients ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-sm text-slate-500">Đang tải danh sách bệnh nhân...</p>
                  </div>
                ) : patients.length === 0 ? (
                  <div className="py-12 text-center">
                    <svg className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-3-3h-4a3 3 0 00-3 3v2zM16 4a3 3 0 100 6 3 3 0 000-6z" />
                    </svg>
                    <p className="text-slate-500 dark:text-slate-400">Không có bệnh nhân nào</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {patients.map((patient) => {
                      const patientName = patient.firstName && patient.lastName 
                        ? `${patient.firstName} ${patient.lastName}` 
                        : patient.email;
                      const hasConversation = conversations.some(c => c.otherUserId === patient.userId);
                      
                      return (
                        <button
                          key={patient.userId}
                          onClick={() => handleStartNewChat(patient.userId, patientName)}
                          className="w-full flex items-center gap-3 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                        >
                          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {patient.profileImageUrl ? (
                              <img src={patient.profileImageUrl} alt={patientName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-slate-600 dark:text-slate-300 font-medium">
                                {patientName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate">{patientName}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{patient.email}</p>
                          </div>
                          {hasConversation && (
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              Đã có cuộc trò chuyện
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="w-full px-4 py-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorChatPage;
