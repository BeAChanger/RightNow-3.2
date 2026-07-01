import React, { useCallback, useEffect, useRef, useState } from 'react';
import { aiCoachApi, authApi, chatApi, trainingSessionApi } from '../api';
import type {
  CoachAssessment,
  CoachIntakePayload,
  FirstDayPlan,
  FirstDayPlanContext,
  OnboardingProfile,
  OnboardingProfileInput,
  StrengthAnchor,
} from '../api/ai-coach';
import { onboardingApi } from '../api/ai-coach';
import {
  chatWithGemini,
  buildPersonalizedCoachPrompt,
  FITNESS_COACH_PROMPT,
  generateFirstDayPlan,
  COACH_WELCOME_MESSAGE,
  STAGE1_ASSESSMENT_PROMPT,
  STAGE2_EXPECTATION_PROMPT,
  STAGE3_NUTRITION_PROMPT,
  STAGE4_TRAINING_PROMPT,
  GOAL_DIRECTION_LABELS,
  STAGE_LABELS,
} from '../services/gemini';
import type { GeminiMessage, UserProfileContext } from '../services/gemini';
import type { ChatMessage, WechatBindingInfo } from '../api/chat';
import { chatApi, wechatApi } from '../api/chat';
import { dietApi } from '../api/diet';
import { View } from '../types';

const FREE_CHAT_PROMPT_SUFFIX = '\n回答要求：中文、简洁、可执行。';

type CoachFlowStage =
  | 'idle'
  | 'welcome'
  | 'loading'
  | 'assessment'
  | 'intake'
  | 'generating'
  | 'first_plan'
  | 'coaching_active'
  | 'plan_summary'
  | 'delivery_stage1'
  | 'delivery_stage2'
  | 'delivery_stage3'
  | 'delivery_stage4';

import AssessmentCard, { type AssessmentData } from '../components/coach/AssessmentCard';
import FirstDayPlanCard, { type FirstDayPlanData } from '../components/coach/FirstDayPlanCard';
import CoachPlanSummaryCard, { type CoachPlanSummaryData } from '../components/coach/CoachPlanSummaryCard';
import IntakeQuestion, { type QuestionType } from '../components/coach/IntakeQuestion';

interface Props {
  onBack: () => void;
  coachTrigger?: boolean;
  mode?: 'coach' | 'training';
  sessionId?: string;
  onNavigate?: (view: View, data?: any) => void;
}

interface DisplayMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  createdAt?: string;
  imageUrl?: string;
  imageAlt?: string;
  pending?: boolean;
}

const MESSAGE_DEDUPE_WINDOW_MS = 15_000;

const normalizeDisplayText = (text: string) => text.trim().replace(/\s+/g, ' ');

const displayMessageTimeMs = (message: DisplayMessage) => {
  if (!message.createdAt) return 0;
  const value = Date.parse(message.createdAt);
  return Number.isNaN(value) ? 0 : value;
};

const isEquivalentDisplayMessage = (a: DisplayMessage, b: DisplayMessage) => {
  if (a.sender !== b.sender) return false;
  if (a.imageUrl || b.imageUrl) {
    if (a.imageUrl !== b.imageUrl) return false;
  }
  if (normalizeDisplayText(a.text) !== normalizeDisplayText(b.text)) return false;

  const aMs = displayMessageTimeMs(a);
  const bMs = displayMessageTimeMs(b);
  return aMs > 0 && bMs > 0 && Math.abs(aMs - bMs) <= MESSAGE_DEDUPE_WINDOW_MS;
};

const isPendingServerEcho = (existing: DisplayMessage, incoming: DisplayMessage) => {
  if (!existing.pending || incoming.pending) return false;
  if (existing.sender !== incoming.sender) return false;
  if (existing.imageUrl || incoming.imageUrl) return false;
  return normalizeDisplayText(existing.text) === normalizeDisplayText(incoming.text);
};

const mergeDisplayMessages = (
  current: DisplayMessage[],
  incoming: DisplayMessage[],
): DisplayMessage[] => {
  const next: DisplayMessage[] = [];
  const ids = new Set<string>();

  for (const message of [...current, ...incoming]) {
    if (ids.has(message.id)) continue;
    const pendingIndex = next.findIndex((existing) => isPendingServerEcho(existing, message));
    if (pendingIndex >= 0) {
      ids.delete(next[pendingIndex].id);
      next[pendingIndex] = { ...message, pending: false };
      ids.add(message.id);
      continue;
    }
    if (next.some((existing) => isEquivalentDisplayMessage(existing, message))) {
      ids.add(message.id);
      continue;
    }
    next.push(message);
    ids.add(message.id);
  }

  return next;
};

const toDisplayMessage = (message: ChatMessage): DisplayMessage => ({
  id: message.id,
  sender: message.role === 'assistant' ? 'ai' : 'user',
  text: message.content,
  createdAt: message.createdAt,
  time: new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  }),
});

const readImageFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });

const renderInlineMarkdown = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-inherit">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

const MarkdownMessage: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split(/\r?\n/);

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={index} className="h-1" />;
        }

        const ordered = trimmed.match(/^(\d+)[.)、]\s*(.+)$/);
        if (ordered) {
          return (
            <div key={index} className="flex gap-2">
              <span className="shrink-0 font-semibold opacity-80">{ordered[1]}.</span>
              <span>{renderInlineMarkdown(ordered[2])}</span>
            </div>
          );
        }

        const bullet = trimmed.match(/^[-*]\s+(.+)$/);
        if (bullet) {
          return (
            <div key={index} className="flex gap-2">
              <span className="shrink-0 opacity-80">•</span>
              <span>{renderInlineMarkdown(bullet[1])}</span>
            </div>
          );
        }

        return <div key={index}>{renderInlineMarkdown(trimmed)}</div>;
      })}
    </div>
  );
};

interface IntakeAnswerState {
  weeklyTrainingDays?: number;
  sessionDurationMinutes?: number;
  strengthLevel?: string;
  dietEnvironment?: string;
  injuryStatus?: string;
}

type IntakeCategory = 'deep_assessment';

interface CoachIntakeStep {
  key: keyof IntakeAnswerState;
  category: IntakeCategory;
  question: string;
  type: QuestionType;
  options: string[];
  mapAnswer: (answer: string | string[]) => string | number | string[];
}

const INTAKE_CATEGORY_LABELS: Record<IntakeCategory, string> = {
  deep_assessment: '深度评估',
};

const EXTENDED_INTAKE_STEPS: CoachIntakeStep[] = [
  // ── Q1: 每周训练天数 ──
  {
    key: 'weeklyTrainingDays',
    category: 'deep_assessment',
    question: '你每周能稳定训练几天？',
    type: 'single',
    options: ['3次', '4次', '5次', '6次'],
    mapAnswer: (answer) => {
      const raw = typeof answer === 'string' ? answer : '';
      const days = Number(raw.replace(/[^0-9]/g, ''));
      return Number.isFinite(days) && days >= 1 ? days : 3;
    },
  },
  // ── Q2: 单次训练时长 ──
  {
    key: 'sessionDurationMinutes',
    category: 'deep_assessment',
    question: '每次训练平均多长时间？',
    type: 'single',
    options: ['30min', '45min', '60min', '75min', '90min'],
    mapAnswer: (answer) => {
      const raw = typeof answer === 'string' ? answer : '';
      const minutes = Number(raw.replace(/[^0-9]/g, ''));
      return Number.isFinite(minutes) && minutes > 0 ? minutes : 45;
    },
  },
  // ── Q4: 饮食环境 ──
  {
    key: 'dietEnvironment',
    category: 'deep_assessment',
    question: '你日常饮食主要是什么情况？',
    type: 'single',
    options: ['家做', '食堂', '外卖', '混合'],
    mapAnswer: (answer) => (typeof answer === 'string' ? answer : '混合'),
  },
  // ── Q5: 伤病 ──
  {
    key: 'injuryStatus',
    category: 'deep_assessment',
    question: '有没有伤病或哪里不舒服？',
    type: 'single',
    options: ['无', '膝盖', '腰', '肩颈', '手腕脚踝', '其他'],
    mapAnswer: (answer) => (typeof answer === 'string' ? answer : '无'),
  },
];

const TOTAL_INTAKE_STEPS = EXTENDED_INTAKE_STEPS.length;

const getMuscleLabel = (muscle?: string): string => {
  if (!muscle) {
    return MUSCLE_LABELS.general;
  }
  const key = muscle.toLowerCase();
  return MUSCLE_LABELS[key] || muscle;
};

const parsePercent = (value: string): number | null => {
  const numberValue = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numberValue) ? numberValue : null;
};

const formatPercent = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--';
  }
  return `${Math.round(value * 10) / 10}%`;
};

const buildTrainingModePrompt = (session: any, profile: UserProfileContext): string => {
  const todos = Array.isArray(session?.contextData?.todayTodos)
    ? session.contextData.todayTodos
        .map((t: any) => (typeof t?.title === 'string' ? t.title.trim() : ''))
        .filter((t: string) => t.length > 0)
    : [];
  const targetMuscle = getMuscleLabel(session?.contextData?.targetMuscle || 'general');
  const lastCycleHistory = session?.contextData?.lastCycleHistory
    ? JSON.stringify(session.contextData.lastCycleHistory)
    : '无';

  return buildPersonalizedCoachPrompt(
    [
      FITNESS_COACH_PROMPT,
      '你现在处于训练模式，请严格按训练教练角色输出。',
      `本次目标肌群：${targetMuscle}`,
      `今日训练任务：${todos.length > 0 ? todos.join('，') : '暂无'}`,
      `最近训练历史：${lastCycleHistory}`,
      '回答要求：中文、简洁、可执行、优先给出当前一组训练指令。',
      FREE_CHAT_PROMPT_SUFFIX,
    ].join('\n'),
    profile,
  );
};

const mapAssessmentToCardData = (assessment: CoachAssessment, profile?: Partial<UserProfileContext>): AssessmentData => {
  const currentBodyFat =
    typeof assessment.bodyFatEstimate === 'number' ? assessment.bodyFatEstimate : Math.max(12, assessment.bmi * 0.9);
  const defaultTarget =
    assessment.goalDirection === 'muscle_gain'
      ? currentBodyFat
      : Math.max(10, currentBodyFat - (assessment.goalDirection === 'recomposition' ? 3 : 5));
  const targetBodyFat =
    typeof assessment.targetBodyFatEstimate === 'number'
      ? assessment.targetBodyFatEstimate
      : defaultTarget;
  const minWeeks = Math.max(8, assessment.targetWeeks || 12);

  return {
    gender: profile?.gender ?? null,
    height: typeof profile?.height === 'number' ? profile.height : null,
    weight: typeof profile?.weight === 'number' ? profile.weight : null,
    age: typeof profile?.age === 'number' ? profile.age : null,
    currentBodyFat: formatPercent(currentBodyFat),
    targetBodyFat: formatPercent(targetBodyFat),
    goalDirection: GOAL_DIRECTION_LABELS[assessment.goalDirection] || '综合优化',
    bmr: Number.isFinite(assessment.bmr) ? assessment.bmr : 0,
    bmi: Number.isFinite(assessment.bmi) ? assessment.bmi : 0,
    tdee: Number.isFinite(assessment.tdee) ? assessment.tdee : 0,
    phaseJudgment: STAGE_LABELS[assessment.stage] || '评估中',
    recommendedCycle: `${minWeeks}周`,
    minWeeks,
    isVisualAssessment: Boolean(assessment.isVisualAssessment),
  };
};

const TASK_ICON_MAP: Record<string, string> = {
  training: 'fitness_center',
  nutrition: 'restaurant',
  recovery: 'self_improvement',
  habit: 'task_alt',
};

const toFirstDayCardData = (plan: FirstDayPlan): FirstDayPlanData => ({
  title: plan.headline || '今日训练计划',
  description: plan.coachMessage || '计划已生成，按顺序完成即可。',
  tasks: (Array.isArray(plan.tasks) ? plan.tasks : []).map((task, index) => ({
    id: task.id || `task-${index + 1}`,
    title: task.title || `任务 ${index + 1}`,
    subtitle: task.detail || '',
    icon: TASK_ICON_MAP[task.category] || 'task_alt',
    type:
      task.category === 'nutrition'
        ? 'diet'
        : task.category === 'recovery'
          ? 'hydration'
          : 'workout',
  })),
});

const clampNumber = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const roundTo = (value: number, step: number): number => Math.round(value / step) * step;
const extractKgByKeywords = (text: string, keywords: string[]): number | null => {
  const lower = text.toLowerCase();
  for (const keyword of keywords) {
    const index = lower.indexOf(keyword.toLowerCase());
    if (index < 0) continue;
    const segment = lower.slice(index, Math.min(lower.length, index + 80));
    const match = segment.match(/(\d+(?:\.\d+)?)/);
    if (match) return Number(match[1]);
  }
  return null;
};

const buildCoachPlanSummary = (
  profile: UserProfileContext & { strengthLevel?: string | null },
  card: AssessmentData | null,
  answers: IntakeAnswerState,
): CoachPlanSummaryData => {
  const weeklyDays = clampNumber(Number(answers.weeklyTrainingDays || profile.trainingDaysPerWeek || 3), 1, 6);
  const sessionMinutes = Math.max(20, Number(answers.sessionDurationMinutes || profile.sessionDurationMinutes || 45));
  const weightKg = Math.max(45, Number(profile.weight || card?.weight || 70));
  const tdee = Math.max(1600, Number(profile.tdee || card?.tdee || 2200));
  const bodyFat = typeof profile.bodyFatEstimate === 'number' ? profile.bodyFatEstimate : parsePercent(card?.currentBodyFat || '');
  const bmi = typeof profile.bmi === 'number' ? profile.bmi : Number(card?.bmi || 0);
  const dietEnvironment = answers.dietEnvironment || profile.dietEnvironment || '\u672a\u586b\u5199';
  const injury = answers.injuryStatus || profile.injuryHistory || '\u65e0\u660e\u663e\u9650\u5236';
  const strengthText = answers.strengthLevel || profile.strengthLevel || '';
  const splitName = weeklyDays >= 4 ? '\u56db\u5206\u5316\u8bad\u7ec3' : weeklyDays === 3 ? '\u4e09\u5206\u5316\u8bad\u7ec3' : '\u4e00\u5206\u5316\u5168\u8eab\u8bad\u7ec3';
  const splitRationale = weeklyDays >= 4
    ? '\u6bcf\u5468 4 \u5929\u4ee5\u4e0a\uff0c\u6309\u4e0a\u80a2\u63a8\u3001\u4e0a\u80a2\u62c9\u3001\u4e0b\u80a2\u3001\u6838\u5fc3/\u5f31\u9879\u62c6\u5206\uff0c\u6062\u590d\u548c\u523a\u6fc0\u66f4\u5747\u8861\u3002'
    : weeklyDays === 3
      ? '\u6bcf\u5468 3 \u5929\uff0c\u6309\u63a8\u3001\u62c9\u3001\u817f/\u6838\u5fc3\u5b89\u6392\uff0c\u9891\u7387\u8db3\u591f\u4e14\u6062\u590d\u538b\u529b\u53ef\u63a7\u3002'
      : '\u53ef\u8bad\u7ec3\u5929\u6570\u8f83\u5c11\uff0c\u4f18\u5148\u7528\u5168\u8eab\u8bad\u7ec3\u8986\u76d6\u4e3b\u8981\u808c\u7fa4\u3002';
  const benchKg = extractKgByKeywords(strengthText, ['\u5367\u63a8', '\u63a8\u80f8', 'bench']);
  const squatKg = extractKgByKeywords(strengthText, ['\u6df1\u8e72', '\u817f\u4e3e', 'squat']);
  const rowKg = extractKgByKeywords(strengthText, ['\u5212\u8239', '\u4e0b\u62c9', 'row']);
  const lightNote = strengthText.trim()
    ? '\u91cd\u91cf\u6309\u4f60\u586b\u5199\u7684\u529b\u91cf\u6c34\u5e73\u4fdd\u5b88\u4e0b\u8c03\uff0c\u5148\u4fdd\u8bc1\u52a8\u4f5c\u8d28\u91cf\u548c\u8170\u90e8\u5b89\u5168\u3002'
    : '\u4f60\u6ca1\u6709\u586b\u5199\u5177\u4f53\u529b\u91cf\u6570\u636e\uff0c\u4eca\u5929\u5168\u90e8\u4ece\u6700\u8f7b\u91cd\u91cf\u5f00\u59cb\uff0c\u80fd\u7a33\u5b9a\u5b8c\u6210\u518d\u52a0\u91cd\u91cf\u3002';
  const weightText = (value: number | null, fallback: string, factor = 0.85) => value ? `${Math.max(2.5, roundTo(value * factor, 2.5))}kg` : fallback;
  const weekly = weeklyDays >= 4
    ? [
        { day: 'Day A', focus: '\u80f8 + \u80a9\u524d\u675f' },
        { day: 'Day B', focus: '\u80cc + \u80b1\u4e8c\u5934' },
        { day: 'Day C', focus: '\u817f + \u6838\u5fc3' },
        { day: 'Day D', focus: '\u80a9 / \u624b\u81c2\u5f31\u9879' },
      ]
    : weeklyDays === 3
      ? [
          { day: 'Day A', focus: '\u80f8 + \u80a9 + \u4e09\u5934' },
          { day: 'Day B', focus: '\u80cc + \u4e8c\u5934 + \u6838\u5fc3' },
          { day: 'Day C', focus: '\u817f\u81c0 + \u6838\u5fc3' },
        ]
      : Array.from({ length: weeklyDays }, (_, index) => ({ day: `Day ${index + 1}`, focus: '\u5168\u8eab\u57fa\u7840\u8bad\u7ec3' }));
  const exercises = weeklyDays >= 4
    ? [
        { name: '\u4e0a\u659c\u54d1\u94c3\u63a8\u80f8', weight: weightText(benchKg, '2-5kg/\u624b', 0.55), sets: '4\u7ec4', reps: '8-12\u6b21' },
        { name: '\u5668\u68b0\u5750\u59ff\u63a8\u80f8', weight: weightText(benchKg, '\u6700\u8f7b\u6863/15kg', 0.65), sets: '4\u7ec4', reps: '8-12\u6b21' },
        { name: '\u8774\u8776\u673a\u5939\u80f8', weight: '\u6700\u8f7b\u6863', sets: '3\u7ec4', reps: '12-15\u6b21' },
        { name: '\u5750\u59ff\u54d1\u94c3\u63a8\u80a9', weight: '2-5kg/\u624b', sets: '3\u7ec4', reps: '10-12\u6b21' },
      ]
    : weeklyDays === 3
      ? [
          { name: '\u6760\u94c3\u5367\u63a8', weight: weightText(benchKg, '\u7a7a\u6746/20kg', 0.75), sets: '4\u7ec4', reps: '6-10\u6b21' },
          { name: '\u4e0a\u659c\u54d1\u94c3\u63a8\u80f8', weight: '2-5kg/\u624b', sets: '3\u7ec4', reps: '10-12\u6b21' },
          { name: '\u5668\u68b0\u5750\u59ff\u63a8\u80a9', weight: '\u6700\u8f7b\u6863', sets: '3\u7ec4', reps: '10-12\u6b21' },
          { name: '\u7ef3\u7d22\u4e0b\u538b', weight: '\u6700\u8f7b\u6863', sets: '3\u7ec4', reps: '12-15\u6b21' },
        ]
      : [
          { name: '\u676f\u5f0f\u6df1\u8e72', weight: weightText(squatKg, '\u81ea\u91cd/10kg'), sets: '3\u7ec4', reps: '10\u6b21' },
          { name: '\u4e0a\u659c\u54d1\u94c3\u63a8\u80f8', weight: weightText(benchKg, '2-5kg/\u624b'), sets: '3\u7ec4', reps: '10\u6b21' },
          { name: '\u5750\u59ff\u5212\u8239', weight: weightText(rowKg, '\u6700\u8f7b\u6863/15kg'), sets: '3\u7ec4', reps: '10\u6b21' },
          { name: '\u7f57\u9a6c\u5c3c\u4e9a\u786c\u62c9', weight: '\u7a7a\u6746/10kg', sets: '2\u7ec4', reps: '10\u6b21' },
          { name: '\u6b7b\u866b\u6838\u5fc3', weight: '\u81ea\u91cd', sets: '2\u7ec4', reps: '12\u6b21' },
          { name: '\u8dd1\u6b65\u673a\u5feb\u8d70', weight: '\u5761\u5ea6 3-5', sets: '1\u7ec4', reps: '12\u5206\u949f' },
        ];
  const targetCalories = Math.max(1200, Math.round(tdee - 400));
  const proteinGrams = Math.round(weightKg * 1.6);
  const fatGrams = Math.round(weightKg * 0.8);
  const carbsGrams = Math.max(80, Math.round((targetCalories - proteinGrams * 4 - fatGrams * 9) / 4));
  const water = Math.max(1500, roundTo(weightKg * 35, 50));
  const scheduleBase = [['08:00', 0.15], ['10:30', 0.14], ['12:30', 0.15], ['15:30', 0.15], ['18:00', 0.18], ['20:30', 0.15], ['22:00', 0.08]] as const;
  return {
    assessment: {
      title: '\u57fa\u4e8e\u4f60\u7684\u4f53\u6d4b\u3001\u8bad\u7ec3\u65f6\u95f4\u548c\u996e\u98df\u73af\u5883\uff0c\u5148\u7ed9\u4e00\u7248\u53ef\u6267\u884c\u65b9\u6848\u3002',
      lines: [
        `\u57fa\u7840\u6570\u636e\uff1a${profile.age || card?.age || '\u5f85\u786e\u8ba4'}\u5c81 / ${profile.gender === 'female' ? '\u5973' : profile.gender === 'male' ? '\u7537' : '\u6027\u522b\u5f85\u786e\u8ba4'} / ${profile.height || card?.height || '--'}cm / ${weightKg}kg`,
        `\u8eab\u4f53\u72b6\u6001\uff1aBMI ${bmi || '--'}\uff0c\u4f53\u8102 ${bodyFat || '--'}%\uff0cTDEE ${tdee} kcal`,
        `\u6267\u884c\u6761\u4ef6\uff1a\u6bcf\u5468 ${weeklyDays} \u7ec3\uff0c\u6bcf\u6b21 ${sessionMinutes} \u5206\u949f\uff0c\u996e\u98df\u73af\u5883\uff1a${dietEnvironment}`,
      ],
      priority: injury && injury !== '\u65e0\u660e\u663e\u9650\u5236' ? `\u5148\u5904\u7406\u300c${injury}\u300d\u76f8\u5173\u9650\u5236\uff0c\u907f\u514d\u8bad\u7ec3\u4e2d\u52a0\u91cd\u3002` : '\u5148\u5efa\u7acb\u7a33\u5b9a\u8bad\u7ec3\u8282\u594f\u548c\u70ed\u91cf\u7f3a\u53e3\u3002',
    },
    training: { splitName, rationale: splitRationale, weekly, todayFocus: weekly[0]?.focus || '\u5168\u8eab\u57fa\u7840\u8bad\u7ec3', exercises, note: lightNote },
    diet: {
      targetCalories,
      deficit: 400,
      proteinGrams,
      carbsGrams,
      fatGrams,
      tips: [
        '\u4eca\u5929\u6309 TDEE - 400 kcal \u6267\u884c\uff0c\u4fdd\u6301 300-500 kcal \u7684\u6e29\u548c\u7f3a\u53e3\u3002',
        dietEnvironment.includes('\u98df\u5802') ? '\u98df\u5802\u4f18\u5148\u9009\u4e00\u4efd\u4f18\u8d28\u86cb\u767d\u3001\u534a\u76d8\u852c\u83dc\u3001\u4e00\u62f3\u4e3b\u98df\uff0c\u5c11\u6cb9\u5c11\u6c64\u6c41\u3002' : '\u5916\u5356\u6216\u5bb6\u5e38\u996d\u4f18\u5148\u4fdd\u8bc1\u86cb\u767d\u8d28\uff0c\u4e3b\u98df\u4e0d\u8fc7\u91cf\uff0c\u6cb9\u8102\u548c\u996e\u6599\u5148\u63a7\u4f4f\u3002',
        '\u5403\u524d\u5148\u62cd\u7167\u95ee\u6559\u7ec3\u600e\u4e48\u5403\uff1b\u5403\u5b8c\u518d\u62cd\u7167\u8bb0\u5f55\uff0c\u70ed\u91cf\u4f1a\u540c\u6b65\u5230\u996e\u98df\u548c\u4eca\u65e5\u770b\u677f\u3002',
      ],
    },
    hydration: { dailyTargetMl: water, schedule: scheduleBase.map(([time, ratio]) => ({ time, amountMl: roundTo(water * ratio, 50) })) },
  };
};

const buildFirstDayPlanFromSummary = (summary: CoachPlanSummaryData): FirstDayPlan => {
  const trainingTasks = summary.training.exercises.map((ex, index) => ({
    id: `training-${index + 1}`,
    title: `${ex.name}\uff5c${ex.weight}\uff5c${ex.sets} x ${ex.reps}`,
    category: 'training' as const,
    detail: `${summary.training.todayFocus}\uff1a${ex.name} ${ex.weight} ${ex.sets} ${ex.reps}`,
    completed: false,
  }));

  return {
    headline: summary.training.todayFocus || summary.training.splitName,
    tasks: [
      ...trainingTasks,
      {
        id: 'nutrition-target',
        title: `${'\u996e\u98df\u63a7\u5236\u5728'} ${summary.diet.targetCalories} kcal`,
        category: 'nutrition',
        detail: `P ${summary.diet.proteinGrams}g / C ${summary.diet.carbsGrams}g / F ${summary.diet.fatGrams}g`,
        completed: false,
      },
      {
        id: 'hydration-target',
        title: `${'\u559d\u6c34'} ${summary.hydration.dailyTargetMl}ml`,
        category: 'recovery',
        detail: summary.hydration.schedule.map((slot) => `${slot.time} ${slot.amountMl}ml`).join('\uff1b'),
        completed: false,
      },
    ],
    nutritionNote: summary.diet.tips.join('\n'),
    recoveryNote: `${'\u996e\u6c34\u76ee\u6807'} ${summary.hydration.dailyTargetMl}ml`,
    coachMessage: '\u8ba1\u5212\u5df2\u5b58\u6863\uff0c\u4eca\u5929\u7684\u8bad\u7ec3\u52a8\u4f5c\u4f1a\u9010\u9879\u540c\u6b65\u5230 TODO\u3002',
  };
};

const buildAssessmentSummary = (assessment: CoachAssessment): string => {
  const currentBodyFat =
    typeof assessment.bodyFatEstimate === 'number' ? `${assessment.bodyFatEstimate}%` : '未知';
  const targetBodyFat =
    typeof assessment.targetBodyFatEstimate === 'number' ? `${assessment.targetBodyFatEstimate}%` : '待确认';

  return [
    `当前体脂：${currentBodyFat}`,
    `目标体脂：${targetBodyFat}`,
    `BMI：${assessment.bmi}`,
    `BMR：${assessment.bmr}`,
    `TDEE：${assessment.tdee}`,
    `目标方向：${GOAL_DIRECTION_LABELS[assessment.goalDirection] || assessment.goalDirection}`,
    `目标周期：${assessment.targetWeeks}周`,
  ].join('；');
};

const buildIntakeSummary = (context: FirstDayPlanContext): string | undefined => {
  if (!context.intake) {
    return undefined;
  }

  return [
    `训练经验：${context.intake.trainingExperience}`,
    `限制情况：${context.intake.injuryHistory}`,
    `每周训练：${context.intake.trainingDaysPerWeek}天`,
    `单次时长：${context.intake.sessionDurationMinutes}分钟`,
  ].join('；');
};

const buildConstraintList = (context: FirstDayPlanContext): string[] => {
  const constraints: string[] = [];
  if (typeof context.constraints?.minTrainingDays === 'number') {
    constraints.push(`每周训练天数不低于 ${context.constraints.minTrainingDays} 天`);
  }
  if (context.constraints?.hardRejectUnderMinDays) {
    constraints.push('低于最低训练频率时，需要先做频率纠偏');
  }
  return constraints;
};

const AIChat: React.FC<Props> = ({
  onBack,
  coachTrigger,
  mode = 'coach',
  sessionId,
  onNavigate,
}) => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [trainingSession, setTrainingSession] = useState<any>(null);
  const [coachStage, setCoachStage] = useState<CoachFlowStage>('idle');
  const [coachError, setCoachError] = useState<string | null>(null);
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [assessmentConfirmed, setAssessmentConfirmed] = useState(false);
  const [intakeStepIndex, setIntakeStepIndex] = useState(0);
  const [intakeAnswers, setIntakeAnswers] = useState<IntakeAnswerState>({});
  const [firstDayPlanData, setFirstDayPlanData] = useState<FirstDayPlanData | null>(null);
  const [planSummaryData, setPlanSummaryData] = useState<CoachPlanSummaryData | null>(null);
  const [onboardingStarted, setOnboardingStarted] = useState(false);
  const [onboardingProfile, setOnboardingProfile] = useState<OnboardingProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewUrlsRef = useRef<string[]>([]);
  const sendLockRef = useRef(false);
  const freeChatHistoryRef = useRef<GeminiMessage[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfileContext>({});

  // ── WeChat inline bind ──
  const [wechatShow, setWechatShow] = useState<'banner' | 'qrcode' | 'scanned' | 'logged-in' | 'binding' | 'bound' | 'hidden'>('banner');
  const [wechatBindCode, setWechatBindCode] = useState<string | null>(null);
  const [wechatAccountId, setWechatAccountId] = useState<string | null>(null);
  const wechatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wechatQrRef = useRef<HTMLCanvasElement>(null);

  const wechatStopPoll = useCallback(() => {
    if (wechatPollRef.current) { clearInterval(wechatPollRef.current); wechatPollRef.current = null; }
  }, []);

  useEffect(() => {
    return () => {
      for (const url of imagePreviewUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      imagePreviewUrlsRef.current = [];
    };
  }, []);

  // Check WeChat binding status on mount
  useEffect(() => {
    wechatApi.getBinding().then(b => { if (b) setWechatShow('hidden'); }).catch(() => {});
  }, []);

  useEffect(() => () => wechatStopPoll(), [wechatStopPoll]);

  const wechatStartLogin = async () => {
    const token = localStorage.getItem('rightnow_token');
    // Check if bridge is already logged in — skip QR if so.
    try {
      const bs = await fetch('/api/wechat/bot/status', { headers: { Authorization: `Bearer ${token}` } });
      const bd = await bs.json();
      if (bd?.data?.loggedIn || bd?.loggedIn) {
        setWechatAccountId(bd?.data?.accountId || bd?.accountId || null);
        setWechatShow('logged-in');
        return;
      }
    } catch { /* bridge may be unreachable */ }

    setWechatShow('qrcode');
    try {
      const res = await fetch('/api/wechat/bot/login/start', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      const qrcodeUrl = data?.data?.qrcodeUrl || data?.qrcodeUrl;
      if (!qrcodeUrl) throw new Error('No QR URL');
      setTimeout(() => {
        import('qrcode').then(QRCode => {
          if (wechatQrRef.current) QRCode.toCanvas(wechatQrRef.current, qrcodeUrl, { width: 240, margin: 2 });
        }).catch(() => {});
      }, 200);
      wechatStopPoll();
      wechatPollRef.current = setInterval(async () => {
        try {
          const sr = await fetch('/api/wechat/bot/login/status', { headers: { Authorization: `Bearer ${token}` } });
          const sd = await sr.json();
          const status = sd?.data?.status || sd?.status;
          if (status === 'confirmed') { wechatStopPoll(); setWechatAccountId(sd?.data?.accountId || sd?.accountId || null); setWechatShow('logged-in'); }
          else if (status === 'scaned') setWechatShow('scanned');
          else if (status === 'expired') { wechatStopPoll(); setWechatShow('banner'); addMessage('ai', '二维码已过期，请点「绑定微信」重新扫码。'); }
        } catch { /* */ }
      }, 2500);
    } catch { setWechatShow('banner'); }
  };

  const wechatGenerateCode = async () => {
    try {
      const { code } = await wechatApi.generateBindCode();
      setWechatBindCode(code);
      setWechatShow('binding');
      const interval = setInterval(async () => {
        try { const b = await wechatApi.getBinding(); if (b) { setWechatShow('hidden'); clearInterval(interval); } } catch { /* */ }
      }, 3000);
      setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
    } catch { addMessage('ai', '❌ 生成绑定码失败，请稍后再试。'); }
  };

  const addMessage = (
    sender: 'user' | 'ai',
    text: string,
    options: { imageUrl?: string; imageAlt?: string; pending?: boolean } = {},
  ) => {
    const now = new Date();
    setMessages((prev) =>
      mergeDisplayMessages(prev, [
        {
          id: `${sender}-${Date.now()}-${Math.random()}`,
          sender,
          text,
          imageUrl: options.imageUrl,
          imageAlt: options.imageAlt,
          pending: options.pending,
          createdAt: now.toISOString(),
          time: now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]),
    );
  };

  const addBackendMessage = (message: ChatMessage, fallbackText?: string) => {
    const content = message.content.trim() || fallbackText || '';
    setMessages((prev) =>
      mergeDisplayMessages(prev, [
        toDisplayMessage({
          ...message,
          content,
        }),
      ]),
    );
  };

  const appendTrainingLog = async (role: 'user' | 'assistant', content: string) => {
    if (mode !== 'training' || !sessionId) {
      return;
    }

    try {
      await trainingSessionApi.updateLog(sessionId, { role, content });
    } catch {
      // Best effort only: chat should continue even if log write fails.
    }
  };

  const prepareAndSaveFirstPlan = async (preparedContext?: FirstDayPlanContext) => {
    setCoachStage('generating');
    setCoachError(null);

    const context = preparedContext || (await aiCoachApi.prepareFirstPlan());
    const generatedPlan: FirstDayPlan = await generateFirstDayPlan({
      assessmentSummary: buildAssessmentSummary(context.assessment),
      intakeSummary: buildIntakeSummary(context),
      dayIndex: 1,
      constraints: buildConstraintList(context),
    });

    const saveResult = await aiCoachApi.saveFirstPlan(generatedPlan);
    const finalPlan = saveResult?.plan || generatedPlan;
    setFirstDayPlanData(toFirstDayCardData(finalPlan));
    setCoachStage('first_plan');

    // 标记建档完成，下次进入不再弹出评估
    try {
      const updatedProfile = await onboardingApi.saveProfile({ onboardingCompleted: true });
      if (updatedProfile) {
        setOnboardingProfile(updatedProfile);
        setUserProfile(prev => ({ ...prev, onboardingCompleted: true }));
      }
    } catch {
      // 非关键：即使保存失败，下次仍然可以重新评估
    }

    addMessage('ai', finalPlan.coachMessage || '首日计划已完成，先做第一项，我们一会儿复盘。');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, coachStage, firstDayPlanData, assessmentData, intakeStepIndex]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setMessages([]);
      setInputValue('');
      setSending(false);
      setTrainingSession(null);
      setCoachStage('idle');
      setCoachError(null);
      setAssessmentData(null);
      setAssessmentConfirmed(false);
      setIntakeStepIndex(0);
      setIntakeAnswers({});
      setFirstDayPlanData(null);
      setPlanSummaryData(null);
      setOnboardingStarted(false);
      setOnboardingProfile(null);
      freeChatHistoryRef.current = [];

      // Fetch user profile + coach assessment for personalized AI context
      try {
        const [authUser, coachAssessment] = await Promise.all([
          authApi.me(),
          aiCoachApi.getAssessment().catch(() => null),
        ]);
        if (!cancelled) {
          setUserProfile({
            gender: authUser.gender,
            height: authUser.height,
            weight: authUser.weight,
            age: authUser.age,
            bodyStyle: authUser.bodyStyle,
            goalWeight: authUser.goalWeight,
            goalDirection: (coachAssessment as CoachAssessment | null)?.goalDirection,
            stage: (coachAssessment as CoachAssessment | null)?.stage,
            bmi: (coachAssessment as CoachAssessment | null)?.bmi,
            bmr: (coachAssessment as CoachAssessment | null)?.bmr,
            tdee: (coachAssessment as CoachAssessment | null)?.tdee,
            bodyFatEstimate: (coachAssessment as CoachAssessment | null)?.bodyFatEstimate,
          });
        }
      } catch {
        // Non-critical: chat works without personalized context
      }

      if (mode === 'training' && sessionId) {
        try {
          const session = await trainingSessionApi.get(sessionId);
          if (cancelled) {
            return;
          }

          setTrainingSession(session);
          addMessage('ai', '训练模式已开启，我会根据今日计划带你完成训练。');

          const todos = Array.isArray(session?.contextData?.todayTodos)
            ? session.contextData.todayTodos
                .map((t: any) => (typeof t?.title === 'string' ? t.title.trim() : ''))
                .filter((t: string) => t.length > 0)
            : [];
          addMessage('ai', `今日训练任务：${todos.length > 0 ? todos.join('，') : '暂无'}`);

          const targetMuscle = session?.contextData?.targetMuscle || 'general';
          addMessage('ai', `本次目标肌群：${getMuscleLabel(targetMuscle)}`);
        } catch {
          if (!cancelled) {
            addMessage('ai', '训练会话加载失败，但你仍可以继续聊天。');
          }
        }
        return;
      }

      let hasBackendChatHistory = false;
      try {
        const history = await chatApi.history(1, 1);
        hasBackendChatHistory = history.total > 0 || history.data.length > 0;
      } catch {
        hasBackendChatHistory = false;
      }

      let fetchedProfile: OnboardingProfile | null = null;
      // ── 加载用户建档数据 ──
      try {
        const profile = await onboardingApi.getProfile();
        fetchedProfile = profile;
        if (!cancelled && profile) {
          setOnboardingProfile(profile);
          // 将建档数据注入 userProfile
          setUserProfile(prev => ({
            ...prev,
            trainingExperience: profile.trainingExperience,
            injuryHistory: profile.injuryHistory,
            trainingDaysPerWeek: profile.weeklyTrainingDays,
            sessionDurationMinutes: profile.sessionDurationMinutes,
            trainingEnvironment: profile.trainingEnvironment,
            timePreference: profile.timePreference,
            strengthAnchors: profile.strengthAnchors ? JSON.stringify(profile.strengthAnchors) : undefined,
            dietEnvironment: profile.dietEnvironment,
            typicalBreakfast: profile.typicalBreakfast,
            typicalLunch: profile.typicalLunch,
            typicalDinner: profile.typicalDinner,
            alcoholFrequency: profile.alcoholFrequency,
            snackFrequency: profile.snackFrequency,
            diningOutFrequency: profile.diningOutFrequency,
            sleepHours: profile.sleepHours,
            sleepQuality: profile.sleepQuality,
            stressLevel: profile.stressLevel,
            cardioType: profile.cardioType,
            cardioFrequency: profile.cardioFrequency,
            stepsPerDay: profile.stepsPerDay,
            motivationLevel: profile.motivationLevel,
            biggestChallenge: profile.biggestChallenge,
            targetAreas: profile.targetAreas?.join('、'),
            onboardingCompleted: profile.onboardingCompleted,
          }));
        }
      } catch {
        // Non-critical: works without onboarding data
      }

      let hasSavedCoachPlan = false;
      try {
        const progress = await aiCoachApi.getProgress();
        hasSavedCoachPlan = Array.isArray(progress?.activePlan?.tasks) && progress.activePlan.tasks.length > 0;
      } catch {
        hasSavedCoachPlan = false;
      }

      if (fetchedProfile?.onboardingCompleted || hasSavedCoachPlan) {
        setOnboardingStarted(true);
        setCoachStage('coaching_active');
        if (!hasBackendChatHistory) {
          addMessage('ai', '\u6b22\u8fce\u56de\u6765\uff01\u4f60\u7684\u79c1\u6559\u6863\u6848\u5df2\u5b8c\u6210\uff0c\u4eca\u5929\u53ef\u4ee5\u76f4\u63a5\u6309 TODO \u6267\u884c\u3002');
        }
        return;
      }

      setCoachStage('welcome');
      addMessage('ai', COACH_WELCOME_MESSAGE);
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [mode, sessionId, coachTrigger]);

  // ── Live sync: load history from backend + poll for new messages ──
  const lastPollRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Seed seenIds from initial local messages so we don't duplicate on first poll.
  useEffect(() => {
    for (const m of messages) {
      seenIdsRef.current.add(m.id);
    }
  }, []); // run once on mount before messages populate

  // Keep seenIds in sync with whatever addMessage puts into state.
  useEffect(() => {
    for (const m of messages) {
      seenIdsRef.current.add(m.id);
    }
  }, [messages]);

  useEffect(() => {
    // Only poll in free-chat / coaching-active / welcome modes.
    // Skip during onboarding flows (assessment, intake, generating) — those
    // messages are managed by chatWithGemini directly.
    const pollable =
      coachStage === 'welcome' ||
      coachStage === 'coaching_active' ||
      coachStage === 'idle' ||
      coachStage.startsWith('delivery_');
    if (!pollable) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    // Load initial history on first pollable entry.
    if (!lastPollRef.current) {
      chatApi
        .history(1, 30)
        .then((res) => {
          if (res.data.length > 0) {
            const backendMsgs = res.data.filter((m) => !seenIdsRef.current.has(m.id));
            if (backendMsgs.length > 0) {
              setMessages((prev) => {
                // Merge backend messages (which may include messages from WeChat
                // or previous sessions) with local ones, dedup by id/content.
                const existing = new Set(prev.map((p) => p.id));
                const fresh = backendMsgs
                  .filter((m) => !existing.has(m.id))
                  .map(toDisplayMessage);
                return mergeDisplayMessages(prev, fresh);
              });
            }
            lastPollRef.current =
              res.data[res.data.length - 1]?.createdAt || new Date().toISOString();
          } else if (!lastPollRef.current) {
            lastPollRef.current = new Date().toISOString();
          }
        })
        .catch(() => {
          if (!lastPollRef.current) lastPollRef.current = new Date().toISOString();
        });
    }

    // Poll every 5 seconds for new messages from backend.
    pollIntervalRef.current = setInterval(() => {
      const since = lastPollRef.current || new Date().toISOString();
      chatApi
        .poll(since)
        .then((res) => {
          if (res.data.length > 0) {
            const fresh = res.data
              .filter((m) => !seenIdsRef.current.has(m.id))
              .map(toDisplayMessage);
            if (fresh.length > 0) {
              setMessages((prev) => mergeDisplayMessages(prev, fresh));
              lastPollRef.current =
                res.data[res.data.length - 1]?.createdAt || lastPollRef.current;
            }
          }
        })
        .catch(() => {
          /* poll failures are non-critical */
        });
    }, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [coachStage]);

  // ── 开始私教建档 ──
  const startOnboarding = () => {
    setOnboardingStarted(true);
    setCoachStage('loading');
    setCoachError(null);

    void (async () => {
      try {
        const [assessment, authUser] = await Promise.all([
          aiCoachApi.getAssessment(),
          authApi.me().catch(() => null),
        ]);
        if (assessment) {
          const cardData = mapAssessmentToCardData(assessment, authUser || userProfile);
          setAssessmentData(cardData);
          setCoachStage('assessment');
          addMessage('ai', '这是根据你的数据生成的体测评估卡。你可以修改 BMI/BMR/TDEE/体脂率 和周数，确认后我继续为你定制方案。');
        } else {
          // No assessment data yet, go directly to intake
          setCoachStage('intake');
          setIntakeStepIndex(0);
          setIntakeAnswers({});
          addMessage('ai', `好，那我来了解一下你的情况。一共 ${TOTAL_INTAKE_STEPS} 个问题，很快就好。`);
        }
      } catch {
        // Fallback: go directly to intake
        setCoachStage('intake');
        setIntakeStepIndex(0);
        setIntakeAnswers({});
        addMessage('ai', `好，那我来了解一下你的情况。一共 ${TOTAL_INTAKE_STEPS} 个问题，很快就好。`);
      }
    })();
  };

  const handleAssessmentConfirm = (selectedWeeks: number) => {
    if (!assessmentData) {
      return;
    }

    setAssessmentConfirmed(true);
    setCoachError(null);

    void (async () => {
      try {
        const bodyFatEstimate = parsePercent(assessmentData.currentBodyFat);
        const targetBodyFatEstimate = parsePercent(assessmentData.targetBodyFat);

        await aiCoachApi.updateAssessment({
          bodyFatEstimate: bodyFatEstimate ?? undefined,
          targetBodyFatEstimate: targetBodyFatEstimate ?? undefined,
          bmi: Number.isFinite(assessmentData.bmi) ? assessmentData.bmi : undefined,
          bmr: Number.isFinite(assessmentData.bmr) ? assessmentData.bmr : undefined,
          tdee: Number.isFinite(assessmentData.tdee) ? assessmentData.tdee : undefined,
          targetWeeks: selectedWeeks,
          isVisualAssessment: assessmentData.isVisualAssessment,
        });

        setCoachStage('intake');
        setIntakeStepIndex(0);
        setIntakeAnswers({});
        setPlanSummaryData(null);
        setFirstDayPlanData(null);
        addMessage('ai', `\u8fd8\u5dee ${TOTAL_INTAKE_STEPS} \u4e2a\u5c0f\u95ee\u9898\uff0c\u7b54\u5b8c\u6211\u5c31\u751f\u6210\u4f60\u7684\u8bad\u7ec3\u3001\u996e\u98df\u548c\u996e\u6c34\u8ba1\u5212\u3002`);
      } catch (err: any) {
        setAssessmentConfirmed(false);
        setCoachStage('assessment');
        const status = err?.response?.status || '未知';
        const detail = err?.response?.data?.message || err?.message || String(err);
        setCoachError('[v3] 保存失败 HTTP=' + status + ' | ' + detail);
        console.error('[v3] Assessment save failed', err?.response?.status, err?.message, err);
      }
    })();
  };

  // ── 深度评估完成 → 保存数据 + 启动四段式交付 ──

  const submitExtendedIntake = (answers: IntakeAnswerState) => {
    setCoachError(null);
    setCoachStage('generating');

    void (async () => {
      // ── Phase 1: 保存数据 ──
      try {
        const trainingDays = clampNumber(Number(answers.weeklyTrainingDays || 3), 1, 6);
        const sessionMinutes = Math.max(20, Number(answers.sessionDurationMinutes || 45));

        await aiCoachApi.saveIntake({
          trainingExperience: '待评估',
          injuryHistory: answers.injuryStatus || '无',
          trainingDaysPerWeek: trainingDays,
          sessionDurationMinutes: sessionMinutes,
        });

        const onboardingInput: OnboardingProfileInput = {
          trainingExperience: '待评估',
          injuryHistory: answers.injuryStatus,
          weeklyTrainingDays: trainingDays,
          sessionDurationMinutes: sessionMinutes,
          dietEnvironment: answers.dietEnvironment,
          strengthAnchors: null,
          onboardingCompleted: true,
          onboardingStep: TOTAL_INTAKE_STEPS,
          // Provide defaults for fields we no longer collect
          sleepHours: 6.5,
          stepsPerDay: 8000,
          stressLevel: '正常水平',
          motivationLevel: '比较坚定',
          biggestChallenge: '工作太忙',
          targetAreas: [],
        };

        // Merge strengthLevel as extra context
        const savedProfile = await onboardingApi.saveProfile(onboardingInput);
        setOnboardingProfile(savedProfile);

        const profileForPlan = {
          ...userProfile,
          injuryHistory: answers.injuryStatus,
          trainingDaysPerWeek: trainingDays,
          sessionDurationMinutes: sessionMinutes,
          dietEnvironment: answers.dietEnvironment,
          strengthLevel: answers.strengthLevel,
          onboardingCompleted: true,
        };

        setUserProfile(prev => ({
          ...prev,
          ...profileForPlan,
        }));

        const summary = buildCoachPlanSummary(profileForPlan, assessmentData, answers);
        const archivedPlan = buildFirstDayPlanFromSummary(summary);
        await aiCoachApi.saveFirstPlan(archivedPlan);
        await aiCoachApi.refreshProfile().catch(() => null);
        setPlanSummaryData(summary);
        setCoachStage('plan_summary');
        addMessage('ai', '\u2705 \u8bc4\u4f30\u6570\u636e\u548c\u4eca\u65e5\u8ba1\u5212\u5df2\u5b58\u6863\uff0cTODO \u548c\u770b\u677f\u4e5f\u4f1a\u540c\u6b65\u66f4\u65b0\u3002');
        return;
      } catch (saveErr: any) {
        console.error('Onboarding save failed', saveErr);
        setCoachStage('intake');
        setCoachError('建档保存失败：' + (saveErr?.response?.data?.message || saveErr?.message || '网络异常，请重试'));
        return;
      }

      // ── Phase 2: AI 生成 Stage 1 ──
      try {
        // Build enriched profile for AI generation — includes strengthLevel even though it is not persisted to OnboardingProfile yet.
        const profile = {
          ...userProfile,
          injuryHistory: answers.injuryStatus,
          trainingDaysPerWeek: Number(answers.weeklyTrainingDays || 3),
          sessionDurationMinutes: Number(answers.sessionDurationMinutes || 45),
          dietEnvironment: answers.dietEnvironment,
          strengthLevel: answers.strengthLevel || '未提供',
          onboardingCompleted: true,
        };

        const stage1Prompt = buildPersonalizedCoachPrompt(
          STAGE1_ASSESSMENT_PROMPT + FREE_CHAT_PROMPT_SUFFIX,
          profile,
        );
        const stage1Reply = await chatWithGemini('请给我现状评估。', stage1Prompt, []);
        setCoachStage('delivery_stage1');
        addMessage('ai', stage1Reply?.trim() || '评估生成中，请稍等...');
      } catch (aiErr: any) {
        console.error('AI generation failed', aiErr);
        setCoachStage('coaching_active');
        addMessage('ai', '好的，你的数据我已经记下了！不过 AI 生成暂时有点慢，你可以先跟我聊聊——比如今天想练什么、吃什么，我会基于你的数据给你建议。稍后再试试生成完整方案。');
      }
    })();
  };

  const handleIntakeAnswer = (answer: string | string[]) => {
    const step = EXTENDED_INTAKE_STEPS[intakeStepIndex];
    if (!step) {
      return;
    }

    const mapped = step.mapAnswer(answer);
    const nextAnswers: IntakeAnswerState = {
      ...intakeAnswers,
      [step.key]: mapped as never,
    };
    setIntakeAnswers(nextAnswers);

    if (intakeStepIndex < EXTENDED_INTAKE_STEPS.length - 1) {
      setIntakeStepIndex((prev) => prev + 1);
      return;
    }

    submitExtendedIntake(nextAnswers);
  };

  // ── 判断用户是否在确认当前阶段 ──
  const isDeliveryConfirmation = (text: string): boolean => {
    const confirmPatterns = /^(确认|继续|下一步|好的|可以|行|嗯|对|没问题|ok|OK|好|是的|没错|下一段|来吧|开始吧)[!！。.]*$/;
    return confirmPatterns.test(text.trim());
  };

  const handleSendText = () => {
    if (sendLockRef.current) {
      return;
    }

    const userText = inputValue.trim();
    const isCoachLocked =
      mode === 'coach' &&
      (coachStage === 'loading' ||
        coachStage === 'assessment' ||
        coachStage === 'intake' ||
        coachStage === 'generating');

    if (!userText || sending || isCoachLocked) {
      return;
    }

    sendLockRef.current = true;
    addMessage('user', userText, { pending: true });
    void appendTrainingLog('user', userText);

    setInputValue('');
    setSending(true);

    void (async () => {
      try {
        // ── 四段式交付：Stage 1 → Stage 2 → Stage 3 → Stage 4 ──
        const deliveryStages: CoachFlowStage[] = [
          'delivery_stage1',
          'delivery_stage2',
          'delivery_stage3',
          'delivery_stage4',
        ];
        const stagePrompts: Record<string, string> = {
          delivery_stage1: STAGE1_ASSESSMENT_PROMPT,
          delivery_stage2: STAGE2_EXPECTATION_PROMPT,
          delivery_stage3: STAGE3_NUTRITION_PROMPT,
          delivery_stage4: STAGE4_TRAINING_PROMPT,
        };

        const currentStageIdx = deliveryStages.indexOf(coachStage);
        if (currentStageIdx >= 0 && isDeliveryConfirmation(userText)) {
          // 用户确认当前阶段 → 推进到下一阶段
          const nextStageIdx = currentStageIdx + 1;
          if (nextStageIdx < deliveryStages.length) {
            const nextStage = deliveryStages[nextStageIdx];
            const nextPrompt = buildPersonalizedCoachPrompt(
              stagePrompts[nextStage] + FREE_CHAT_PROMPT_SUFFIX,
              userProfile,
            );
            setCoachStage('generating');
            const reply = await chatWithGemini('请继续下一阶段。', nextPrompt, []);
            setCoachStage(nextStage);
            addMessage('ai', reply?.trim() || '下一阶段准备中...');
          } else {
            // 所有阶段完成 → 进入日常陪伴
            setCoachStage('coaching_active');
            addMessage('ai', '方案交付完毕！从今天开始，我就是你的日常私教了。有什么问题随时找我，比如今天吃什么、怎么练、状态不好怎么办——我都会基于你的数据给你具体建议。');
          }
        } else if (currentStageIdx >= 0) {
          // 在交付阶段但用户没有确认 → 在当前阶段上下文中回复
          const stagePrompt = buildPersonalizedCoachPrompt(
            stagePrompts[coachStage] + '\n用户尚未确认，请在当前阶段上下文中回答用户的问题，回答完毕后提醒用户确认以进入下一阶段。' + FREE_CHAT_PROMPT_SUFFIX,
            userProfile,
          );
          const reply = await chatApi
            .send({ content: userText, systemPrompt: stagePrompt });
          const assistantText = reply.content.trim() || '请确认是否继续。';
          freeChatHistoryRef.current = [
            ...freeChatHistoryRef.current,
            { role: 'user', parts: [{ text: userText }] },
            { role: 'model', parts: [{ text: assistantText }] },
          ].slice(-16);
          addBackendMessage(reply, assistantText);
        } else {
          // ── 正常聊天模式 ──
          const modePrompt =
            mode === 'training'
              ? buildTrainingModePrompt(trainingSession, userProfile)
              : buildPersonalizedCoachPrompt(
                  `${FITNESS_COACH_PROMPT}${FREE_CHAT_PROMPT_SUFFIX}`,
                  userProfile,
                );

          const reply = await chatApi
            .send({ content: userText, systemPrompt: modePrompt });
          const assistantText =
            reply.content.trim() || '我在，告诉我你今天的训练目标和状态。';

          freeChatHistoryRef.current = [
            ...freeChatHistoryRef.current,
            { role: 'user', parts: [{ text: userText }] },
            { role: 'model', parts: [{ text: assistantText }] },
          ].slice(-16);

          addBackendMessage(reply, assistantText);
          void appendTrainingLog('assistant', assistantText);
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || String(err || '');
        console.error('[chat] send error:', err);
        addMessage('ai', `发送失败: ${msg}`);
        throw err;
      } finally {
        setSending(false);
        sendLockRef.current = false;
      }
    })();
  };

  const currentIntakeStep = EXTENDED_INTAKE_STEPS[intakeStepIndex];
  const isCoachInputLocked =
    mode === 'coach' &&
    (coachStage === 'loading' ||
      coachStage === 'assessment' ||
      coachStage === 'intake' ||
      coachStage === 'generating');
  const isDeliveryStage =
    coachStage === 'delivery_stage1' ||
    coachStage === 'delivery_stage2' ||
    coachStage === 'delivery_stage3' ||
    coachStage === 'delivery_stage4';
  const showInlineWechatBind = false;

  const inputPlaceholder =
    mode === 'training'
      ? '请输入训练相关问题...'
      : isCoachInputLocked
        ? '请先完成上方教练流程...'
        : isDeliveryStage
          ? '输入"确认"进入下一阶段，或提出你的疑问...'
          : '告诉我你今天的训练目标或状态...';

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || sending || isCoachInputLocked || sendLockRef.current) return;

    if (!file.type.startsWith('image/')) {
      addMessage('ai', '请上传图片文件，我才能帮你识别。');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      addMessage('ai', '这张图有点大，先压缩到 8MB 以内再发我。');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    imagePreviewUrlsRef.current.push(previewUrl);
    sendLockRef.current = true;
    addMessage('user', '', { imageUrl: previewUrl, imageAlt: file.name || '上传的图片' });
    setSending(true);

    try {
      const imageBase64 = await readImageFileAsDataUrl(file);
      const analysis = await dietApi.analyzeImage(imageBase64);
      addMessage(
        'ai',
        [
          `我看了一下，这张图像是：**${analysis.name}**`,
          `估算热量：**${analysis.calories} kcal**`,
          `蛋白质 ${analysis.protein}g / 碳水 ${analysis.carbs}g / 脂肪 ${analysis.fat}g`,
          `餐别：${analysis.mealType}`,
          '',
          '如果要同步到热量记录，可以告诉我“记录这餐”。',
        ].join('\n'),
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        '图片识别失败，请换一张清晰一点的照片再试。';
      addMessage('ai', msg);
    } finally {
      setSending(false);
      sendLockRef.current = false;
    }
  };

  return (
    <div className="h-screen bg-bg-dark flex flex-col relative z-50 animate-fade-in">
      <div className="px-4 py-4 flex items-center gap-3 border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-10">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-transform"
        >
          <span className="material-icons-round text-white">arrow_back</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/30 flex-shrink-0">
            <img src="/xiaozhao-avatar.png" alt="小爪" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">小爪</h1>
            <p className="text-[10px] text-primary font-medium tracking-wider">AI 私教 · 在线</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#050505] to-[#0A0A0A]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-primary text-black rounded-tr-none'
                  : 'bg-[#1A1A1A] text-gray-200 rounded-tl-none border border-white/5'
              }`}
            >
              {msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt={msg.imageAlt || '上传的图片'}
                  className={`mb-3 max-h-64 w-full rounded-xl object-cover ${
                    msg.sender === 'user' ? 'border border-black/10' : 'border border-white/10'
                  }`}
                />
              )}
              {msg.text && <MarkdownMessage text={msg.text} />}
              <div className="text-[10px] text-gray-500 mt-2">{msg.time}</div>
            </div>
          </div>
        ))}

        {/* ── 欢迎界面：开始私教评估按钮 ── */}
        {mode === 'coach' && coachStage === 'welcome' && !onboardingStarted && (
          <div className="flex justify-center mt-2">
            <button
              onClick={startOnboarding}
              className="w-full max-w-sm bg-primary hover:bg-primary/90 text-black font-bold text-lg py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(184,255,0,0.3)] active:scale-[0.98] transition-all"
            >
              <span className="material-icons-round text-xl">fitness_center</span>
              开始私教评估
            </button>
          </div>
        )}

        {/* ── 扩展建档进度条 ── */}
        {mode === 'coach' && coachStage === 'intake' && onboardingStarted && (
          <div className="flex justify-center mt-2">
            <div className="w-full max-w-sm">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[10px] text-primary font-bold tracking-wider">
                  {INTAKE_CATEGORY_LABELS[currentIntakeStep?.category || 'deep_assessment']}
                </span>
                <span className="text-[10px] text-gray-500">
                  {intakeStepIndex + 1}/{TOTAL_INTAKE_STEPS}
                </span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${((intakeStepIndex + 1) / TOTAL_INTAKE_STEPS) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── 四段式交付阶段提示 ── */}

        {/* ── 微信绑定入口（AI 聊天内嵌）── */}
        {showInlineWechatBind && wechatShow === 'banner' && (
          <div className="flex justify-center mt-2">
            <button
              onClick={wechatStartLogin}
              className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-sm text-green-400 hover:bg-green-500/20 active:scale-[0.98] transition-all"
            >
              <span className="material-icons-round text-lg">chat</span>
              <span>绑定微信，双端同步对话</span>
              <span className="material-icons-round text-sm">arrow_forward</span>
            </button>
          </div>
        )}

        {showInlineWechatBind && wechatShow === 'qrcode' && (
          <div className="flex justify-center mt-2">
            <div className="bg-[#1A1A1A] border border-green-500/20 rounded-2xl p-5 space-y-3 text-center max-w-xs w-full">
              <p className="text-xs text-gray-300">用微信扫二维码登录 Bot</p>
              <div className="bg-white rounded-xl p-3 inline-block">
                <canvas ref={wechatQrRef} style={{ width: 240, height: 240 }} />
              </div>
              <p className="text-[10px] text-gray-500">扫码后在手机上点确认</p>
              <button onClick={() => { wechatStopPoll(); setWechatShow('banner'); }} className="text-xs text-gray-500 underline">取消</button>
            </div>
          </div>
        )}

        {showInlineWechatBind && wechatShow === 'scanned' && (
          <div className="flex justify-center mt-2">
            <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 text-center animate-pulse">
              <p className="text-sm text-primary font-bold">👀 已扫码，请在微信确认</p>
            </div>
          </div>
        )}

        {showInlineWechatBind && wechatShow === 'logged-in' && (
          <div className="flex justify-center mt-2">
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 space-y-3 text-center max-w-xs w-full">
              <span className="material-icons-round text-4xl text-green-400">check_circle</span>
              <p className="text-sm text-green-300 font-bold">Bot 已登录</p>
              {wechatAccountId && <p className="text-[10px] text-gray-500 truncate">{wechatAccountId}</p>}
              <button onClick={wechatGenerateCode} className="w-full py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors">
                生成绑定码
              </button>
            </div>
          </div>
        )}

        {showInlineWechatBind && wechatShow === 'binding' && wechatBindCode && (
          <div className="flex justify-center mt-2">
            <div className="bg-primary/5 border-2 border-primary/30 rounded-2xl p-5 space-y-3 text-center max-w-xs w-full">
              <p className="text-xs text-gray-300">给微信 ClawBot 发送：</p>
              <div className="bg-black/50 rounded-xl py-3 px-4">
                <span className="text-2xl font-mono font-bold tracking-[0.25em] text-primary">绑定 {wechatBindCode}</span>
              </div>
              <p className="text-[10px] text-gray-500">5分钟内有效 · 发送后自动绑定</p>
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">等待绑定...</span>
              </div>
            </div>
          </div>
        )}

        {/* ── 四段式交付阶段提示 ── */}
        {mode === 'coach' && isDeliveryStage && (
          <div className="flex justify-center mt-2">
            <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-primary font-bold">
                📋 {
                  coachStage === 'delivery_stage1' ? '第1段：现状评估' :
                  coachStage === 'delivery_stage2' ? '第2段：预期管理' :
                  coachStage === 'delivery_stage3' ? '第3段：饮食建议' :
                  '第4段：训练框架'
                }
              </p>
              <p className="text-[10px] text-gray-400 mt-1">确认后自动进入下一阶段</p>
            </div>
          </div>
        )}

        {mode === 'coach' && coachStage === 'loading' && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-2xl p-4 text-sm bg-[#1A1A1A] border border-white/5 text-gray-300">
              正在为你准备体测报告和教练计划...
            </div>
          </div>
        )}

        {mode === 'coach' && coachStage === 'assessment' && assessmentData && (
          <div className="flex justify-start">
            <div className="w-full max-w-[94%]">
              <AssessmentCard
                data={assessmentData}
                onDataUpdate={setAssessmentData}
                onConfirm={handleAssessmentConfirm}
                isConfirmed={assessmentConfirmed}
              />
            </div>
          </div>
        )}

        {mode === 'coach' && coachStage === 'intake' && currentIntakeStep && (
          <div className="flex justify-start">
            <IntakeQuestion
              key={`${currentIntakeStep.key}-${intakeStepIndex}`}
              question={currentIntakeStep.question}
              type={currentIntakeStep.type}
              options={currentIntakeStep.options}
              onAnswer={handleIntakeAnswer}
            />
          </div>
        )}

        {mode === 'coach' && coachStage === 'generating' && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-2xl p-4 text-sm bg-[#1A1A1A] border border-primary/30 text-gray-200">
              正在生成你的首日计划，请稍等...
            </div>
          </div>
        )}

        {mode === 'coach' && coachStage === 'first_plan' && firstDayPlanData && (
          <div className="flex justify-start">
            <div className="w-full max-w-[94%]">
              <FirstDayPlanCard
                data={firstDayPlanData}
                onCheckInClick={() => {
                  setCoachStage('coaching_active');
                  addMessage('ai', '完成任一任务后告诉我，我会立刻给你下一步反馈。');
                  onNavigate?.(View.ActionCenter);
                }}
              />
            </div>
          </div>
        )}

        {mode === 'coach' && coachStage === 'plan_summary' && planSummaryData && (
          <div className="flex justify-start">
            <div className="w-full max-w-[94%]">
              <CoachPlanSummaryCard
                data={planSummaryData}
                onStart={() => {
                  setCoachStage('coaching_active');
                  addMessage('ai', '\u597d\uff0c\u4ece\u4eca\u5929\u5f00\u59cb\u6309\u8fd9\u4efd\u65b9\u6848\u6267\u884c\u3002\u8bad\u7ec3\u3001\u5403\u996d\u548c\u559d\u6c34\u6709\u53d8\u5316\uff0c\u968f\u65f6\u544a\u8bc9\u6211\uff0c\u6211\u4f1a\u5e2e\u4f60\u8c03\u6574\u3002');
                }}
              />
            </div>
          </div>
        )}

        {coachError && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-2xl p-3 text-xs bg-red-500/10 border border-red-500/40 text-red-300">
              {coachError}
            </div>
          </div>
        )}

        {sending && (
          <div className="flex justify-start">
            <div className="p-4 rounded-2xl rounded-tl-none bg-[#1A1A1A] border border-white/5">
              <div className="flex gap-1.5">
                <div
                  className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-4" />
      </div>

      <div className="p-4 bg-black/80 backdrop-blur-md border-t border-white/5 pb-safe relative z-20">
        {mode === 'training' && sessionId && (
          <button
            onClick={() =>
              onNavigate?.(View.TrainingConfirm, {
                sessionId,
                sessionData: trainingSession,
              })
            }
            className="w-full mb-3 bg-[#B8FF00] hover:bg-[#a3e000] text-black font-bold py-3 rounded-full transition-all flex justify-center items-center gap-2"
          >
            <span className="material-icons-round">check_circle</span>
            结束训练
          </button>
        )}

        <div className="flex gap-2 items-end">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={sending || isCoachInputLocked}
            aria-label="上传图片"
            title="上传图片"
            className={`w-12 h-12 rounded-full flex shrink-0 items-center justify-center border transition-all duration-300 ${
              !sending && !isCoachInputLocked
                ? 'border-white/10 bg-white/[0.04] text-primary hover:bg-white/[0.08] active:scale-95'
                : 'border-white/5 bg-white/[0.02] text-gray-700'
            }`}
          >
            <span className="material-icons-round text-2xl">add</span>
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <div className="flex-1 bg-white/[0.03] rounded-2xl flex items-center px-4 py-2 border border-white/5 focus-within:border-primary/50 focus-within:bg-white/[0.05] transition-all duration-300">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  handleSendText();
                }
              }}
              placeholder={inputPlaceholder}
              disabled={isCoachInputLocked || sending}
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none min-h-[40px] font-medium disabled:opacity-60"
            />
          </div>
          <button
            onClick={handleSendText}
            disabled={!inputValue.trim() || sending || isCoachInputLocked}
            className={`p-3 rounded-full flex items-center justify-center transition-all duration-300 ${
              inputValue.trim() && !sending && !isCoachInputLocked
                ? 'bg-primary text-black hover:bg-primary-dark shadow-[0_0_15px_rgba(184,255,0,0.3)] transform active:scale-95'
                : 'bg-white/5 text-gray-600'
            }`}
          >
            <span className="material-icons-round">send</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
