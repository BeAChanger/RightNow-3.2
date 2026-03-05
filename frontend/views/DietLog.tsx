import React, { useState, useRef, useEffect } from 'react';
import { dietApi, uploadApi } from '../api';
import type { DietRecord, DietSummary, UploadAsset, NutritionData } from '../api';
import { DietConfirmCard } from '../components/DietConfirmCard';

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
    const [error, setError] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [galleryAssets, setGalleryAssets] = useState<UploadAsset[]>([]);
    const [galleryLoading, setGalleryLoading] = useState(false);

    const [draftData, setDraftData] = useState<{
        draftId: string;
        photoUrl?: string;
        calories: number;
        protein: number;
        fat: number;
        carbs: number;
    } | null>(null);
    const [isConfirmCardOpen, setIsConfirmCardOpen] = useState(false);

    const today = new Date().toISOString().split('T')[0];
    const safeRecords = Array.isArray(records) ? records : [];

    useEffect(() => {
        void loadData();
        void loadGallery();
    }, []);

    useEffect(() => {
        if (isBottomSheetOpen && galleryAssets.length === 0 && !galleryLoading) {
            void loadGallery();
        }
    }, [isBottomSheetOpen, galleryAssets.length, galleryLoading]);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await dietApi.getRecords(today);
            setRecords(Array.isArray(result.records) ? result.records : []);
            setSummary(result.summary && typeof result.summary === 'object' ? result.summary : null);
        } catch (e: any) {
            setError(e?.response?.data?.message || '加载失败');
        } finally {
            setLoading(false);
        }
    };

    const loadGallery = async () => {
        setGalleryLoading(true);
        try {
            const list = await uploadApi.list({ kind: 'general', limit: 24 });
            const safeList = Array.isArray(list) ? list : [];
            const realUploads = safeList.filter((asset) => {
                const url = typeof asset?.url === 'string' ? asset.url.trim() : '';
                return Boolean(url) && url.includes('/uploads/');
            });
            setGalleryAssets(realUploads);
        } catch (e) {
            setGalleryAssets([]);
        } finally {
            setGalleryLoading(false);
        }
    };

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        setIsBottomSheetOpen(false);
        setAnalyzing(true);
        setError('');

        try {
            const result = await dietApi.analyzePhoto(file);

            setDraftData({
                draftId: result.draftId,
                photoUrl: result.photoUrl,
                calories: result.nutrition.calories,
                protein: result.nutrition.protein,
                fat: result.nutrition.fat,
                carbs: result.nutrition.carbs,
            });
            setIsConfirmCardOpen(true);
        } catch (e: any) {
            setError(e?.response?.data?.message || '识别失败，请重试');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleGalleryImageSelect = async (url: string) => {
        setIsBottomSheetOpen(false);
        setAnalyzing(true);
        setError('');

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('加载图片失败');
            }
            const blob = await response.blob();
            const file = new File([blob], 'gallery-image.jpg', { type: blob.type });

            const result = await dietApi.analyzePhoto(file);

            setDraftData({
                draftId: result.draftId,
                photoUrl: result.photoUrl,
                calories: result.nutrition.calories,
                protein: result.nutrition.protein,
                fat: result.nutrition.fat,
                carbs: result.nutrition.carbs,
            });
            setIsConfirmCardOpen(true);
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || '识别失败，请重试');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleTextSubmit = async () => {
        if (!foodName.trim()) return;
        setAnalyzing(true);
        setError('');

        try {
            const result = await dietApi.analyzeText(foodName, foodDesc || undefined);

            setDraftData({
                draftId: result.draftId,
                calories: result.nutrition.calories,
                protein: result.nutrition.protein,
                fat: result.nutrition.fat,
                carbs: result.nutrition.carbs,
            });
            setIsTextModalOpen(false);
            setIsConfirmCardOpen(true);
            setFoodName('');
            setFoodDesc('');
        } catch (e: any) {
            setError(e?.response?.data?.message || '识别失败');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleConfirmDraft = async (nutrition: NutritionData) => {
        if (!draftData) return;

        setSaving(true);
        try {
            const result = await dietApi.confirmRecord(draftData.draftId, nutrition);

            await loadData();

            setIsConfirmCardOpen(false);
            setDraftData(null);
        } catch (e: any) {
            setError(e?.response?.data?.message || '保存失败');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelDraft = () => {
        setIsConfirmCardOpen(false);
        setDraftData(null);
    };

    const handleDelete = async (id: string) => {
        try {
            const result = await dietApi.deleteRecord(id);

            setRecords(prev => prev.filter(r => r.id !== id));
            setSummary(result.summary);
        } catch (e: any) {
            setError(e?.response?.data?.message || '删除失败');
        }
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
                                    <span className="text-lg">🍔</span>
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

                {/* Recent Photos Grid */}
                <div className="px-2 pb-8 max-h-[40vh] overflow-y-auto">
                    <div className="flex justify-between items-center px-2 mb-2">
                        <span className="text-white font-bold text-sm">最近的照片</span>
                        <span className="text-[#B8FF00] text-xs font-bold">图库</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                        <div
                            className="aspect-square bg-gray-800 rounded relative overflow-hidden flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <span className="material-icons-round text-white/50 text-4xl">photo_camera</span>
                        </div>

                        {galleryLoading && (
                            <div className="col-span-2 grid grid-cols-2 gap-1">
                                {Array.from({ length: 4 }).map((_, idx) => (
                                    <div key={idx} className="aspect-square rounded bg-white/5 animate-pulse" />
                                ))}
                            </div>
                        )}

                        {!galleryLoading && galleryAssets.map((asset) => (
                            <button
                                key={asset.id}
                                onClick={() => handleGalleryImageSelect(asset.url)}
                                className="aspect-square bg-gray-800 rounded relative overflow-hidden cursor-pointer group active:scale-95 transition-transform"
                            >
                                <img src={asset.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="Recent" />
                                <div className="absolute top-1 right-1 w-5 h-5 rounded-full border border-white/80 bg-black/20 flex items-center justify-center text-white">
                                    <span className="material-icons-round text-[12px]">add</span>
                                </div>
                            </button>
                        ))}

                        {!galleryLoading && galleryAssets.length === 0 && (
                            <div className="col-span-2 aspect-square rounded bg-white/5 flex items-center justify-center text-[11px] text-gray-400 px-3 text-center">
                                暂无历史上传图片
                            </div>
                        )}
                    </div>
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

            {/* Diet Confirm Card */}
            {isConfirmCardOpen && draftData && (
                <DietConfirmCard
                    isOpen={isConfirmCardOpen}
                    photoUrl={draftData.photoUrl}
                    initialData={{
                        calories: draftData.calories,
                        protein: draftData.protein,
                        fat: draftData.fat,
                        carbs: draftData.carbs,
                    }}
                    onConfirm={handleConfirmDraft}
                    onCancel={handleCancelDraft}
                />
            )}
        </div>
    );
};

export default DietLog;

