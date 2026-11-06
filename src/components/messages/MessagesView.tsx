import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, MessageCircle, ArrowRight } from 'lucide-react';
import type { User, DirectMessage } from '../../types';
import {
  subscribeToCommunityUsers,
  subscribeToChat,
  sendDirectMessage,
} from '../../services/messageService';

interface MessagesViewProps {
  currentUser: User;
  onNotify?: (text: string, type?: 'success' | 'info') => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({ currentUser, onNotify }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to community members
  useEffect(() => {
    const unsub = subscribeToCommunityUsers((communityList) => {
      // Exclude self
      const otherMembers = communityList.filter((u) => u.id !== currentUser.id);
      setUsers(otherMembers);
      if (!selectedUser && otherMembers.length > 0) {
        setSelectedUser(otherMembers[0]);
      }
    });
    return () => unsub();
  }, [currentUser.id]);

  // Subscribe to chat with selected user
  useEffect(() => {
    if (!selectedUser) return;
    const unsub = subscribeToChat(currentUser.id, selectedUser.id, (loadedMessages) => {
      setMessages(loadedMessages);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    });
    return () => unsub();
  }, [currentUser.id, selectedUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedUser || isSending) return;

    try {
      setIsSending(true);
      await sendDirectMessage(currentUser.id, selectedUser.id, inputText.trim());
      setInputText('');
    } catch (e) {
      console.error('Failed to send direct message:', e);
      if (onNotify) onNotify('تعذر إرسال الرسالة، تحقق من الاتصال', 'info');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen border-x border-[#2f3336] max-w-4xl w-full bg-[#000000] flex flex-col md:flex-row">
      {/* Conversations / Users List */}
      <div
        className={`w-full md:w-80 border-l border-[#2f3336] flex flex-col shrink-0 ${
          selectedUser ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-[#2f3336] sticky top-0 bg-[#000000]/90 backdrop-blur-md z-10 flex items-center justify-between">
          <h2 className="font-bold text-lg text-[#e7e9ea] flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#1d9bf0]" />
            <span>الرسائل المباشرة</span>
          </h2>
          <span className="text-xs text-[#71767b]">{users.length} أعضاء</span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#2f3336]/40">
          {users.length > 0 ? (
            users.map((user) => {
              const isSelected = selectedUser?.id === user.id;
              return (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer hover:bg-[#16181c] transition-colors ${
                    isSelected ? 'bg-[#16181c]' : ''
                  }`}
                >
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                    {user.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00ba7c] border-2 border-black rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#e7e9ea] truncate">{user.name}</span>
                      {user.verified && (
                        <span className="text-[#1d9bf0] text-xs font-bold mr-1">✓</span>
                      )}
                    </div>
                    <span className="text-xs text-[#71767b]">@{user.username}</span>
                    <p className="text-xs text-[#71767b] truncate mt-0.5">
                      {user.bio || 'انقر لبدء محادثة فورية'}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-[#71767b] leading-relaxed">
              لا يوجد أعضاء آخرين مسجلين حالياً. بمجرد أن يسجل أي مستخدم آخر في الموقع سيظهر هنا للتحدث معه فوراً!
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
            <div className="p-3.5 border-b border-[#2f3336] bg-[#000000]/90 backdrop-blur-md flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="md:hidden p-1.5 text-[#71767b] hover:text-white rounded-full hover:bg-[#181818]"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-sm text-[#e7e9ea]">{selectedUser.name}</span>
                    {selectedUser.verified && (
                      <span className="text-[#1d9bf0] text-xs font-bold">✓</span>
                    )}
                  </div>
                  <span className="text-xs text-[#71767b]">@{selectedUser.username}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs bg-[#00ba7c]/10 text-[#00ba7c] px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#00ba7c]" />
                  <span>متصل لحظياً</span>
                </span>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#000000]">
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMe
                          ? 'bg-[#1d9bf0] text-white rounded-bl-sm'
                          : 'bg-[#202327] text-[#e7e9ea] rounded-br-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-[#71767b] mt-1 px-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Box */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-[#2f3336] bg-[#000000] flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="اكتب رسالتك..."
                className="flex-1 bg-[#202327] text-[#e7e9ea] placeholder-[#71767b] text-sm px-4 py-2.5 rounded-full outline-none border border-transparent focus:border-[#1d9bf0] focus:bg-[#000000] transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
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
              اختر أحد أعضاء مجتمع GXE من القائمة لبدء تبادل الرسائل في الوقت الفعلي.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
