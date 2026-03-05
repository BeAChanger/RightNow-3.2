import React, { useState, useEffect } from 'react';
import { View } from '../types';
import { groupsApi, Group } from '../api';

interface GroupListProps {
  onNavigate: (view: View, groupId?: number) => void;
}

const GroupList: React.FC<GroupListProps> = ({ onNavigate }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const data = await groupsApi.list();
      setGroups(data);
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await groupsApi.create({ name: name.trim(), description: description.trim() || undefined });
      setShowCreate(false);
      setName('');
      setDescription('');
      loadGroups();
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#B8FF00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-20">
      <div className="sticky top-0 bg-[#050505] border-b border-gray-800 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => onNavigate(View.Community)} className="text-gray-400">
            <span className="material-icons-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold">群组</h1>
          <button onClick={() => setShowCreate(true)} className="text-[#B8FF00]">
            <span className="material-icons-outlined">add</span>
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-800">
        {groups.map(group => (
          <button
            key={group.id}
            onClick={() => onNavigate(View.GroupChat, group.id)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-900 transition"
          >
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
              {group.avatar ? (
                <img src={group.avatar} alt={group.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="material-icons-outlined text-gray-500">group</span>
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium truncate">{group.name}</h3>
                {group.lastMessageAt && (
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {new Date(group.lastMessageAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400 truncate">{group.lastMessage || '暂无消息'}</p>
                {group.unreadCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-[#B8FF00] text-black text-xs rounded-full flex-shrink-0">
                    {group.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <span className="material-icons-outlined text-5xl mb-4">group</span>
          <p>暂无群组</p>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D0D0D] rounded-lg w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-4">创建群组</h2>
            <input
              type="text"
              placeholder="群组名称"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 mb-3"
              maxLength={50}
            />
            <textarea
              placeholder="群组简介（可选）"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 mb-4 resize-none"
              rows={3}
              maxLength={200}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowCreate(false); setName(''); setDescription(''); }}
                className="flex-1 py-2 border border-gray-700 rounded"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="flex-1 py-2 bg-[#B8FF00] text-black rounded font-medium disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupList;
