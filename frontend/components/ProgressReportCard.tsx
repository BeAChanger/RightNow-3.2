import React from 'react';

interface ProgressMetrics {
  trainingCount?: number;
  weightChange?: number;
  streak?: number;
}

interface ProgressReportCardProps {
  post: {
    id: string;
    content: string;
    images?: string[];
    author: { id: string; name: string; avatar?: string };
    likes: number;
    liked: boolean;
    commentCount: number;
    createdAt: string;
    aiDraftPayload?: {
      metrics?: ProgressMetrics;
    };
  };
  onLike: (id: string) => void;
  onComment: (id: string) => void;
}

export const ProgressReportCard: React.FC<ProgressReportCardProps> = ({ post, onLike, onComment }) => {
  const metrics = post.aiDraftPayload?.metrics;

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${Math.max(1, mins)}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
  };

  return (
    <article className="bg-[#111] p-4 border-l-2 border-[#B8FF00]">
      {/* 作者信息 */}
      <div className="flex items-center gap-3 mb-3">
        {post.author?.avatar ? (
          <img src={post.author.avatar} className="w-10 h-10 rounded-full border border-white/10" alt="Avatar" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#B8FF00]/20 flex items-center justify-center">
            <span className="text-[#B8FF00] text-sm font-bold">{post.author?.name?.charAt(0) || '匿'}</span>
          </div>
        )}
        <div>
          <h4 className="text-sm font-bold text-white">{post.author?.name || '匿名用户'}</h4>
          <p className="text-[10px] text-gray-500">{formatTime(post.createdAt)}</p>
        </div>
        <div className="ml-auto">
          <span className="text-[10px] bg-[#B8FF00]/20 text-[#B8FF00] px-2 py-1 rounded font-bold">进步报告</span>
        </div>
      </div>

      {/* 主视觉 */}
      {post.images && post.images.length > 0 && (
        <div className="mb-3 rounded-xl overflow-hidden">
          <img src={post.images[0]} className="w-full aspect-[4/3] object-cover" alt="Progress" />
        </div>
      )}

      {/* AI 标题 */}
      <h3 className="text-base font-bold text-white mb-3 leading-snug">{post.content}</h3>

      {/* 关键指标 */}
      {metrics && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {metrics.trainingCount !== undefined && (
            <div className="bg-[#1A1A1A] rounded-lg p-3 text-center">
              <div className="text-xl font-black text-[#B8FF00]">{metrics.trainingCount}</div>
              <div className="text-[10px] text-gray-500 mt-1">训练次数</div>
            </div>
          )}
          {metrics.weightChange !== undefined && (
            <div className="bg-[#1A1A1A] rounded-lg p-3 text-center">
              <div className="text-xl font-black text-[#B8FF00]">{metrics.weightChange > 0 ? '+' : ''}{metrics.weightChange}</div>
              <div className="text-[10px] text-gray-500 mt-1">体重变化(kg)</div>
            </div>
          )}
          {metrics.streak !== undefined && (
            <div className="bg-[#1A1A1A] rounded-lg p-3 text-center">
              <div className="text-xl font-black text-[#B8FF00]">{metrics.streak}</div>
              <div className="text-[10px] text-gray-500 mt-1">连续天数</div>
            </div>
          )}
        </div>
      )}

      {/* 互动区 */}
      <div className="flex items-center gap-6 text-gray-400 border-t border-white/5 pt-3">
        <button onClick={() => onLike(post.id)} className={`flex items-center gap-1.5 transition-colors ${post.liked ? 'text-[#B8FF00]' : 'hover:text-[#B8FF00]'}`}>
          <span className="material-icons-round text-[18px]">{post.liked ? 'favorite' : 'favorite_border'}</span>
          <span className="text-xs font-bold">{post.likes}</span>
        </button>
        <button onClick={() => onComment(post.id)} className="flex items-center gap-1.5 hover:text-white transition-colors">
          <span className="material-icons-round text-[18px]">chat_bubble_outline</span>
          <span className="text-xs font-bold">{post.commentCount}</span>
        </button>
        <button className="flex items-center gap-1.5 hover:text-white transition-colors">
          <span className="material-icons-round text-[18px]">share</span>
        </button>
      </div>
    </article>
  );
};
