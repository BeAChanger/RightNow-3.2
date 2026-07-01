import React, { useState } from 'react';
import { View } from '../types';
import type { AuthUser } from '../api';

const MOTIVATION_QUOTES = [
    "除了汗水，没有任何东西能穿透现实与理想的壁垒。",
    "昨天的犹豫，是今天唯一的遗憾。",
    "你离目标（Z），只差今天这 45 分钟。",
    "痛苦是暂时的，但成就感会随你一生。",
    "不要为了舒适而妥协你的潜力。",
    "每一次力竭，都是在重塑更强大的自己。",
    "镜子不说谎，进度条也是。"
];

interface Props {
    onNavigate?: (view: View) => void;
    isProfileComplete?: boolean;
    authUser?: AuthUser | null;
    onLogout?: () => void;
    idealImage?: string | null;
}

const Dashboard: React.FC<Props> = ({ onNavigate, isProfileComplete = true, authUser, onLogout, idealImage }) => {
    const [showMenu, setShowMenu] = useState(false);
    // Incomplete State View
    if (!isProfileComplete) {
        return (
            <div className="min-h-screen bg-bg-dark flex flex-col justify-center items-center p-6 relative overflow-hidden">
                {/* Background Ambience */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="z-10 text-center space-y-6 animate-fade-in">
                    {/* Big RightNow Logo */}
                    <div>
                        <h1 className="text-6xl font-black font-serif italic text-white mb-2">Right<span className="text-primary">Now</span></h1>
                        <p className="text-sm text-gray-400 tracking-[0.5em] uppercase">Believing is Seeing</p>
                    </div>

                    <div className="w-16 h-1 bg-white/10 mx-auto rounded-full"></div>

                    <p className="text-gray-400 max-w-xs mx-auto text-sm leading-relaxed">
                        您尚未完成身体档案配置。<br />
                        完善数据，让 AI 为您生成未来的理想形态。
                    </p>

                    <button
                        onClick={() => onNavigate?.(View.Onboarding)}
                        className="bg-primary text-black font-bold text-lg px-10 py-4 rounded-full shadow-[0_0_25px_rgba(184,255,0,0.3)] active:scale-[0.98] transition-all flex items-center gap-2 mx-auto hover:bg-primary-dark"
                    >
                        <span>继续配置档案</span>
                        <span className="material-icons-round">arrow_forward</span>
                    </button>
                </div>
            </div>
        );
    }

    // Get a deterministic quote based on the current day of the year
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    const dailyQuote = MOTIVATION_QUOTES[dayOfYear % MOTIVATION_QUOTES.length];

    return (
        <div className="min-h-screen pb-24 relative overflow-hidden bg-bg-dark">
            {idealImage && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <img
                        src={idealImage}
                        alt=""
                        className="w-full h-full object-cover scale-110 opacity-[0.18] blur-[10px]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/82 to-[#050505]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(184,255,0,0.08),transparent_55%)]" />
                </div>
            )}

            {/* Header */}
            <div className="absolute top-0 w-full p-6 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <div>
                    <h1 className="text-2xl font-black font-serif italic text-white">Right<span className="text-primary">Now</span></h1>
                    <p className="text-[10px] text-gray-400 tracking-widest uppercase">Believing is Seeing</p>
                </div>
                <div className="relative">
                    <button onClick={() => setShowMenu(!showMenu)} className="w-10 h-10 rounded-full border border-white/20 overflow-hidden">
                        {authUser?.avatar ? (
                            <img src={authUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                                <span className="text-primary text-sm font-bold">{authUser?.name?.charAt(0) || '?'}</span>
                            </div>
                        )}
                    </button>

                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                            <div className="absolute right-0 top-12 z-40 bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[160px]">
                                <div className="px-4 py-3 border-b border-white/5">
                                    <p className="text-xs font-bold text-white truncate">{authUser?.name || '用户'}</p>
                                    <p className="text-[10px] text-gray-500 truncate">{authUser?.email || ''}</p>
                                </div>
                                <button
                                    onClick={() => { setShowMenu(false); onLogout?.(); }}
                                    className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/5 flex items-center gap-2 transition-colors"
                                >
                                    <span className="material-icons-round text-base">logout</span>
                                    退出登录
                                </button>
                                <button
                                    onClick={() => { setShowMenu(false); onNavigate?.(View.WechatSettings); }}
                                    className="w-full px-4 py-3 text-left text-sm text-gray-400 hover:bg-white/5 flex items-center gap-2 transition-colors border-t border-white/5"
                                >
                                    <span className="material-icons-round text-base">chat</span>
                                    微信绑定
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Center Visual Area */}
            <div className="relative h-[70vh] w-full flex flex-col items-center justify-center z-10">
                {/* Background glow */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-purple-900/20 rounded-full blur-[100px]"></div>

                {idealImage ? (
                    /* Co-created ideal body image */
                    <div className="w-full h-full absolute inset-0 z-10 flex items-center justify-center" style={{ maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}>
                        <img src={idealImage} alt="理想身材" className="h-full object-contain" />
                    </div>
                ) : (
                    /* "显化中" placeholder when no co-created image yet */
                    <div className="w-full h-full absolute inset-0 z-10 flex flex-col items-center justify-center gap-6">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full bg-[#B8FF00]/5 border border-[#B8FF00]/20 flex items-center justify-center">
                                <div className="w-24 h-24 rounded-full bg-[#B8FF00]/10 border border-[#B8FF00]/15 flex items-center justify-center animate-pulse">
                                    <span className="material-icons-round text-[#B8FF00]/60 text-4xl">auto_awesome</span>
                                </div>
                            </div>
                            <div className="absolute inset-0 rounded-full border-2 border-[#B8FF00]/30 border-t-transparent animate-spin" style={{ animationDuration: '3s' }}></div>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-white/80 mb-1">显化中...</p>
                            <p className="text-[10px] text-gray-500">完成 AI 共创后，你的理想身材将在此展示</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Stats Panel / Bottom Action */}
            <div className="absolute bottom-[100px] left-6 right-6 z-20">
                {/* Current Phase Card */}
                <div
                    onClick={() => onNavigate?.(View.EvolutionProgress)}
                    className="glass p-5 rounded-3xl border-l-4 border-l-primary relative overflow-hidden cursor-pointer active:scale-95 transition-all group shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-400 font-serif">进化进度</span>
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-colors">
                            <span className="material-icons-round text-sm">arrow_forward</span>
                        </div>
                    </div>
                    <div>
                        <span className="text-lg font-bold text-white leading-tight">查看AI预测<br />不同阶段的自己</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
