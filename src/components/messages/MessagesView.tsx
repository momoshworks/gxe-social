import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, MessageCircle, ArrowRight, Search, Paperclip, X, FileText, Download } from 'lucide-react';
import type { User, DirectMessage } from '../../types';
import {
  subscribeToCommunityUsers,
  subscribeToChat,
  sendDirectMessage,
} from '../../services/messageService';
import { uploadMediaFile, downloadFile } from '../../services/storageService';
import { playNotificationSound } from '../../services/notificationService';

interface MessagesViewProps {
  currentUser: User;
  initialChatUser?: User | null;
  onNotify?: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  currentUser,
  initialChatUser,
  onNotify,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(initialChatUser || null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchUserTerm, setSearchUserTerm] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageCountRef = useRef<number>(0);

  // If initialChatUser changes, select it
  useEffect(() => {
    if (initialChatUser) {
      setSelectedUser(initialChatUser);
    }
  }, [initialChatUser]);

  // Subscribe to community members
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

  // Subscribe to chat with selected user in real-time
  useEffect(() => {
    if (!selectedUser || !currentUser.id) return;
    lastMessageCountRef.current = 0;

    const unsub = subscribeToChat(
      currentUser.id,
      selectedUser.id,
      (loadedMessages) => {
        // If a new message arrived from other user, play sound
        if (
          lastMessageCountRef.current > 0 &&
          loadedMessages.length > lastMessageCountRef.current &&
          loadedMessages[loadedMessages.length - 1]?.senderId === selectedUser.id
        ) {
          playNotificationSound();
        }
        lastMessageCountRef.current = loadedMessages.length;
        setMessages(loadedMessages);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      },
      (errorMsg) => {
        if (onNotify) onNotify(errorMsg, 'error');
      }
    );
    return () => unsub();
  }, [currentUser.id, selectedUser?.id]);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedFile) || !selectedUser || isSending) return;

    try {
      setIsSending(true);
      let mediaUrl: string | undefined;

      if (selectedFile) {
        const uploadRes = await uploadMediaFile(selectedFile);
        mediaUrl = uploadRes.url;
      }

      await sendDirectMessage(currentUser.id, selectedUser.id, inputText.trim(), mediaUrl);
      playNotificationSound();
      setInputText('');
      removeFile();
    } catch (err: any) {
      console.error('Failed to send direct message:', err);
      if (onNotify) onNotify(err?.message || 'تعذر إرسال الرسالة، تحقق من الاتصال', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Filter users by search term (name, username, email)
  const q = searchUserTerm.toLowerCase().trim();
  const filteredUsers = users.filter((u) => {
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.email ? u.email.toLowerCase().includes(q) : false)
    );
  });

  return (
    <div className="flex-1 min-h-screen border-x border-[#2f3336] max-w-4xl w-full bg-[#000000] flex flex-col md:flex-row">
      {/* Conversations / Users List */}
      <div
        className={`w-full md:w-80 border-l border-[#2f3336] flex flex-col shrink-0 ${
          selectedUser ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-3 border-b border-[#2f3336] sticky top-0 bg-[#000000]/90 backdrop-blur-md z-10 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-[#e7e9ea] flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#1d9bf0]" />
              <span>الرسائل المباشرة</span>
            </h2>
            <span className="text-xs text-[#71767b]">{filteredUsers.length} أعضاء</span>
          </div>

          {/* Search Bar for Users in Messages */}
          <div className="relative flex items-center">
            <Search className="absolute right-3 w-3.5 h-3.5 text-[#71767b]" />
            <input
              type="text"
              value={searchUserTerm}
              onChange={(e) => setSearchUserTerm(e.target.value)}
              placeholder="ابحث بالاسم، المعرّف، أو الإيميل..."
              className="w-full bg-[#16181c] border border-[#2f3336] rounded-full py-1.5 pr-9 pl-3 text-xs text-[#e7e9ea] placeholder-[#71767b] outline-none focus:border-[#1d9bf0]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#2f3336]/40">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const isSelected = selectedUser?.id === user.id;
              return (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer hover:bg-[#16181c] transition-colors ${
                    isSelected ? 'bg-[#16181c]' : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-11 h-11 rounded-full object-cover shrink-0 border border-[#2f3336]"
                    />
                    {user.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00ba7c] border-2 border-black rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#e7e9ea] truncate">{user.name}</span>
                      {user.verified && (
                        <span className="text-[#1d9bf0] text-xs font-bold mr-1 shrink-0">✓</span>
                      )}
                    </div>
                    <div className="text-xs text-[#71767b] truncate" dir="ltr">
                      @{user.username}
                    </div>
                    {user.email && (
                      <span className="text-[10px] text-[#71767b] block truncate" dir="ltr">
                        {user.email}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-[#71767b] leading-relaxed">
              {q ? 'لا يوجد مستخدم يطابق بحثك' : 'لا يوجد أعضاء آخرين مسجلين حالياً.'}
            </div>
          )}
        </div>
      </div>

      {/* Active Conversation Chat Window */}
      <div
        className={`flex-1 flex flex-col h-screen sticky top-0 ${
          !selectedUser ? 'hidden md:flex' : 'flex'
        }`}
      >
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-3.5 border-b border-[#2f3336] bg-[#000000]/90 backdrop-blur-md flex items-center justify-between z-10 gap-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="md:hidden p-1.5 text-[#71767b] hover:text-white rounded-full hover:bg-[#181818] shrink-0"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  className="w-10 h-10 rounded-full object-cover shrink-0 border border-[#2f3336]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-sm text-[#e7e9ea] truncate">
                      {selectedUser.name}
                    </span>
                    {selectedUser.verified && (
                      <span className="text-[#1d9bf0] text-xs font-bold shrink-0">✓</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#71767b] truncate" dir="ltr">
                    <span className="truncate">@{selectedUser.username}</span>
                    {selectedUser.email && (
                      <span className="text-[11px] text-[#1d9bf0] truncate">
                        ({selectedUser.email})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <span className="text-xs bg-[#00ba7c]/10 text-[#00ba7c] px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-[#00ba7c] animate-pulse" />
                  <span className="hidden sm:inline">محادثة مباشرة</span>
                  <span className="sm:hidden">مباشر</span>
                </span>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#000000]">
              {messages.length > 0 ? (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;
                  const timeStr =
                    typeof msg.createdAt === 'number'
                      ? new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          isMe
                            ? 'bg-[#1d9bf0] text-white rounded-bl-sm'
                            : 'bg-[#202327] text-[#e7e9ea] rounded-br-sm border border-[#2f3336]/40'
                        }`}
                      >
                        {msg.mediaUrl && (
                          <div className="mb-2 rounded-xl overflow-hidden">
                            {msg.mediaUrl.startsWith('data:image/') || msg.mediaUrl.match(/\.(jpeg|jpg|png|webp|gif|svg)/i) ? (
                              <img
                                src={msg.mediaUrl}
                                alt="مرفق صورة"
                                className="w-full h-auto max-h-64 object-cover rounded-lg cursor-pointer hover:opacity-95"
                                onClick={() => window.open(msg.mediaUrl, '_blank')}
                              />
                            ) : (
                              <div
                                onClick={() => downloadFile(msg.mediaUrl!, 'chat-attachment')}
                                className="p-3 bg-black/40 hover:bg-black/60 rounded-xl border border-white/10 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  <FileText className="w-5 h-5 text-white/80 shrink-0" />
                                  <span className="text-xs font-medium truncate">مرفق ملف / مستند</span>
                                </div>
                                <Download className="w-4 h-4 text-white/80 shrink-0" />
                              </div>
                            )}
                          </div>
                        )}
                        {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                      </div>
                      <span className="text-[10px] text-[#71767b] mt-1 px-1">
                        {timeStr}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#71767b]">
                  <MessageCircle className="w-12 h-12 text-[#2f3336] mb-2" />
                  <p className="text-sm font-semibold text-[#e7e9ea]">
                    هذه بداية محادثتك الخاصة مع {selectedUser.name}
                  </p>
                  <p className="text-xs mt-1">الرسائل تتبادل وتُحفظ لحظياً في الوقت الفعلي.</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* File Preview before sending */}
            {selectedFile && (
              <div className="px-4 py-2 bg-[#16181c] border-t border-[#2f3336] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {filePreview && (
                    <img
                      src={filePreview}
                      alt="معاينة"
                      className="w-8 h-8 rounded object-cover border border-[#2f3336]"
                    />
                  )}
                  <span className="text-[#1d9bf0] truncate max-w-xs font-medium">
                    مرفق: {selectedFile.name}
                  </span>
                </div>
                <button onClick={removeFile} className="p-1 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Message Input Box */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-[#2f3336] bg-[#000000] flex items-center gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFilePick}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-[#1d9bf0] hover:bg-[#1d9bf0]/10 rounded-full transition-colors"
                title="إرفاق صورة أو ملف"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="اكتب رسالة خاصة..."
                className="flex-1 bg-[#202327] text-[#e7e9ea] placeholder-[#71767b] text-sm px-4 py-2.5 rounded-full outline-none border border-transparent focus:border-[#1d9bf0] focus:bg-[#000000] transition-colors"
              />
              <button
                type="submit"
                disabled={(!inputText.trim() && !selectedFile) || isSending}
                className="p-2.5 rounded-full bg-[#1d9bf0] text-white hover:bg-[#1a8cd8] active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md shadow-[#1d9bf0]/20"
                title="إرسال"
              >
                {isSending ? (
                  <Sparkles className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#71767b]">
            <MessageCircle className="w-14 h-14 text-[#2f3336] mb-3" />
            <h3 className="text-lg font-bold text-[#e7e9ea]">اختر محادثة للبدء</h3>
            <p className="text-xs max-w-xs mt-1">
              اختر أحد أعضاء مجتمع GXE أو ابحث عن مستخدم بالاسم أو المعرّف أو الإيميل.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
