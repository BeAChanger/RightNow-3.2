import React, { useState } from 'react';
import { View } from '../types';
import { postsApi } from '../api/posts';

interface CommunityShareProps {
  onNavigate: (view: View) => void;
  onBack: () => void;
  shareData: {
    trainingRecordId: string;
    feedbackCard: any;
    photoUrl?: string;
  } | null;
}

const CommunityShare: React.FC<CommunityShareProps> = ({ onNavigate, onBack, shareData }) => {
  const [content, setContent] = useState(shareData?.feedbackCard?.content || '');
  const [images, setImages] = useState<string[]>(shareData?.photoUrl ? [shareData.photoUrl] : []);
  const [tags, setTags] = useState<string[]>(['训练打卡']);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const PRESET_TOPICS = ['健身打卡', '增肌', '减脂', '突破极限', '核心碎片'];

  const handlePublish = async () => {
    if (!shareData?.trainingRecordId) return;

    setLoading(true);
    try {
      await postsApi.createFromTraining({
        trainingRecordId: shareData.trainingRecordId,
        content,
        images,
        tags
      });

      setShowSuccess(true);
      setTimeout(() => {
        onNavigate(View.Community);
      }, 2000);
    } catch (err) {
      alert('发布失败');
      setLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center animate-fade-in">
        <div className="w-20 h-20 bg-[#B8FF00] rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(184,255,0,0.4)] animate-pop-in">
          <span className="material-icons-round text-black text-4xl">check</span>
        </div>
        <h2 className="text-2xl font-black text-white tracking-widest mb-2 animate-slide-up">发布成功</h2>
        <p className="text-gray-400 text-sm animate-slide-up" style={{ animationDelay: '100ms' }}>正在前往社区...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white pb-20 font-sans animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#030303]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/5">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors hidden-md">
          <span className="material-icons-round">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold tracking-wider">分享到社区</h1>
        <button
          onClick={handlePublish}
          disabled={loading}
          className={`px-5 py-1.5 rounded-full font-black text-sm transition-all duration-300 ${loading
            ? 'bg-white/10 text-gray-500 cursor-not-allowed'
            : 'bg-[#B8FF00] text-black shadow-[0_0_15px_rgba(184,255,0,0.2)] hover:bg-[#B8FF00]/90 active:scale-95'
            }`}
        >
          {loading ? '发布中' : '发布'}
        </button>
      </div>

      <div className="p-5">
        <div className="space-y-6">
          {/* Content Input */}
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="分享你的训练心得..."
              className="w-full bg-transparent border-none focus:ring-0 p-0 min-h-[140px] text-lg leading-relaxed resize-none placeholder-gray-600"
            />
          </div>

          {/* Media Grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-icons-round text-white text-[14px]">close</span>
                  </button>
                </div>
              ))}
              <button className="aspect-square rounded-xl bg-[#1a1a1a] border border-white/5 hover:border-white/20 border-dashed flex items-center justify-center transition-colors">
                <span className="material-icons-round text-gray-500 text-3xl">add</span>
              </button>
            </div>
          )}

          <hr className="border-white/5 my-4" />

          {/* Topics & Tags */}
          <div>
            <div className="flex items-center gap-1 mb-3">
              <span className="material-icons-round text-[#B8FF00] text-sm">tag</span>
              <label className="text-sm font-bold text-white/90 tracking-wide">添加话题</label>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {PRESET_TOPICS.map((topic, i) => {
                const isActive = tags.includes(topic);
                return (
                  <button
                    key={i}
                    onClick={() => toggleTag(topic)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-1 border ${isActive
                      ? 'bg-[#B8FF00]/10 text-[#B8FF00] border-[#B8FF00]/30 shadow-[0_0_10px_rgba(184,255,0,0.05)]'
                      : 'bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20'
                      }`}
                  >
                    <span className="opacity-70 text-xs">#</span> {topic}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityShare;
