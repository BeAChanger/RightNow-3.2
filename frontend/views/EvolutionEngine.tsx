import React, { useState, useEffect } from 'react';
import { View } from '../types';
import { generateIdealBodyAll3 } from '../services/gemini';
import type { AuthUser } from '../api';

interface Props {
  userImage?: string | null;
  userFaceImage?: string | null;
  bodyStyle?: string;
  gender?: 'male' | 'female';
  authUser?: AuthUser | null;
  onComplete: (generatedImage?: string | null, visualAssessment?: { currentBodyFat: number; targetBodyFat: number } | null) => void;
  onNavigate?: (view: View) => void;
}

const CARD_LABELS = ['数字美塑', '维度显化', '量子融合'];
const CARD_SUBTITLES = ['精准面部移植', '身材维度重塑', '意识量子叠加'];
const CARD_ROTATIONS = [-6, 0, 6];

const EvolutionEngine: React.FC<Props> = ({
  userImage, bodyStyle, gender, onComplete,
}) => {
  const [images, setImages] = useState<Array<string | null>>([null, null, null]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generate = async () => {
    setIsGenerating(true);
    setImages([null, null, null]);
    setSelectedIdx(null);
    setErrorMessage(null);
    const results = await generateIdealBodyAll3({
      currentImageBase64: userImage || undefined,
      targetStyle: bodyStyle || 'athletic',
      gender: gender || 'male',
    });
    setImages(results);
    if (!results.some(Boolean)) {
      setErrorMessage('生图服务暂时受限，请稍后再试或检查中转站额度。');
    }
    setIsGenerating(false);
  };

  useEffect(() => { generate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-screen bg-[#030303] flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="px-5 pt-4 pb-3 flex justify-between items-center bg-black/60 backdrop-blur-md">
        <h1 className="text-base font-bold text-white tracking-wide">AI 共创 · 理想态</h1>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
          <span className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-[#B8FF00] animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-[10px] text-gray-300">{isGenerating ? '显化中' : '已就绪'}</span>
        </div>
      </div>

      {/* Main — cards */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
        <p className="text-sm text-center text-gray-400">
          {isGenerating
            ? '正在为你生成三个理想身材版本...'
            : errorMessage
              ? errorMessage
            : selectedIdx === null
              ? '点击选择你满意的理想身材版本'
              : `已选择「${CARD_LABELS[selectedIdx]}」`}
        </p>

        {errorMessage && !isGenerating ? (
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-6 text-center">
            <span className="material-icons-round mb-3 text-3xl text-white/35">hourglass_empty</span>
            <p className="text-sm font-bold text-white/80">暂时没有生成可用图片</p>
            <p className="mt-2 text-xs leading-5 text-white/45">当前中转站返回繁忙或限流，请稍后点击下方按钮重新生成。</p>
          </div>
        ) : (
          <div className="flex items-end justify-center gap-4">
            {[0, 1, 2].map(i => {
              const isSelected = selectedIdx === i;
              const isDimmed = selectedIdx !== null && !isSelected;
              return (
                <div
                  key={i}
                  onClick={() => !isGenerating && images[i] && setSelectedIdx(i)}
                  className={`relative transition-all duration-300 ${!isGenerating && images[i] ? 'cursor-pointer' : 'cursor-default'}`}
                  style={{
                    transform: `rotate(${isSelected ? 0 : CARD_ROTATIONS[i]}deg) scale(${isSelected ? 1.1 : 0.95})`,
                    opacity: isDimmed ? 0.45 : 1,
                  }}
                >
                  {/* Card */}
                  <div className={`w-[105px] h-[170px] rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                    isSelected
                      ? 'border-[#B8FF00] shadow-[0_0_28px_rgba(184,255,0,0.55)]'
                      : 'border-white/15'
                  }`}>
                    {isGenerating || images[i] === null ? (
                      <div className={`w-full h-full bg-gradient-to-br from-[#0f1a0f] to-[#0a0a0a] flex items-center justify-center ${isGenerating ? 'animate-pulse' : ''}`}>
                        <div className="w-8 h-8 rounded-full border-2 border-[#B8FF00]/30 border-t-[#B8FF00] animate-spin" />
                      </div>
                    ) : (
                      <img src={images[i]!} alt={CARD_LABELS[i]} className="w-full h-full object-cover" />
                    )}
                  </div>

                  {/* Check badge */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#B8FF00] flex items-center justify-center shadow-lg">
                      <span className="material-icons-round text-black text-sm">check</span>
                    </div>
                  )}

                  {/* Label */}
                  <div className={`mt-2 text-center transition-colors ${isSelected ? 'text-[#B8FF00]' : 'text-gray-500'}`}>
                    <p className="text-[11px] font-bold">{CARD_LABELS[i]}</p>
                    <p className="text-[9px] mt-0.5">{CARD_SUBTITLES[i]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="px-5 pb-8 space-y-2.5">
        {/* Confirm */}
        <button
          onClick={() => selectedIdx !== null && onComplete(images[selectedIdx], null)}
          disabled={selectedIdx === null || isGenerating || !images[selectedIdx]}
          className={`w-full py-3.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            selectedIdx !== null && !isGenerating && images[selectedIdx]
              ? 'bg-[#B8FF00] text-black shadow-[0_0_25px_rgba(184,255,0,0.3)]'
              : 'bg-white/5 text-white/30 cursor-not-allowed'
          }`}
        >
          <span>这就是理想的我！</span>
          <span className="material-icons-round text-lg">arrow_forward</span>
        </button>

        {/* Regenerate */}
        <button
          onClick={generate}
          disabled={isGenerating}
          className="w-full py-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-2 border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 disabled:opacity-40 transition-all"
        >
          <span className="material-icons-round text-sm">refresh</span>
          <span>都不满意，重新生成</span>
        </button>
      </div>
    </div>
  );
};

export default EvolutionEngine;
