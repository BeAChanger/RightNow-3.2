import React, { useState } from 'react';

type PostVisibility = 'PUBLIC' | 'BUDDIES_ONLY';

interface DraftConfirmProps {
  draft: {
    content: string;
    suggestedImages: string[];
    metrics?: {
      trainingCount?: number;
      weightChange?: number;
      streak?: number;
    };
  };
  onPublish: (data: { content: string; images: string[]; visibility: PostVisibility }) => Promise<void> | void;
  onCancel: () => void;
}

const DraftConfirm: React.FC<DraftConfirmProps> = ({ draft, onPublish, onCancel }) => {
  const [content, setContent] = useState(draft.content);
  const [images, setImages] = useState<string[]>(draft.suggestedImages || []);
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const handlePublish = async () => {
    if (!content.trim() || publishing) return;

    setPublishing(true);
    setError('');
    try {
      await onPublish({ content, images, visibility });
    } catch (e) {
      const message = e instanceof Error ? e.message : '发布失败，请稍后重试';
      setError(message || '发布失败，请稍后重试');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-24">
      <header className="sticky top-0 z-30 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5 pt-12 pb-4 px-6">
        <div className="flex items-center justify-between">
          <button onClick={onCancel} className="text-gray-400 hover:text-white">
            <span className="material-icons-round">close</span>
          </button>
          <h1 className="text-lg font-bold">确认发布</h1>
          <button
            onClick={() => void handlePublish()}
            disabled={!content.trim() || publishing}
            className={`text-sm font-bold ${content.trim() && !publishing ? 'text-[#B8FF00]' : 'text-gray-600'}`}
          >
            {publishing ? '发布中...' : '发布'}
          </button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2 text-xs text-[#B8FF00]">
          <span className="material-icons-round text-sm">auto_awesome</span>
          <span>AI 生成草稿</span>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="text-xs text-gray-500 mb-2 block">文案</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-[#1A1A1A] rounded-xl p-4 text-sm text-white outline-none border border-white/5 focus:border-[#B8FF00]/50 min-h-[120px] resize-none"
            placeholder="分享你的进步..."
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-2 block">图片</label>
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-square bg-[#1A1A1A] rounded-lg overflow-hidden">
                <img src={img} className="w-full h-full object-cover" alt={`Image ${idx + 1}`} />
                <button
                  onClick={() => setImages(images.filter((_, i) => i !== idx))}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <span className="material-icons-round text-white text-sm">close</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-2 block">可见范围</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setVisibility('PUBLIC')}
              className={`p-4 rounded-xl border transition-all ${visibility === 'PUBLIC' ? 'bg-[#B8FF00]/10 border-[#B8FF00] text-[#B8FF00]' : 'bg-[#1A1A1A] border-white/5 text-gray-400'}`}
            >
              <span className="material-icons-round text-2xl mb-1">public</span>
              <div className="text-xs font-bold">全部可见</div>
            </button>
            <button
              onClick={() => setVisibility('BUDDIES_ONLY')}
              className={`p-4 rounded-xl border transition-all ${visibility === 'BUDDIES_ONLY' ? 'bg-[#B8FF00]/10 border-[#B8FF00] text-[#B8FF00]' : 'bg-[#1A1A1A] border-white/5 text-gray-400'}`}
            >
              <span className="material-icons-round text-2xl mb-1">group</span>
              <div className="text-xs font-bold">仅搭子可见</div>
            </button>
          </div>
        </div>

        {draft.metrics && (
          <div className="bg-[#1A1A1A] rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-3">数据指标</div>
            <div className="grid grid-cols-3 gap-3">
              {draft.metrics.trainingCount !== undefined && (
                <div className="text-center">
                  <div className="text-lg font-black text-[#B8FF00]">{draft.metrics.trainingCount}</div>
                  <div className="text-[10px] text-gray-500">训练次数</div>
                </div>
              )}
              {draft.metrics.weightChange !== undefined && (
                <div className="text-center">
                  <div className="text-lg font-black text-[#B8FF00]">
                    {draft.metrics.weightChange > 0 ? '+' : ''}
                    {draft.metrics.weightChange}
                  </div>
                  <div className="text-[10px] text-gray-500">体重变化</div>
                </div>
              )}
              {draft.metrics.streak !== undefined && (
                <div className="text-center">
                  <div className="text-lg font-black text-[#B8FF00]">{draft.metrics.streak}</div>
                  <div className="text-[10px] text-gray-500">连续天数</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DraftConfirm;
