import React, { useState, useEffect, useRef } from 'react';
import { View } from '../types';

interface Props {
  onChatClick?: () => void;
  hasNotification?: boolean;
  currentView?: View;
  coachReady?: boolean;
  coachMessage?: string;
  onCoachStart?: () => void;
}

const VIEW_TIPS: Partial<Record<View, string>> = {
  [View.Dashboard]: '今天的训练计划安排好了吗？点我聊聊吧',
  [View.Stats]: '数据有变化，想听听我的分析吗？',
  [View.Diet]: '拍张照片，我帮你算算热量',
  [View.Community]: '看看大家的打卡，找找灵感',
};
const DEFAULT_TIP = '有什么健身问题，随时问我';

const FloatingAdvisor: React.FC<Props> = ({ onChatClick, hasNotification = false, currentView, coachReady = false, coachMessage, onCoachStart }) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [message, setMessage] = useState<string | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const dragMovedRef = useRef(false);

  // Show contextual tip based on current page
  useEffect(() => {
    const tip = coachReady
      ? (coachMessage || '我已经分析了你的数据，点我开始你的教练之旅！')
      : hasNotification
        ? '欢迎！我是你的专属AI教练，点击我获取你的首日训练计划！'
        : ((currentView && VIEW_TIPS[currentView]) || DEFAULT_TIP);
    setMessage(null);
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    const show = window.setTimeout(() => {
      setMessage(tip);
      hideTimerRef.current = window.setTimeout(() => {
        setMessage(null);
        hideTimerRef.current = null;
      }, coachReady ? 20000 : hasNotification ? 15000 : 8000);
    }, 1000);

    return () => {
      window.clearTimeout(show);
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [currentView]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragMovedRef.current = false;
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
    if (
      Math.abs(e.clientX - (position.x + offset.x)) > 3 ||
      Math.abs(e.clientY - (position.y + offset.y)) > 3
    ) {
      dragMovedRef.current = true;
    }
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
    if (!isDragging && !dragMovedRef.current) {
      if (coachReady && onCoachStart) {
        onCoachStart();
      } else if (onChatClick) {
        onChatClick();
      }
    }
    dragMovedRef.current = false;
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
        {/* Unread Red Dot */}
        {hasNotification && (
          <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full z-20 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"></div>
        )}

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
