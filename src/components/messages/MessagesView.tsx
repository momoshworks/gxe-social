import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  MessageCircle,
  Search,
  Paperclip,
  X,
  ArrowRight,
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
    <div className="flex-1 w-full h-full flex flex-col md:flex-row overflow-hidden bg-[#070A14] relative">
      {/* =========================================================================
          RIGHT COLUMN (in RTL): Conversations & Contacts List (Edge-to-Edge)
         ========================================================================= */}
      <aside
        className={`w-full md:w-80 lg:w-[380px] flex flex-col border-l border-white/10 bg-[#0A0E1A]/90 backdrop-blur-3xl shrink-0 z-20 ${
          selectedUser ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* List Header */}
        <div className="p-4 border-b border-white/10 space-y-3 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/15">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white leading-none">المحادثات المباشرة</h2>
                <span className="text-[11px] text-slate-400 mt-1 block">تشفير سحابي فوري ⚡</span>
              </div>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold">
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
              className="w-full bg-white/[0.06] border border-white/15 rounded-2xl py-2.5 pr-10 pl-4 text-xs text-white placeholder-slate-400 outline-none focus:border-cyan-400/60 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Contacts / Chats Stream */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y-0">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const isSelected = selectedUser?.id === user.id;
              return (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-3 px-3.5 rounded-2xl flex items-center gap-3.5 cursor-pointer transition-all duration-200 select-none ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-600/25 via-blue-600/15 to-transparent border border-cyan-400/50 border-r-4 border-r-cyan-400 shadow-lg shadow-cyan-500/10'
                      : 'hover:bg-white/[0.05] border border-transparent'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-white/20 bg-slate-800 shadow-md"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0A0E1A] shadow-sm shadow-emerald-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-sm font-bold text-white truncate">
                          {user.name}
                        </span>
                        {user.verified && (
                          <span className="text-cyan-400 text-xs font-bold shrink-0">✓</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0" dir="ltr">
                        @{user.username}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 truncate leading-relaxed">
                      {user.bio || 'عضو نشط في مجتمع GXE 🚀'}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 space-y-3 my-auto">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                <MessageCircle className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-200">
                {q ? 'لا يوجد أعضاء يطابقون بحثك' : 'لا يوجد أعضاء آخرين مسجلين بعد'}
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                جميع المحادثات حية ومشفرة وتتم مزامنتها مع سحابة Cloudflare D1 بدون تأخير.
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* =========================================================================
          LEFT COLUMN (in RTL): Active Direct Messaging Room
         ========================================================================= */}
      <main
        className={`flex-1 flex flex-col h-full bg-gradient-to-b from-[#080C18] via-[#0A0E1F] to-[#070A14] relative overflow-hidden ${
          !selectedUser ? 'hidden md:flex' : 'flex'
        }`}
      >
        {selectedUser ? (
          <>
            {/* Active Chat Header */}
            <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-[#0A0E1A]/85 backdrop-blur-2xl shrink-0 z-10">
              <div className="flex items-center gap-3.5">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setSelectedUser(null)}
                  className="md:hidden p-2 rounded-xl hover:bg-white/10 text-slate-300 transition-colors"
                  title="الرجوع للقائمة"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>

                <div className="relative">
                  <img
                    src={selectedUser.avatar}
                    alt={selectedUser.name}
                    className="w-10 h-10 rounded-xl object-cover border border-white/20 bg-slate-800 shadow"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0A0E1A] shadow-sm shadow-emerald-500" />
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-extrabold text-white">
                      {selectedUser.name}
                    </span>
                    {selectedUser.verified && (
                      <span className="text-[10px] text-cyan-400 font-bold">✓</span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>متصل الآن • سحابة Cloudflare D1 ⚡</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                  محادثة خاصة وموثقة 🔒
                </span>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.length > 0 ? (
                messages.map((msg) => {
                  const isOutgoing = msg.senderId === currentUser.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOutgoing ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[82%] sm:max-w-lg p-4 text-sm transition-all shadow-xl leading-relaxed ${
                          isOutgoing
                            ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white rounded-3xl rounded-bl-sm border border-white/25 border-t-white/40'
                            : 'bg-white/[0.08] text-slate-100 rounded-3xl rounded-br-sm border border-white/15 border-t-white/30 backdrop-blur-xl'
                        }`}
                      >
                        {/* Attached Image if any */}
                        {msg.mediaUrl && (
                          <div
                            onClick={() => onOpenLightbox && onOpenLightbox(msg.mediaUrl!)}
                            className="mb-2.5 rounded-2xl overflow-hidden border border-white/20 cursor-pointer max-h-72 shadow-md group"
                          >
                            <img
                              src={msg.mediaUrl}
                              alt="مرفق"
                              className="w-full h-auto object-cover max-h-72 group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}

                        {/* Message Text */}
                        {msg.text && (
                          <p className="whitespace-pre-wrap leading-relaxed select-text font-medium">
                            {msg.text}
                          </p>
                        )}

                        {/* Message Metadata (Timestamp + Checkmark) */}
                        <div
                          className={`flex items-center gap-1.5 mt-1.5 text-[10px] ${
                            isOutgoing ? 'justify-end text-blue-200' : 'justify-start text-slate-400'
                          }`}
                        >
                          <span className="font-mono">{formatMessageTime(msg.createdAt)}</span>
                          {isOutgoing && (
                            <CheckCheck className="w-3.5 h-3.5 text-cyan-300 stroke-[2.5]" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Rich Interactive Welcome Card */
                <div className="h-full flex flex-col items-center justify-center p-6 text-center select-none my-auto">
                  <div className="max-w-md w-full glass-panel p-6 sm:p-8 flex flex-col items-center gap-4 shadow-2xl relative overflow-hidden">
                    <div className="card-accent-bar" />
                    <div className="relative">
                      <img
                        src={selectedUser.avatar}
                        alt={selectedUser.name}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-xl"
                      />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#08090C]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">
                        محادثة مشفرة مع {selectedUser.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {selectedUser.bio || 'ابدأ المحادثة الفورية الآن بدون أي تأخير.'}
                      </p>
                    </div>

                    <div className="w-full pt-3 border-t border-white/10 space-y-2 text-right">
                      <span className="text-[11px] font-mono text-slate-400 block px-1">
                        اقتراحات سريعة للبدء:
                      </span>
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInputText(`أهلاً بك يا ${selectedUser.name}! 👋`)}
                          className="glass-btn-secondary w-full py-2 px-3 text-xs text-right justify-start text-slate-200 hover:text-white hover:border-blue-500/40"
                        >
                          👋 أهلاً بك يا {selectedUser.name}!
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputText('كيف تسير مشاريعك التقنية اليوم؟ 🚀')}
                          className="glass-btn-secondary w-full py-2 px-3 text-xs text-right justify-start text-slate-200 hover:text-white hover:border-blue-500/40"
                        >
                          🚀 كيف تسير مشاريعك التقنية اليوم؟
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputText('أود مشاركتك فكرة جديدة والنقاش حولها 💡')}
                          className="glass-btn-secondary w-full py-2 px-3 text-xs text-right justify-start text-slate-200 hover:text-white hover:border-blue-500/40"
                        >
                          💡 أود مشاركتك فكرة جديدة والنقاش حولها
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Emojis Bar */}
            {showEmojiBar && (
              <div className="px-6 py-2 border-t border-white/10 flex items-center gap-3 bg-[#0A0C14]/90 backdrop-blur-xl overflow-x-auto shrink-0">
                {quickEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setInputText((prev) => prev + emoji);
                      setShowEmojiBar(false);
                    }}
                    className="text-xl hover:scale-125 transition-transform p-1.5"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Selected File Preview before sending */}
            {filePreview && (
              <div className="px-6 py-3 border-t border-white/10 flex items-center justify-between bg-black/60 shrink-0">
                <div className="flex items-center gap-3">
                  <img
                    src={filePreview}
                    alt="معاينة"
                    className="w-12 h-12 rounded-xl object-cover border border-white/20"
                  />
                  <span className="text-xs text-slate-300 truncate max-w-xs">
                    {selectedFile?.name}
                  </span>
                </div>
                <button
                  onClick={removeFile}
                  className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Message Input Bar (WhatsApp Ergonomics + Liquid Glass) */}
            <form
              onSubmit={handleSendMessage}
              className="p-3.5 px-6 border-t border-white/10 bg-[#0A0C14]/90 backdrop-blur-2xl flex items-center gap-3 shrink-0"
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
                className="p-3 rounded-2xl text-slate-400 hover:text-blue-400 hover:bg-white/10 transition-colors shrink-0"
                title="إرفاق صورة"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* Emoji Bar Trigger */}
              <button
                type="button"
                onClick={() => setShowEmojiBar(!showEmojiBar)}
                className="p-3 rounded-2xl text-slate-400 hover:text-amber-400 hover:bg-white/10 transition-colors shrink-0"
                title="رموز تعبيرية"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="اكتب رسالة مشفرة..."
                className="flex-1 bg-white/[0.06] border border-white/15 focus:border-cyan-400/80 rounded-2xl py-3 px-5 text-sm text-white placeholder-slate-400 outline-none transition-all shadow-inner"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={(!inputText.trim() && !selectedFile) || isSending}
                className="glass-btn-primary p-3 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/30"
              >
                <Send className="w-5 h-5 stroke-[2.5]" />
              </button>
            </form>
          </>
        ) : (
          /* No Chat Selected Placeholder */
          <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-4 text-slate-400 select-none">
            <div className="w-20 h-20 rounded-3xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-500/15">
              <MessageCircle className="w-10 h-10" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-xl font-extrabold text-white">مرحباً بك في محادثات GXE الحية</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                اختر أحد أعضاء المجتمع من القائمة على اليمين لبدء محادثة مشفرة ومباشرة مع حفظ فوري لجميع الرسائل والوسائط في Cloudflare D1.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
