import React, { useEffect, useMemo, useRef, useState } from 'react';
import { evolutionApi } from '../api/evolution';
import type { EvolutionRecord } from '../api/evolution';

interface Props {
    onBack: () => void;
    customPhotos?: string[];
}

type GalleryItem = {
    id: string;
    src: string;
    source: 'custom' | 'record';
    createdAt?: string;
    weight?: number;
};

const EvolutionGallery: React.FC<Props> = ({ onBack, customPhotos = [] }) => {
    const [records, setRecords] = useState<EvolutionRecord[]>([]);
    const [recordsLoading, setRecordsLoading] = useState(true);
    const [recordsError, setRecordsError] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const touchStartX = useRef<number | null>(null);

    useEffect(() => {
        const loadRecords = async () => {
            setRecordsLoading(true);
            setRecordsError('');
            try {
                const list = await evolutionApi.list();
                setRecords(Array.isArray(list) ? list : []);
            } catch (e: any) {
                setRecordsError(e?.response?.data?.message || '加载图库失败');
                setRecords([]);
            } finally {
                setRecordsLoading(false);
            }
        };
        void loadRecords();
    }, []);

    const allImages = useMemo<GalleryItem[]>(() => {
        const customItems: GalleryItem[] = customPhotos
            .filter(Boolean)
            .map((photo, index) => ({
                id: `custom-${index}`,
                src: photo,
                source: 'custom',
            }));

        const recordItems: GalleryItem[] = records
            .filter((record) => Boolean(record.imageUrl))
            .map((record) => ({
                id: record.id,
                src: record.imageUrl,
                source: 'record',
                createdAt: record.createdAt,
                weight: record.weight,
            }));

        const merged = [...customItems, ...recordItems];
        const seen = new Set<string>();
        return merged.filter((item) => {
            const key = item.src.trim();
            if (!key || seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }, [customPhotos, records]);

    useEffect(() => {
        if (allImages.length === 0) {
            setCurrentIndex(0);
            setIsLoading(false);
            return;
        }

        setCurrentIndex((prev) => Math.min(prev, allImages.length - 1));
        setIsLoading(true);

        const preload = async () => {
            const tasks = allImages.map((item) => {
                return new Promise<void>((resolve) => {
                    const img = new Image();
                    img.src = item.src;
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                });
            });
            await Promise.allSettled(tasks);
            setIsLoading(false);
        };

        void preload();
    }, [allImages]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (allImages.length === 0) return;
        const index = Number(e.target.value);
        setCurrentIndex(Math.max(0, Math.min(allImages.length - 1, index)));
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null || allImages.length === 0) return;

        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX.current - touchEndX;

        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                setCurrentIndex((prev) => Math.min(allImages.length - 1, prev + 1));
            } else {
                setCurrentIndex((prev) => Math.max(0, prev - 1));
            }
        }
        touchStartX.current = null;
    };

    const currentItem = allImages[currentIndex];
    const progressPercent =
        allImages.length <= 1 ? 0 : (currentIndex / (allImages.length - 1)) * 100;

    const formatDate = (iso?: string) => {
        if (!iso) return '--';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '--';
        return d.toLocaleDateString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
        });
    };

    return (
        <div className="h-screen bg-black flex flex-col relative overflow-hidden font-sans">
            <div
                className="absolute inset-0 opacity-30 blur-3xl scale-110 pointer-events-none transition-all duration-500"
                style={
                    currentItem
                        ? {
                            backgroundImage: `url(${currentItem.src})`,
                            backgroundPosition: 'center',
                            backgroundSize: 'cover',
                        }
                        : undefined
                }
            />

            <div className="absolute top-0 left-0 right-0 p-6 z-40 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent">
                <button onClick={onBack} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all">
                    <span className="material-icons-round">close</span>
                </button>

                <div className="flex flex-col items-center">
                    <span className="text-xs font-serif text-[#B8FF00] tracking-[0.2em] uppercase mb-1 drop-shadow-[0_0_10px_rgba(184,255,0,0.5)]">进化图库</span>
                    <span className="text-white font-bold text-lg font-mono">
                        {allImages.length > 0 ? (currentIndex + 1).toString().padStart(2, '0') : '00'}
                        <span className="text-gray-600 mx-1">/</span>
                        {allImages.length}
                    </span>
                </div>

                <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all">
                    <span className="material-icons-round">share</span>
                </button>
            </div>

            <div
                className="flex-1 flex items-center justify-center relative z-20 px-4"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {allImages.length > 0 && (
                    <>
                        <div
                            className="absolute inset-y-0 left-0 w-1/3 z-30 transform active:bg-white/5 transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentIndex((prev) => Math.max(0, prev - 1));
                            }}
                        />
                        <div
                            className="absolute inset-y-0 right-0 w-1/3 z-30 transform active:bg-white/5 transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentIndex((prev) => Math.min(allImages.length - 1, prev + 1));
                            }}
                        />
                    </>
                )}

                <div className="relative w-full max-w-md aspect-[3.5/5] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-[#151515]">
                    {(isLoading || recordsLoading) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a] z-10">
                            <div className="w-8 h-8 rounded-full border-2 border-[#B8FF00] border-t-transparent animate-spin"></div>
                        </div>
                    )}

                    {allImages.length === 0 ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center px-8">
                            <span className="material-icons-round text-5xl text-white/20 mb-4">photo_library</span>
                            <p className="text-white/80 text-lg font-bold mb-2">暂无上传记录</p>
                            <p className="text-gray-500 text-sm">
                                先去「进化记录」上传照片，这里会自动展示真实图库
                            </p>
                            {recordsError && (
                                <p className="text-red-400 text-xs mt-4">{recordsError}</p>
                            )}
                        </div>
                    ) : (
                        <>
                            <img
                                src={currentItem?.src}
                                alt={`Stage ${currentIndex + 1}`}
                                className="w-full h-full object-cover transition-opacity duration-75"
                                draggable={false}
                            />

                            <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none flex flex-col justify-end p-6">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[#B8FF00] font-bold text-xs mb-1 uppercase tracking-wider">
                                            {currentItem?.source === 'custom' ? '本地图片' : '云端记录'} #{currentIndex + 1}
                                        </p>
                                        <p className="text-white text-2xl font-serif font-bold italic">
                                            {formatDate(currentItem?.createdAt)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">体重</p>
                                        <p className="text-white font-mono font-bold">
                                            {currentItem?.weight != null ? `${currentItem.weight.toFixed(1)} kg` : '--'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="relative z-50 pb-12 pt-6 px-8 bg-gradient-to-t from-black via-black/95 to-transparent">
                <div className="relative h-12 flex items-center justify-center max-w-md mx-auto w-full touch-none">
                    <div className="absolute left-0 right-0 h-1.5 bg-white/20 rounded-full overflow-hidden pointer-events-none">
                        <div
                            className="absolute left-0 top-0 bottom-0 bg-[#B8FF00] shadow-[0_0_15px_#B8FF00] transition-all duration-75 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>

                    <input
                        type="range"
                        min={0}
                        max={Math.max(0, allImages.length - 1)}
                        step={1}
                        value={Math.min(currentIndex, Math.max(0, allImages.length - 1))}
                        onChange={handleChange}
                        disabled={allImages.length === 0}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50 active:cursor-grabbing disabled:cursor-not-allowed"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    />

                    <div
                        className="absolute w-8 h-8 rounded-full bg-[#B8FF00] border-4 border-black shadow-[0_0_20px_rgba(184,255,0,0.6)] z-40 pointer-events-none transform -translate-x-1/2 flex items-center justify-center transition-all duration-75 ease-out"
                        style={{ left: `${progressPercent}%` }}
                    >
                        <div className="w-1.5 h-1.5 bg-black rounded-full" />
                    </div>
                </div>

                <div className="flex justify-between max-w-md mx-auto mt-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono pointer-events-none">
                    <span>最早</span>
                    <span>最新</span>
                </div>
            </div>
        </div>
    );
};

export default EvolutionGallery;
