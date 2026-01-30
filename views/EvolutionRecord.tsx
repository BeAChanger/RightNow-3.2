import React, { useState } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { View } from '../types';

interface Props {
    onBack: () => void;
    onNavigate?: (view: View) => void;
}

// Mock Data for the Stacked Album
const EVOLUTION_HISTORY = [
    {
        id: 1,
        date: '2023.10.24',
        status: 'CURRENT',
        img: '/real_pro/z.png', // Latest
        weight: '64.5 kg'
    },
    {
        id: 2,
        date: '2023.09.15',
        status: 'RECORD',
        img: '/real_pro/m.png', // Middle
        weight: '65.2 kg'
    },
    {
        id: 3,
        date: '2023.08.01',
        status: 'START',
        img: '/real_pro/a.png', // Start
        weight: '66.9 kg'
    }
];

const EvolutionRecord: React.FC<Props> = ({ onBack, onNavigate }) => {
    // Mock data for weight chart
    const weightTrend = [
        { val: 66.9 }, { val: 66.5 }, { val: 66.0 }, { val: 65.8 }, { val: 65.2 }, { val: 64.8 }, { val: 64.5 }
    ];

    const [activeIndex, setActiveIndex] = useState(0);

    const handleNextCard = () => {
        setActiveIndex((prev) => (prev + 1) % EVOLUTION_HISTORY.length);
    };

    return (
        <div className="min-h-screen bg-bg-dark text-white pb-safe relative z-50 flex flex-col font-sans">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all">
                    <span className="material-icons-round text-white">arrow_back_ios_new</span>
                </button>
                <h1 className="text-lg font-serif font-bold tracking-widest">进化记录</h1>
                <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all">
                    <span className="material-icons-round text-white">share</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pt-2 pb-32 space-y-6">
                {/* Weight Card */}
                <div className="bg-[#151515] rounded-[32px] p-6 border border-white/5 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] text-gray-400 tracking-widest uppercase">Current Weight</span>
                        <div className="flex items-center gap-1 bg-[#2AD56F]/20 px-3 py-1 rounded-full border border-[#2AD56F]/20">
                            <span className="material-icons-round text-[#2AD56F] text-[10px]">arrow_downward</span>
                            <span className="text-[10px] font-bold text-[#2AD56F]">比30天前少 2.4 kg</span>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-5xl font-serif font-medium text-white">64.5</span>
                        <span className="text-sm text-gray-500">kg</span>
                    </div>
                    <div className="h-16 w-full opacity-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weightTrend}>
                                <Line
                                    type="monotone"
                                    dataKey="val"
                                    stroke="#2AD56F"
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 5, fill: '#2AD56F' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                        {/* Decorative gradient under line simulated via css if needed, simplified here */}
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#2AD56F]/10 to-transparent pointer-events-none"></div>
                    </div>
                </div>

                {/* STACKED CARD ALBUM AREA */}
                <div className="relative py-4 h-[500px] flex justify-center items-center perspective-1000">
                    {EVOLUTION_HISTORY.map((item, index) => {
                        // Calculate visual position based on index relative to active index
                        // We want to show: Active(0) -> Next(1) [Behind] -> Next(2) [Behind Further]
                        const offset = (index - activeIndex + EVOLUTION_HISTORY.length) % EVOLUTION_HISTORY.length;

                        // Only show top 3 cards for performance and visual clarity
                        if (offset > 2) return null;

                        const zIndex = 30 - offset * 10;
                        const scale = 1 - offset * 0.1; // Make size difference clearer
                        const translateY = offset * 45; // INCREASED SPACING: Easier to click back cards
                        const brightness = 1 - offset * 0.3; // Each card behind is darker
                        const rotate = offset % 2 === 0 ? offset * 2 : offset * -2; // Subtle random-ish rotation

                        return (
                            <div
                                key={item.id}
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent duplicate triggers
                                    if (offset === 0) onNavigate?.(View.EvolutionGallery);
                                    else handleNextCard();
                                }}
                                className="absolute w-full max-w-[320px] aspect-[3.5/5] bg-[#1a1a1a] rounded-[40px] overflow-hidden shadow-2xl ring-1 ring-white/10 transition-all duration-500 ease-out cursor-pointer"
                                style={{
                                    zIndex,
                                    transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
                                    filter: `brightness(${brightness})`,
                                    opacity: offset > 2 ? 0 : 1
                                }}
                            >
                                {/* Image */}
                                <img
                                    src={item.img}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    alt="Evolution Model"
                                />

                                {/* Gradient Overlay */}
                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent"></div>

                                {/* Content (Only visible on active card) */}
                                <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-xl px-8 py-3 rounded-2xl border border-white/20 text-center shadow-lg w-auto min-w-[160px] transition-opacity duration-300 ${offset === 0 ? 'opacity-100' : 'opacity-0'}`}>
                                    <p className="text-[8px] text-gray-300 tracking-[0.2em] uppercase mb-1 font-bold">{item.status}</p>
                                    <p className="text-xl font-serif font-bold text-white/90">{item.date}</p>
                                </div>

                                {/* Tap hint */}
                                <div className="absolute inset-0 bg-white/0 hover:bg-white/5 transition-colors"></div>
                            </div>
                        );
                    })}

                    {/* Stack Hint */}
                    <div className="absolute top-0 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full pointer-events-none z-40">
                        <span className="text-[10px] font-bold text-gray-400">{activeIndex + 1} / {EVOLUTION_HISTORY.length}</span>
                    </div>
                </div>

                {/* Measurements Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Waist */}
                    <div className="bg-[#151515] rounded-[32px] p-5 border border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-400 text-xs">腰围</span>
                            <span className="bg-[#2AD56F]/10 text-[#2AD56F] text-[10px] px-2 py-0.5 rounded-full font-bold">↓ 4.2%</span>
                        </div>
                        <div className="flex items-baseline gap-1 mb-3">
                            <span className="text-3xl font-serif text-white">68.0</span>
                            <span className="text-[10px] text-gray-500 uppercase font-bold">CM</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-full relative">
                            <div className="absolute inset-0 bg-[#2AD56F] w-3/4 rounded-full"></div>
                        </div>
                    </div>

                    {/* Hips */}
                    <div className="bg-[#151515] rounded-[32px] p-5 border border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-400 text-xs">臀围</span>
                            <span className="bg-[#2AD56F]/10 text-[#2AD56F] text-[10px] px-2 py-0.5 rounded-full font-bold">↓ 2.1%</span>
                        </div>
                        <div className="flex items-baseline gap-1 mb-3">
                            <span className="text-3xl font-serif text-white">92.0</span>
                            <span className="text-[10px] text-gray-500 uppercase font-bold">CM</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-full relative">
                            <div className="absolute inset-0 bg-[#2AD56F] w-[90%] rounded-full"></div>
                        </div>
                    </div>
                </div>

                {/* AI Analysis */}
                <div className="bg-[#151515] rounded-[32px] p-6 border border-white/5 relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#2AD56F]/20 flex items-center justify-center">
                                <span className="material-icons-round text-[#2AD56F] text-sm">auto_awesome</span>
                            </div>
                            <h2 className="text-base font-serif font-bold text-white">AI 智能分析</h2>
                        </div>
                        <span className="text-[10px] text-gray-500 font-serif tracking-widest uppercase">Real-Time</span>
                    </div>

                    <p className="text-sm text-gray-300 leading-relaxed font-serif italic relative z-10 opacity-90">
                        “历史记录显示，你的体态变化在第 3 个周期最为显著。现在的腰臀比已经进入理想区间，建议拍照记录此刻状态。”
                    </p>

                    {/* Background decoration */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#2AD56F]/5 rounded-full blur-3xl group-hover:bg-[#2AD56F]/10 transition-colors duration-500"></div>
                </div>
            </div>

            {/* Footer Button */}
            <div className="fixed bottom-6 left-6 right-6 z-50">
                <button className="w-full bg-[#2AD56F] hover:bg-[#25b860] active:scale-[0.98] transition-all text-black font-bold text-lg py-4 rounded-full flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(42,213,111,0.4)]">
                    <span>查看深度报告</span>
                    <span className="material-icons-round">arrow_forward</span>
                </button>
            </div>
        </div>
    );
};

export default EvolutionRecord;