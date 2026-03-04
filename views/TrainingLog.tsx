import React, { useState } from 'react';
import { View } from '../types';
import type { AiFeedbackCard } from '../types';
import { trainingApi } from '../api/training';
import { uploadApi } from '../api/upload';

interface TrainingLogProps {
  onNavigate: (view: View, data?: any) => void;
  onBack: () => void;
}

const TrainingLog: React.FC<TrainingLogProps> = ({ onNavigate, onBack }) => {
  const [description, setDescription] = useState('');
  const [feeling, setFeeling] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recordId, setRecordId] = useState('');
  const [feedbackCard, setFeedbackCard] = useState<AiFeedbackCard | null>(null);

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('当前浏览器不支持语音输入');
      return;
    }
    const recognition = new SpeechRecognition();

    recognition.lang = 'zh-CN';
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setDescription(prev => prev + ' ' + transcript);
    };
    recognition.start();
    setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadApi.upload(file);
      setPhotoUrl(result.url);
    } catch (err) {
      alert('上传失败');
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      alert('请输入训练描述');
      return;
    }

    setLoading(true);
    try {
      const result = await trainingApi.create({
        description,
        todayFeeling: feeling || undefined,
        photoUrl: photoUrl || undefined,
        date: new Date().toISOString().slice(0, 10)
      });

      setRecordId(result.record.id);
      setFeedbackCard(result.feedbackCard);
    } catch (err) {
      alert('提交失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDailyChange = async () => {
    setLoading(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      const card = await trainingApi.generateDailyChange(date);
      setFeedbackCard(card);
    } catch (err) {
      alert('生成失败');
    } finally {
      setLoading(false);
    }
  };

  const handleShareToCommunity = () => {
    onNavigate(View.CommunityShare, {
      trainingRecordId: recordId,
      feedbackCard,
      photoUrl
    });
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white pb-20">
      <div className="p-4">
        <button onClick={onBack} className="mb-4">
          <span className="material-icons-round">arrow_back</span>
        </button>

        <h1 className="text-2xl font-bold mb-6">训练记录</h1>

        {!feedbackCard ? (
          <div className="space-y-6">
            <div className="relative">
              <label className="block text-sm font-bold mb-3 text-white/90">训练描述 <span className="text-[#B8FF00]">*</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                placeholder="例如：深蹲 4组x12次 60kg"
                className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#B8FF00]/50 focus:ring-1 focus:ring-[#B8FF00]/50 rounded-xl p-4 min-h-[120px] text-white transition-all duration-300 resize-none"
              />
              <span className={`absolute bottom-3 right-3 text-xs ${description.length >= 450 ? 'text-red-400' : 'text-gray-500'}`}>
                {description.length}/500
              </span>
            </div>

            <div className="flex gap-3">
              {typeof (window as any).webkitSpeechRecognition !== 'undefined' && (
                <button
                  onClick={handleVoiceInput}
                  disabled={isRecording}
                  className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${isRecording
                    ? 'bg-[#B8FF00]/20 text-[#B8FF00] border border-[#B8FF00]/30 shadow-[0_0_15px_rgba(184,255,0,0.2)]'
                    : 'bg-[#1a1a1a] text-white border border-white/5 hover:border-white/20'
                    }`}
                >
                  <span className={`material-icons-round text-lg ${isRecording ? 'animate-pulse' : ''}`}>mic</span>
                  <span className="font-medium text-sm">{isRecording ? '正在聆听...' : '语音输入'}</span>
                  {isRecording && (
                    <div className="flex gap-1 items-center ml-1">
                      <div className="w-1 h-3 bg-[#B8FF00] rounded-full animate-[bounce_1s_infinite] delay-100"></div>
                      <div className="w-1 h-4 bg-[#B8FF00] rounded-full animate-[bounce_1s_infinite] delay-200"></div>
                      <div className="w-1 h-2 bg-[#B8FF00] rounded-full animate-[bounce_1s_infinite] delay-300"></div>
                    </div>
                  )}
                </button>
              )}

              <label className="flex-1 py-3 bg-[#1a1a1a] border border-white/5 hover:border-white/20 text-white rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-300">
                <span className="material-icons-round text-lg">photo_camera</span>
                <span className="font-medium text-sm">拍照/相册</span>
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>

            {photoUrl && (
              <div className="relative rounded-xl overflow-hidden border border-white/10 group">
                <img src={photoUrl} alt="训练照片" className="w-full object-cover max-h-[300px]" />
                <button
                  onClick={() => setPhotoUrl('')}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="material-icons-round text-white text-sm">close</span>
                </button>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold mb-3 text-white/90">今日感受</label>
              <input
                value={feeling}
                onChange={(e) => setFeeling(e.target.value)}
                placeholder="例如：状态不错，突破了重量！"
                className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#B8FF00]/50 focus:ring-1 focus:ring-[#B8FF00]/50 rounded-xl p-4 text-white transition-all duration-300"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !description.trim()}
              className={`w-full font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${!description.trim()
                ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                : 'bg-[#B8FF00] text-black hover:bg-[#B8FF00]/90 shadow-[0_0_20px_rgba(184,255,0,0.3)] active:scale-[0.98]'
                }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  生成 AI 分析报告
                  <span className="material-icons-round text-sm">auto_awesome</span>
                </>
              )}
            </button>
          </div>
        ) : loading ? (
          /* Skeleton Loader */
          <div className="space-y-4 animate-pulse">
            <div className="bg-[#1a1a1a] h-64 rounded-xl border border-white/5 p-5">
              <div className="h-6 bg-white/10 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-white/10 rounded w-full mb-2"></div>
              <div className="h-4 bg-white/10 rounded w-5/6 mb-6"></div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="h-16 bg-white/10 rounded-lg"></div>
                <div className="h-16 bg-white/10 rounded-lg"></div>
              </div>

              <div className="h-10 bg-white/10 rounded-lg w-full mt-auto"></div>
            </div>
            <div className="flex flex-col items-center justify-center mt-4">
              <div className="w-10 h-10 rounded-full bg-[#B8FF00]/20 flex items-center justify-center mb-3">
                <span className="material-icons-round text-[#B8FF00] animate-spin">sync</span>
              </div>
              <p className="text-[#B8FF00] font-medium text-sm tracking-wide">AI 正在生成深度反馈...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-up">
            {/* AI Feedback Card - Modern Redesign */}
            <div className="relative overflow-hidden rounded-2xl bg-[#1a1a1a] border border-white/10 shadow-2xl">
              {/* Top Gradient Accent */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#B8FF00] via-[#B8FF00]/50 to-transparent"></div>

              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#B8FF00]/10 flex items-center justify-center border border-[#B8FF00]/20">
                    <span className="material-icons-round text-[#B8FF00]">psychology</span>
                  </div>
                  <h2 className="text-xl font-bold tracking-wide text-white">{feedbackCard.title}</h2>
                </div>

                <p className="text-gray-300 leading-relaxed mb-6 font-medium tracking-wide">
                  {feedbackCard.content}
                </p>

                {feedbackCard.highlights && (
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {Object.entries(feedbackCard.highlights).map(([key, value]) => (
                      <div key={key} className="bg-black/40 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group hover:border-[#B8FF00]/30 transition-colors">
                        <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#B8FF00]/5 rounded-full filter blur-xl group-hover:bg-[#B8FF00]/10 transition-colors"></div>
                        <div className="text-3xl font-black text-[#B8FF00] tracking-tighter mb-1 relative z-10">{value}</div>
                        <div className="text-xs text-gray-500 font-medium relative z-10">{key}</div>
                      </div>
                    ))}
                  </div>
                )}

                {feedbackCard.encouragement && (
                  <div className="bg-[#B8FF00]/5 rounded-xl p-4 border border-[#B8FF00]/10 mb-2 relative">
                    <span className="material-icons-round text-[#B8FF00] absolute top-3 right-3 opacity-20 text-3xl">format_quote</span>
                    <p className="text-sm font-bold italic text-[#B8FF00] relative z-10">"{feedbackCard.encouragement}"</p>
                  </div>
                )}

                {feedbackCard.suggestions && (
                  <details className="mt-4 group cursor-pointer">
                    <summary className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors list-none">
                      <span className="material-icons-round text-sm group-open:rotate-90 transition-transform">chevron_right</span>
                      查看详细建议
                    </summary>
                    <div className="mt-3 text-sm text-gray-400 bg-white/5 p-4 rounded-xl border border-white/5 leading-relaxed">
                      {feedbackCard.suggestions.split('\n').map((line, idx) => (
                        <p key={idx} className="mb-1 last:mb-0">{line}</p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleGenerateDailyChange}
                disabled={loading}
                className="flex-1 bg-[#1a1a1a] hover:bg-white/5 text-white font-medium py-4 rounded-xl border border-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span className="material-icons-round text-sm">refresh</span>
                {loading ? '生成中...' : '重新生成'}
              </button>

              <button
                onClick={handleShareToCommunity}
                className="flex-[2] bg-[#B8FF00] hover:bg-[#B8FF00]/90 text-black font-black py-4 rounded-xl shadow-[0_0_15px_rgba(184,255,0,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>转发到社区</span>
                <span className="material-icons-round text-sm">ios_share</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingLog;
