import React, { useState, useRef, useEffect } from 'react';

interface Props {
  userImage?: string | null;
  onComplete: () => void;
}

const EvolutionEngine: React.FC<Props> = ({ userImage, onComplete }) => {
  const [sliderVal, setSliderVal] = useState(50);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { id: 1, text: "正在分析您的骨架结构与体脂分布...", sender: 'ai' },
  ]);
  const faceInputRef = useRef<HTMLInputElement>(null);

  // Fallback images if no user image provided (Demo mode)
  const defaultBefore = "/ori.png";
  const defaultAfter = "/Z.png";

  const beforeSrc = userImage || defaultBefore;
  // Force using Z.png for the Future view even if user uploaded an image, 
  // because we want to show the specific AI result (Z.png), not just a filter on the user image.
  const afterSrc = defaultAfter;

  // Simulate initial analysis
  useEffect(() => {
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: 2,
        text: "基于您的目标 [塑型]，我已生成初步 3D 模型。体脂率设定为 18%。",
        sender: 'ai',
        tags: ['✨ 腿部线条', '💪 腰腹更紧致', '🍑 提升臀线']
      }]);
    }, 1000);
  }, []);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now(), text: text, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputValue(""); // Clear input

    // Simulate AI response
    setTimeout(() => {
      let response = "收到。正在调整模型参数...";
      if (text.includes("腿") || text.includes("脚") || text.includes("瘦")) response = "正在针对腿部线条进行微调，拉伸肌肉比例...";
      if (text.includes("肌") || text.includes("线") || text.includes("肩")) response = "已增强肌群渲染，提升光影质感...";
      if (text.includes("脸") || text.includes("面")) response = "正在优化面部特征融合...";

      setMessages(prev => [...prev, { id: Date.now() + 1, text: response, sender: 'ai' }]);
    }, 1000);
  };

  const handleMicClick = () => {
    if (isListening) return;
    setIsListening(true);
    // Simulate voice recognition
    setInputValue("正在聆听...");
    setTimeout(() => {
      setInputValue("我想把肩膀练宽一点");
      setIsListening(false);
    }, 1500);
  };

  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setMessages(prev => [
          ...prev,
          { id: Date.now(), text: "已上传正脸照。", sender: 'user', image: reader.result as string },
          { id: Date.now() + 1, text: "正在融合面部特征，保持身材进化的同时还原您的样貌...", sender: 'ai' }
        ]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // Reset
  };

  return (
    <div className="h-screen bg-bg-dark flex flex-col relative overflow-hidden">
      <input type="file" ref={faceInputRef} accept="image/*" className="hidden" onChange={handleFaceUpload} />

      {/* Top Bar */}
      <div className="px-6 pt-4 pb-2 z-20 flex justify-between items-center bg-black/40 backdrop-blur-md">
        <h1 className="text-lg font-serif font-bold text-white tracking-wide">AI 共创 · 理想态</h1>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
          <span className="text-[10px] text-gray-300">连接中</span>
        </div>
      </div>

      {/* Main Visualizer */}
      <div className="flex-1 relative w-full overflow-hidden bg-black">
        {/* Comparison Images */}
        <div className="absolute inset-0 flex justify-center items-center">

          {/* BACKGROUND LAYER: Future (Z.png) [RIGHT SIDE LOGIC] */}
          {/* We place Future at the bottom, full screen. */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-900 to-black">
            {/* Ambient Glow for Future */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/20 rounded-full blur-[80px]"></div>

            <img src={afterSrc}
              className={`absolute inset-0 w-full h-full object-contain ${userImage ? 'brightness-110 contrast-125 saturate-110 sepia-[0.15]' : ''}`}
              alt="Ideal" />

            {/* Label for Future */}
            <div className="absolute top-20 right-6 bg-black/60 px-3 py-1 rounded-full text-[10px] text-primary border border-primary/30 shadow-[0_0_10px_rgba(184,255,0,0.2)] z-10">Future</div>
          </div>

          {/* FOREGROUND LAYER: Now (ori.png) [LEFT SIDE LOGIC] */}
          {/* This layer sits on top. Its WIDTH is controlled by the slider. */}
          <div
            className="absolute inset-y-0 left-0 overflow-hidden border-r border-white/30 bg-black/50" // Added darker bg to distinguish layers if transparent
            style={{ width: `${sliderVal}%`, zIndex: 10 }}
          >
            {/* We need inner container to be full width relative to SCREEN, not the parent div, to keep image static */}
            <div className="absolute inset-0 w-screen h-full bg-gradient-to-br from-gray-800 to-gray-900">
              <img src={beforeSrc}
                className="absolute inset-0 w-full h-full object-contain opacity-80"
                alt="Current" />
            </div>

            {/* Label for Now */}
            <div className="absolute top-20 left-6 bg-black/60 px-3 py-1 rounded-full text-[10px] text-gray-400 border border-white/10 z-10">Now</div>
          </div>

          {/* Handle */}
          <div
            className="absolute top-0 bottom-0 w-10 flex items-center justify-center -ml-5 z-20 cursor-ew-resize touch-none"
            style={{ left: `${sliderVal}%` }}
            onTouchMove={(e) => {
              const touch = e.touches[0];
              const val = Math.min(100, Math.max(0, (touch.clientX / window.innerWidth) * 100));
              setSliderVal(val);
            }}
          >
            <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/50 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              <span className="material-icons-round text-white text-sm">code</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface / Controls */}
      <div className={`bg-[#030305] border-t border-white/10 transition-all duration-300 ${isChatOpen ? 'h-[50%]' : 'h-16'}`}>
        <div className="flex justify-center -mt-3 mb-2 pt-2" onClick={() => setIsChatOpen(!isChatOpen)}>
          <div className="w-12 h-1 bg-white/20 rounded-full"></div>
        </div>

        <div className="flex flex-col h-full px-5 pb-6">
          {/* Messages Area */}
          {isChatOpen && (
            <div className="flex-1 overflow-y-auto space-y-4 mb-2 no-scrollbar">
              {messages.map((msg: any) => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-[90%]`}>
                    <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.sender === 'ai' && (
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2 mt-1 shrink-0">
                          <span className="material-icons-round text-[10px] text-primary">smart_toy</span>
                        </div>
                      )}
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed ${msg.sender === 'user'
                        ? 'bg-primary text-black rounded-tr-none'
                        : 'bg-white/10 text-gray-200 rounded-tl-none'
                        }`}>
                        {msg.text}
                        {msg.image && (
                          <img src={msg.image} className="mt-2 w-16 h-16 object-cover rounded-lg border border-black/10" alt="Upload" />
                        )}
                      </div>
                    </div>

                    {/* Tags Render for AI Messages */}
                    {msg.tags && (
                      <div className="flex flex-wrap gap-2 mt-2 ml-8 animate-fade-in">
                        {msg.tags.map((tag: string, i: number) => (
                          <span key={i} className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-[10px] text-gray-300 flex items-center">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Suggestion Action Button */}
                  {msg.type === 'suggestion' && (
                    <button
                      onClick={() => faceInputRef.current?.click()}
                      className="ml-10 mt-2 bg-white/5 border border-primary/30 text-primary text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-primary/10 transition-colors animate-fade-in"
                    >
                      <span className="material-icons-round text-sm">face</span>
                      上传正脸照修正
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Input Area (New) */}
          {isChatOpen && (
            <div className="shrink-0 mb-4 animate-fade-in">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-2 py-1.5">
                <button
                  onClick={handleMicClick}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-primary text-black animate-pulse' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                >
                  <span className="material-icons-round text-xl">mic</span>
                </button>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend(inputValue)}
                  placeholder="告诉我哪里想调整..."
                  className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 outline-none px-2"
                />
                <button
                  onClick={() => handleSend(inputValue)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${inputValue.trim() ? 'bg-primary text-black' : 'text-gray-500 bg-white/5'}`}
                >
                  <span className="material-icons-round text-lg">send</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions Panel */}
          {isChatOpen && (
            <div className="shrink-0">
              <p className="text-[10px] text-gray-500 mb-2 pl-1">调整指令建议：</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-2">
                <button onClick={() => handleSend("再瘦一点")} className="whitespace-nowrap bg-white/5 border border-white/10 px-4 py-2 rounded-full text-[11px] text-white hover:bg-white/10 active:bg-white/20 transition-colors flex items-center gap-1">
                  <span className="material-icons-round text-yellow-500 text-xs">bolt</span>
                  再瘦一点
                </button>
                <button onClick={() => handleSend("增加肌肉线条")} className="whitespace-nowrap bg-white/5 border border-white/10 px-4 py-2 rounded-full text-[11px] text-white hover:bg-white/10 active:bg-white/20 transition-colors flex items-center gap-1">
                  <span className="material-icons-round text-orange-500 text-xs">fitness_center</span>
                  增加肌肉线条
                </button>
                <button onClick={() => faceInputRef.current?.click()} className="whitespace-nowrap bg-white/5 border border-primary/30 px-4 py-2 rounded-full text-[11px] text-primary hover:bg-primary/10 flex items-center gap-1 active:bg-primary/20 transition-colors">
                  <span className="material-icons-round text-xs">face</span>
                  换张脸
                </button>
              </div>

              <button
                onClick={onComplete}
                className="w-full bg-primary text-black font-bold text-lg py-3 rounded-full flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-[0_0_25px_rgba(184,255,0,0.3)] hover:bg-primary-dark"
              >
                确认并生成最终 3D 模型
                <span className="material-icons-round">arrow_forward</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvolutionEngine;