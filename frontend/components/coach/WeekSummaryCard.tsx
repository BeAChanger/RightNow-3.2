import React from 'react';

export interface WeekSummaryData {
    daysCompleted: number;
    totalWorkouts: number;
    aiPraise: string;
    badgeLevel: string; // e.g. "青铜斗士", "白银标杆", "黄金自律"
    userFeeling: string; // The selected mood/feeling from the week
}

interface Props {
    data: WeekSummaryData;
    onNextWeekClick: () => void;
}

const WeekSummaryCard: React.FC<Props> = ({ data, onNextWeekClick }) => {
    return (
        <div className="w-full bg-[#1A1A1A]/90 backdrop-blur-md border border-primary/30 rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(184,255,0,0.1)] animate-fade-in-up relative">
            {/* Celebration Effects */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/20 blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/20 blur-3xl translate-y-1/3 -translate-x-1/2"></div>

            {/* Header */}
            <div className="p-6 text-center border-b border-white/5 relative z-10">
                <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30 transform rotate-[-5deg]">
                    <span className="material-icons-round text-white text-3xl">emoji_events</span>
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-yellow-300 to-yellow-500 text-transparent bg-clip-text tracking-wide">
                    恭喜完成首周目标！
                </h3>
                <p className="text-xs text-yellow-500/80 uppercase tracking-widest mt-1 font-bold">
                    {data.badgeLevel}
                </p>
            </div>

            {/* Stats Board */}
            <div className="p-5 flex justify-center gap-6 relative z-10">
                <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">完成打卡</p>
                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-black text-white">{data.daysCompleted}</span>
                        <span className="text-sm font-bold text-gray-500">/ 7</span>
                    </div>
                    <p className="text-[10px] text-primary mt-1">天</p>
                </div>
                <div className="w-px h-12 bg-white/10 self-center"></div>
                <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">累计动作</p>
                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-black text-white">{data.totalWorkouts}</span>
                    </div>
                    <p className="text-[10px] text-primary mt-1">项</p>
                </div>
            </div>

            {/* AI Praise Box */}
            <div className="px-5 pb-5 relative z-10">
                <div className="bg-gradient-to-r from-primary/5 to-transparent p-4 rounded-xl border-l-4 border-primary relative">
                    <span className="material-icons-round text-primary/20 text-4xl absolute -top-2 -left-1">format_quote</span>
                    <p className="text-sm text-gray-200 leading-relaxed font-medium mt-2">{data.aiPraise}</p>
                </div>
            </div>

            {/* Feedback Highlight */}
            <div className="px-5 pb-5 relative z-10">
                <p className="text-center text-xs text-gray-400 mb-2">你的第一周感受</p>
                <div className="w-fit mx-auto px-4 py-2 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
                    <span className="material-icons-round text-yellow-500 text-sm">sentiment_satisfied</span>
                    <span className="text-sm text-white font-medium">{data.userFeeling}</span>
                </div>
            </div>

            {/* Action Footer */}
            <div className="p-5 pt-0 relative z-10">
                <button
                    onClick={onNextWeekClick}
                    className="w-full py-4 bg-gradient-to-r from-[#B8FF00] to-[rgba(184,255,0,0.8)] text-black font-black text-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-[0_0_25px_rgba(184,255,0,0.3)] uppercase tracking-wide"
                >
                    领取下周计划
                    <span className="material-icons-round">arrow_forward_ios</span>
                </button>
            </div>
        </div>
    );
};

export default WeekSummaryCard;
