import React, { useRef, useState } from 'react';
import { getApiErrorMessage, trainingSessionApi, uploadApi } from '../api';
import { View } from '../types';

interface Props {
  onBack: () => void;
  onNavigate?: (view: View, data?: any) => void;
  sessionId: string;
  sessionData?: any;
}

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

const TrainingConfirm: React.FC<Props> = ({ onBack, onNavigate, sessionId, sessionData: _sessionData }) => {
  const [duration, setDuration] = useState(60);
  const [description, setDescription] = useState('');
  const [todayFeeling, setTodayFeeling] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getLocalDateString = (): string => {
    const now = new Date();
    const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localTime.toISOString().slice(0, 10);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('仅支持图片文件');
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      setError('图片不能超过 10MB');
      return;
    }

    setError('');
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (saving) {
      return;
    }

    const normalizedDescription = description.trim();
    if (!normalizedDescription) {
      setError('请填写训练内容');
      return;
    }

    const normalizedDuration = Number.isFinite(duration)
      ? Math.max(0, Math.round(duration))
      : 0;

    setSaving(true);
    setError('');

    try {
      let photoUrl: string | undefined;
      if (selectedFile) {
        const uploadResult = await uploadApi.upload(selectedFile);
        photoUrl = uploadResult.url;
      }

      await trainingSessionApi.complete(sessionId, {
        description: normalizedDescription,
        duration: normalizedDuration,
        todayFeeling: todayFeeling.trim() || undefined,
        photoUrl,
        date: getLocalDateString(),
      });

      onNavigate?.(View.ActionCenter);
    } catch (e: any) {
      setError(getApiErrorMessage(e, '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col font-sans">
      <div className="px-6 pt-12 pb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">确认训练记录</h1>
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
        >
          <span className="material-icons-round text-white/70">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-32">
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">时长 *</label>
          <input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(Math.max(0, Number.parseInt(e.target.value, 10) || 0))}
            className="w-full bg-[#111] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#B8FF00]/50"
            placeholder="分钟"
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">动作 / 组数 *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[#111] border border-white/10 rounded-2xl px-5 py-4 text-white min-h-[120px] resize-none focus:outline-none focus:border-[#B8FF00]/50"
            placeholder="例如：杠铃卧推 4组x10次\n哑铃飞鸟 3组x12次"
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">今日感受</label>
          <textarea
            value={todayFeeling}
            onChange={(e) => setTodayFeeling(e.target.value)}
            className="w-full bg-[#111] border border-white/10 rounded-2xl px-5 py-4 text-white min-h-[80px] resize-none focus:outline-none focus:border-[#B8FF00]/50"
            placeholder="状态如何？有什么收获？"
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">照片</label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 border-2 border-dashed border-gray-700 hover:border-[#B8FF00]/40 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-300 transition-all bg-[#111]/50 overflow-hidden"
          >
            {selectedPhoto ? (
              <img src={selectedPhoto} className="w-full h-full object-cover" alt="Preview" />
            ) : (
              <>
                <span className="material-icons-round text-3xl">add_a_photo</span>
                <span className="text-xs font-bold">添加照片</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#030303] via-[#030303] to-transparent">
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 bg-[#1a1a1a] hover:bg-[#222] text-white font-bold py-4 rounded-full transition-all"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !description.trim()}
            className="flex-1 bg-[#B8FF00] hover:bg-[#a3e000] disabled:bg-white/10 disabled:text-gray-500 text-black font-bold py-4 rounded-full transition-all flex justify-center items-center gap-2"
          >
            {saving ? '保存中...' : '确认保存'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrainingConfirm;
