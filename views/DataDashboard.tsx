import React, { useState } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { View } from '../types';

interface Props {
  onNavigate?: (view: View) => void;
}

const weightData = [
  { date: '10月1日', val: 62.0 },
  { date: '10月8日', val: 62.5 },
  { date: '10月15日', val: 63.2 },
  { date: '10月22日', val: 63.8 },
  { date: '今天', val: 64.2 },
];

const DataDashboard: React.FC<Props> = ({ onNavigate }) => {
  const [chartTab, setChartTab] = useState<'weight' | 'fat'>('weight');

  return (
    <div className="min-h-screen pb-32 pt-6 px-6 bg-bg-dark text-white font-sans">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-serif font-bold tracking-tight">数据看板</h1>
            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all">
                <span className="material-icons-round text-gray-300">settings</span>
            </button>
        </div>

        {/* Current Phase Pill */}
        <div className="inline-flex items-center gap-2 bg-white/5 rounded-full px-4 py-1.5 mb-6 border border-white/5">
             <span className="text-xs text-gray-400">当前阶段</span>
             <span className="text-sm font-bold text-primary font-serif">H</span>
             <span className="text-[10px] text-gray-500">(A → Z)</span>
        </div>

        {/* Weekly Progress Card */}
        <div className="bg-[#111] rounded-[32px] p-5 border border-white/5 mb-4 shadow-lg">
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-xs text-gray-400 mb-1">本周已完成</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold font-serif text-white">2.0</span>
                        <span className="text-sm text-gray-500">/ 5.5 小时</span>
                    </div>
                </div>
                <button 
                  onClick={() => onNavigate?.(View.EvolutionRecord)}
                  className="flex items-center gap-2 bg-white/5 px-4 py-2.5 rounded-2xl border border-white/5 hover:bg-white/10 active:bg-white/15 transition-all group"
                >
                    <span className="material-icons-round text-primary text-sm group-hover:scale-110 transition-transform">history</span>
                    <span className="text-xs font-bold text-gray-200">查看进化之路</span>
                </button>
            </div>
        </div>

        {/* Calories Card */}
        <div className="bg-[#111] rounded-[32px] p-6 border border-white/5 mb-4 shadow-lg">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-sm text-gray-400">消耗热量</p>
                 <span className="material-icons-round text-primary text-sm">local_fire_department</span>
             </div>
             <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold font-serif text-white">450</span>
                  <span className="text-sm text-gray-500">/ 600 kcal</span>
             </div>
             <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                 <div className="h-full bg-primary w-[75%] rounded-full shadow-[0_0_12px_#B8FF00]"></div>
             </div>
        </div>

        {/* Weight Chart Card */}
        <div className="bg-[#111] rounded-[32px] p-6 border border-white/5 mb-4 shadow-lg">
            <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-3">
                     <h2 className="text-lg font-bold">体重变化</h2>
                     <button className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all">
                        <span className="material-icons-round text-xs text-primary">edit</span>
                     </button>
                 </div>
                 <div className="flex bg-white/5 rounded-lg p-1">
                     <button 
                        onClick={() => setChartTab('weight')}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${chartTab === 'weight' ? 'bg-white/10 text-white font-bold' : 'text-gray-500'}`}
                     >
                         体重
                     </button>
                     <button 
                        onClick={() => setChartTab('fat')}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${chartTab === 'fat' ? 'bg-white/10 text-white font-bold' : 'text-gray-500'}`}
                     >
                         体脂
                     </button>
                 </div>
            </div>
            
            <div className="h-[180px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weightData}>
                        <defs>
                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#B8FF00" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#B8FF00" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Tooltip 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                return (
                                    <div className="bg-[#222] border border-white/10 px-3 py-1.5 rounded-lg shadow-xl">
                                       <p className="text-xs font-bold text-white">{`${payload[0].value} 公斤`}</p>
                                    </div>
                                );
                                }
                                return null;
                            }}
                            cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="val" 
                            stroke="#B8FF00" 
                            strokeWidth={3} 
                            fill="url(#colorVal)" 
                            activeDot={{ r: 6, fill: "#B8FF00", stroke: "black", strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
                {/* Custom X Axis Labels (Simulated) */}
                <div className="flex justify-between text-[10px] text-gray-500 mt-2 px-2">
                    <span>10月1日</span>
                    <span>10月8日</span>
                    <span>10月15日</span>
                    <span>10月22日</span>
                    <span>今天</span>
                </div>
            </div>
        </div>

        {/* Diet Card */}
        <div className="bg-[#111] rounded-[32px] p-6 border border-white/5 mb-4 shadow-lg">
             <div className="flex justify-between items-start mb-6">
                 <h2 className="text-lg font-bold">今日饮食</h2>
                 <button className="flex items-center gap-1 bg-[#2a2a2a] text-[#B8FF00] px-3 py-1 rounded-lg text-[10px] font-bold active:scale-95 transition-transform">
                     <span className="material-icons-round text-sm">filter_center_focus</span>
                     拍照识别
                 </button>
             </div>
             
             <div className="mb-6">
                 <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold font-serif text-white">1,240</span>
                      <span className="text-sm text-gray-500">/ 1,800 kcal</span>
                 </div>
             </div>

             <div className="space-y-4">
                 {/* Protein */}
                 <div>
                     <div className="flex justify-between text-xs mb-1.5">
                         <span className="font-bold text-gray-400">蛋白质</span>
                         <span className="text-gray-500">85/120g</span>
                     </div>
                     <div className="h-1.5 bg-white/10 rounded-full overflow-hidden flex">
                         <div className="h-full bg-[#4A90E2] w-[70%] rounded-full"></div>
                     </div>
                 </div>
                 {/* Fat */}
                 <div>
                     <div className="flex justify-between text-xs mb-1.5">
                         <span className="font-bold text-gray-400">脂肪</span>
                         <span className="text-gray-500">25/55g</span>
                     </div>
                     <div className="h-1.5 bg-white/10 rounded-full overflow-hidden flex">
                         <div className="h-full bg-[#F5A623] w-[45%] rounded-full"></div>
                     </div>
                 </div>
                 {/* Carbs */}
                 <div>
                     <div className="flex justify-between text-xs mb-1.5">
                         <span className="font-bold text-gray-400">碳水</span>
                         <span className="text-gray-500">120/200g</span>
                     </div>
                     <div className="h-1.5 bg-white/10 rounded-full overflow-hidden flex">
                         <div className="h-full bg-[#50E3C2] w-[60%] rounded-full"></div>
                     </div>
                 </div>
             </div>
        </div>

        {/* Activity Heatmap */}
        <div className="bg-[#111] rounded-[32px] p-6 border border-white/5 mb-4 shadow-lg">
             <div className="flex justify-between items-center mb-4">
                 <h2 className="text-sm font-bold">活动热力图</h2>
                 <span className="text-[10px] text-gray-500">过去30天</span>
             </div>
             
             {/* Heatmap Grid */}
             <div className="grid grid-cols-7 gap-2 mb-4">
                 {['M','T','W','T','F','S','S'].map((d,i) => (
                     <span key={i} className="text-[10px] text-center text-gray-600">{d}</span>
                 ))}
                 {Array.from({ length: 28 }).map((_, i) => {
                     // Simulate random activity data
                     const opacity = Math.random() > 0.3 ? Math.max(0.2, Math.random()) : 0.1;
                     const color = Math.random() > 0.8 ? '#B8FF00' : '#4a5900';
                     const isInactive = opacity === 0.1;
                     
                     return (
                         <div 
                            key={i} 
                            className="aspect-square rounded-md transition-all hover:scale-110"
                            style={{ 
                                backgroundColor: isInactive ? 'rgba(255,255,255,0.05)' : color,
                                opacity: isInactive ? 1 : opacity
                            }}
                         ></div>
                     )
                 })}
             </div>

             <div className="flex justify-end items-center gap-2 text-[10px] text-gray-500">
                 <span>Less</span>
                 <div className="flex gap-1">
                     <div className="w-3 h-3 rounded-sm bg-white/5"></div>
                     <div className="w-3 h-3 rounded-sm bg-[#4a5900] opacity-50"></div>
                     <div className="w-3 h-3 rounded-sm bg-[#4a5900]"></div>
                     <div className="w-3 h-3 rounded-sm bg-[#B8FF00]"></div>
                 </div>
                 <span>More</span>
             </div>
        </div>

        {/* AI Suggestions */}
        <div className="bg-[#111] rounded-[32px] p-6 border border-white/5 mb-4 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
                <span className="material-icons-round text-primary text-lg">auto_awesome</span>
                <h2 className="text-sm font-bold font-serif">AI 下一步建议</h2>
            </div>
            <ul className="space-y-3">
                <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                        根据今日热量缺口，建议晚餐增加 <span className="text-white font-bold">50g 鸡胸肉</span>。
                    </p>
                </li>
                <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                        体脂率下降趋缓，建议明日增加 <span className="text-white font-bold">20 分钟 HIIT 有氧</span>。
                    </p>
                </li>
            </ul>
        </div>
    </div>
  );
};

export default DataDashboard;