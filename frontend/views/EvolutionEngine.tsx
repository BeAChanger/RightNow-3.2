import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View } from '../types';
import { chatWithGemini, chatWithImage, generateIdealBody, getEvolutionAnalyzeBodyPrompt, getEvolutionFaceMergeRefinementText, getEvolutionRefinementAckPrompt } from '../services/gemini';
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

interface ChatMsg {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  image?: string;
  tags?: string[];
  isTyping?: boolean;
  quickReplies?: string[];
}

const bodyStyleLabels: Record<string, string> = {
  slim: '薄肌型 · 线条分明',
  athletic: '力量型 · 均衡发展',
  muscular: '健美型 · 大框架',
  comic: '漫画型 · 轻盈纤细',
  custom: '自定义理想体型',
};

const EvolutionEngine: React.FC<Props> = ({
  userImage, userFaceImage, bodyStyle, gender, authUser, onComplete, onNavigate,
}) => {
  const [sliderVal, setSliderVal] = useState(50);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);

  const beforeSrc = userImage || '/ori.png';

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMsg = useCallback((msg: Omit<ChatMsg, 'id'>) => {
    setMessages(prev => [...prev, { ...msg, id: Date.now() + Math.random() }]);
  }, []);

  const addTyping = useCallback(() => {
    const id = Date.now() + Math.random();
    setMessages(prev => [...prev, { id, text: '...', sender: 'ai', isTyping: true }]);
    return id;
  }, []);

  const removeTyping = useCallback((typingId: number) => {
    setMessages(prev => prev.filter(m => m.id !== typingId));
  }, []);

  const handleConfirmComplete = async () => {
    onComplete(generatedImage, null);
  };

  const updateSliderFromClientX = useCallback((clientX: number) => {
    const rect = comparisonRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const nextValue = ((clientX - rect.left) / rect.width) * 100;
    setSliderVal(Math.min(100, Math.max(0, nextValue)));
  }, []);

  const handleSliderPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    updateSliderFromClientX(e.clientX);

    const handleMove = (event: PointerEvent) => {
      updateSliderFromClientX(event.clientX);
    };

    const stopDragging = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);
  }, [updateSliderFromClientX]);

  // Initial AI analysis on mount — focus on "PS yourself"
  useEffect(() => {
    const styleLabel = bodyStyleLabels[bodyStyle || ''] || bodyStyle || '均衡健康';
    addMsg({ text: `正在分析你的身体数据，目标方向：「${styleLabel}」...`, sender: 'ai' });

    const timer = setTimeout(async () => {
      if (userImage) {
        const typingId = addTyping();
        const analysis = await chatWithImage(
          await getEvolutionAnalyzeBodyPrompt(styleLabel),
          userImage,
        );
        removeTyping(typingId);
        addMsg({
          text: analysis,
          sender: 'ai',
          tags: ['✨ 体态分析', '🎯 开始 PS'],
        });
      } else {
        addMsg({
          text: `好的，你的目标是「${styleLabel}」体型。现在你可以告诉我想怎么调整，比如"手臂再粗一点"、"腰再细一些"，我来帮你 PS 理想身材。`,
          sender: 'ai',
        });
      }

      // Prompt user to start PS
      setTimeout(() => {
        addMsg({
          text: '你可以描述想要的调整，也可以上传正脸照来做脸部融合。试试看？',
          sender: 'ai',
          quickReplies: ['手臂再粗一点', '腰再细一些', '整体更有线条感'],
        });
      }, 1500);

      // Auto-generate ideal body image in background (with fallback)
      setIsGenerating(true);
      (async () => {
        // 第一次尝试：带用户照片
        let img = await generateIdealBody({
          currentImageBase64: userImage || undefined,
          targetStyle: bodyStyle || 'athletic',
          gender: gender || 'male',
        });

        // Fallback 1：带照片失败时，用更保守的 prompt 再试一次
        if (!img && userImage) {
          addMsg({ text: '正在优化生成方式...', sender: 'ai' });
          img = await generateIdealBody({
            currentImageBase64: userImage,
            targetStyle: bodyStyle || 'athletic',
            gender: gender || 'male',
            conservative: true,
          });
        }

        // Fallback 2：如果仍失败，用纯文字再试一次
        if (!img && userImage) {
          addMsg({ text: '正在用另一种方式生成...', sender: 'ai' });
          img = await generateIdealBody({
            targetStyle: bodyStyle || 'athletic',
            gender: gender || 'male',
          });
        }

        if (img) {
          setGeneratedImage(img);
          addMsg({ text: '理想身材预览图已生成！滑动对比看看效果，不满意可以继续调整。', sender: 'ai' });
        } else {
          addMsg({
            text: '图片生成暂时遇到问题，你可以点击「重新生成」再试一次，或者先通过对话描述你想要的调整。',
            sender: 'ai',
            quickReplies: ['重新生成'],
          });
        }
        setIsGenerating(false);
      })();
    }, 1200);

    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle sending messages — PS refinement mode
  const handleSend = async (text: string) => {
    if (!text.trim() || isGenerating) return;
    addMsg({ text, sender: 'user' });
    setInputValue('');

    const isRetry = text === '重新生成';

    if (!isRetry) {
      // Use Gemini to acknowledge
      const typingId = addTyping();
      const reply = await chatWithGemini(
        await getEvolutionRefinementAckPrompt(text),
      );
      removeTyping(typingId);
      addMsg({ text: reply, sender: 'ai' });
    } else {
      addMsg({ text: '好的，正在重新生成...', sender: 'ai' });
    }

    // Generate / regenerate image (with fallback)
    setIsGenerating(true);
    let img = await generateIdealBody({
      currentImageBase64: userImage || undefined,
      targetStyle: bodyStyle || 'athletic',
      gender: gender || 'male',
      refinement: isRetry ? undefined : text,
    });

    // Fallback 1：带照片失败时，用更保守的 prompt 再试
    if (!img && userImage) {
      addMsg({ text: '正在优化生成方式...', sender: 'ai' });
      img = await generateIdealBody({
        currentImageBase64: userImage,
        targetStyle: bodyStyle || 'athletic',
        gender: gender || 'male',
        refinement: isRetry ? undefined : text,
        conservative: true,
      });
    }

    // Fallback 2：带照片仍失败时用纯文字再试
    if (!img && userImage) {
      addMsg({ text: '正在用另一种方式生成...', sender: 'ai' });
      img = await generateIdealBody({
        targetStyle: bodyStyle || 'athletic',
        gender: gender || 'male',
        refinement: isRetry ? undefined : text,
      });
    }

    if (img) {
      setGeneratedImage(img);
      addMsg({ text: '已生成！滑动对比看看效果，还可以继续调整。', sender: 'ai' });
    } else {
      addMsg({
        text: '生成遇到问题，可以再试一次。',
        sender: 'ai',
        quickReplies: ['重新生成'],
      });
    }
    setIsGenerating(false);
  };

  const renderBottomActions = () => (
    <div className="shrink-0 pb-4 space-y-2">
      {/* Face replacement button */}
      <button
        onClick={() => faceInputRef.current?.click()}
        disabled={isGenerating}
        className="w-full py-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all border border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
      >
        <span className="material-icons-round text-sm text-[#B8FF00]">face_retouching_natural</span>
        <span>{faceImage ? '重新上传正脸照' : '脸部替换 · 上传正脸照融合'}</span>
      </button>

      {/* Confirm button */}
      <button
        onClick={handleConfirmComplete}
        disabled={isGenerating}
        className={`w-full py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all ${
          isGenerating
            ? 'bg-white/10 text-white/30 cursor-not-allowed'
            : 'bg-[#B8FF00] text-black shadow-[0_0_25px_rgba(184,255,0,0.3)]'
        }`}
      >
        <span>{isGenerating ? '显化中' : '满意了，开始显化之旅'}</span>
        <span className="material-icons-round text-lg">arrow_forward</span>
      </button>
    </div>
  );

  const renderComparison = () => (
    <div
      ref={comparisonRef}
      className="flex-1 relative w-full overflow-hidden bg-black touch-none select-none"
      style={{ minHeight: '35%' }}
      onPointerDown={handleSliderPointerDown}
    >
      <div className="absolute inset-0">
        {/* Future layer (background) */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#B8FF00]/20 rounded-full blur-[80px]" />
          {generatedImage && <img src={generatedImage} className="absolute inset-0 w-full h-full object-contain" alt="Ideal" />}
          <div className="absolute top-16 right-5 bg-black/60 px-3 py-1 rounded-full text-[10px] text-[#B8FF00] border border-[#B8FF00]/30 z-10">未来</div>
        </div>

        {/* Current layer (foreground, clipped by slider) */}
        <div className="absolute inset-y-0 left-0 overflow-hidden border-r border-white/30" style={{ width: `${sliderVal}%`, zIndex: 10 }}>
          <div className="absolute inset-0 w-screen h-full bg-gradient-to-br from-gray-800 to-gray-900">
            <img src={beforeSrc} className="absolute inset-0 w-full h-full object-contain opacity-80" alt="Current" />
          </div>
          <div className="absolute top-16 left-5 bg-black/60 px-3 py-1 rounded-full text-[10px] text-gray-400 border border-white/10 z-10">现在</div>
        </div>

        {/* Slider handle */}
        <div
          className="absolute top-0 bottom-0 w-10 flex items-center justify-center -ml-5 z-20 cursor-ew-resize touch-none"
          style={{ left: `${sliderVal}%` }}
        >
          <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/50 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            <span className="material-icons-round text-white text-sm">code</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInput = () => (
    <div className="shrink-0 mb-2">
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-2 py-1.5">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
          placeholder="描述想要的调整，如「手臂再粗一点」..."
          className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 outline-none px-2"
        />
        <button
          onClick={() => handleSend(inputValue)}
          disabled={isGenerating || !inputValue.trim()}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isGenerating || !inputValue.trim() ? 'text-gray-500 bg-white/5' : 'bg-[#B8FF00] text-black'
          }`}
        >
          <span className="material-icons-round text-base">send</span>
        </button>
      </div>
    </div>
  );

  const renderChatPanel = () => (
    <div className={`bg-[#030305] border-t border-white/10 transition-all duration-300 ${isChatOpen ? 'h-[50%]' : 'h-14'}`}>
      {/* Drag handle */}
      <div className="flex justify-center pt-2 pb-1 cursor-pointer" onClick={() => setIsChatOpen(!isChatOpen)}>
        <div className="w-10 h-1 bg-white/20 rounded-full" />
      </div>

      {isChatOpen && (
        <div className="flex flex-col h-[calc(100%-20px)] px-4">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-2 no-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} max-w-[90%]`}>
                  {msg.sender === 'ai' && (
                    <div className="w-5 h-5 rounded-full bg-[#B8FF00]/20 flex items-center justify-center mr-1.5 mt-1 shrink-0">
                      <span className="material-icons-round text-[9px] text-[#B8FF00]">smart_toy</span>
                    </div>
                  )}
                  <div className={`p-2.5 rounded-2xl text-xs leading-relaxed ${
                    msg.isTyping ? 'bg-white/5 text-gray-400 animate-pulse' :
                    msg.sender === 'user' ? 'bg-[#B8FF00] text-black rounded-tr-none' :
                    'bg-white/10 text-gray-200 rounded-tl-none'
                  }`}>
                    {msg.text}
                    {msg.image && <img src={msg.image} className="mt-2 w-14 h-14 object-cover rounded-lg" alt="" />}
                  </div>
                </div>

                {/* Tags */}
                {msg.tags && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5 ml-7">
                    {msg.tags.map((tag, i) => (
                      <span key={i} className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-[10px] text-gray-300">{tag}</span>
                    ))}
                  </div>
                )}

                {/* Quick replies */}
                {msg.quickReplies && (
                  <div className="flex flex-wrap gap-1.5 mt-2 ml-7">
                    {msg.quickReplies.map((reply, i) => (
                      <button key={i} onClick={() => handleSend(reply)}
                        disabled={isGenerating}
                        className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-[10px] text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          {renderInput()}

          {/* Bottom actions */}
          {renderBottomActions()}
        </div>
      )}
    </div>
  );

  // RENDER
  return (
    <div className="h-screen bg-[#030303] flex flex-col relative overflow-hidden">
      <input type="file" ref={faceInputRef} accept="image/*" className="hidden" onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          setFaceImage(base64);
          addMsg({ text: '已上传正脸照', sender: 'user', image: base64 });
          addMsg({ text: '收到，正在将你的面部特征与理想身材融合...', sender: 'ai' });

          const faceMergeRefinement = await getEvolutionFaceMergeRefinementText();
          setIsGenerating(true);
          let img = await generateIdealBody({
            currentImageBase64: generatedImage || userImage || undefined,
            referenceImageBase64: base64,
            targetStyle: bodyStyle || 'athletic',
            gender: gender || 'male',
            refinement: faceMergeRefinement,
          });
          if (!img) {
            addMsg({ text: '正在优化融合方式...', sender: 'ai' });
            img = await generateIdealBody({
              currentImageBase64: generatedImage || userImage || undefined,
              referenceImageBase64: base64,
              targetStyle: bodyStyle || 'athletic',
              gender: gender || 'male',
              refinement: faceMergeRefinement,
              conservative: true,
            });
          }
          if (img) {
            setGeneratedImage(img);
            addMsg({ text: '脸部融合完成！滑动对比看看效果。', sender: 'ai' });
          } else {
            addMsg({ text: '融合遇到问题，请稍后重试。', sender: 'ai' });
          }
          setIsGenerating(false);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
      }} />

      {/* Top Bar */}
      <div className="px-5 pt-4 pb-2 z-20 flex justify-between items-center bg-black/60 backdrop-blur-md">
        <h1 className="text-base font-bold text-white tracking-wide">AI 共创 · 理想态</h1>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
          <span className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-[#B8FF00] animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-[10px] text-gray-300">{isGenerating ? '显化中' : '已就绪'}</span>
        </div>
      </div>

      {/* Image Comparison Area */}
      {renderComparison()}

      {/* Chat Panel */}
      {renderChatPanel()}
    </div>
  );
};

export default EvolutionEngine;
