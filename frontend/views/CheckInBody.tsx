import React, { useState } from 'react';
import { weightApi, userApi } from '../api';

interface Props {
  onBack: () => void;
  onSave: () => void;
}

const CheckInBody: React.FC<Props> = ({ onBack, onSave }) => {
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(70.5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans animate-fade-in relative z-50">
       {/* Header */}
       <div className="px-6 py-6 flex items-center justify-between sticky top-0 bg-[#050505]/80 backdrop-blur-md z-20">
           <button onClick={onBack} className="w-8 h-8 flex items-center justify-center">
              <span className="material-icons-round text-gray-400">arrow_back_ios</span>
           </button>
           <h1 className="text-lg font-serif font-bold tracking-wide">身体档案</h1>
           <div className="w-8"></div>
       </div>

       <div className="flex-1 overflow-y-auto px-6 pb-32">
           <div className="flex items-center gap-2 mb-6">
               <span className="material-icons-round text-primary text-sm">auto_awesome</span>
               <span className="text-sm font-bold">基础指标</span>
           </div>

           {/* Height Card */}
           <div className="bg-[#111] rounded-[32px] p-6 mb-4 border border-white/5 relative overflow-hidden">
               <div className="flex justify-between items-start mb-8">
                   <span className="text-gray-500 text-xs">身高 (cm)</span>
                   <span className="text-4xl font-serif font-bold">{height}</span>
               </div>
               
               {/* Ruler */}
               <div className="relative h-12 w-full flex items-end justify-center gap-3 opacity-50">
                    <div className="w-[1px] h-3 bg-gray-500"></div>
                    <div className="w-[1px] h-5 bg-gray-500"></div>
                    <div className="w-[1px] h-3 bg-gray-500"></div>
                    <div className="w-[2px] h-8 bg-primary shadow-[0_0_10px_#B8FF00]"></div>
                    <div className="w-[1px] h-3 bg-gray-500"></div>
                    <div className="w-[1px] h-5 bg-gray-500"></div>
                    <div className="w-[1px] h-3 bg-gray-500"></div>
               </div>
               <div className="flex justify-between text-[10px] text-gray-600 mt-2 px-8">
                   <span>170</span>
                   <span>180</span>
               </div>
               <input 
                  type="range"
                  min="150"
                  max="200"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               />
           </div>

           {/* Weight Card */}
           <div className="bg-[#111] rounded-[32px] p-6 mb-8 border border-white/5 relative overflow-hidden">
               <div className="flex justify-between items-start mb-8">
                   <span className="text-gray-500 text-xs">体重 (kg)</span>
                   <span className="text-4xl font-serif font-bold">{weight}</span>
               </div>
               
               {/* Ruler */}
               <div className="relative h-12 w-full flex items-end justify-center gap-3 opacity-50">
                    <div className="w-[1px] h-3 bg-gray-500"></div>
                    <div className="w-[1px] h-5 bg-gray-500"></div>
                    <div className="w-[1px] h-3 bg-gray-500"></div>
                    <div className="w-[2px] h-8 bg-primary shadow-[0_0_10px_#B8FF00]"></div>
                    <div className="w-[1px] h-3 bg-gray-500"></div>
                    <div className="w-[1px] h-5 bg-gray-500"></div>
                    <div className="w-[1px] h-3 bg-gray-500"></div>
               </div>
               <div className="flex justify-between text-[10px] text-gray-600 mt-2 px-12">
                   <span>65</span>
                   <span>75</span>
               </div>
                <input 
                  type="range"
                  min="40"
                  max="120"
                  step="0.5"
                  value={weight}
                  onChange={(e) => setWeight(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               />
           </div>

           {/* More Dimensions */}
           <div className="flex items-center gap-2 mb-4">
               <span className="material-icons-round text-gray-500 text-sm">add_circle_outline</span>
               <span className="text-sm font-bold text-gray-300">更多围度 (选填)</span>
           </div>

           <div className="bg-[#111] rounded-[32px] border border-white/5 divide-y divide-white/5">
                {[
                    { icon: 'straighten', label: '腰围' },
                    { icon: 'accessibility_new', label: '臀围' },
                    { icon: 'directions_run', label: '大腿围' }
                ].map((item, i) => (
                    <div key={i} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary">
                                <span className="material-icons-round">{item.icon}</span>
                            </div>
                            <span className="text-sm font-bold">{item.label}</span>
                        </div>
                        <span className="text-xs text-gray-600">-- cm</span>
                    </div>
                ))}
           </div>
           
           <div className="mt-8 text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-primary text-[10px] font-bold tracking-widest uppercase">
                    <span className="material-icons-round text-xs">lightbulb</span>
                    专家建议
                </div>
                <p className="text-[10px] text-gray-500 w-3/4 mx-auto leading-relaxed">
                    定期测量身体围度比单纯关注体重数字更能反映您的健身成果和体态变化。
                </p>
           </div>
       </div>

       {/* Footer */}
       <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black to-transparent z-20">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2 text-red-400 text-sm text-center mb-3">
                {error}
              </div>
            )}
            <button
              onClick={async () => {
                setSaving(true);
                setError('');
                try {
                  await Promise.all([
                    userApi.updateProfile({ height, weight }),
                    weightApi.create({
                      date: new Date().toISOString().split('T')[0],
                      weight,
                    }),
                  ]);
                  onSave();
                } catch (e: any) {
                  setError(e?.response?.data?.message || '保存失败，请重试');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="w-full bg-primary hover:bg-primary-dark disabled:bg-white/10 disabled:text-gray-500 text-black font-bold text-lg py-4 rounded-full shadow-[0_0_25px_rgba(184,255,0,0.3)] active:scale-[0.98] transition-all"
           >
              {saving ? '保存中...' : '保存档案'}
           </button>
       </div>
    </div>
  );
};

export default CheckInBody;