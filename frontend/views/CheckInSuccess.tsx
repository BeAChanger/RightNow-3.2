import React, { useState, useEffect } from 'react';
import { View } from '../types';
import { checkinsApi } from '../api';
import type { CheckInRecord } from '../api';

interface Props {
  onNavigate: (view: View) => void;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  strength: { icon: 'fitness_center', label: '力量训练' },
  cardio: { icon: 'directions_run', label: '有氧训练' },
  cycling: { icon: 'directions_bike', label: '骑行' },
  swim: { icon: 'pool', label: '游泳' },
  yoga: { icon: 'self_improvement', label: '瑜伽' },
};

const CheckInSuccess: React.FC<Props> = ({ onNavigate, onClose }) => {
  const [latestCheckin, setLatestCheckin] = useState<CheckInRecord | null>(null);

  useEffect(() => {
    checkinsApi.latest()
      .then(setLatestCheckin)
      .catch(() => {});
  }, []);

  const typeInfo = TYPE_LABELS[latestCheckin?.type || 'strength'] || TYPE_LABELS.strength;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center pt-12 pb-6 px-6 relative z-50 animate-fade-in font-sans">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 left-6 text-gray-400 hover:text-white"
      >
        <span className="material-icons-round">close</span>
      </button>

      <h1 className="text-lg font-serif font-normal text-gray-200 mt-2">打卡成就</h1>

      {/* Main Success Card */}
      <div className="w-full mt-8 bg-[#151515] rounded-[40px] p-8 flex flex-col items-center justify-center aspect-square border border-white/5 relative overflow-hidden group">
          {/* Glow Effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-primary/20 rounded-full blur-[60px] group-hover:bg-primary/30 transition-colors"></div>
          
          <div className="relative z-10 w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(184,255,0,0.4)] mb-6 animate-[bounce_1s_ease-out]">
             <span className="material-icons-round text-5xl text-black">check</span>
          </div>
          
          <h2 className="text-3xl font-serif font-bold text-white mb-2">打卡成功!</h2>
          <p className="text-gray-500 text-xs tracking-wider">又是充满活力的一天，继续保持！</p>
      </div>

      {/* Secondary Tasks Section */}
      <div className="w-full mt-10">
          <h3 className="text-xl font-serif font-bold mb-1">完善运动数据</h3>
          <p className="text-xs text-gray-500 mb-6">记录更多维度，见证你的蜕变</p>
          
          {/* Task Grid */}
          <div className="grid grid-cols-2 gap-3">
              {/* Task 1: Workout Type (Done) */}
              <div className="col-span-2 bg-[#1a1a1a]/50 border border-primary/20 p-4 rounded-2xl flex items-center justify-between">
                   <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-xl bg-[#111] flex items-center justify-center">
                           <span className="material-icons-round text-primary text-xl">{typeInfo.icon}</span>
                       </div>
                       <div>
                           <div className="text-sm font-bold text-gray-200">运动类型与时长</div>
                           <div className="text-[10px] text-primary">{typeInfo.label}{latestCheckin?.note ? ` · ${latestCheckin.note}` : ''}</div>
                       </div>
                   </div>
                   <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                       <span className="material-icons-round text-black text-xs">check</span>
                   </div>
              </div>

              {/* Task 2: Dimensions */}
              <button 
                onClick={() => onNavigate(View.CheckInBody)}
                className="bg-[#111] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 h-32 hover:bg-[#161616] active:scale-95 transition-all"
              >
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                       <span className="material-icons-round text-gray-400">straighten</span>
                  </div>
                  <span className="text-xs text-gray-400">维度上传</span>
              </button>

              {/* Task 3: Photo */}
              <button 
                 onClick={() => onNavigate(View.ActionCenter)}
                 className="bg-[#111] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 h-32 hover:bg-[#161616] active:scale-95 transition-all"
              >
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                       <span className="material-icons-round text-gray-400">photo_camera</span>
                  </div>
                  <span className="text-xs text-gray-400">记录身材</span>
              </button>
          </div>
      </div>

      {/* Save Button */}
      <div className="flex-1"></div>
      <button 
         onClick={() => onNavigate(View.CheckInShare)}
         className="w-full bg-primary hover:bg-primary-dark text-black font-bold text-lg py-4 rounded-full shadow-[0_0_25px_rgba(184,255,0,0.3)] active:scale-[0.98] transition-all mt-6"
      >
          保存
      </button>
    </div>
  );
};

export default CheckInSuccess;
