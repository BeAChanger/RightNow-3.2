import React, { useState, useEffect } from 'react';

interface Props {
  onChatClick?: () => void;
}

const FloatingAdvisor: React.FC<Props> = ({ onChatClick }) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [message, setMessage] = useState<string | null>(null);

  // Mock AI proactive message
  useEffect(() => {
    const timer = setTimeout(() => {
      setMessage("检测到今日热量缺口，建议晚餐增加 50g 鸡胸肉。");
      setTimeout(() => setMessage(null), 8000);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    // Prevent default to avoid scrolling while dragging on mobile
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleClick = () => {
    if (!isDragging && onChatClick) {
      onChatClick();
    }
  };

  return (
    <div 
      className="fixed z-[100] touch-none"
      style={{ left: position.x, top: position.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Message Bubble - Clicking this also opens chat */}
      {message && (
        <div 
          onClick={handleClick}
          className="absolute right-16 top-0 w-48 bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-2xl rounded-tr-none text-xs text-gray-200 shadow-xl animate-fade-in cursor-pointer hover:bg-black/90"
        >
          <div className="flex items-center gap-2 mb-1 text-primary">
            <span className="material-icons-round text-[10px]">smart_toy</span>
            <span className="text-[10px] font-bold">AI 建议</span>
          </div>
          {message}
        </div>
      )}

      {/* The Orb */}
      <div 
        onClick={handleClick}
        className="w-14 h-14 rounded-full relative cursor-pointer group transition-transform active:scale-95"
      >
        {/* Outer Glow/Pulse */}
        <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping opacity-20"></div>
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
        
        {/* Main Body */}
        <div className="relative w-full h-full bg-[#B8FF00] rounded-full shadow-[0_0_20px_rgba(184,255,0,0.6)] flex items-center justify-center border border-white/20 overflow-hidden">
             
             {/* Subtle Shine */}
             <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>

             {/* 3 Dots Icon - Custom built with CSS to match image */}
             <div className="relative w-6 h-6 z-10">
                 {/* Large Dot (Top Right) */}
                 <div className="absolute top-0 right-0 w-3 h-3 bg-black rounded-full shadow-sm"></div>
                 {/* Medium Dot (Left) */}
                 <div className="absolute top-[8px] left-0 w-2.5 h-2.5 bg-black rounded-full shadow-sm"></div>
                 {/* Small Dot (Bottom) */}
                 <div className="absolute bottom-0 left-[8px] w-2 h-2 bg-black rounded-full shadow-sm"></div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingAdvisor;