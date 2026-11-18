import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  MessageCircle,
  Search,
  Paperclip,
  X,
  ArrowRight,
  Sparkles,
  CheckCheck,
  Smile,
} from 'lucide-react';
import type { User, DirectMessage } from '../../types';
import {
  subscribeToCommunityUsers,
  subscribeToChat,
  sendDirectMessage,
} from '../../services/messageService';
import { uploadMediaFile } from '../../services/storageService';
import { playNotificationSound } from '../../services/notificationService';

interface MessagesViewProps {
  currentUser: User;
  initialChatUser?: User | null;
  onOpenLightbox?: (url: string) => void;
  onNotify?: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  currentUser,
  initialChatUser,
  onOpenLightbox,
  onNotify,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(initialChatUser || null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showEmojiBar, setShowEmojiBar] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMsgCountRef = useRef<number>(0);

  const quickEmojis = ['👍', '❤️', '🔥', '🚀', '😂', '✨', '👏', '🎉'];

  // Sync if initialChatUser changes externally
  useEffect(() => {
    if (initialChatUser) {
      setSelectedUser(initialChatUser);
    }
  }, [initialChatUser]);

  // Subscribe to community members from Cloudflare D1
  useEffect(() => {
    const unsub = subscribeToCommunityUsers((communityList) => {
      const otherMembers = communityList.filter((u) => u.id !== currentUser.id);
      setUsers(otherMembers);
      if (!selectedUser && !initialChatUser && otherMembers.length > 0) {
        setSelectedUser(otherMembers[0]);
      }
    });
    return () => unsub();
  }, [currentUser.id]);

  // Real-time chat subscription with selected user
  useEffect(() => {
    if (!selectedUser || !currentUser.id) return;
    lastMsgCountRef.current = 0;

    const unsub = subscribeToChat(
      currentUser.id,
      selectedUser.id,
      (loadedMessages) => {
        if (
          lastMsgCountRef.current > 0 &&
          loadedMessages.length > lastMsgCountRef.current &&
          loadedMessages[loadedMessages.length - 1]?.senderId === selectedUser.id
        ) {
          playNotificationSound();
        }
        lastMsgCountRef.current = loadedMessages.length;
        setMessages(loadedMessages);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 60);
      },
      (errorMsg) => {
        if (onNotify) onNotify(errorMsg, 'error');
      }
    );
    return () => unsub();
  }, [currentUser.id, selectedUser?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !selectedFile) || !selectedUser || isSending) return;

    try {
      setIsSending(true);
      let mediaUrl: string | undefined;

      if (selectedFile) {
        const uploadRes = await uploadMediaFile(selectedFile);
        mediaUrl = uploadRes.url;
      }

      const textToSend = inputText.trim();
      setInputText('');
      removeFile();

      const sentMsg = await sendDirectMessage(currentUser, selectedUser.id, textToSend, mediaUrl);
      setMessages((prev) => [...prev.filter((m) => m.id !== sentMsg.id), sentMsg]);
      playNotificationSound();

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (err: any) {
      console.error('Failed to send direct message:', err);
      if (onNotify) onNotify(err?.message || 'تعذر إرسال الرسالة، تحقق من الاتصال', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  const q = searchTerm.toLowerCase().trim();
  const filteredUsers = users.filter((u) => {
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.email ? u.email.toLowerCase().includes(q) : false)
    );
  });

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-2 sm:px-6 py-3 h-[calc(100vh-80px)] flex flex-col">
      <div className="glass-panel flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Glowing Top Accent Bar */}
        <div className="card-accent-bar" />

        {/* =========================================================================
            LEFT COLUMN: Conversations & Contacts List (WhatsApp Style)
           ========================================================================= */}
        <aside
          className={`w-full md:w-80 lg:w-96 flex flex-col border-l border-white/10 shrink-0 ${
            selectedUser ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* List Header */}
          <div className="p-4 border-b border-white/10 space-y-3 bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-white">المحادثات المباشرة</h2>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {filteredUsers.length} أعضاء
              </span>
            </div>

            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="absolute right-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث في الأعضاء والمحادثات..."
                className="w-full bg-white/5 border border-white/10 rounded-full py-2 pr-10 pl-3 text-xs text-white placeholder-slate-400 outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Contacts / Chats Stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const isSelected = selectedUser?.id === user.id;
                return (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`p-3.5 flex items-center gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-500/15 border-r-2 border-blue-500'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-white/20 shadow"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#08090C]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-bold text-white truncate">
                          {user.name}
                        </span>
                        {user.verified && (
                          <span className="text-blue-400 text-xs font-bold">✓</span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-slate-400 truncate" dir="ltr">
                        @{user.username}
                      </div>
                      {user.bio && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {user.bio}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <p>{q ? 'لا يوجد أعضاء يطابقون بحثك' : 'لا يوجد أعضاء آخرين مسجلين بعد.'}</p>
                <p className="text-[11px] text-slate-500">
                  جميع المحادثات مشفرة وتتم مزامنتها سحابياً بسرعة فائقة.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* =========================================================================
            RIGHT COLUMN: Active Direct Messaging Room (WhatsApp Style)
           ========================================================================= */}
        <main
          className={`flex-1 flex flex-col bg-black/20 ${
            !selectedUser ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedUser ? (
            <>
              {/* Active Chat Header */}
              <div className="p-3.5 px-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="md:hidden p-1.5 rounded-full hover:bg-white/10 text-slate-300"
                    title="الرجوع للقائمة"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  <div className="relative">
                    <img
                      src={selectedUser.avatar}
                      alt={selectedUser.name}
                      className="w-10 h-10 rounded-2xl object-cover border border-white/20 shadow"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#08090C]" />
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white">
                        {selectedUser.name}
                      </span>
                      {selectedUser.verified && (
                        <span className="text-[10px] text-blue-400 font-bold">✓</span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>متصل الآن</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                    محادثة خاصة
                  </span>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {messages.length > 0 ? (
                  messages.map((msg) => {
                    const isOutgoing = msg.senderId === currentUser.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOutgoing ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-md p-3.5 text-sm transition-all ${
                            isOutgoing ? 'chat-bubble-outgoing' : 'chat-bubble-incoming'
                          }`}
                        >
                          {/* Attached Image if any */}
                          {msg.mediaUrl && (
                            <div
                              onClick={() => onOpenLightbox && onOpenLightbox(msg.mediaUrl!)}
                              className="mb-2 rounded-xl overflow-hidden border border-white/20 cursor-pointer max-h-60"
                            >
                              <img
                                src={msg.mediaUrl}
                                alt="مرفق"
                                className="w-full h-auto object-cover max-h-60 hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}

                          {/* Message Text */}
                          {msg.text && (
                            <p className="whitespace-pre-wrap leading-relaxed select-text">
                              {msg.text}
                            </p>
                          )}

                          {/* Message Metadata (Timestamp + Checkmark) */}
                          <div
                            className={`flex items-center gap-1 mt-1 text-[10px] ${
                              isOutgoing ? 'justify-end text-white/80' : 'justify-start text-slate-400'
                            }`}
                          >
                            <span className="font-mono">{formatMessageTime(msg.createdAt)}</span>
                            {isOutgoing && (
                              <CheckCheck className="w-3.5 h-3.5 text-white/90" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-white">
                      بداية المحادثة مع {selectedUser.name}
                    </p>
                    <p className="text-xs text-slate-400 max-w-xs">
                      أرسل أول رسالة أو شارك صورة لبدء النقاش المشفر 💬
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Emojis Bar */}
              {showEmojiBar && (
                <div className="px-4 py-2 border-t border-white/10 flex items-center gap-2 bg-white/[0.03] overflow-x-auto">
                  {quickEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setInputText((prev) => prev + emoji);
                        setShowEmojiBar(false);
                      }}
                      className="text-lg hover:scale-125 transition-transform p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Selected File Preview before sending */}
              {filePreview && (
                <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between bg-black/40">
                  <div className="flex items-center gap-3">
                    <img
                      src={filePreview}
                      alt="معاينة"
                      className="w-12 h-12 rounded-xl object-cover border border-white/20"
                    />
                    <span className="text-xs text-gray-300 truncate max-w-xs">
                      {selectedFile?.name}
                    </span>
                  </div>
                  <button
                    onClick={removeFile}
                    className="p-1 rounded-full text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Message Input Bar (WhatsApp Ergonomics + Liquid Glass) */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 px-4 border-t border-white/10 bg-white/[0.02] flex items-center gap-2"
              >
                {/* File Upload Trigger */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-full text-slate-400 hover:text-blue-400 hover:bg-white/10 transition-colors"
                  title="إرفاق صورة"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Emoji Bar Trigger */}
                <button
                  type="button"
                  onClick={() => setShowEmojiBar(!showEmojiBar)}
                  className="p-2.5 rounded-full text-slate-400 hover:text-amber-400 hover:bg-white/10 transition-colors"
                  title="رموز تعبيرية"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {/* Text Input */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="اكتب رسالة مشفرة..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-full py-2.5 px-4 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500/50 transition-colors"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={(!inputText.trim() && !selectedFile) || isSending}
                  className="glass-btn-primary p-2.5 px-4 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            </>
          ) : (
            /* No Chat Selected Placeholder */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-4 text-slate-400">
              <div className="w-16 h-16 rounded-3xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
                <MessageCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">مرحباً بك في محادثات GXE</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  اختر أحد أعضاء المجتمع من القائمة على اليمين لبدء محادثة مباشرة وسريعة.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
