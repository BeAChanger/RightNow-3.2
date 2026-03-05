import React, { useState, useEffect, useRef } from 'react';
import { View } from '../types';
import { groupsApi, Group, GroupMessage, AuthUser } from '../api';

interface GroupChatProps {
  groupId: number;
  authUser: AuthUser;
  onNavigate: (view: View, groupId?: number) => void;
}

const GroupChat: React.FC<GroupChatProps> = ({ groupId, authUser, onNavigate }) => {
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGroup();
    loadMessages(1);
  }, [groupId]);

  useEffect(() => {
    if (page === 1) {
      scrollToBottom();
    }
  }, [messages]);

  const loadGroup = async () => {
    try {
      const data = await groupsApi.get(groupId);
      setGroup(data);
    } catch (err) {
      console.error('Failed to load group:', err);
    }
  };

  const loadMessages = async (p: number) => {
    try {
      const data = await groupsApi.messages(groupId, p);
      if (p === 1) {
        setMessages(data.data.reverse());
      } else {
        setMessages(prev => [...data.data.reverse(), ...prev]);
      }
      setHasMore(data.data.length === 20);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!content.trim()) return;
    const text = content.trim();
    setContent('');
    try {
      const msg = await groupsApi.sendMessage(groupId, text);
      setMessages(prev => [...prev, msg]);
    } catch (err) {
      console.error('Failed to send message:', err);
      setContent(text);
    }
  };

  const handleScroll = () => {
    if (!containerRef.current || !hasMore || loading) return;
    if (containerRef.current.scrollTop === 0) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadMessages(nextPage);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading && page === 1) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#B8FF00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#050505] text-white flex flex-col">
      <div className="sticky top-0 bg-[#050505] border-b border-gray-800 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => onNavigate(View.GroupList)} className="text-gray-400">
            <span className="material-icons-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold">{group?.name}</h1>
          <button onClick={() => onNavigate(View.GroupSettings, groupId)} className="text-gray-400">
            <span className="material-icons-outlined">more_horiz</span>
          </button>
        </div>
      </div>

      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map(msg => {
          const isMe = msg.userId === authUser.id;
          return (
            <div key={msg.id} className={`mb-4 flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isMe && <span className="text-xs text-gray-500 mb-1">{msg.username}</span>}
                <div className={`px-3 py-2 rounded-lg ${isMe ? 'bg-[#B8FF00] text-black' : 'bg-gray-800'}`}>
                  {msg.content}
                </div>
                <span className="text-xs text-gray-600 mt-1">
                  {new Date(msg.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-800 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="输入消息..."
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-full px-4 py-2"
          />
          <button
            onClick={handleSend}
            disabled={!content.trim()}
            className="w-10 h-10 bg-[#B8FF00] text-black rounded-full flex items-center justify-center disabled:opacity-50"
          >
            <span className="material-icons-outlined">send</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupChat;
