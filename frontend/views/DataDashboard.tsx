import React, { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { View } from '../types';
import { aiCoachApi, checkinsApi, dietApi, trainingApi, weightApi } from '../api';
import type { DietSummary } from '../api';
import { generateDataInsights } from '../services/gemini';

interface Props {
    onNavigate?: (view: View) => void;
    weightData?: { date: string; val: number }[];
}

type WeightPoint = { date: string; val: number };

function toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getWeekRange(now = new Date()): { start: string; end: string } {
    const start = new Date(now);
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: toDateKey(start), end: toDateKey(end) };
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

const DataDashboard: React.FC<Props> = ({ onNavigate }) => {
    const [weightChartData, setWeightChartData] = useState<WeightPoint[]>([]);
    const [dietSummary, setDietSummary] = useState<DietSummary | null>(null);
    const [checkinDays, setCheckinDays] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [weeklyCompletedHours, setWeeklyCompletedHours] = useState(0);
    const [weeklyTargetHours, setWeeklyTargetHours] = useState<number | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { start, end } = getWeekRange();
                const [weights, diet, checkins, trainings, profile] = await Promise.all([
                    weightApi.list().catch(() => []),
                    dietApi.summary().catch(() => null),
                    checkinsApi.list().catch(() => []),
                    trainingApi.list().catch(() => []),
                    aiCoachApi.getProfile().catch(() => null),
                ]);

                if (weights.length > 0) {
                    const sorted = [...weights]
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .slice(-7);
                    const today = toDateKey(new Date());
                    setWeightChartData(
                        sorted.map((w) => {
                            if (w.date === today) {
                                return { date: '今天', val: w.weight };
                            }
                            const parts = w.date.split('-');
                            return {
                                date: `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`,
                                val: w.weight,
                            };
                        }),
                    );
                } else {
                    setWeightChartData([]);
                }

                if (diet) setDietSummary(diet);

                const days = new Set<string>();
                checkins.forEach((c) => {
                    const d = c.createdAt?.split('T')[0];
                    if (d) days.add(d);
                });
                setCheckinDays(days);

                const weeklyTrainings = Array.isArray(trainings)
                    ? trainings.filter((t) => typeof t.date === 'string' && t.date >= start && t.date <= end)
                    : [];

                const totalMinutes = weeklyTrainings.reduce((sum, item) => {
                    const value = Number(item.duration);
                    return Number.isFinite(value) && value > 0 ? sum + value : sum;
                }, 0);
                setWeeklyCompletedHours(totalMinutes / 60);

                const targetMinutes = Array.isArray(profile?.fitnessPlan?.weeklyTrainingPlan)
                    ? profile.fitnessPlan.weeklyTrainingPlan.reduce((sum: number, item: any) => {
                        const val = Number(item?.durationMinutes);
                        return Number.isFinite(val) && val > 0 ? sum + val : sum;
                    }, 0)
                    : null;

                setWeeklyTargetHours(
                    targetMinutes != null && targetMinutes > 0 ? targetMinutes / 60 : null,
                );
            } catch (err) {
                console.error('DataDashboard fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        void fetchData();
    }, []);

    useEffect(() => {
        if (loading) return;

        setAiLoading(true);
        const latestWeight =
            weightChartData.length > 0
                ? weightChartData[weightChartData.length - 1].val
                : undefined;

        let weightTrend = '暂无数据';
        if (weightChartData.length >= 2) {
            const diff =
                weightChartData[weightChartData.length - 1].val - weightChartData[0].val;
            weightTrend =
                diff > 0
                    ? `上升 ${diff.toFixed(1)}kg`
                    : diff < 0
                        ? `下降 ${Math.abs(diff).toFixed(1)}kg`
                        : '持平';
        }

        void generateDataInsights({
            totalCalories: dietSummary?.totalCalories,
            totalProtein: dietSummary?.totalProtein,
            totalFat: dietSummary?.totalFat,
            totalCarbs: dietSummary?.totalCarbs,
            latestWeight,
            weightTrend,
            checkinCount: checkinDays.size,
        })
            .then((suggestions) => {
                setAiSuggestions(suggestions);
            })
            .finally(() => setAiLoading(false));
    }, [loading, dietSummary, weightChartData, checkinDays]);

    const latestWeight = weightChartData.length > 0 ? weightChartData[weightChartData.length - 1].val : null;

    const weeklyProgress = useMemo(() => {
        if (weeklyTargetHours == null || weeklyTargetHours <= 0) {
            return weeklyCompletedHours > 0 ? 100 : 0;
        }
        return clamp((weeklyCompletedHours / weeklyTargetHours) * 100, 0, 100);
    }, [weeklyCompletedHours, weeklyTargetHours]);

    return (
        <div className="min-h-screen pb-32 pt-6 px-6 bg-bg-dark text-white font-sans">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-serif font-bold tracking-tight">数据看板</h1>
                <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all">
                    <span className="material-icons-round text-gray-300">settings</span>
                </button>
            </div>

            <div className="bg-[#111] rounded-[32px] p-5 border border-white/5 mb-4 shadow-lg">
                <div className="flex justify-between items-center">
                    <div className="min-w-0 flex-1 pr-3">
                        <p className="text-xs text-gray-400 mb-1">本周已完成</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold font-serif text-white">
                                {loading ? '--' : weeklyCompletedHours.toFixed(1)}
                            </span>
                            <span className="text-sm text-gray-500">
                                {weeklyTargetHours != null
                                    ? `/ ${weeklyTargetHours.toFixed(1)} 小时`
                                    : '小时'}
                            </span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-3 max-w-[220px]">
                            <div
                                className="h-full bg-primary rounded-full shadow-[0_0_12px_#B8FF00]"
                                style={{ width: `${weeklyProgress}%` }}
                            ></div>
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

            <div className="bg-[#111] rounded-[32px] p-6 border border-white/5 mb-4 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-sm text-gray-400">消耗热量</p>
                    <span className="material-icons-round text-primary text-sm">local_fire_department</span>
                </div>
                <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-bold font-serif text-white">
                        {dietSummary ? dietSummary.totalCalories.toLocaleString() : '--'}
                    </span>
                    <span className="text-sm text-gray-500">kcal</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full shadow-[0_0_12px_#B8FF00]"
                        style={{ width: `${dietSummary ? Math.min(100, (dietSummary.totalCalories / 1800) * 100) : 0}%` }}
                    />
                </div>
            </div>

            <div className="bg-[#111] rounded-[32px] p-6 border border-white/5 mb-4 shadow-lg relative overflow-hidden">
                {/* 装饰背景光晕 */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-lg font-bold text-white">体重趋势</h2>
                        </div>
                        <p className="text-xs text-gray-500">最近7天趋势</p>
                    </div>

                    <button
                        onClick={() => onNavigate?.(View.WeightRecord)}
                        className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center border border-primary/10 shadow-[0_0_15px_rgba(184,255,0,0.05)] hover:bg-primary/20 active:scale-95 transition-all"
                        aria-label="前往体重记录"
                    >
                        <span className="material-icons-round text-primary text-xl">monitor_weight</span>
                    </button>
                </div>

                <div className="flex items-baseline gap-1.5 mb-4 relative z-10">
                    <span className="text-5xl font-black font-serif text-white tracking-tighter">
                        {latestWeight != null ? latestWeight.toFixed(1) : '--'}
                    </span>
                    <span className="text-lg text-primary font-bold">kg</span>
                </div>

                <div className="h-[200px] w-full relative z-10">
                    {weightChartData.length < 2 ? (
                        <div className="h-full rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center px-6">
                            <span className="material-icons-round text-3xl text-gray-500 mb-2">monitor_weight</span>
                            <p className="text-sm text-gray-300 mb-1">体重数据不足</p>
                            <p className="text-xs text-gray-500">至少记录 2 次体重后显示趋势图</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <AreaChart data={weightChartData} margin={{ left: 0, right: 0, top: 10, bottom: 10 }}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#B8FF00" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#B8FF00" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Tooltip
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-[#222] border border-white/10 px-3 py-1.5 rounded-lg shadow-xl">
                                                    <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
                                                    <p className="text-xs font-bold text-white">{`${payload[0].value} 公斤`}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                    cursor={{ stroke: 'rgba(255,255,255,0.12)' }}
                                />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 10 }}
                                    dy={8}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="val"
                                    stroke="#B8FF00"
                                    strokeWidth={3}
                                    fill="url(#colorVal)"
                                    activeDot={{ r: 5, fill: '#B8FF00', stroke: 'black', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <div className="bg-[#111] rounded-[32px] p-6 border border-white/5 mb-4 shadow-lg">
                <div className="flex justify-between items-start mb-6">
                    <h2 className="text-lg font-bold">今日饮食</h2>
                    <button
                        onClick={() => onNavigate?.(View.Diet)}
                        className="flex items-center gap-1 bg-[#2a2a2a] text-[#B8FF00] px-3 py-1 rounded-lg text-[10px] font-bold active:scale-95 transition-transform"
                    >
                        <span className="material-icons-round text-sm">filter_center_focus</span>
                        拍照识别
                    </button>
                </div>

                <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold font-serif text-white">
                            {dietSummary ? dietSummary.totalCalories.toLocaleString() : '--'}
                        </span>
                        <span className="text-sm text-gray-500">kcal</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-bold text-gray-400">蛋白质</span>
                            <span className="text-gray-500">{dietSummary ? `${dietSummary.totalProtein}g` : '--'}</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden flex">
                            <div className="h-full bg-[#4A90E2] rounded-full" style={{ width: `${dietSummary ? Math.min(100, (dietSummary.totalProtein / 120) * 100) : 0}%` }} />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-bold text-gray-400">脂肪</span>
                            <span className="text-gray-500">{dietSummary ? `${dietSummary.totalFat}g` : '--'}</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden flex">
                            <div className="h-full bg-[#F5A623] rounded-full" style={{ width: `${dietSummary ? Math.min(100, (dietSummary.totalFat / 55) * 100) : 0}%` }} />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-bold text-gray-400">碳水</span>
                            <span className="text-gray-500">{dietSummary ? `${dietSummary.totalCarbs}g` : '--'}</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden flex">
                            <div className="h-full bg-[#50E3C2] rounded-full" style={{ width: `${dietSummary ? Math.min(100, (dietSummary.totalCarbs / 200) * 100) : 0}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-[#111] rounded-[32px] p-6 border border-white/5 mb-4 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-bold">活动热力图</h2>
                    <span className="text-[10px] text-gray-500">过去30天</span>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-4">
                    {['一', '二', '三', '四', '五', '六', '日'].map((d, i) => (
                        <span key={i} className="text-[10px] text-center text-gray-600">{d}</span>
                    ))}

                    {Array.from({ length: 28 }).map((_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - (27 - i));
                        const dateStr = toDateKey(date);
                        const hasCheckin = checkinDays.has(dateStr);

                        return (
                            <div
                                key={i}
                                className="aspect-square rounded-md transition-all hover:scale-110"
                                style={{
                                    backgroundColor: hasCheckin ? '#B8FF00' : 'rgba(255,255,255,0.05)',
                                    opacity: hasCheckin ? 0.8 : 1,
                                }}
                            />
                        );
                    })}
                </div>

                <div className="flex justify-end items-center gap-2 text-[10px] text-gray-500">
                    <span>少</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-sm bg-white/5"></div>
                        <div className="w-3 h-3 rounded-sm bg-[#4a5900] opacity-50"></div>
                        <div className="w-3 h-3 rounded-sm bg-[#4a5900]"></div>
                        <div className="w-3 h-3 rounded-sm bg-[#B8FF00]"></div>
                    </div>
                    <span>多</span>
                </div>
            </div>

            <div className="bg-[#111] rounded-[32px] p-6 border border-white/5 mb-4 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-icons-round text-primary text-lg">auto_awesome</span>
                    <h2 className="text-sm font-bold font-serif">AI 下一步建议</h2>
                </div>
                {aiLoading ? (
                    <div className="space-y-3">
                        <div className="h-4 bg-white/5 rounded-full w-4/5 animate-pulse"></div>
                        <div className="h-4 bg-white/5 rounded-full w-3/5 animate-pulse"></div>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {aiSuggestions.map((tip, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div>
                                <p className="text-xs text-gray-300 leading-relaxed">{tip}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default DataDashboard;


