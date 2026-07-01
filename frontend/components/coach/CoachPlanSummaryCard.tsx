import React, { useEffect, useState } from 'react';

export interface CoachPlanExercise {
  name: string;
  weight: string;
  sets: string;
  reps: string;
}

export interface CoachPlanSummaryData {
  assessment: {
    title: string;
    lines: string[];
    priority: string;
  };
  training: {
    splitName: string;
    rationale: string;
    weekly: Array<{ day: string; focus: string }>;
    todayFocus: string;
    exercises: CoachPlanExercise[];
    note: string;
  };
  diet: {
    targetCalories: number;
    deficit: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    tips: string[];
  };
  hydration: {
    dailyTargetMl: number;
    schedule: Array<{ time: string; amountMl: number }>;
  };
}

interface Props {
  data: CoachPlanSummaryData;
  onStart?: () => void;
}

const labels = {
  summaryTitle: '\u4f60\u7684\u9996\u7248\u79c1\u6559\u65b9\u6848',
  assessment: '\u73b0\u72b6\u5206\u6790',
  training: '\u8bad\u7ec3\u8ba1\u5212',
  trainingSummary: '\u8bad\u7ec3\u8ba1\u5212',
  calorieSummary: '\u70ed\u91cf\u6444\u5165',
  waterSummary: '\u996e\u6c34\u8ba1\u5212',
  daily: '\u6bcf\u5929',
  weekly: '\u672c\u5468\u6846\u67b6',
  today: '\u4eca\u5929\u5148\u7ec3',
  exercises: '\u4eca\u65e5\u52a8\u4f5c',
  addExercise: '\u6dfb\u52a0\u6307\u5b9a\u52a8\u4f5c',
  diet: '\u996e\u98df\u8ba1\u5212',
  targetCalories: '\u4eca\u65e5\u76ee\u6807\u70ed\u91cf',
  macros: '\u78b3\u86cb\u8102',
  photo: '\u62cd\u7167\u89c4\u5219',
  hydration: '\u996e\u6c34\u8ba1\u5212',
  dailyWater: '\u4eca\u65e5\u996e\u6c34\u76ee\u6807',
  addWater: '\u6dfb\u52a0\u996e\u6c34\u65f6\u95f4',
  start: '\u6309\u8fd9\u4efd\u65b9\u6848\u5f00\u59cb\u6267\u884c',
  actionName: '\u52a8\u4f5c',
  actionWeight: '\u91cd\u91cf',
  sets: '\u7ec4\u6570',
  reps: '\u6b21\u6570',
  time: '\u65f6\u95f4',
  amount: '\u6c34\u91cf',
};

const inputClass = 'w-full bg-transparent border-b border-white/10 focus:border-primary outline-none text-white font-bold text-sm py-1';
const smallInputClass = 'w-full bg-transparent border-b border-white/10 focus:border-primary outline-none text-gray-300 text-xs py-1';

const normalizeTime = (value: string): string => {
  const match = value.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return value;
  const hour = Math.min(23, Math.max(0, Number(match[1]) || 0));
  const minute = Math.min(59, Math.max(0, Number(match[2]) || 0));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const Section: React.FC<{ icon: string; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-[#111] border border-white/10 rounded-2xl p-4 space-y-3">
    <div className="flex items-center gap-2">
      <span className="material-icons-round text-primary text-lg">{icon}</span>
      <h4 className="text-white font-bold text-base">{title}</h4>
    </div>
    {children}
  </div>
);

const CoachPlanSummaryCard: React.FC<Props> = ({ data, onStart }) => {
  const [exercises, setExercises] = useState<CoachPlanExercise[]>(data.training.exercises);
  const [waterSchedule, setWaterSchedule] = useState(data.hydration.schedule);

  useEffect(() => {
    setExercises(data.training.exercises);
    setWaterSchedule(data.hydration.schedule);
  }, [data]);

  const updateExercise = (index: number, field: keyof CoachPlanExercise, value: string) => {
    setExercises((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addExercise = () => {
    setExercises((prev) => [
      ...prev,
      { name: '\u81ea\u5b9a\u4e49\u52a8\u4f5c', weight: '\u5f85\u586b\u5199', sets: '3\u7ec4', reps: '10\u6b21' },
    ]);
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const updateWater = (index: number, field: 'time' | 'amountMl', value: string) => {
    setWaterSchedule((prev) => prev.map((item, i) => (
      i === index
        ? { ...item, [field]: field === 'amountMl' ? Math.max(0, Number(value) || 0) : normalizeTime(value) }
        : item
    )));
  };

  const addWater = () => {
    setWaterSchedule((prev) => [...prev, { time: '21:30', amountMl: 300 }]);
  };

  const removeWater = (index: number) => {
    setWaterSchedule((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full bg-[#1A1A1A]/90 backdrop-blur-md border border-primary/20 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(184,255,0,0.08)] animate-fade-in-up">
      <div className="p-5 bg-gradient-to-b from-primary/10 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-icons-round text-primary">assignment_turned_in</span>
          <h3 className="text-xl font-bold text-white">{labels.summaryTitle}</h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">{data.assessment.title}</p>
      </div>

      <div className="p-4 space-y-4">
        <Section icon="monitor_heart" title={labels.assessment}>
          <div className="space-y-2">
            {data.assessment.lines.map((line, index) => (
              <p key={index} className="text-sm text-gray-300 leading-relaxed">{line}</p>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2">
            <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 flex items-center justify-between gap-3">
              <span className="text-xs text-primary/80">{labels.trainingSummary}</span>
              <span className="text-sm text-primary font-bold">{data.training.splitName}</span>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 flex items-center justify-between gap-3">
              <span className="text-xs text-primary/80">{labels.calorieSummary}</span>
              <span className="text-sm text-primary font-bold">{labels.daily}{data.diet.targetCalories} kcal</span>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 flex items-center justify-between gap-3">
              <span className="text-xs text-primary/80">{labels.waterSummary}</span>
              <span className="text-sm text-primary font-bold">{labels.daily}{data.hydration.dailyTargetMl} ml</span>
            </div>
          </div>
        </Section>

        <Section icon="fitness_center" title={labels.training}>
          <div className="flex items-center justify-between gap-3 bg-black/30 rounded-xl p-3">
            <div>
              <p className="text-xs text-gray-500">{data.training.splitName}</p>
              <p className="text-sm text-gray-300 mt-1">{data.training.rationale}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">{labels.weekly}</p>
            <div className="grid grid-cols-2 gap-2">
              {data.training.weekly.map((item) => (
                <div key={item.day} className="bg-white/[0.04] rounded-xl px-3 py-2 border border-white/5">
                  <p className="text-[10px] text-gray-500">{item.day}</p>
                  <p className="text-sm text-white font-bold mt-0.5">{item.focus}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-black/30 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">{labels.today}</p>
            <p className="text-base text-primary font-bold">{data.training.todayFocus}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">{labels.exercises}</p>
            <div className="space-y-2">
              {exercises.map((ex, index) => (
                <div key={`${ex.name}-${index}`} className="bg-white/[0.04] rounded-xl px-3 py-3 border border-white/5 space-y-2">
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
                    <input
                      value={ex.name}
                      onChange={(event) => updateExercise(index, 'name', event.target.value)}
                      className={inputClass}
                      aria-label={labels.actionName}
                    />
                    <button onClick={() => removeExercise(index)} className="w-8 h-8 rounded-full bg-white/5 text-gray-500 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center">
                      <span className="material-icons-round text-base">close</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input value={ex.weight} onChange={(event) => updateExercise(index, 'weight', event.target.value)} className={smallInputClass} aria-label={labels.actionWeight} />
                    <input value={ex.sets} onChange={(event) => updateExercise(index, 'sets', event.target.value)} className={smallInputClass} aria-label={labels.sets} />
                    <input value={ex.reps} onChange={(event) => updateExercise(index, 'reps', event.target.value)} className={smallInputClass} aria-label={labels.reps} />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addExercise} className="mt-3 w-full py-2.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
              <span className="material-icons-round text-base">add</span>
              {labels.addExercise}
            </button>
            <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">{data.training.note}</p>
          </div>
        </Section>

        <Section icon="restaurant" title={labels.diet}>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-black/30 rounded-xl p-3">
              <p className="text-[10px] text-gray-500">{labels.targetCalories}</p>
              <p className="text-lg text-primary font-bold">{data.diet.targetCalories} kcal</p>
              <p className="text-[10px] text-gray-500">-{data.diet.deficit} kcal</p>
            </div>
            <div className="bg-black/30 rounded-xl p-3">
              <p className="text-[10px] text-gray-500">{labels.macros}</p>
              <p className="text-sm text-white font-bold">C {data.diet.carbsGrams}g</p>
              <p className="text-sm text-white font-bold">P {data.diet.proteinGrams}g / F {data.diet.fatGrams}g</p>
            </div>
          </div>
          <div className="space-y-2">
            {data.diet.tips.map((tip, index) => (
              <p key={index} className="text-sm text-gray-300 leading-relaxed">{tip}</p>
            ))}
          </div>
          <div className="bg-[#F5A623]/10 border border-[#F5A623]/20 rounded-xl p-3 text-sm text-[#F5A623] leading-relaxed">
            {labels.photo + '\uff1a\u6ca1\u5403\u524d\u5148\u62cd\uff0c\u6211\u5e2e\u4f60\u9884\u4f30\u8fd9\u987f\u600e\u4e48\u5403\uff1b\u5403\u5b8c\u518d\u62cd\uff0c\u76f4\u63a5\u8bb0\u5f55\u70ed\u91cf\u5e76\u540c\u6b65\u770b\u677f\u3002'}
          </div>
        </Section>

        <Section icon="water_drop" title={labels.hydration}>
          <div className="bg-black/30 rounded-xl p-3 flex items-center justify-between">
            <p className="text-sm text-gray-400">{labels.dailyWater}</p>
            <p className="text-lg text-primary font-bold">{data.hydration.dailyTargetMl} ml</p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {waterSchedule.map((slot, index) => (
              <div key={`${slot.time}-${index}`} className="bg-white/[0.04] rounded-xl px-3 py-2 border border-white/5 grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <label className="relative block">
                  <input
                    value={normalizeTime(slot.time)}
                    type="time"
                    onChange={(event) => updateWater(index, 'time', event.target.value)}
                    className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                    aria-label={labels.time}
                  />
                  <div className="flex items-center justify-between border-b border-white/10 py-1 text-white font-bold text-sm">
                    <span>{normalizeTime(slot.time)}</span>
                    <span className="material-icons-round text-gray-500 text-base">schedule</span>
                  </div>
                </label>
                <div className="flex items-center gap-1">
                  <input value={slot.amountMl} type="number" onChange={(event) => updateWater(index, 'amountMl', event.target.value)} className={inputClass} aria-label={labels.amount} />
                  <span className="text-sm text-gray-500">ml</span>
                </div>
                <button onClick={() => removeWater(index)} className="w-8 h-8 rounded-full bg-white/5 text-gray-500 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center">
                  <span className="material-icons-round text-base">close</span>
                </button>
              </div>
            ))}
          </div>
          <button onClick={addWater} className="w-full py-2.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
            <span className="material-icons-round text-base">add</span>
            {labels.addWater}
          </button>
        </Section>
      </div>

      {onStart && (
        <div className="p-4 pt-0">
          <button
            onClick={onStart}
            className="w-full py-3.5 bg-primary text-black font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-[#a3e600] active:scale-95 transition-all shadow-[0_0_20px_rgba(184,255,0,0.2)]"
          >
            <span className="material-icons-round text-[18px]">play_arrow</span>
            {labels.start}
          </button>
        </div>
      )}
    </div>
  );
};

export default CoachPlanSummaryCard;
