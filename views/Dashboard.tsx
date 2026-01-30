import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { View } from '../types';
import Hero3D from '../components/Hero3D';

const data = [
    { name: 'Mon', val: 40 },
    { name: 'Tue', val: 35 },
    { name: 'Wed', val: 50 },
    { name: 'Thu', val: 45 },
    { name: 'Fri', val: 60 },
    { name: 'Sat', val: 55 },
    { name: 'Sun', val: 65 },
];

interface Props {
    onNavigate?: (view: View) => void;
}

const Dashboard: React.FC<Props> = ({ onNavigate }) => {
    return (
        <div className="min-h-screen pb-24 relative overflow-hidden bg-bg-dark">
            {/* Header */}
            <div className="absolute top-0 w-full p-6 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <div>
                    <h1 className="text-2xl font-black font-serif italic text-white">Right<span className="text-primary">Now</span></h1>
                    <p className="text-[10px] text-gray-400 tracking-widest uppercase">Believe is Seeing</p>
                </div>
                <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden">
                    <img src="https://picsum.photos/id/64/100/100" alt="Profile" className="w-full h-full object-cover" />
                </div>
            </div>

            {/* 3D Model Area (Simulated) */}
            <div className="relative h-[65vh] w-full">
                {/* Background Glows */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-purple-900/20 rounded-full blur-[100px]"></div>

                {/* The Model Image from Prompt */}
                {/* <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfj_7DoosOac9dnm_zORPTfQMDPj8t8iW8vkTOuANge-IBOriPpDTDhKYRX__pq_yxgRkzcZNYgM4RHH0ghBd2EeY1iAxLWxiCbn3wgFHDS8-COlD39BO7Y41A3FpdxlBvHYxJIchJN6Pj0sw4lkc1XDolO9DNHSr-hcjiwqyjclN5CsytaNeAgSGNNeXMHoqOMsB1qZSYuyu-y_csEeHDmei3kRMuVudP8C9SZme0AT2KfVHA_7WGKhhq2gOnkCvwG1J1DsyXhZaX" 
              alt="3D Model" 
              className="w-full h-full object-cover object-top mask-image-gradient"
              style={{ maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)' }}
            /> */}
                <div className="w-full h-full absolute inset-0 z-10" style={{ maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}>
                    <Hero3D />
                </div>

                {/* Floating Stats */}
                <div className="absolute top-1/3 left-6 glass px-3 py-2 rounded-xl flex items-center gap-2 animate-float" style={{ animationDelay: '0s' }}>
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                    <span className="text-xs font-bold">体脂 18%</span>
                </div>
                <div className="absolute top-1/4 right-6 glass px-3 py-2 rounded-xl flex items-center gap-2 animate-float" style={{ animationDelay: '2s' }}>
                    <span className="text-xs font-bold text-gray-300">目标 Z</span>
                </div>
            </div>

            {/* Main Stats Panel */}
            <div className="px-6 -mt-12 relative z-10 space-y-4">
                {/* Current Phase Card */}
                <div
                    onClick={() => onNavigate?.(View.EvolutionProgress)}
                    className="glass p-5 rounded-3xl border-l-4 border-l-primary relative overflow-hidden cursor-pointer active:scale-95 transition-all group"
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

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="glass p-4 rounded-3xl">
                        <div className="flex justify-between items-start mb-6">
                            <span className="text-xs text-gray-400">今日消耗</span>
                            <span className="material-icons-round text-orange-500 text-sm">local_fire_department</span>
                        </div>
                        <div className="flex items-end gap-1">
                            <span className="text-2xl font-bold font-serif">450</span>
                            <span className="text-[10px] text-gray-500 mb-1">kcal</span>
                        </div>
                    </div>
                    <div className="glass p-4 rounded-3xl relative overflow-hidden">
                        <div className="absolute inset-0 opacity-20 pointer-events-none">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data}>
                                    <Area type="monotone" dataKey="val" stroke="#B8FF00" fill="#B8FF00" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <span className="text-xs text-gray-400">体重变化</span>
                                <span className="material-icons-round text-primary text-sm">show_chart</span>
                            </div>
                            <div className="flex items-end gap-1">
                                <span className="text-2xl font-bold font-serif">64.2</span>
                                <span className="text-[10px] text-gray-500 mb-1">kg</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
