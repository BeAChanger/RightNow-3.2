import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from '../types';
import { evolutionStageApi, EvolutionStage } from '../api/evolution-stage';
import { evolutionApi } from '../api/evolution';
import type { EvolutionRecord as EvolutionRecordItem } from '../api/evolution';

interface Props {
  onBack: () => void;
  onNavigate?: (view: View) => void;
  currentFat?: number;
  targetFat?: number;
}

const STAGES_CONFIG = [
  { id: 6, top: 120, left: 200, align: 'center' },
  { id: 5, top: 380, left: 100, align: 'left' },
  { id: 4, top: 620, left: 300, align: 'right' },
  { id: 3, top: 880, left: 300, align: 'right' },
  { id: 2, top: 1140, left: 100, align: 'left' },
  { id: 1, top: 1400, left: 100, align: 'left' },
  { id: 0, top: 1650, left: 200, align: 'center' },
] as const;

const FALLBACK_STAGE_TITLES = [
  '当前状态',
  '初始进展',
  '持续进步',
  '变化可见',
  '接近目标',
  '冲刺阶段',
  '目标身材',
] as const;

const USER_IMAGE_KEY = 'rightnow_user_image';
const IDEAL_BODY_IMAGE_KEY = 'rightnow_ideal_body_image';

type StageImageContext = {
  firstImage?: string;
  currentImage?: string;
  goalImage?: string;
  timeline: string[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function readLocalImage(key: string): string | undefined {
  if (typeof window === 'undefined' || !window.localStorage) {
    return undefined;
  }

  const value = window.localStorage.getItem(key);
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  return value;
}

function isLikelyUserPhoto(image: string): boolean {
  const normalized = image.toLowerCase();

  if (normalized.startsWith('data:image/')) {
    return true;
  }

  if (normalized.startsWith('blob:')) {
    return true;
  }

  const deniedMarkers = ['/progress/', '/ori.png', '/placeholder.png', '/mock/'];
  if (deniedMarkers.some((marker) => normalized.includes(marker))) {
    return false;
  }

  if (normalized.includes('/uploads/')) {
    return true;
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return true;
  }

  return normalized.startsWith('/');
}

function uniqImages(images: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const list: string[] = [];

  for (const image of images) {
    if (!image) {
      continue;
    }

    const normalized = image.trim();
    if (!normalized || !isLikelyUserPhoto(normalized) || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    list.push(normalized);
  }

  return list;
}

function buildImageContext(records: EvolutionRecordItem[]): StageImageContext {
  const localCurrent = readLocalImage(USER_IMAGE_KEY);
  const localGoal = readLocalImage(IDEAL_BODY_IMAGE_KEY);

  const sorted = [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const recordImages = sorted
    .map((record) => record.imageUrl)
    .filter((image): image is string => typeof image === 'string' && image.trim().length > 0);

  // Timeline is from first uploaded photo to latest uploaded photo.
  const timeline = uniqImages([...recordImages, localCurrent]);
  const firstImage = recordImages[0] ?? timeline[0];
  const currentImage = recordImages[recordImages.length - 1] ?? timeline[timeline.length - 1];
  const goalImage = uniqImages([localGoal])[0] ?? timeline[timeline.length - 1];

  return {
    firstImage,
    currentImage,
    goalImage,
    timeline,
  };
}

function pickTimelineImage(stageIndex: number, context: StageImageContext): string | undefined {
  if (context.timeline.length === 0) {
    return undefined;
  }

  if (stageIndex <= 0) {
    return context.firstImage ?? context.timeline[0];
  }

  if (stageIndex >= 6) {
    return context.goalImage ?? context.timeline[context.timeline.length - 1];
  }

  return context.timeline[Math.min(stageIndex, context.timeline.length - 1)];
}

function hydrateStageImages(stages: EvolutionStage[], context: StageImageContext): EvolutionStage[] {
  return [...stages]
    .sort((a, b) => a.stageIndex - b.stageIndex)
    .map((stage) => {
      const candidateImage = pickTimelineImage(stage.stageIndex, context);
      const preferredGoal = stage.stageIndex === 6 ? context.goalImage : undefined;
      const stageActual =
        stage.actualImageUrl && isLikelyUserPhoto(stage.actualImageUrl)
          ? stage.actualImageUrl
          : undefined;
      const stagePreview =
        stage.previewImageUrl && isLikelyUserPhoto(stage.previewImageUrl)
          ? stage.previewImageUrl
          : undefined;

      if (stage.stageIndex === 0) {
        const stageZeroImage =
          context.firstImage ||
          stageActual ||
          stagePreview ||
          candidateImage;

        return {
          ...stage,
          previewImageUrl: stagePreview || stageZeroImage,
          actualImageUrl: stage.isUnlocked ? stageZeroImage : stageActual,
        };
      }

      const preferredImage =
        preferredGoal ||
        stageActual ||
        stagePreview ||
        candidateImage;

      return {
        ...stage,
        previewImageUrl: stagePreview || preferredImage,
        actualImageUrl: stage.isUnlocked
          ? preferredGoal || stageActual || candidateImage
          : stageActual,
      };
    });
}

function buildFallbackStages(
  currentFat: number,
  targetFat: number,
  imageContext: StageImageContext,
): EvolutionStage[] {
  const safeCurrent = Number(clamp(currentFat, 3, 60).toFixed(1));
  const safeTarget = Number(clamp(targetFat, 3, safeCurrent).toFixed(1));
  const step = Number(((safeCurrent - safeTarget) / 6).toFixed(1));

  return Array.from({ length: 7 }, (_, index) => {
    const value = Number((safeCurrent - step * index).toFixed(1));
    const targetBodyFat = index === 6 ? safeTarget : Number(Math.max(safeTarget, value).toFixed(1));
    const candidateImage = pickTimelineImage(index, imageContext);

    return {
      stageIndex: index,
      targetBodyFat,
      title: FALLBACK_STAGE_TITLES[index],
      previewImageUrl: candidateImage,
      isUnlocked: index <= 1,
      actualImageUrl: index <= 1 ? candidateImage : undefined,
      qualifiedCount: index === 0 ? 2 : index === 1 ? 1 : 0,
    };
  });
}

function buildDisplayBodyFatByStage(
  stages: EvolutionStage[],
  currentFat: number,
  targetFat: number,
): Map<number, number> {
  const rawByStage = new Map<number, number>();
  const rawValues: number[] = [];

  for (const stage of stages) {
    if (!Number.isFinite(stage.targetBodyFat)) {
      continue;
    }

    const value = clamp(stage.targetBodyFat, 3, 60);
    rawByStage.set(stage.stageIndex, value);
    rawValues.push(value);
  }

  const maxRaw = rawValues.length > 0 ? Math.max(...rawValues) : clamp(currentFat, 3, 60);
  const minRaw = rawValues.length > 0 ? Math.min(...rawValues) : clamp(targetFat, 3, 60);
  const highest = clamp(Math.max(maxRaw, currentFat), 3, 60);
  const lowest = clamp(Math.min(minRaw, targetFat, highest), 3, highest);
  const stageCount = STAGES_CONFIG.length;
  const values: number[] = new Array(stageCount).fill(lowest);

  values[0] = Number(highest.toFixed(1));
  for (let index = 1; index < stageCount; index += 1) {
    const fallback = highest - ((highest - lowest) * index) / (stageCount - 1);
    const raw = rawByStage.get(index);
    const seeded = clamp(raw ?? fallback, lowest, highest);
    values[index] = Number(Math.min(values[index - 1], seeded).toFixed(1));
  }

  values[stageCount - 1] = Number(Math.min(values[stageCount - 1], lowest).toFixed(1));
  for (let index = stageCount - 2; index >= 0; index -= 1) {
    values[index] = Number(Math.max(values[index], values[index + 1]).toFixed(1));
  }

  return new Map(values.map((value, stageIndex) => [stageIndex, value]));
}

const EvolutionProgress: React.FC<Props> = ({ onBack, currentFat: propCurrentFat, targetFat: propTargetFat }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fallbackCurrentFat = propCurrentFat ?? 28;
  const fallbackTargetFat = propTargetFat ?? 15;

  const [showBanner, setShowBanner] = useState(true);
  const [stages, setStages] = useState<EvolutionStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadIssue, setLoadIssue] = useState('');
  const [currentFat, setCurrentFat] = useState(fallbackCurrentFat);
  const [targetFat, setTargetFat] = useState(fallbackTargetFat);

  const displayBodyFatByStage = useMemo(
    () => buildDisplayBodyFatByStage(stages, currentFat, targetFat),
    [stages, currentFat, targetFat],
  );

  useEffect(() => {
    void loadStages();
  }, []);

  useEffect(() => {
    if (loading || !containerRef.current) {
      return;
    }

    if (stages.length > 0) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      return;
    }

    containerRef.current.scrollTop = 0;
  }, [loading, stages.length]);

  const loadStages = async () => {
    setLoading(true);
    setLoadIssue('');

    const [recordsResult, stagesResult] = await Promise.allSettled([
      evolutionApi.list(),
      evolutionStageApi.list(),
    ]);

    const records =
      recordsResult.status === 'fulfilled' && Array.isArray(recordsResult.value)
        ? recordsResult.value
        : [];

    const imageContext = buildImageContext(records);
    const hasUserPhoto =
      Boolean(imageContext.currentImage) ||
      Boolean(imageContext.goalImage) ||
      imageContext.timeline.length > 0;

    try {
      if (stagesResult.status !== 'fulfilled') {
        throw stagesResult.reason;
      }

      const data = stagesResult.value;
      const normalizedStages = hydrateStageImages(data.stages, imageContext);

      if (normalizedStages.length === 0) {
        throw new Error('Stage list is empty.');
      }

      setStages(normalizedStages);
      setCurrentFat(data.currentBodyFat || fallbackCurrentFat);

      const goalStage = normalizedStages.find((stage) => stage.stageIndex === 6) ?? normalizedStages[normalizedStages.length - 1];
      setTargetFat(goalStage?.targetBodyFat || fallbackTargetFat);

      if (!hasUserPhoto) {
        setLoadIssue('暂未检测到你的进化照片，请先在“进化记录”里上传。');
      }
    } catch (err) {
      console.error('Failed to load evolution stages:', err);
      setStages(buildFallbackStages(fallbackCurrentFat, fallbackTargetFat, imageContext));
      setCurrentFat(fallbackCurrentFat);
      setTargetFat(fallbackTargetFat);
      setLoadIssue(
        hasUserPhoto
          ? '进度阶段服务暂不可用，已回退到你的照片路径。'
          : '暂未检测到你的进化照片，请先在“进化记录”里上传。',
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStageImage = (imageUrl: string | undefined, alt: string, className: string) => (
    <>
      {imageUrl ? (
        <img
          src={imageUrl}
          className={className}
          alt={alt}
          onError={(event) => {
            const image = event.currentTarget;
            image.style.display = 'none';

            const placeholder = image.nextElementSibling;
            if (placeholder instanceof HTMLElement) {
              placeholder.style.opacity = '1';
            }
          }}
        />
      ) : null}
      <div
        className={`absolute inset-0 flex items-center justify-center text-[11px] text-white/45 tracking-wide ${imageUrl ? 'opacity-0' : 'opacity-100'}`}
      >
        等待你的照片
      </div>
    </>
  );

  return (
    <div
      className="h-screen bg-[#050505] overflow-y-auto overflow-x-hidden font-sans select-none scroll-smooth relative"
      ref={containerRef}
    >
      <div className="fixed top-0 w-full flex items-center justify-between px-6 py-5 z-50 bg-gradient-to-b from-[#050505] via-[#050505]/80 to-transparent">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-[#111] border border-white/5 shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform">
          <span className="material-icons-round text-lg">close</span>
        </button>
        <div className="px-5 py-2 rounded-full bg-black/80 backdrop-blur-md border border-[#B8FF00]/30 shadow-[0_0_15px_rgba(184,255,0,0.1)]">
          <span className="text-xs text-[#B8FF00] font-bold tracking-widest uppercase">进化路径</span>
        </div>
        <button className="w-10 h-10 rounded-full bg-[#111] border border-white/5 shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform">
          <span className="material-icons-round text-lg">settings</span>
        </button>
      </div>

      <div className="relative w-full max-w-[400px] h-[1900px] mx-auto mt-32 pb-40">
        {loadIssue && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[90%] max-w-[340px] z-20 rounded-xl border border-[#B8FF00]/30 bg-black/70 backdrop-blur-md px-3 py-2 text-center text-[11px] text-[#D5FF73]">
            {loadIssue}
          </div>
        )}

        <svg className="absolute inset-0 w-full h-[1900px] z-0 pointer-events-none" viewBox="0 0 400 1900" preserveAspectRatio="xMidYMid slice">
          <path
            d="M 200,120
               C 200,280 100,280 100,380
               C 100,520 300,520 300,620
               C 300,760 300,760 300,880
               C 300,1020 100,1020 100,1140
               C 100,1280 100,1280 100,1400
               C 100,1540 200,1540 200,1650
               L 200,1800"
            stroke="#B8FF00"
            strokeWidth="1.5"
            strokeDasharray="6 6"
            fill="none"
            opacity="0.6"
          />
        </svg>

        {loading ? (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white">加载中...</div>
        ) : stages.length === 0 ? (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-white/60 text-sm">未获取到阶段数据，请稍后重试</p>
            <button onClick={loadStages} className="mt-4 px-4 py-2 bg-[#B8FF00] text-black rounded-lg text-sm">重试</button>
          </div>
        ) : (
          STAGES_CONFIG.map((conf) => {
            const stage = stages.find((s) => s.stageIndex === conf.id);
            if (!stage) {
              return null;
            }

            const bodyFat = displayBodyFatByStage.get(conf.id) ?? Math.round(stage.targetBodyFat);
            const isGoal = conf.id === 6;
            const isCurrent = conf.id === 0;
            const isNextStage = conf.id === 1;
            const imageUrl = stage.actualImageUrl || stage.previewImageUrl;

            if (isGoal) {
              return (
                <div key={conf.id} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10" style={{ top: conf.top, left: conf.left }}>
                  <div className="relative">
                    <div className="absolute -inset-4 bg-[#FFD700]/20 blur-2xl rounded-full animate-pulse-slow"></div>
                    <div className="absolute -inset-1 bg-gradient-to-b from-[#FFD700]/60 to-transparent blur-md rounded-[2rem]"></div>

                    <div className="w-[150px] h-[190px] rounded-[1.8rem] bg-black border-[2.5px] border-[#FFD700] flex items-center justify-center shadow-[0_0_50px_rgba(255,215,0,0.4),inset_0_0_20px_rgba(255,215,0,0.3)] relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-t from-[#FFD700]/20 to-transparent opacity-80 z-20 pointer-events-none mix-blend-screen"></div>
                      {renderStageImage(imageUrl, 'Goal', 'w-full h-full object-cover object-top relative z-10 brightness-[1.15] contrast-[1.2] saturate-150')}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#FFF]/40 to-transparent -translate-x-full animate-[shimmer_3s_ease-out_infinite] z-20 mix-blend-overlay"></div>
                      <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black via-black/40 to-transparent z-10"></div>
                    </div>

                    <div className="absolute -top-7 left-0 right-0 flex items-center justify-center animate-bounce z-30 drop-shadow-[0_0_15px_#FFD700]">
                      <span className="material-icons-round text-[#FFD700] text-4xl leading-none">workspace_premium</span>
                    </div>
                    <div className="absolute -bottom-2 -left-3 animate-pulse">
                      <span className="material-icons-round text-[#FFD700]/80 text-xl blur-[1px]">flare</span>
                    </div>
                  </div>

                  <div className="mt-5 bg-[#120a00]/90 backdrop-blur-md px-6 py-2.5 rounded-xl border border-[#FFD700]/40 text-center shadow-[0_10px_30px_rgba(255,215,0,0.2)] relative z-20">
                    <h3 className="text-[#FFD700] font-black text-[15px] tracking-widest drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]">{stage.title}</h3>
                    <p className="text-[#FFD700]/70 text-[10px] tracking-wider mt-1 font-bold">目标: {bodyFat}% 体脂</p>
                  </div>
                </div>
              );
            }

            if (isCurrent) {
              return (
                <div key={conf.id} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10" style={{ top: conf.top, left: conf.left }}>
                  <div className="w-[170px] h-[210px] rounded-[1.5rem] bg-black border-[1.5px] border-[#B8FF00] overflow-hidden flex flex-col relative shadow-[0_0_40px_rgba(184,255,0,0.15)] glow-neon">
                    {renderStageImage(imageUrl, 'Current', 'w-full h-full object-cover object-top opacity-90')}
                    <div className="absolute top-0 w-full h-1 bg-[#B8FF00]/60"></div>
                    <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/90 to-transparent pt-12 pb-4 text-center">
                      <h3 className="text-[#B8FF00] font-black italic text-4xl drop-shadow-md tracking-tighter">
                        {bodyFat}%<span className="text-[12px] not-italic ml-1 opacity-80">体脂</span>
                      </h3>
                      <p className="text-white/80 text-[10px] uppercase font-bold tracking-[0.2em] mt-1">{stage.title}</p>
                    </div>
                  </div>
                  <div className="absolute -bottom-10 w-2 h-2 rounded-full bg-[#B8FF00] shadow-[0_0_15px_#B8FF00] border-2 border-[#B8FF00]"></div>
                  <div className="absolute -bottom-10 w-1 h-[40px] bg-gradient-to-t from-[#B8FF00] to-transparent -z-10 opacity-50"></div>
                  <div className="absolute -left-[85px] top-1/2 -translate-y-1/2 flex items-center animate-bounce-x">
                    <div className="bg-[#B8FF00] text-black text-[11px] font-bold px-2 py-1.5 rounded-sm shadow-[0_0_10px_#B8FF00]">当前状态</div>
                    <div className="w-4 h-4 bg-[#B8FF00] rotate-45 -ml-2 rounded-sm transform translate-x-[4px]"></div>
                  </div>
                </div>
              );
            }

            if (stage.isUnlocked) {
              return (
                <div key={conf.id} className="absolute -translate-x-1/2 -translate-y-1/2 z-10" style={{ top: conf.top, left: conf.left }}>
                  <div className="w-[170px] h-[210px] rounded-[1.5rem] bg-black border border-[#B8FF00]/60 overflow-hidden relative shadow-[0_0_30px_rgba(184,255,0,0.2)]">
                    {renderStageImage(stage.actualImageUrl || imageUrl, `Unlocked ${conf.id}`, 'w-full h-full object-cover object-top opacity-90')}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-12 pb-3 flex flex-col items-center">
                      <span className="text-[#B8FF00] font-black text-2xl italic tracking-tighter drop-shadow-md">{bodyFat}%</span>
                      <div className="flex items-center gap-1 mt-1 opacity-90 bg-[#B8FF00]/20 px-2.5 py-0.5 rounded-full border border-[#B8FF00]/40">
                        <span className="material-icons-round text-[10px] text-[#B8FF00]">check_circle</span>
                        <span className="text-[9px] text-[#B8FF00] font-bold tracking-widest">已解锁</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            if (isNextStage) {
              return (
                <div key={conf.id} className="absolute -translate-x-1/2 -translate-y-1/2 z-10" style={{ top: conf.top, left: conf.left }}>
                  <div className="w-[170px] h-[210px] rounded-[1.5rem] bg-black border border-[#B8FF00]/40 overflow-hidden relative shadow-[0_0_20px_rgba(184,255,0,0.15)]">
                    {renderStageImage(imageUrl, `Next Stage ${conf.id}`, 'w-full h-full object-cover object-top opacity-90')}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-12 pb-3 flex flex-col items-center">
                      <span className="text-[#B8FF00] font-black text-2xl italic tracking-tighter drop-shadow-md">{bodyFat}%</span>
                      <div className="flex items-center gap-1 mt-1 opacity-90 bg-[#B8FF00]/10 px-2.5 py-0.5 rounded-full border border-[#B8FF00]/30">
                        <span className="material-icons-round text-[10px] text-[#B8FF00]">lock_open</span>
                        <span className="text-[9px] text-[#B8FF00] font-bold tracking-widest">下阶段目标 {stage.qualifiedCount}/2</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={conf.id} className="absolute -translate-x-1/2 -translate-y-1/2 z-10" style={{ top: conf.top, left: conf.left }}>
                <div className="w-[170px] h-[210px] rounded-[1.5rem] bg-[#0a0a0a] border-[1px] border-white/5 flex flex-col items-center justify-center relative shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:10px_10px] pointer-events-none opacity-20"></div>
                  <div className="relative z-20 flex flex-col items-center">
                    <span className="text-gray-600 font-black text-4xl italic tracking-tighter drop-shadow-md">{bodyFat}%</span>
                    <div className="flex items-center gap-1 mt-3 opacity-60 bg-black/60 px-3 py-1 rounded-full border border-white/5">
                      <span className="material-icons-round text-[12px] text-gray-500">lock</span>
                      <span className="text-[10px] text-gray-500 font-bold tracking-widest">待解锁</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showBanner && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-[360px] bg-[#0c0c0c]/90 backdrop-blur-2xl border border-white/5 rounded-3xl p-4 flex gap-4 items-center shadow-[0_20px_40px_rgba(0,0,0,0.9)] z-50 animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="w-12 h-12 bg-[#B8FF00] rounded-full flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(184,255,0,0.2)]">
            <span className="material-icons-round text-black md-24">share</span>
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-white font-bold text-[13px] tracking-widest">AI 预测</h4>
              <span className="text-[9px] px-2 py-0.5 bg-white/10 rounded uppercase text-gray-400 font-mono tracking-widest">180 天</span>
            </div>
            <p className="text-gray-400 text-[10px] leading-relaxed">
              基于你当前的轨迹，如果蛋白质摄入量增加 10%，你将在 11 月中旬解锁 <strong className="text-[#B8FF00]">22% 节点</strong>。
            </p>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="w-10 h-10 rounded-full bg-white/5 flex flex-col gap-1 items-center justify-center shrink-0 border border-white/5 cursor-pointer active:scale-95 transition-transform hover:bg-white/10"
          >
            <span className="material-icons-round text-gray-400 text-[16px]">visibility_off</span>
          </button>
        </div>
      )}

      <style>{`
        .glow-neon {
          box-shadow: 0 0 20px rgba(184,255,0,0.1), inset 0 0 40px rgba(0,0,0,1);
        }
        @keyframes scan {
          0%, 100% { transform: translateY(-100%); opacity: 0; }
          10%, 90% { opacity: 1; }
          50% { transform: translateY(200%); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-150%) skewX(-15deg); }
          100% { transform: translateX(150%) skewX(-15deg); }
        }
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-4px); }
        }
        .animate-bounce-x {
          animation: bounce-x 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default EvolutionProgress;
