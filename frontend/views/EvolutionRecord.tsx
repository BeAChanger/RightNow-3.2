import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { View } from '../types';
import { evolutionApi, weightApi } from '../api';
import { evolutionStageApi } from '../api/evolution-stage';
import type { EvolutionRecord as EvolutionRecordType, WeightRecord as WeightRecordType } from '../api';

interface Props {
    onBack: () => void;
    onNavigate?: (view: View) => void;
    customPhotos?: string[];
    onUploadPhoto?: (photo: string) => void;
}

type HistoryItem = {
    id: string;
    date: string;
    status: string;
    img: string;
    weight: string;
};

type MeasurementModel = {
    latest: number | null;
    badgeText: string;
    badgeClassName: string;
    progressWidth: number;
    deltaSinceStart: number | null;
};

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function buildMeasurement(
    records: WeightRecordType[],
    field: 'waist' | 'hip',
    range: { min: number; max: number },
): MeasurementModel {
    const values = [...records]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((item) => item[field])
        .filter((item): item is number => typeof item === 'number' && Number.isFinite(item));

    if (values.length === 0) {
        return {
            latest: null,
            badgeText: '--',
            badgeClassName: 'bg-white/10 text-gray-400',
            progressWidth: 0,
            deltaSinceStart: null,
        };
    }

    const latest = values[values.length - 1];
    const previous = values.length > 1 ? values[values.length - 2] : null;
    const deltaPercent =
        previous != null && previous > 0 ? ((latest - previous) / previous) * 100 : null;

    const isImproved = deltaPercent != null ? deltaPercent < 0 : null;
    const badgeText =
        deltaPercent == null
            ? '--'
            : `${deltaPercent < 0 ? '↓' : '↑'} ${Math.abs(deltaPercent).toFixed(1)}%`;

    const badgeClassName =
        deltaPercent == null
            ? 'bg-white/10 text-gray-400'
            : isImproved
                ? 'bg-[#2AD56F]/10 text-[#2AD56F]'
                : 'bg-red-500/10 text-red-400';

    const progressWidth = clamp(
        ((latest - range.min) / (range.max - range.min)) * 100,
        0,
        100,
    );

    return {
        latest,
        badgeText,
        badgeClassName,
        progressWidth,
        deltaSinceStart: values.length > 1 ? latest - values[0] : null,
    };
}

const EvolutionRecord: React.FC<Props> = ({ onBack, onNavigate, customPhotos = [], onUploadPhoto }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [records, setRecords] = useState<EvolutionRecordType[]>([]);
    const [weightRecords, setWeightRecords] = useState<WeightRecordType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        void loadRecords();
    }, []);

    const loadRecords = async () => {
        setLoading(true);
        setError('');
        try {
            const list = await evolutionApi.list();
            setRecords(Array.isArray(list) ? list : []);

            try {
                const weightList = await weightApi.list();
                setWeightRecords(Array.isArray(weightList) ? weightList : []);
            } catch {
                setWeightRecords([]);
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || '加载进化记录失败');
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                const created = await evolutionApi.create(formData);
                await evolutionStageApi.assess(created.id).catch(() => {});
                await loadRecords();
            } catch (err: any) {
                setError(err?.response?.data?.message || '上传失败');
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                if (onUploadPhoto) {
                    onUploadPhoto(reader.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const combinedHistory: HistoryItem[] = useMemo(
        () => [
            ...customPhotos.map((photo, i) => ({
                id: `custom_${i}`,
                date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
                status: i === 0 ? 'CURRENT' : 'UPDATED',
                img: photo,
                weight: '--',
            })),
            ...records.map((r, i) => ({
                id: r.id,
                date: r.createdAt
                    ? new Date(r.createdAt).toISOString().split('T')[0].replace(/-/g, '.')
                    : '--',
                status: r.status || (i === 0 && customPhotos.length === 0 ? 'CURRENT' : 'RECORD'),
                img: r.imageUrl,
                weight: r.weight ? `${r.weight} kg` : '--',
            })),
        ],
        [customPhotos, records],
    );

    useEffect(() => {
        setActiveIndex((prev) => {
            if (combinedHistory.length === 0) return 0;
            return Math.min(prev, combinedHistory.length - 1);
        });
    }, [combinedHistory.length]);

    const sortedWeightRecords = useMemo(
        () => [...weightRecords].sort((a, b) => a.date.localeCompare(b.date)),
        [weightRecords],
    );

    const weightTrend = useMemo(
        () => sortedWeightRecords.map((r) => ({ val: r.weight })),
        [sortedWeightRecords],
    );

    const latestWeight =
        weightTrend.length > 0
            ? weightTrend[weightTrend.length - 1].val
            : records.find((r) => r.weight != null)?.weight;

    const waistMetric = useMemo(
        () => buildMeasurement(weightRecords, 'waist', { min: 55, max: 110 }),
        [weightRecords],
    );

    const hipMetric = useMemo(
        () => buildMeasurement(weightRecords, 'hip', { min: 75, max: 130 }),
        [weightRecords],
    );

    const analysisText = useMemo(() => {
        const tips: string[] = [];

        if (combinedHistory.length > 0) {
            tips.push(`已累计记录 ${combinedHistory.length} 张进化照片`);
        }

        if (sortedWeightRecords.length >= 2) {
            const first = sortedWeightRecords[0].weight;
            const last = sortedWeightRecords[sortedWeightRecords.length - 1].weight;
            const diff = last - first;
            tips.push(`体重较初次${diff <= 0 ? '下降' : '上升'} ${Math.abs(diff).toFixed(1)}kg`);
        }

        if (waistMetric.deltaSinceStart != null) {
            const diff = waistMetric.deltaSinceStart;
            tips.push(`腰围较初次${diff <= 0 ? '减少' : '增加'} ${Math.abs(diff).toFixed(1)}cm`);
        }

        if (hipMetric.deltaSinceStart != null) {
            const diff = hipMetric.deltaSinceStart;
            tips.push(`臀围较初次${diff <= 0 ? '减少' : '增加'} ${Math.abs(diff).toFixed(1)}cm`);
        }

        if (tips.length === 0) {
            return '暂时没有足够的体围和体重数据，建议先在体重记录页补充腰围/臀围，AI 分析会自动变得更准确。';
        }

        return `${tips.join('，')}。建议持续每周同一时间记录，观察趋势更稳定。`;
    }, [combinedHistory.length, sortedWeightRecords, waistMetric.deltaSinceStart, hipMetric.deltaSinceStart]);

    const handleNextCard = () => {
        if (combinedHistory.length <= 1) return;
        setActiveIndex((prev) => (prev + 1) % combinedHistory.length);
    };

    return (
        <div className="min-h-screen bg-bg-dark text-white pb-safe relative z-50 flex flex-col font-sans">
            <div className="flex items-center justify-between px-6 py-4 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all">
                    <span className="material-icons-round text-white">arrow_back_ios_new</span>
                </button>
                <h1 className="text-lg font-serif font-bold tracking-widest">进化记录</h1>
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoSelect}
                        accept="image/*"
                        className="hidden"
                    />
                    <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all">
                        <span className="material-icons-round text-[#B8FF00]">add_a_photo</span>
                    </button>
                    <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all">
                        <span className="material-icons-round text-white">share</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pt-2 pb-32 space-y-6">
                {loading && (
                    <div className="text-center py-12 text-gray-500">加载中...</div>
                )}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-3 text-red-400 text-sm">
                        {error}
                    </div>
                )}
                {!loading && combinedHistory.length === 0 && !error && (
                    <div className="text-center py-12 text-gray-500">
                        <span className="material-icons-round text-4xl mb-2 block opacity-30">photo_library</span>
                        暂无进化记录，点击右上角添加
                    </div>
                )}

                <div className="bg-[#151515] rounded-[32px] p-6 border border-white/5 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] text-gray-400 tracking-widest uppercase">当前体重</span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-5xl font-serif font-medium text-white">{latestWeight ?? '--'}</span>
                        <span className="text-sm text-gray-500">kg</span>
                    </div>
                    {weightTrend.length > 1 && (
                        <div className="h-16 w-full opacity-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={weightTrend}>
                                    <Line
                                        type="monotone"
                                        dataKey="val"
                                        stroke="#2AD56F"
                                        strokeWidth={3}
                                        dot={false}
                                        activeDot={{ r: 5, fill: '#2AD56F' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#2AD56F]/10 to-transparent pointer-events-none"></div>
                        </div>
                    )}
                </div>

                <div className="relative py-4 h-[500px] flex justify-center items-center perspective-1000">
                    {combinedHistory.map((item, index) => {
                        const offset = (index - activeIndex + combinedHistory.length) % combinedHistory.length;
                        if (offset > 2) return null;

                        const zIndex = 30 - offset * 10;
                        const scale = 1 - offset * 0.1;
                        const translateY = offset * 45;
                        const brightness = 1 - offset * 0.3;
                        const rotate = offset % 2 === 0 ? offset * 2 : offset * -2;

                        return (
                            <div
                                key={item.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (offset === 0) onNavigate?.(View.EvolutionGallery);
                                    else handleNextCard();
                                }}
                                className="absolute w-full max-w-[320px] aspect-[3.5/5] bg-[#1a1a1a] rounded-[40px] overflow-hidden shadow-2xl ring-1 ring-white/10 transition-all duration-500 ease-out cursor-pointer"
                                style={{
                                    zIndex,
                                    transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
                                    filter: `brightness(${brightness})`,
                                    opacity: offset > 2 ? 0 : 1,
                                }}
                            >
                                <img
                                    src={item.img}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    alt="Evolution Model"
                                />

                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent"></div>

                                <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-xl px-8 py-3 rounded-2xl border border-white/20 text-center shadow-lg w-auto min-w-[160px] transition-opacity duration-300 ${offset === 0 ? 'opacity-100' : 'opacity-0'}`}>
                                    <p className="text-[8px] text-gray-300 tracking-[0.2em] uppercase mb-1 font-bold">{item.status}</p>
                                    <p className="text-xl font-serif font-bold text-white/90">{item.date}</p>
                                </div>

                                <div className="absolute inset-0 bg-white/0 hover:bg-white/5 transition-colors"></div>
                            </div>
                        );
                    })}

                    <div className="absolute top-0 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full pointer-events-none z-40">
                        <span className="text-[10px] font-bold text-gray-400">{combinedHistory.length === 0 ? '0 / 0' : `${activeIndex + 1} / ${combinedHistory.length}`}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#151515] rounded-[32px] p-5 border border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-400 text-xs">腰围</span>
                            <span className={`${waistMetric.badgeClassName} text-[10px] px-2 py-0.5 rounded-full font-bold`}>
                                {waistMetric.badgeText}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-1 mb-3">
                            <span className="text-3xl font-serif text-white">{waistMetric.latest != null ? waistMetric.latest.toFixed(1) : '--'}</span>
                            <span className="text-[10px] text-gray-500 uppercase font-bold">CM</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-full relative">
                            <div className="absolute inset-y-0 left-0 bg-[#2AD56F] rounded-full" style={{ width: `${waistMetric.progressWidth}%` }}></div>
                        </div>
                    </div>

                    <div className="bg-[#151515] rounded-[32px] p-5 border border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-400 text-xs">臀围</span>
                            <span className={`${hipMetric.badgeClassName} text-[10px] px-2 py-0.5 rounded-full font-bold`}>
                                {hipMetric.badgeText}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-1 mb-3">
                            <span className="text-3xl font-serif text-white">{hipMetric.latest != null ? hipMetric.latest.toFixed(1) : '--'}</span>
                            <span className="text-[10px] text-gray-500 uppercase font-bold">CM</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-full relative">
                            <div className="absolute inset-y-0 left-0 bg-[#2AD56F] rounded-full" style={{ width: `${hipMetric.progressWidth}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#151515] rounded-[32px] p-6 border border-white/5 relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#2AD56F]/20 flex items-center justify-center">
                                <span className="material-icons-round text-[#2AD56F] text-sm">auto_awesome</span>
                            </div>
                            <h2 className="text-base font-serif font-bold text-white">AI 智能分析</h2>
                        </div>
                        <span className="text-[10px] text-gray-500 font-serif tracking-widest uppercase">实时分析</span>
                    </div>

                    <p className="text-sm text-gray-300 leading-relaxed font-serif italic relative z-10 opacity-90">
                        “{analysisText}”
                    </p>

                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#2AD56F]/5 rounded-full blur-3xl group-hover:bg-[#2AD56F]/10 transition-colors duration-500"></div>
                </div>
            </div>

            <div className="fixed bottom-6 left-6 right-6 z-50">
                <button className="w-full bg-[#B8FF00] hover:bg-[#a6e600] active:scale-[0.98] transition-all text-black font-bold text-lg py-4 rounded-full flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(184,255,0,0.4)]">
                    <span>查看深度报告</span>
                    <span className="material-icons-round">arrow_forward</span>
                </button>
            </div>
        </div>
    );
};

export default EvolutionRecord;
