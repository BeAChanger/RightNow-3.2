import React, { useState, useEffect } from 'react';
import { View } from '../types';
import { groupsApi, Group, GroupMember, AuthUser } from '../api';

interface GroupSettingsProps {
  groupId: number;
  authUser: AuthUser;
  onNavigate: (view: View, groupId?: number) => void;
}

const GroupSettings: React.FC<GroupSettingsProps> = ({ groupId, authUser, onNavigate }) => {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const myMember = members.find(m => m.userId === authUser.id);
  const isOwner = myMember?.role === 'owner';
  const isAdmin = myMember?.role === 'admin' || isOwner;

  useEffect(() => {
    loadData();
  }, [groupId]);

  const loadData = async () => {
    try {
      const [groupData, membersData] = await Promise.all([
        groupsApi.get(groupId),
        groupsApi.members(groupId)
      ]);
      setGroup(groupData);
      setMembers(membersData);
      setName(groupData.name);
      setDescription(groupData.description || '');
    } catch (err) {
      console.error('Failed to load group data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!name.trim()) return;
    try {
      await groupsApi.update(groupId, { name: name.trim(), description: description.trim() || undefined });
      setEditing(false);
      loadData();
    } catch (err) {
      console.error('Failed to update group:', err);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!confirm('确定移除该成员？')) return;
    try {
      await groupsApi.removeMember(groupId, userId);
      loadData();
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleToggleRole = async (member: GroupMember) => {
    const newRole = member.role === 'admin' ? 'member' : 'admin';
    try {
      await groupsApi.updateMemberRole(groupId, member.userId, newRole);
      loadData();
    } catch (err) {
      console.error('Failed to update role:', err);
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
          <button onClick={() => onNavigate(View.GroupChat, groupId)} className="text-gray-400">
            <span className="material-icons-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold">群组设置</h1>
          <div className="w-6" />
        </div>
      </div>

      <div className="p-4">
        <div className="bg-[#0D0D0D] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">群组信息</h2>
            {isOwner && !editing && (
              <button onClick={() => setEditing(true)} className="text-[#B8FF00] text-sm">编辑</button>
            )}
          </div>
          {editing ? (
            <>
              <input
                type="text"
                placeholder="群组名称"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 mb-3"
                maxLength={50}
              />
              <textarea
                placeholder="群组简介"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 mb-3 resize-none"
                rows={3}
                maxLength={200}
              />
              <div className="flex gap-3">
                <button onClick={() => { setEditing(false); setName(group?.name || ''); setDescription(group?.description || ''); }} className="flex-1 py-2 border border-gray-700 rounded">取消</button>
                <button onClick={handleUpdate} disabled={!name.trim()} className="flex-1 py-2 bg-[#B8FF00] text-black rounded font-medium disabled:opacity-50">保存</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-400 mb-2">名称：{group?.name}</p>
              <p className="text-gray-400">简介：{group?.description || '暂无简介'}</p>
            </>
          )}
        </div>

        <div className="bg-[#0D0D0D] rounded-lg p-4">
          <h2 className="font-bold mb-4">成员列表 ({members.length})</h2>
          <div className="space-y-3">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.username} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="material-icons-outlined text-gray-500">person</span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{member.username}</p>
                    <p className="text-xs text-gray-500">
                      {member.role === 'owner' ? '群主' : member.role === 'admin' ? '管理员' : '成员'}
                    </p>
                  </div>
                </div>
                {isOwner && member.role !== 'owner' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleToggleRole(member)} className="text-xs text-[#B8FF00] px-2 py-1 border border-[#B8FF00] rounded">
                      {member.role === 'admin' ? '取消管理' : '设为管理'}
                    </button>
                    <button onClick={() => handleRemoveMember(member.userId)} className="text-xs text-red-500 px-2 py-1 border border-red-500 rounded">移除</button>
                  </div>
                )}
                {isAdmin && !isOwner && member.role === 'member' && member.userId !== authUser.id && (
                  <button onClick={() => handleRemoveMember(member.userId)} className="text-xs text-red-500 px-2 py-1 border border-red-500 rounded">移除</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupSettings;
