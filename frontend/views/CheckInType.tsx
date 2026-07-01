import React, { useState } from 'react';
import { View } from '../types';
import { checkinsApi } from '../api';

interface Props {
  onClose: () => void;
  onNext: () => void;
}

const CheckInType: React.FC<Props> = ({ onClose, onNext }) => {
  const [selectedType, setSelectedType] = useState('strength');
  const [duration, setDuration] = useState(45);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const types = [
    { id: 'strength', icon: 'fitness_center', label: '力量训练', desc: '增肌塑形，力量提升' },
    { id: 'cardio', icon: 'directions_run', label: '有氧训练', desc: '跑步、快走或慢跑' },
    { id: 'cycling', icon: 'directions_bike', label: '骑行', desc: '室内单车或户外骑行' },
    { id: 'swim', icon: 'pool', label: '游泳', desc: '泳池或公开水域' },
    { id: 'yoga', icon: 'self_improvement', label: '瑜伽', desc: '静心拉伸，平衡身心' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans animate-fade-in relative z-50">
       {/* Background Glow */}
       <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-purple-900/10 blur-[100px] pointer-events-none"></div>

       {/* Header */}
       <div className="px-6 pt-12 pb-4 flex justify-between items-start">
           <h1 className="text-3xl font-serif font-bold leading-tight w-2/3">选择运动类型与<br/>时长</h1>
           <div className="flex gap-4">
              <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <span className="material-icons-round text-white/70">light_mode</span>
              </button>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <span className="material-icons-round text-white/70">close</span>
              </button>
           </div>
       </div>

       {/* Type List */}
       <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
           {types.map((type) => {
               const isActive = selectedType === type.id;
               return (
                   <button 
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                          isActive 
                          ? 'bg-[#1a1a1a] border-primary/50 shadow-[0_0_15px_rgba(184,255,0,0.1)]' 
                          : 'bg-[#111] border-transparent hover:bg-[#161616]'
                      }`}
                   >
                       <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-primary text-black' : 'bg-white/5 text-gray-400'}`}>
                               <span className="material-icons-round">{type.icon}</span>
                           </div>
                           <div className="text-left">
                               <div className={`font-bold ${isActive ? 'text-white' : 'text-gray-300'}`}>{type.label}</div>
                               <div className="text-[10px] text-gray-500">{type.desc}</div>
                           </div>
                       </div>
                       {isActive && (
                           <span className="material-icons-round text-primary">check_circle</span>
                       )}
                   </button>
               )
           })}
       </div>

       {/* Duration Slider Section */}
       <div className="px-6 pb-8 pt-6 bg-gradient-to-t from-black via-black to-transparent">
           <h2 className="text-lg font-serif font-bold mb-6">运动时长</h2>
           
           <div className="flex flex-col items-center mb-8">
               <div className="flex items-baseline gap-1 mb-2">
                   <span className="text-6xl font-serif font-thin text-white">{duration}</span>
                   <span className="text-xl text-gray-500 font-serif">分钟</span>
               </div>
               
               {/* Ruler Slider Visual */}
               <div className="w-full h-16 relative flex items-end justify-between px-2 overflow-hidden select-none cursor-ew-resize touch-none">
                   {/* This is a visual representation, functionality is driven by the invisible range input */}
                   {[0, 15, 30, 45, 60].map((tick) => (
                       <div key={tick} className="flex flex-col items-center gap-2" style={{ opacity: Math.abs(duration - tick) < 15 ? 1 : 0.3 }}>
                            <div className={`w-0.5 rounded-full transition-all ${duration === tick ? 'h-8 bg-primary shadow-[0_0_10px_#B8FF00]' : 'h-4 bg-gray-600'}`}></div>
                            <span className={`text-[10px] ${duration === tick ? 'text-primary font-bold' : 'text-gray-600'}`}>{tick}</span>
                       </div>
                   ))}
                   
                   {/* Invisible Slider for Interaction */}
                   <input 
                      type="range"
                      min="0"
                      max="60"
                      step="5"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                   />
               </div>
           </div>

           <button
              onClick={async () => {
                setSaving(true);
                setError('');
                try {
                  await checkinsApi.create({
                    type: selectedType,
                    note: `${duration}分钟`,
                  });
                  onNext();
                } catch (e: any) {
                  setError(e?.response?.data?.message || '打卡失败，请重试');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="w-full bg-primary hover:bg-primary-dark disabled:bg-white/10 disabled:text-gray-500 text-black font-bold text-lg py-4 rounded-full shadow-[0_0_25px_rgba(184,255,0,0.3)] active:scale-[0.98] transition-all"
           >
              {saving ? '保存中...' : '保存'}
           </button>
           {error && (
             <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2 text-red-400 text-sm text-center">
               {error}
             </div>
           )}
       </div>
    </div>
  );
};

export default CheckInType;