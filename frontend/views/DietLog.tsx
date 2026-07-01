import React, { useState, useRef, useEffect } from 'react';
import { dietApi } from '../api';
import type { DietRecord, DietSummary } from '../api/diet';
import { analyzeFoodText, analyzeFoodImage } from '../services/gemini';
import type { FoodAnalysis } from '../services/gemini';

const DietLog: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    const [foodName, setFoodName] = useState('');
    const [foodDesc, setFoodDesc] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [records, setRecords] = useState<DietRecord[]>([]);
    const [summary, setSummary] = useState<DietSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
  const [isEstimateOpen, setIsEstimateOpen] = useState(false);
  const [estimateResult, setEstimateResult] = useState<any>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimatePreview, setEstimatePreview] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [analyzing, setAnalyzing] = useState(false);

    const today = new Date().toISOString().split('T')[0];
    const safeRecords = Array.isArray(records) ? records : [];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const [list, sum] = await Promise.all([
                dietApi.list(today),
                dietApi.summary(today),
            ]);
            setRecords(Array.isArray(list) ? list : []);
            setSummary(sum && typeof sum === 'object' ? sum : null);
        } catch (e: any) {
            setError(e?.response?.data?.message || '加载失败');
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setIsBottomSheetOpen(false);
        setAnalyzing(true);
        setSaving(true);
        try {
            // Read file as base64
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // AI analyze food image
            const analysis = await analyzeFoodImage(base64);
            setAnalyzing(false);

            const newRecord = await dietApi.create({
                name: analysis.name,
                calories: analysis.calories,
                protein: analysis.protein,
                fat: analysis.fat,
                carbs: analysis.carbs,
                date: today,
                mealType: analysis.mealType,
            });
            setRecords(prev => [newRecord, ...prev]);
            const sum = await dietApi.summary(today);
            setSummary(sum && typeof sum === 'object' ? sum : null);
        } catch (e: any) {
            setError(e?.response?.data?.message || '识别失败，请重试');
        } finally {
            setSaving(false);
            setAnalyzing(false);
        }
    };

    const handleTextSubmit = async () => {
        if (!foodName.trim()) return;
        setSaving(true);
        setAnalyzing(true);
        try {
            // AI analyze food nutrition
            const analysis = await analyzeFoodText(foodName, foodDesc || undefined);
            setAnalyzing(false);

            const newRecord = await dietApi.create({
                name: analysis.name,
                calories: analysis.calories,
                protein: analysis.protein,
                fat: analysis.fat,
                carbs: analysis.carbs,
                date: today,
                mealType: analysis.mealType,
            });
            setRecords(prev => [newRecord, ...prev]);
            setIsTextModalOpen(false);
            setFoodName('');
            setFoodDesc('');
            const sum = await dietApi.summary(today);
            setSummary(sum && typeof sum === 'object' ? sum : null);
        } catch (e: any) {
            setError(e?.response?.data?.message || '保存失败');
        } finally {
            setSaving(false);
            setAnalyzing(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await dietApi.remove(id);
            setRecords(prev => (Array.isArray(prev) ? prev.filter(r => r.id !== id) : []));
            const sum = await dietApi.summary(today);
            setSummary(sum && typeof sum === 'object' ? sum : null);
        } catch (e: any) {
            setError(e?.response?.data?.message || '删除失败');
        }
    };


  const handleEstimateBeforeMeal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEstimatePreview(reader.result as string);
    reader.readAsDataURL(file);
    const base64Reader = new FileReader();
    base64Reader.onload = async () => {
      const base64 = (base64Reader.result as string).split(',')[1];
      setEstimating(true);
      try {
        const result = await dietApi.estimateBeforeMeal(base64);
        setEstimateResult(result);
        setIsEstimateOpen(true);
      } catch {
        alert('预估失败，请重试');
      } finally {
        setEstimating(false);
      }
    };
    base64Reader.readAsDataURL(file);
  };

    return (
        <div className="min-h-screen bg-bg-dark text-white pb-24 px-6 pt-12">
            <header className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-black font-serif tracking-tight">近期饮食</h1>
                <div className="flex flex-col items-center">
                    <span className="text-4xl font-serif italic text-white font-bold">{summary?.totalCalories ?? '--'}</span>
                    <span className="text-xs text-gray-500 uppercase">千卡 今日</span>
                </div>
            </header>

            {/* Calendar Strip (Simplified) */}
            <div className="flex justify-between mb-8 text-center text-gray-500">
                {['一', '二', '三', '四', '五', '六', '日'].map((d, i) => (
                    <div key={i} className={`flex flex-col gap-2 ${i === 5 ? 'text-primary' : ''}`}>
                        <span className="text-[10px] font-bold opacity-50">{d}</span>
                        <span className={`text-sm ${i === 5 ? 'w-8 h-8 rounded-full bg-primary/20 border border-primary text-white flex items-center justify-center shadow-[0_0_10px_rgba(184,255,0,0.3)]' : ''}`}>
                            {22 + i}
                        </span>
                    </div>
                ))}
            </div>

            <div className="space-y-6">
                {loading && (
                    <div className="text-center py-12 text-gray-500">加载中...</div>
                )}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-3 text-red-400 text-sm">
                        {error}
                    </div>
                )}
                {!loading && safeRecords.length === 0 && !error && (
                    <div className="text-center py-12 text-gray-500">
                        <span className="material-icons-round text-4xl mb-2 block opacity-30">restaurant</span>
                        今日暂无饮食记录
                    </div>
                )}
                {safeRecords.map((record) => (
                    <div key={record.id} className="glass rounded-[32px] p-4 border-white/5 relative overflow-hidden group">
                        <div className="flex justify-between items-start px-2">
                            <div className="flex-1">
                                <h3 className="text-xl font-bold font-serif">{record.name}</h3>
                                <div className="flex items-center gap-2 mt-1 opacity-50">
                                    <span className="text-lg">🍽️</span>
                                    <span className="text-xs font-mono">{record.mealType || '未分类'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="bg-[#F5F5F0]/10 backdrop-blur-md rounded-xl p-3 text-white">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="font-serif font-bold text-xs mr-2">热量</span>
                                        <span className="font-black text-lg">{record.calories}</span>
                                    </div>
                                    <div className="space-y-0.5 text-[10px] opacity-70">
                                        {record.fat != null && <div className="flex justify-between gap-3"><span>脂肪</span><b>{record.fat}g</b></div>}
                                        {record.protein != null && <div className="flex justify-between gap-3"><span>蛋白质</span><b>{record.protein}g</b></div>}
                                        {record.carbs != null && <div className="flex justify-between gap-3"><span>碳水</span><b>{record.carbs}g</b></div>}
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(record.id)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-500/20 transition-colors">
                                    <span className="material-icons-round text-gray-500 text-sm">delete</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Floating Add Menu */}
            <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center">
                <div className={`flex flex-col gap-3 mb-4 transition-all duration-300 origin-bottom ${isMenuOpen && !isBottomSheetOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-50 translate-y-10 pointer-events-none'}`}>
                    <div className="flex flex-col items-center gap-2">
                        <div
                            className="flex items-center gap-3 bg-[#1a1a1a] border border-white/10 p-2 pr-4 pl-2 rounded-full shadow-2xl cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => {
                                setIsMenuOpen(false);
                                setIsTextModalOpen(true);
                            }}
                        >
                            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pointer-events-none text-white">
                                <span className="material-icons-round text-sm notranslate">edit_note</span>
                            </button>
                            <span className="text-sm font-bold tracking-widest text-gray-300 pointer-events-none">文字记录</span>
                        </div>

                        <div
                            className="flex items-center gap-3 bg-[#1a1a1a] border border-[#B8FF00]/30 p-2 pr-4 pl-2 rounded-full shadow-2xl cursor-pointer hover:bg-[#B8FF00]/10 transition-colors"
                            onClick={() => {
                                setIsMenuOpen(false);
                                setIsBottomSheetOpen(true);
                            }}
                        >
                            <button className="w-10 h-10 rounded-full bg-[#B8FF00]/10 flex items-center justify-center pointer-events-none text-[#B8FF00]">
                                <span className="material-icons-round text-sm notranslate">camera_alt</span>
                            </button>
                            <span className="text-sm font-bold tracking-widest text-[#B8FF00] pointer-events-none">拍照记录</span>
                        </div>
                        <div
                            className="flex items-center gap-3 bg-[#1a1a1a] border border-[#F5A623]/30 p-2 pr-4 pl-2 rounded-full shadow-2xl cursor-pointer hover:bg-[#F5A623]/10 transition-colors"
                            onClick={() => {
                                const input = document.getElementById("estimate-file-input");
                                if (input) input.click();
                            }}
                        >
                            <button className="w-10 h-10 rounded-full bg-[#F5A623]/10 flex items-center justify-center pointer-events-none text-[#F5A623]">
                                <span className="material-icons-round text-sm notranslate">restaurant_menu</span>
                            </button>
                            <span className="text-sm font-bold tracking-widest text-[#F5A623] pointer-events-none">饭前预估</span>
                        </div>
                    </div>
                </div>

                {!isBottomSheetOpen && (
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`w-16 h-16 bg-primary rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(184,255,0,0.4)] transition-all duration-300 ${isMenuOpen ? 'rotate-45 scale-95 bg-white shadow-white/20' : 'hover:scale-110'}`}
                    >
                        <span className="material-icons-round text-3xl notranslate">add</span>
                    </button>
                )}
            </div>

            {/* Bottom Sheet Menu */}
            <div
                className={`fixed inset-x-0 bottom-0 z-50 bg-[#1c1c1e] rounded-t-[24px] transition-transform duration-300 ease-out transform ${isBottomSheetOpen ? 'translate-y-0' : 'translate-y-full'
                    }`}
            >
                {/* Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-4" onClick={() => setIsBottomSheetOpen(false)}>
                    <div className="w-12 h-1.5 bg-gray-600 rounded-full cursor-pointer hover:bg-gray-500 transition-colors"></div>
                </div>

                {/* Top Actions (Camera - mimicking TG) */}
                <div className="flex justify-start gap-6 items-center px-6 mb-4">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center gap-1 opacity-80 hover:opacity-100 transition-opacity"
                    >
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                            <span className="material-icons-round text-[#B8FF00] notranslate">camera_alt</span>
                        </div>
                        <span className="text-[10px] text-gray-400">拍照</span>
                    </button>
                </div>

            </div>

            {/* Hidden Input for Photo Upload */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoSelect}
                accept="image/*"
                className="hidden"
            />

            {/* Text Record Modal */}
            {isTextModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsTextModalOpen(false)} />
                    <div className="bg-[#1c1c1e] w-full max-w-sm rounded-[32px] p-6 relative z-10 shadow-2xl border border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-serif font-bold text-white">文字记录</h3>
                            <button onClick={() => setIsTextModalOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
                                <span className="material-icons-round text-gray-400 text-sm">close</span>
                            </button>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2 tracking-widest uppercase">食物名称</label>
                                <input
                                    type="text"
                                    value={foodName}
                                    onChange={(e) => setFoodName(e.target.value)}
                                    placeholder="例如：全麦吐司配煎蛋"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#B8FF00]/50 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2 tracking-widest uppercase">详情描述 <span className="text-gray-600 lowercase tracking-normal">(选填)</span></label>
                                <textarea
                                    value={foodDesc}
                                    onChange={(e) => setFoodDesc(e.target.value)}
                                    placeholder="描述大小、克数、烹饪方式以获取更准确的热量预估..."
                                    rows={3}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#B8FF00]/50 transition-colors resize-none"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleTextSubmit}
                            disabled={!foodName.trim() || saving}
                            className="w-full bg-[#B8FF00] hover:bg-[#a6e600] disabled:bg-white/10 disabled:text-gray-500 disabled:shadow-none active:scale-[0.98] transition-all text-black font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(184,255,0,0.3)]"
                        >
                            <span className="material-icons-round text-sm notranslate">{saving ? 'hourglass_empty' : 'auto_awesome'}</span>
                            <span>{analyzing ? 'AI 分析中...' : saving ? '保存中...' : 'AI 分析'}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Backdrop for closing menus */}
            {(isMenuOpen || isBottomSheetOpen) && (
                <div
                    className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm transition-opacity cursor-pointer"
                    onClick={() => {
                        setIsMenuOpen(false);
                        setIsBottomSheetOpen(false);
                    }}
                />
            )}

            {/* AI Analyzing Overlay */}
            {analyzing && !isTextModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#1c1c1e] rounded-3xl p-8 flex flex-col items-center gap-4 border border-white/10 shadow-2xl">
                        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-gray-300 font-bold">AI 正在识别食物...</p>
                    </div>
                </div>
            )}

            {/* 饭前预估结果弹窗 */}
            {isEstimateOpen && estimateResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsEstimateOpen(false); setEstimateResult(null); setEstimatePreview(null); }} />
                    <div className="bg-[#1c1c1e] w-full max-w-sm rounded-[32px] p-6 relative z-10 shadow-2xl border border-white/10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-serif font-bold text-white">饭前预估</h3>
                            <button onClick={() => { setIsEstimateOpen(false); setEstimateResult(null); setEstimatePreview(null); }} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
                                <span className="material-icons-round text-gray-400 text-sm">close</span>
                            </button>
                        </div>
                        {estimatePreview && (
                            <img src={estimatePreview} alt="食物预览" className="w-full h-40 object-cover rounded-2xl mb-4" />
                        )}
                        {estimating ? (
                            <div className="flex flex-col items-center py-8 gap-3">
                                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm text-gray-300 font-bold">AI 正在识别食物...</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-[#F5A623]/10 border border-[#F5A623]/30 rounded-2xl p-4 mb-3">
                                    <div className="text-sm font-bold text-[#F5A623] mb-1">
                                        {estimateResult.mealTypeGuess === "breakfast" ? "早餐" : estimateResult.mealTypeGuess === "lunch" ? "午餐" : estimateResult.mealTypeGuess === "dinner" ? "晚餐" : "加餐/零食"}
                                        · 预估 {estimateResult.estimated?.calories} kcal
                                    </div>
                                    <div className="flex gap-3 text-xs text-gray-400">
                                        <span>蛋白质 {estimateResult.estimated?.protein}g</span>
                                        <span>碳水 {estimateResult.estimated?.carbs}g</span>
                                        <span>脂肪 {estimateResult.estimated?.fat}g</span>
                                    </div>
                                </div>
                                {estimateResult.warning && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 mb-3 text-sm text-red-400">
                                        {estimateResult.warning}
                                    </div>
                                )}
                                <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 mb-4 text-sm text-gray-200">
                                    {estimateResult.advice}
                                </div>
                                <button
                                    onClick={() => { setIsEstimateOpen(false); setEstimateResult(null); setEstimatePreview(null); }}
                                    className="w-full bg-primary hover:bg-[#a6e600] disabled:bg-white/10 disabled:text-gray-500 transition-all text-black font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(184,255,0,0.3)]"
                                >
                                    关闭
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
export default DietLog;
