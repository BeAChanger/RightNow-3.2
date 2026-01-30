import React from 'react';

interface Props {
  onClose: () => void;
}

const CheckInShare: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="min-h-screen bg-[#020202] text-white flex flex-col items-center justify-center p-6 relative z-50 animate-fade-in">
        {/* Main Poster Card */}
        <div className="w-full max-w-sm bg-[#0a0a0a] rounded-[32px] overflow-hidden border border-white/5 shadow-2xl relative group">
             
             {/* Poster Image Area */}
             <div className="aspect-[3/4] relative">
                 <img 
                    src="https://images.unsplash.com/photo-1549476464-37392f717541?q=80&w=1000&auto=format&fit=crop" 
                    className="w-full h-full object-cover" 
                    alt="Fitness Model"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#4a5e42] via-transparent to-transparent opacity-60"></div>
                 
                 {/* Overlay Text */}
                 <div className="absolute top-8 left-0 right-0 text-center">
                     <h3 className="text-xs font-bold tracking-[0.1em] text-white/90 uppercase mb-1">Fitness Achievement</h3>
                     <p className="text-[8px] text-white/60 tracking-widest uppercase">Natural Fitness Work</p>
                 </div>

                 <div className="absolute bottom-8 left-8">
                     <p className="text-[10px] text-white/60 font-serif tracking-widest mb-1">WORKOUT DAY</p>
                     <p className="text-5xl font-serif text-white/90">DAY 42</p>
                 </div>
             </div>

             {/* Content Below Image */}
             <div className="p-8 text-center bg-[#0a0a0a]">
                 <h2 className="text-2xl font-serif font-bold mb-3">今日打卡已达成</h2>
                 <p className="text-sm text-gray-500 mb-8 font-serif">坚持不懈，看见更好的自己</p>

                 <div className="flex justify-center gap-8 mb-4">
                     <div className="flex items-center gap-2 text-sm text-gray-300">
                         <span>燃脂中</span>
                         <span className="text-lg">🔥</span>
                     </div>
                     <div className="w-px h-6 bg-white/10"></div>
                     <div className="flex items-center gap-2 text-sm text-gray-300">
                         <span>增肌中</span>
                         <span className="text-lg">💪</span>
                     </div>
                 </div>
             </div>
        </div>

        {/* Action Button */}
        <button 
           onClick={onClose}
           className="w-full max-w-sm mt-8 bg-primary hover:bg-primary-dark text-black font-bold text-lg py-4 rounded-full shadow-[0_0_25px_rgba(184,255,0,0.3)] active:scale-[0.98] transition-all relative overflow-hidden"
        >
            <span className="relative z-10">太棒啦！一键分享</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300"></div>
        </button>
        
        {/* Footer Branding */}
        <div className="mt-8 text-[10px] text-gray-600 font-serif tracking-[0.3em] uppercase flex items-center gap-4">
            <span>Rightnow Fitness</span>
            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
            <span>进化不止</span>
        </div>
    </div>
  );
};

export default CheckInShare;