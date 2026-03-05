import React, { useState } from 'react';
import { postsApi, uploadApi } from '../api';
import { View } from '../types';

interface ManualPostProps {
  onNavigate: (view: View) => void;
}

const ManualPost: React.FC<ManualPostProps> = ({ onNavigate }) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'PUBLIC' | 'BUDDIES_ONLY'>('PUBLIC');
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (let i = 0; i < Math.min(files.length, 9 - images.length); i += 1) {
        const result = await uploadApi.upload(files[i]);
        uploaded.push(result.url);
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    if (!content.trim() || publishing) return;

    setPublishing(true);
    try {
      await postsApi.create({ content, images, tags: [], visibility });
      onNavigate(View.Community);
    } catch (err) {
      console.error('Publish failed:', err);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-6">
      <header className="sticky top-0 z-30 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <button onClick={() => onNavigate(View.Community)} className="text-gray-400 hover:text-white">
          <span className="material-icons-round">close</span>
        </button>
        <h1 className="text-lg font-bold">发布动态</h1>
        <button
          onClick={() => void handlePublish()}
          disabled={!content.trim() || publishing}
          className={`text-sm font-bold ${content.trim() && !publishing ? 'text-[#B8FF00]' : 'text-gray-600'}`}
        >
          {publishing ? '发布中...' : '发布'}
        </button>
      </header>

      <div className="p-6 space-y-6">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="分享你的训练心得..."
          className="w-full bg-[#1A1A1A] rounded-2xl p-4 text-sm text-white placeholder-gray-500 outline-none border border-white/5 focus:border-[#B8FF00]/50 min-h-[200px] resize-none"
        />

        <div>
          <h3 className="text-xs font-bold text-gray-400 mb-3">图片（最多 9 张）</h3>
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, idx) => (
              <div key={idx} className="aspect-square bg-white/5 rounded-xl overflow-hidden relative">
                <img src={img} className="w-full h-full object-cover" alt={`Upload ${idx + 1}`} />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <span className="material-icons-round text-white text-sm">close</span>
                </button>
              </div>
            ))}
            {images.length < 9 && (
              <label className="aspect-square bg-[#1A1A1A] border border-dashed border-white/20 rounded-xl flex items-center justify-center cursor-pointer hover:border-[#B8FF00]/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <span className="material-icons-round text-gray-500 text-3xl">
                  {uploading ? 'hourglass_empty' : 'add_photo_alternate'}
                </span>
              </label>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-400 mb-3">可见范围</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setVisibility('PUBLIC')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${visibility === 'PUBLIC' ? 'bg-[#B8FF00] text-black' : 'bg-[#1A1A1A] text-gray-400'}`}
            >
              公开
            </button>
            <button
              onClick={() => setVisibility('BUDDIES_ONLY')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${visibility === 'BUDDIES_ONLY' ? 'bg-[#B8FF00] text-black' : 'bg-[#1A1A1A] text-gray-400'}`}
            >
              仅搭子可见
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualPost;
