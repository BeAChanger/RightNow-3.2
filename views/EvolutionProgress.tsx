import React, { useState, useRef } from 'react';
import { View } from '../types';

interface Props {
  onBack: () => void;
  onNavigate?: (view: View) => void;
}

const STAGES = [
  { id: 0, label: 'Current', img: '/progress/ori.png', bodyFat: '28%' },
  { id: 1, label: 'Phase 1', img: '/progress/25%.png', bodyFat: '25%' },
  { id: 2, label: 'Phase 2', img: '/progress/21%.png', bodyFat: '21%' },
  { id: 3, label: 'Phase 3', img: '/progress/18%.png', bodyFat: '18%' },
  { id: 4, label: 'Phase 4', img: '/progress/15%.png', bodyFat: '15%' },
  { id: 5, label: 'Phase 5', img: '/progress/12%.png', bodyFat: '12%' },
  { id: 6, label: 'Goal', img: '/progress/Z.png', bodyFat: '10%' }
];

const EvolutionProgress: React.FC<Props> = ({ onBack }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const width = e.currentTarget.clientWidth;
    const x = e.clientX;

    // Tap Left 30% -> Prev
    if (x < width * 0.4) {
      if (activeIndex > 0) setActiveIndex(prev => prev - 1);
    }
    // Tap Right 30% -> Next
    else {
      if (activeIndex < STAGES.length - 1) setActiveIndex(prev => prev + 1);
    }
  };

  const currentStage = STAGES[activeIndex];

  return (
    <div
      onClick={handleTap}
      className="h-screen bg-[#050505] flex flex-col relative overflow-hidden font-sans select-none cursor-pointer"
    >

      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0 flex items-end justify-center perspective-[1200px] overflow-hidden pointer-events-none">
        {STAGES.map((stage, idx) => {
          // Logic for "Target" Animation
          let transformClass = '';
          let opacityClass = '';

          if (idx === activeIndex) {
            // Active: Pop up
            transformClass = 'rotate-x-0 scale-100 brightness-110';
            opacityClass = 'opacity-100';
          } else if (idx < activeIndex) {
            // Past: Fallen down (backward)
            transformClass = 'rotate-x-90 scale-90 brightness-50';
            opacityClass = 'opacity-0';
          } else {
            // Future: Hidden (waiting to pop)
            transformClass = 'rotate-x-90 scale-90 brightness-50';
            opacityClass = 'opacity-0';
          }

          return (
            <div
              key={stage.id}
              className={`absolute bottom-0 w-full max-w-lg h-[85vh] origin-bottom transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${transformClass} ${opacityClass} will-change-transform`}
            >
              <img
                src={stage.img}
                className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                alt={`Stage ${idx}`}
              />
            </div>
          );
        })}

        {/* Floor Reflection/Shadow */}
        <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-black via-black/80 to-transparent z-10"></div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-6 z-20 pointer-events-none">
        <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="pointer-events-auto group w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 hover:scale-105 transition-all">
          <span className="material-icons-round group-active:rotate-90 transition-transform">close</span>
        </button>
        <div className="px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-[#B8FF00]/30 shadow-[0_0_15px_rgba(184,255,0,0.1)]">
          <span className="text-[10px] text-[#B8FF00] font-black tracking-widest uppercase">Target Mode</span>
        </div>
        <div className="w-10 h-10"></div>
      </div>

      <div className="flex-1"></div>

      {/* Click Hints */}
      <div className="absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-black/10 to-transparent z-10 hover:bg-white/5 transition-colors group/left">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover/left:opacity-100 transition-opacity backdrop-blur">
          <span className="material-icons-round text-white">arrow_back</span>
        </div>
      </div>
      <div className="absolute inset-y-0 right-0 w-[60%] bg-gradient-to-l from-black/10 to-transparent z-10 hover:bg-white/5 transition-colors group/right">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover/right:opacity-100 transition-opacity backdrop-blur">
          <span className="material-icons-round text-white">arrow_forward</span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="z-20 w-full bg-gradient-to-t from-black via-black/90 to-transparent pt-12 pb-12 px-8 pointer-events-none">

        {/* Stage Info */}
        <div className="flex flex-col items-center text-center">
          <h2 className="text-[#B8FF00] font-black text-6xl italic tracking-tighter drop-shadow-[0_0_10px_rgba(184,255,0,0.4)] mb-2">
            {currentStage.bodyFat}
            <span className="text-2xl not-italic ml-1 text-white/50 font-medium">Fat</span>
          </h2>
          <p className="text-white/60 text-xs tracking-[0.3em] uppercase mb-6">{currentStage.label}</p>

          {/* Progress Dots */}
          <div className="flex gap-2">
            {STAGES.map((_, idx) => (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === activeIndex ? 'bg-[#B8FF00] w-4' : 'bg-white/20'}`}
              ></div>
            ))}
          </div>

          <p className="mt-4 text-[9px] text-gray-500 uppercase tracking-widest animate-pulse">
            Tap Left / Right to Switch
          </p>
        </div>
      </div>

      {/* Global CSS for 3D transforms if not tailored in config */}
      <style>{`
        .perspective-[1200px] { perspective: 1200px; }
        .rotate-x-90 { transform: rotateX(90deg); }
        .rotate-x-0 { transform: rotateX(0deg); }
        .origin-bottom { transform-origin: bottom center; }
        .will-change-transform { will-change: transform, opacity; }
      `}</style>
    </div>
  );
};

export default EvolutionProgress;