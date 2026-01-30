import React, { useState, useRef } from 'react';
import { View } from '../types';

interface Props {
  onComplete: (image: string | null) => void;
}

const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<'shape' | 'fat_loss' | 'muscle'>('shape');
  
  // Goal Detail State
  const [selectedParts, setSelectedParts] = useState<string[]>(['腹肌核心']);
  const [targetWeightChange, setTargetWeightChange] = useState(5); // kg (loss or gain)
  const [weeklyHours, setWeeklyHours] = useState(5.5); // Weekly hours

  // Body metrics state
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(62.5);
  const [age, setAge] = useState(26);

  // Photo state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // File input refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const goals = [
    { id: 'shape', icon: 'accessibility_new', label: '塑型' },
    { id: 'fat_loss', icon: 'monitor_weight', label: '减脂' },
    { id: 'muscle', icon: 'fitness_center', label: '增肌' }
  ];

  const bodyParts = ['腹肌核心', '臀腿线条', '背部体态', '胸型', '肩部', '二头', '三头', '全身紧致'];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  const triggerCamera = () => {
    if (cameraInputRef.current) cameraInputRef.current.click();
  };

  const triggerGallery = () => {
    if (galleryInputRef.current) galleryInputRef.current.click();
  };

  const togglePart = (part: string) => {
    if (selectedParts.includes(part)) {
      setSelectedParts(selectedParts.filter(p => p !== part));
    } else {
      setSelectedParts([...selectedParts, part]);
    }
  };

  return (
    <div className="min-h-screen bg-[#05040a] text-white p-6 relative overflow-hidden flex flex-col font-sans">
      {/* Background Ambience */}
      <div className="absolute top-[-10%] left-[-20%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[-10%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-10 pt-4 mb-6">
        <div className="flex items-center justify-between mb-6">
           <button onClick={() => step > 1 ? setStep(step - 1) : null} className={`p-2 rounded-full hover:bg-white/10 ${step === 1 ? 'invisible' : ''}`}>
             <span className="material-icons-round">arrow_back</span>
           </button>
           <span className="text-[10px] font-bold tracking-[0.2em] bg-white/5 border border-white/10 px-3 py-1 rounded-full">STEP {step}/3</span>
           <button className="p-2 rounded-full hover:bg-white/10">
             <span className="material-icons-round">help_outline</span>
           </button>
        </div>
        
        <h1 className="text-3xl font-serif font-black leading-[1.2] mb-2">
           {step === 1 ? <>选择你的<br/><span className="text-primary text-4xl">健身目标</span></> : 
            step === 2 ? <>完善<br/>身体数据</> :
            <>上传<br/>身材照</>}
        </h1>
        <p className="text-white/40 text-xs tracking-widest">
           {step === 1 ? "告诉我你想成为怎样的自己" : 
            step === 2 ? "AI将根据数据建立基础模型" : 
            "生成你的专属 3D 进化模型"}
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col w-full overflow-hidden">
        {step === 1 && (
          <div className="flex flex-col h-full">
            {/* Goal Selectors */}
            <div className="grid grid-cols-3 gap-3 mb-8 shrink-0">
              {goals.map((g) => {
                const isActive = goal === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setGoal(g.id as any)}
                    className={`aspect-[3/4] rounded-2xl flex flex-col items-center justify-center gap-3 border transition-all duration-300 relative ${
                      isActive 
                        ? 'bg-gradient-to-b from-white/10 to-primary/10 border-primary shadow-[0_0_15px_rgba(184,255,0,0.15)]' 
                        : 'bg-white/5 border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <span className={`material-icons-round text-3xl ${isActive ? 'text-primary' : 'text-white/70'}`}>
                      {g.icon}
                    </span>
                    <span className={`text-sm font-bold tracking-wider ${isActive ? 'text-white' : 'text-white/70'}`}>
                      {g.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable Details Section */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
                {/* Specific Goal Settings */}
                <div className="mb-8">
                    {goal === 'shape' && (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-bold border-l-4 border-primary pl-3">重点雕刻部位</span>
                                <span className="text-[10px] bg-primary text-black px-2 py-0.5 rounded font-bold">多选</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {bodyParts.map(part => {
                                    const isSelected = selectedParts.includes(part);
                                    return (
                                        <button 
                                            key={part}
                                            onClick={() => togglePart(part)}
                                            className={`py-3 rounded-full text-xs font-bold transition-all border ${
                                                isSelected 
                                                ? 'bg-primary text-black border-primary shadow-[0_0_10px_rgba(184,255,0,0.3)]' 
                                                : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10'
                                            }`}
                                        >
                                            {part}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {(goal === 'fat_loss' || goal === 'muscle') && (
                        <div className="animate-fade-in flex flex-col items-center justify-center py-6">
                            <div className="text-center w-full">
                                <span className="text-sm font-bold block mb-6 text-left border-l-4 border-primary pl-3">
                                    {goal === 'fat_loss' ? '目标减少体重' : '目标增加体重'}
                                </span>
                                
                                <div className="glass p-6 rounded-[40px] border border-primary/30 relative overflow-hidden inline-flex flex-col items-center min-w-[200px]">
                                    <div className="absolute inset-0 bg-primary/5 blur-xl"></div>
                                    <span className="text-xs text-primary mb-2 font-bold tracking-widest uppercase">
                                        {goal === 'fat_loss' ? 'Reduce' : 'Gain'}
                                    </span>
                                    <div className="flex items-baseline gap-2 mb-4 relative z-10">
                                        <span className="text-6xl font-black font-serif text-white drop-shadow-2xl">
                                            {targetWeightChange}
                                        </span>
                                        <span className="text-xl text-primary font-bold">KG</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-6 relative z-10">
                                        <button 
                                            onClick={() => setTargetWeightChange(Math.max(1, targetWeightChange - 1))}
                                            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95"
                                        >
                                            <span className="material-icons-round">remove</span>
                                        </button>
                                        <button 
                                            onClick={() => setTargetWeightChange(Math.min(30, targetWeightChange + 1))}
                                            className="w-12 h-12 rounded-full bg-primary text-black flex items-center justify-center shadow-[0_0_15px_rgba(184,255,0,0.4)] active:scale-95"
                                        >
                                            <span className="material-icons-round">add</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Weekly Time Slider (New Module) */}
                <div className="animate-fade-in pt-4 border-t border-white/5">
                     <div className="flex justify-between items-center mb-5">
                        <span className="text-sm font-bold border-l-4 border-primary pl-3">每周投入时间</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black font-serif text-primary">{weeklyHours}</span>
                            <span className="text-xs text-gray-500 font-bold">小时/周</span>
                        </div>
                     </div>
                     
                     <div className="glass p-6 rounded-3xl border border-white/5">
                        <input 
                            type="range" 
                            min="1" 
                            max="50" 
                            step="0.5"
                            value={weeklyHours}
                            onChange={(e) => setWeeklyHours(parseFloat(e.target.value))}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" 
                        />
                        <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-3 px-1">
                             <span>1h</span>
                             <span>25h</span>
                             <span>50h</span>
                        </div>
                     </div>
                </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
             {/* Height Input */}
             <div className="glass p-6 rounded-3xl border border-white/5">
                <div className="flex justify-between items-end mb-4">
                   <span className="text-gray-400 text-sm">身高 (Height)</span>
                   <span className="text-3xl font-bold font-serif">{Number.isInteger(height) ? height : height.toFixed(1)} <span className="text-sm font-sans text-gray-500">cm</span></span>
                </div>
                <input 
                  type="range" 
                  min="100" 
                  max="300" 
                  step="0.1"
                  value={height}
                  onChange={(e) => setHeight(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" 
                />
             </div>

             {/* Weight and Age Inputs */}
             <div className="flex gap-4">
                <div className="glass p-6 rounded-3xl flex-1 flex flex-col justify-between border border-white/5">
                   <div>
                       <span className="text-gray-400 text-sm block mb-2">体重</span>
                       <div className="flex items-baseline mb-4">
                          <span className="text-3xl font-bold font-serif">{Number.isInteger(weight) ? weight : weight.toFixed(1)}</span>
                          <span className="text-xs text-gray-500 ml-1">kg</span>
                       </div>
                   </div>
                   <input 
                      type="range"
                      min="30"
                      max="150"
                      step="0.1"
                      value={weight}
                      onChange={(e) => setWeight(parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                   />
                </div>
                 <div className="glass p-6 rounded-3xl flex-1 flex flex-col justify-between border border-white/5">
                   <div>
                       <span className="text-gray-400 text-sm block mb-2">年龄</span>
                       <div className="flex items-baseline mb-4">
                           <span className="text-3xl font-bold font-serif">{age}</span>
                           <span className="text-xs text-gray-500 ml-1">岁</span>
                       </div>
                   </div>
                   <input 
                      type="range"
                      min="12"
                      max="100"
                      step="1"
                      value={age}
                      onChange={(e) => setAge(parseInt(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                   />
                </div>
             </div>
             
             {/* Summary of Step 1 */}
             <div className="p-4 bg-white/5 rounded-2xl flex items-center gap-3 opacity-60">
                <span className="material-icons-round text-primary">check_circle</span>
                <span className="text-xs">
                    目标：{goals.find(g => g.id === goal)?.label} 
                    {goal === 'shape' ? ` (${selectedParts.length}个部位)` : ` (${goal === 'fat_loss' ? '-' : '+'}${targetWeightChange}kg)`}
                    {`, ${weeklyHours}h/周`}
                </span>
             </div>
          </div>
        )}

        {step === 3 && (
           <div className="h-full flex flex-col flex-1 animate-fade-in">
              {/* Hidden Inputs */}
              <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  style={{ display: 'none' }} 
                  ref={cameraInputRef}
                  onChange={handleFileChange}
              />
              <input 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  ref={galleryInputRef}
                  onChange={handleFileChange}
              />

              <div className="flex-1 glass rounded-[32px] border-dashed border-2 border-white/20 relative overflow-hidden mb-6 w-full group">
                 {selectedImage ? (
                    <img 
                        src={selectedImage} 
                        alt="Selected" 
                        className="w-full h-full object-cover" 
                    />
                 ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="absolute inset-0 bg-primary/5 animate-pulse-slow"></div>
                        <span className="material-icons-round text-6xl text-white/20 mb-4 relative z-10">center_focus_strong</span>
                        <p className="text-xs text-gray-400 tracking-widest relative z-10">请确保全身完整入镜</p>
                    </div>
                 )}
                 
                 {/* Simulated Scan Line (Overlay) */}
                 <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_20px_#B8FF00] animate-[float_3s_linear_infinite] pointer-events-none z-20" style={{ animationDuration: '2s' }}></div>
              </div>

              {/* Upload Tips */}
              {!selectedImage && (
                  <div className="mb-4 text-center">
                      <p className="text-xs text-gray-500 mb-1">推荐穿着紧身衣物</p>
                      <p className="text-[10px] text-gray-600">光线充足 · 背景干净 · 姿势自然</p>
                  </div>
              )}

              <div className="grid grid-cols-2 gap-4 shrink-0">
                 <button 
                    onClick={triggerCamera}
                    className="glass py-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-white/10 active:scale-95 transition-all"
                 >
                    <span className="material-icons-round text-2xl">photo_camera</span>
                    <span className="text-xs">拍照</span>
                 </button>
                 <button 
                    onClick={triggerGallery}
                    className="glass py-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-white/10 active:scale-95 transition-all"
                 >
                    <span className="material-icons-round text-2xl">photo_library</span>
                    <span className="text-xs">相册</span>
                 </button>
              </div>
           </div>
        )}
      </main>

      <footer className="mt-6 shrink-0 z-20">
        <button 
          onClick={() => step < 3 ? setStep(step + 1) : onComplete(selectedImage)}
          disabled={step === 3 && !selectedImage}
          className={`w-full font-bold text-lg py-4 rounded-full shadow-[0_0_25px_rgba(184,255,0,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
              step === 3 && !selectedImage 
              ? 'bg-white/10 text-white/30 cursor-not-allowed shadow-none' 
              : 'bg-primary hover:bg-primary-dark text-black'
          }`}
        >
          <span>{step === 3 ? "生成我的理想态" : "下一步"}</span>
          <span className="material-icons-round">arrow_forward</span>
        </button>
      </footer>
    </div>
  );
};

export default Onboarding;