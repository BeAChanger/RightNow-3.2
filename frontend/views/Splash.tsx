import React from 'react';

interface Props {
  onComplete: () => void;
}

const Splash: React.FC<Props> = ({ onComplete }) => {
  return (
    <div
      className="h-screen w-full relative overflow-hidden cursor-pointer bg-black group"
      onClick={onComplete}
    >
      {/* Background Image Container */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {/* 
           TODO: 请将下方的 src 替换为您本地的那张“林荫大道”图片路径 
           例如: src="/assets/splash_tree.jpg" 
        */}
        <img
          src="/assets/splash_bg.jpg"
          alt="Future Path"
          className="w-full h-full object-cover animate-[zoom_25s_ease-out_infinite] opacity-80 group-active:scale-105 transition-transform duration-700"
        />
        {/* Warm Overlay to match the autumn/warm vibe of the user's photo */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-[#3a2f05]/20 to-black/20 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Pulsing "Ghost" Text Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pb-16">
        <div className="mix-blend-overlay">
          <h1
            className="text-2xl md:text-4xl font-serif text-white/90 tracking-[0.5em] font-light text-center leading-relaxed select-none"
            style={{ animation: 'breathe 5s ease-in-out infinite' }}
          >
            点击遇见<br />
            <span className="font-normal text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">未来的自己</span>
          </h1>
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-12 w-full text-center">
        <div className="w-px h-12 bg-gradient-to-b from-transparent via-white/50 to-transparent mx-auto animate-pulse"></div>
        <p className="text-[10px] text-white/30 tracking-widest mt-2 uppercase">Tap to Start</p>
      </div>

      <style>{`
        @keyframes zoom {
          0% { transform: scale(1); }
          50% { transform: scale(1.10); }
          100% { transform: scale(1); }
        }
        @keyframes breathe {
          0%, 100% { 
            opacity: 0.4; 
            filter: blur(1px); 
            transform: scale(0.98);
          }
          50% { 
            opacity: 1; 
            filter: blur(0px); 
            transform: scale(1.02);
            text-shadow: 0 0 30px rgba(184, 255, 0, 0.2);
          }
        }
      `}</style>
    </div>
  );
};

export default Splash;
