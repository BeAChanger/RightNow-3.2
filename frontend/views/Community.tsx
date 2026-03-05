import React, { useState, useEffect } from 'react';
import { postsApi, friendshipsApi } from '../api';
import type { PostItem, Comment, Friendship, BuddyRecommendation } from '../api';
import { ProgressReportCard } from '../components/ProgressReportCard';
import { View } from '../types';

interface CommunityProps {
    onNavigate: (view: View, data?: any) => void;
}

const Community: React.FC<CommunityProps> = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'forum' | 'friends'>('forum');

    return (
        <div className="min-h-screen bg-[#050505] text-white pb-24 font-sans">
            <header className="sticky top-0 z-30 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5 pt-12 pb-4">
                <div className="px-6 flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        社区 <span className="w-1.5 h-1.5 bg-[#B8FF00] rounded-full shadow-[0_0_8px_#B8FF00]"></span>
                    </h1>
                    <div className="flex gap-4 items-center">
                        <button onClick={() => onNavigate(View.GroupList)} className="text-gray-400 hover:text-[#B8FF00] transition">
                            <span className="material-icons-outlined">group</span>
                        </button>
                        <img src="https://picsum.photos/id/64/100/100" className="w-8 h-8 rounded-full border border-white/20" alt="Avatar" />
                    </div>
                </div>
                {/* Tabs */}
                <div className="px-6 flex gap-6 border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('forum')}
                        className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'forum' ? 'text-[#B8FF00]' : 'text-gray-500'}`}
                    >
                        广场
                        {activeTab === 'forum' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#B8FF00] shadow-[0_0_8px_#B8FF00]"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('friends')}
                        className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'friends' ? 'text-[#B8FF00]' : 'text-gray-500'}`}
                    >
                        搭子
                        {activeTab === 'friends' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#B8FF00] shadow-[0_0_8px_#B8FF00]"></div>}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="p-0">
                {activeTab === 'forum' ? <ForumTab onNavigate={onNavigate} /> : <FriendsTab />}
            </div>
        </div>
    );
};

interface ForumTabProps {
    onNavigate: (view: View, data?: any) => void;
}

const ForumTab: React.FC<ForumTabProps> = ({ onNavigate }) => {
    const [posts, setPosts] = useState<PostItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [showPostOptions, setShowPostOptions] = useState(false);
    const [expandedComments, setExpandedComments] = useState<string | null>(null);
    const [comments, setComments] = useState<Record<string, Comment[]>>({});
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
    const [recommendations, setRecommendations] = useState<BuddyRecommendation[]>([]);
    const safePosts = Array.isArray(posts) ? posts : [];

    const loadPosts = async (p: number) => {
        try {
            setLoading(true);
            const res = await postsApi.list(p, 10);
            const nextPosts = Array.isArray(res.data) ? res.data : [];
            if (p === 1) {
                setPosts(nextPosts);
            } else {
                setPosts(prev => [...(Array.isArray(prev) ? prev : []), ...nextPosts]);
            }
            const pageLimit = Number.isFinite(res.limit) && res.limit > 0 ? res.limit : 10;
            setHasMore(nextPosts.length >= pageLimit);
        } catch (err) {
            console.error('Failed to load posts:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPosts(1);
        const loadRecs = async () => {
            try {
                const data = await friendshipsApi.getRecommendations();
                setRecommendations(data.slice(0, 3));
            } catch (err) {
                console.error('Failed to load recommendations:', err);
            }
        };
        loadRecs();
    }, []);

    const handleLike = async (postId: string) => {
        try {
            await postsApi.toggleLike(postId);
            setPosts(prev => (Array.isArray(prev) ? prev.map(p =>
                p.id === postId ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
            ) : []));
        } catch (err) {
            console.error('Like failed:', err);
        }
    };

    const handleAiPost = async () => {
        setShowPostOptions(false);
        try {
            const draft = await postsApi.generateAiDraft();
            onNavigate(View.DraftConfirm, draft);
        } catch (err) {
            console.error('AI draft failed:', err);
        }
    };

    const handleToggleComments = async (postId: string) => {
        if (expandedComments === postId) {
            setExpandedComments(null);
            return;
        }
        setExpandedComments(postId);
        if (!comments[postId]) {
            try {
                const data = await postsApi.getComments(postId);
                setComments(prev => ({ ...prev, [postId]: Array.isArray(data) ? data : [] }));
            } catch (err) {
                console.error('Load comments failed:', err);
            }
        }
    };

    const handleAddComment = async (postId: string) => {
        const commentInput = commentInputs[postId] || '';
        if (!commentInput.trim()) return;
        try {
            const comment = await postsApi.addComment(postId, commentInput);
            setComments(prev => ({ ...prev, [postId]: [...(Array.isArray(prev[postId]) ? prev[postId] : []), comment] }));
            setPosts(prev => (Array.isArray(prev) ? prev.map(p => p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p) : []));
            setCommentInputs(prev => ({ ...prev, [postId]: '' }));
        } catch (err) {
            console.error('Add comment failed:', err);
        }
    };

    const formatTime = (dateStr: string) => {
        const timestamp = new Date(dateStr).getTime();
        if (!Number.isFinite(timestamp)) {
            return '刚刚';
        }

        const diff = Date.now() - timestamp;
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${Math.max(1, mins)}分钟前`;

        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}小时前`;

        return `${Math.floor(hours / 24)}天前`;
    };

    const handleAddBuddy = async (userId: string) => {
        try {
            await friendshipsApi.request(userId);
            setRecommendations(prev => prev.filter(r => r.userId !== userId));
        } catch (err) {
            console.error('Add buddy failed:', err);
        }
    };

    return (
        <div className="animate-fade-in pb-20">
            {/* 搭子推荐区 */}
            {recommendations.length > 0 && (
                <div className="m-4 p-4 rounded-2xl bg-[#1A1A1A] border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <span className="material-icons-round text-[#B8FF00] text-lg">group</span>
                            为你推荐搭子
                        </h3>
                        <button onClick={() => onNavigate(View.BuddyRecommend)} className="text-xs text-[#B8FF00] font-bold">查看全部</button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                        {recommendations.map((buddy) => (
                            <div key={buddy.userId} className="flex-shrink-0 w-24 text-center">
                                {buddy.avatar ? (
                                    <img src={buddy.avatar} className="w-16 h-16 rounded-full border border-white/10 mx-auto mb-2" alt={buddy.name} />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-[#B8FF00]/20 border border-[#B8FF00]/30 mx-auto mb-2 flex items-center justify-center">
                                        <span className="text-[#B8FF00] font-bold text-lg">{buddy.name.charAt(0)}</span>
                                    </div>
                                )}
                                <div className="text-xs text-white font-bold truncate px-1">{buddy.name}</div>
                                <div className="text-[10px] text-[#B8FF00] mt-0.5">{buddy.matchScore}%</div>
                                <button onClick={() => handleAddBuddy(buddy.userId)} className="mt-2 px-2 py-1 bg-[#B8FF00] text-black text-[10px] font-bold rounded">添加</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Post Options Modal */}
            {showPostOptions && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-end" onClick={() => setShowPostOptions(false)}>
                    <div className="w-full bg-[#111] rounded-t-3xl p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-bold mb-4 text-center">选择发帖方式</h3>
                        <div className="space-y-3">
                            <button onClick={() => { setShowPostOptions(false); onNavigate(View.ManualPost); }} className="w-full py-4 bg-[#1A1A1A] hover:bg-[#222] rounded-xl text-white font-bold transition-colors flex items-center justify-center gap-2">
                                <span className="material-icons-round">edit</span>
                                手动发帖
                            </button>
                            <button onClick={handleAiPost} className="w-full py-4 bg-[#B8FF00] hover:bg-[#a3e000] rounded-xl text-black font-bold transition-colors flex items-center justify-center gap-2">
                                <span className="material-icons-round">auto_awesome</span>
                                AI 帮我发
                            </button>
                        </div>
                        <button onClick={() => setShowPostOptions(false)} className="w-full mt-4 py-3 text-gray-400 text-sm">取消</button>
                    </div>
                </div>
            )}

            {/* Posts */}
            <div className="space-y-2 relative z-10">
                {loading && safePosts.length === 0 ? (
                    <div className="flex justify-center py-12">
                        <div className="w-6 h-6 border-2 border-[#B8FF00] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : safePosts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-sm">暂无动态，快来发布第一条吧</div>
                ) : safePosts.map(post => {
                    const isProgressReport = post.aiDraftPayload?.metrics;

                    if (isProgressReport) {
                        return (
                            <ProgressReportCard
                                key={post.id}
                                post={post}
                                onLike={handleLike}
                                onComment={handleToggleComments}
                            />
                        );
                    }

                    return (
                        <article key={post.id} className="bg-[#111] p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    {post.author?.avatar ? (
                                        <img src={post.author.avatar} className="w-10 h-10 rounded-full border border-white/10" alt="Avatar" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full border border-white/10 bg-[#B8FF00]/20 flex items-center justify-center">
                                            <span className="text-[#B8FF00] text-sm font-bold">{post.author?.name?.charAt(0) || '匿'}</span>
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="text-sm font-bold text-white">{post.author?.name || '匿名用户'}</h4>
                                        <p className="text-[10px] text-gray-500">{formatTime(post.createdAt)}</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed mb-3">{post.content}</p>
                            {post.images && post.images.length > 0 && (
                                <div className={`grid ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2 mb-4`}>
                                    {post.images.map((img, idx) => (
                                        <div key={idx} className="aspect-square bg-white/5 rounded-xl overflow-hidden relative group">
                                            <img src={img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={`Post img ${idx + 1}`} />
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center justify-between text-gray-400 border-t border-white/5 pt-3">
                                <button onClick={() => handleLike(post.id)} className={`flex items-center gap-1.5 transition-colors ${post.liked ? 'text-[#B8FF00]' : 'hover:text-[#B8FF00]'}`}>
                                    <span className="material-icons-round text-[18px]">{post.liked ? 'favorite' : 'favorite_border'}</span>
                                    <span className="text-xs font-bold">{post.likes}</span>
                                </button>
                                <button onClick={() => handleToggleComments(post.id)} className="flex items-center gap-1.5 hover:text-white transition-colors">
                                    <span className="material-icons-round text-[18px]">chat_bubble_outline</span>
                                    <span className="text-xs font-bold">{post.commentCount}</span>
                                </button>
                                <button className="flex items-center gap-1.5 hover:text-white transition-colors">
                                    <span className="material-icons-round text-[18px]">share</span>
                                </button>
                            </div>
                            {/* Comments Section */}
                            {expandedComments === post.id && (
                                <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
                                    {(comments[post.id] || []).map(c => (
                                        <div key={c.id} className="flex gap-2">
                                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                                <span className="text-[10px] text-gray-400">{c.author?.name?.charAt(0) || '匿'}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-gray-300">{c.author?.name || '匿名用户'}</span>
                                                <p className="text-xs text-gray-400">{c.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex gap-2">
                                        <input
                                            value={commentInputs[post.id] || ''}
                                            onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                            onKeyDown={e => e.key === 'Enter' && handleAddComment(post.id)}
                                            placeholder="写评论..."
                                            className="flex-1 bg-[#1A1A1A] rounded-full px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none border border-white/5"
                                        />
                                        <button onClick={() => handleAddComment(post.id)} className="text-[#B8FF00] text-xs font-bold">发送</button>
                                    </div>
                                </div>
                            )}
                        </article>
                    );
                })}
                {hasMore && safePosts.length > 0 && (
                    <button
                        onClick={() => { setPage(p => p + 1); loadPosts(page + 1); }}
                        disabled={loading}
                        className="w-full py-3 text-center text-xs text-gray-500 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {loading ? '加载中...' : '加载更多'}
                    </button>
                )}
            </div>

            {/* Floating Post Button */}
            <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center">
                <button onClick={() => setShowPostOptions(true)} className="w-16 h-16 bg-[#B8FF00] rounded-full shadow-[0_0_20px_rgba(184,255,0,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300">
                    <span className="material-icons-round text-black text-3xl notranslate">add</span>
                </button>
            </div>
        </div>
    );
};

const FriendsTab: React.FC = () => {
    const [friends, setFriends] = useState<Friendship[]>([]);
    const [loading, setLoading] = useState(true);
    const [addId, setAddId] = useState('');
    const safeFriends = Array.isArray(friends) ? friends : [];

    useEffect(() => {
        const loadFriends = async () => {
            try {
                const data = await friendshipsApi.list();
                setFriends(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Failed to load friends:', err);
            } finally {
                setLoading(false);
            }
        };
        loadFriends();
    }, []);

    const handleAdd = async () => {
        if (!addId.trim()) return;
        try {
            const f = await friendshipsApi.request(addId.trim());
            setFriends(prev => [...(Array.isArray(prev) ? prev : []), f]);
            setAddId('');
        } catch (err) {
            console.error('Friend request failed:', err);
        }
    };

    const handleAccept = async (id: string) => {
        try {
            const updated = await friendshipsApi.accept(id);
            setFriends(prev => (Array.isArray(prev) ? prev.map(f => f.id === id ? updated : f) : []));
        } catch (err) {
            console.error('Accept failed:', err);
        }
    };

    const handleRemove = async (id: string) => {
        try {
            await friendshipsApi.remove(id);
            setFriends(prev => (Array.isArray(prev) ? prev.filter(f => f.id !== id) : []));
        } catch (err) {
            console.error('Remove failed:', err);
        }
    };

    const accepted = safeFriends.filter(f => f.status === 'accepted');
    const pending = safeFriends.filter(f => f.status === 'pending');
    return (
        <div className="animate-fade-in p-6">
            {/* Search/Add */}
            <div className="relative mb-8">
                <div className="flex items-center bg-[#111] border border-white/10 rounded-full overflow-hidden focus-within:border-[#B8FF00]/50 transition-colors pl-4 shadow-sm">
                    <span className="material-icons-round text-gray-500">person_add</span>
                    <input
                        type="text"
                        value={addId}
                        onChange={e => setAddId(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        placeholder="输入用户 ID 添加搭子"
                        className="flex-1 bg-transparent border-none py-3 px-3 text-sm text-white focus:outline-none placeholder-gray-600"
                    />
                    <button onClick={handleAdd} className="bg-[#B8FF00] hover:bg-[#a3e000] text-black text-sm font-bold px-6 h-full py-3 transition-colors active:bg-[#8ebb00]">添加</button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-6 h-6 border-2 border-[#B8FF00] border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <>
                    {/* Pending Requests */}
                    {pending.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">待确认 ({pending.length})</h3>
                            <div className="space-y-4">
                                {pending.map(f => (
                                    <div key={f.id} className="flex items-center justify-between bg-[#111]/80 p-4 rounded-2xl border border-[#B8FF00]/20">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full border border-white/10 bg-[#B8FF00]/20 flex items-center justify-center">
                                                <span className="text-[#B8FF00] font-bold">{f.user?.name?.charAt(0) || '匿'}</span>
                                            </div>
                                            <h4 className="text-sm font-bold text-white">{f.user?.name || '匿名用户'}</h4>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleAccept(f.id)} className="px-3 py-1.5 bg-[#B8FF00] text-black text-xs font-bold rounded-full">接受</button>
                                            <button onClick={() => handleRemove(f.id)} className="px-3 py-1.5 bg-white/10 text-gray-400 text-xs font-bold rounded-full">拒绝</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Friend List */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">我的运动搭子 ({accepted.length})</h3>
                        {accepted.length === 0 ? (
                            <p className="text-center text-gray-500 text-sm py-8">还没有搭子，快去添加吧</p>
                        ) : (
                            <div className="space-y-4">
                                {accepted.map(f => (
                                    <div key={f.id} className="flex items-center justify-between bg-[#111]/80 hover:bg-[#161616] p-4 rounded-2xl border border-white/5 transition-colors cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                {f.user?.avatar ? (
                                                    <img src={f.user.avatar} className="w-12 h-12 rounded-full border border-white/10" alt="Friend" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full border border-white/10 bg-white/10 flex items-center justify-center">
                                                        <span className="text-white font-bold">{f.user?.name?.charAt(0) || '匿'}</span>
                                                    </div>
                                                )}
                                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#B8FF00] border-2 border-[#111] rounded-full"></div>
                                            </div>
                                            <h4 className="text-sm font-bold text-white">{f.user?.name || '匿名用户'}</h4>
                                        </div>
                                        <button onClick={() => handleRemove(f.id)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors">
                                            <span className="material-icons-round text-[18px]">person_remove</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* AI Recommendation Box */}
            <div className="mt-8 border border-[#B8FF00]/20 rounded-3xl p-5 relative overflow-hidden group transition-colors">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#B8FF00]/5 to-transparent pointer-events-none"></div>
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-[#B8FF00] flex items-center gap-2">
                            <span className="material-icons-round text-[18px]">smart_toy</span>
                            AI 搭子匹配
                        </h4>
                        <span className="text-[10px] bg-[#B8FF00]/20 text-[#B8FF00] px-2 py-0.5 rounded font-bold">高匹配度</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed mb-4">
                        发现与你目标相似的用户。是否让 AI 帮您发起搭子邀请并代理打招呼？
                    </p>
                    <button className="w-full bg-[#B8FF00]/10 hover:bg-[#B8FF00]/20 text-[#B8FF00] text-sm font-bold py-3 rounded-xl transition-colors border border-[#B8FF00]/20">
                        查看智能推荐
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Community;
