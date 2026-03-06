import React, { useEffect, useRef, useState } from 'react';
import { aiCoachApi, trainingSessionApi } from '../api';
import type {
  CoachAssessment,
  CoachIntakePayload,
  FirstDayPlan,
  FirstDayPlanContext,
} from '../api/ai-coach';
import { chatWithGemini, FITNESS_COACH_PROMPT, generateFirstDayPlan } from '../services/gemini';
import type { GeminiMessage } from '../services/gemini';
import { View } from '../types';
import AssessmentCard, { type AssessmentData } from '../components/coach/AssessmentCard';
import FirstDayPlanCard, { type FirstDayPlanData } from '../components/coach/FirstDayPlanCard';
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
}

interface IntakeAnswerState {
  trainingExperience?: string;
  injuryHistory?: string;
  trainingDaysPerWeek?: number;
  sessionDurationMinutes?: number;
}

interface CoachIntakeStep {
  key: keyof IntakeAnswerState;
  question: string;
  type: QuestionType;
  options: string[];
  mapAnswer: (answer: string | string[]) => string | number;
}

type CoachFlowStage =
  | 'idle'
  | 'loading'
  | 'assessment'
  | 'intake'
  | 'generating'
  | 'first_plan'
  | 'coaching_active';

const FREE_CHAT_PROMPT_SUFFIX = '\nReply in Chinese under 100 words, no markdown.';

const MUSCLE_LABELS: Record<string, string> = {
  general: '综合训练',
  chest: '胸部',
  back: '背部',
  legs: '腿部',
  shoulders: '肩部',
  arms: '手臂',
  core: '核心',
};

const GOAL_DIRECTION_LABELS: Record<string, string> = {
  fat_loss: '减脂塑形',
  recomposition: '体态重塑',
  muscle_gain: '增肌提升',
};

const STAGE_LABELS: Record<string, string> = {
  foundation: '基础期',
  build: '增肌期',
  cut: '减脂期',
  maintain: '维持期',
};

const TASK_ICON_MAP: Record<string, string> = {
  training: 'fitness_center',
  nutrition: 'restaurant',
  recovery: 'self_improvement',
  habit: 'task_alt',
};

const COACH_INTAKE_STEPS: CoachIntakeStep[] = [
  {
    key: 'trainingExperience',
    question: '你现在的训练经验更接近哪种情况？',
    type: 'single',
    options: ['零基础，刚开始训练', '有经验但不稳定', '训练较稳定，可独立安排'],
    mapAnswer: (answer) => (typeof answer === 'string' ? answer : '有经验但不稳定'),
  },
  {
    key: 'injuryHistory',
    question: '目前最需要我重点规避的身体限制是？',
    type: 'single',
    options: ['无明显限制', '膝关节不适', '腰背不适', '肩颈不适', '其他需要注意'],
    mapAnswer: (answer) => (typeof answer === 'string' ? answer : '无明显限制'),
  },
  {
    key: 'trainingDaysPerWeek',
    question: '你每周稳定训练几天最现实？',
    type: 'single',
    options: ['每周3天', '每周4天', '每周5天', '每周6天'],
    mapAnswer: (answer) => {
      const raw = typeof answer === 'string' ? answer : '';
      const days = Number(raw.replace(/[^0-9]/g, ''));
      return Number.isFinite(days) && days >= 3 ? days : 3;
    },
  },
  {
    key: 'sessionDurationMinutes',
    question: '每次训练你平均可投入多久？',
    type: 'single',
    options: ['30分钟', '45分钟', '60分钟', '75分钟'],
    mapAnswer: (answer) => {
      const raw = typeof answer === 'string' ? answer : '';
      const minutes = Number(raw.replace(/[^0-9]/g, ''));
      return Number.isFinite(minutes) && minutes > 0 ? minutes : 45;
    },
  },
];

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

const buildTrainingModePrompt = (session: any): string => {
  const todos = Array.isArray(session?.contextData?.todayTodos)
    ? session.contextData.todayTodos
        .map((t: any) => (typeof t?.title === 'string' ? t.title.trim() : ''))
        .filter((t: string) => t.length > 0)
    : [];
  const targetMuscle = getMuscleLabel(session?.contextData?.targetMuscle || 'general');
  const lastCycleHistory = session?.contextData?.lastCycleHistory
    ? JSON.stringify(session.contextData.lastCycleHistory)
    : '无';

  return [
    FITNESS_COACH_PROMPT,
    '你现在处于训练模式，请严格按训练教练角色输出。',
    `本次目标肌群：${targetMuscle}`,
    `今日训练任务：${todos.length > 0 ? todos.join('，') : '暂无'}`,
    `最近训练历史：${lastCycleHistory}`,
    '回答要求：中文、简洁、可执行、优先给出当前一组训练指令。',
    FREE_CHAT_PROMPT_SUFFIX,
  ].join('\n');
};

const mapAssessmentToCardData = (assessment: CoachAssessment): AssessmentData => {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const freeChatHistoryRef = useRef<GeminiMessage[]>([]);

  const addMessage = (sender: 'user' | 'ai', text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${sender}-${Date.now()}-${Math.random()}`,
        sender,
        text,
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
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
      freeChatHistoryRef.current = [];

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

      if (!coachTrigger) {
        addMessage('ai', '我是你的 AI 健身教练，你可以直接告诉我今天要练什么。');
        return;
      }

      setCoachStage('loading');
      addMessage('ai', '我正在读取你的教练进度，马上为你启动首轮流程。');

      try {
        const progress = await aiCoachApi.getProgress();
        if (cancelled) {
          return;
        }

        if (
          progress?.activePlan &&
          Array.isArray(progress.activePlan.tasks) &&
          progress.activePlan.tasks.length > 0
        ) {
          setFirstDayPlanData(toFirstDayCardData(progress.activePlan));
          setCoachStage('first_plan');
          addMessage('ai', progress.activePlan.coachMessage || '今日计划已恢复，继续执行当前任务。');
          return;
        }

        const assessment = await aiCoachApi.getAssessment();
        if (cancelled) {
          return;
        }

        setAssessmentData(mapAssessmentToCardData(assessment));
        setCoachStage('assessment');
        addMessage('ai', '这是你的体测报告，确认目标周期后我会继续生成首日计划。');
      } catch {
        if (cancelled) {
          return;
        }
        setCoachStage('idle');
        setCoachError('教练流程加载失败，已切回普通聊天模式。');
        addMessage('ai', '教练流程启动失败，先告诉我你今天的训练目标。');
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [mode, sessionId, coachTrigger]);

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

        const context = await aiCoachApi.prepareFirstPlan();
        if (context.intake) {
          await prepareAndSaveFirstPlan(context);
          return;
        }

        setCoachStage('intake');
        setIntakeStepIndex(0);
        setIntakeAnswers({});
        addMessage('ai', '还差 4 个小问题，答完我就生成你的首日计划。');
      } catch {
        setAssessmentConfirmed(false);
        setCoachStage('assessment');
        setCoachError('保存体测失败，请再试一次。');
      }
    })();
  };

  const submitIntakeAndGenerate = (answers: IntakeAnswerState) => {
    setCoachError(null);
    setCoachStage('generating');

    void (async () => {
      try {
        const payload: CoachIntakePayload = {
          trainingExperience: answers.trainingExperience || '有经验但不稳定',
          injuryHistory: answers.injuryHistory || '无明显限制',
          trainingDaysPerWeek: Math.max(3, Number(answers.trainingDaysPerWeek || 3)),
          sessionDurationMinutes: Math.max(20, Number(answers.sessionDurationMinutes || 45)),
        };

        await aiCoachApi.saveIntake(payload);
        await prepareAndSaveFirstPlan();
      } catch {
        setCoachStage('intake');
        setCoachError('问卷保存失败，请重试。');
      }
    })();
  };

  const handleIntakeAnswer = (answer: string | string[]) => {
    const step = COACH_INTAKE_STEPS[intakeStepIndex];
    if (!step) {
      return;
    }

    const mapped = step.mapAnswer(answer);
    const nextAnswers: IntakeAnswerState = {
      ...intakeAnswers,
      [step.key]: mapped as never,
    };
    setIntakeAnswers(nextAnswers);

    if (intakeStepIndex < COACH_INTAKE_STEPS.length - 1) {
      setIntakeStepIndex((prev) => prev + 1);
      return;
    }

    submitIntakeAndGenerate(nextAnswers);
  };

  const handleSendText = () => {
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

    addMessage('user', userText);
    void appendTrainingLog('user', userText);

    setInputValue('');
    setSending(true);

    void (async () => {
      try {
        const modePrompt =
          mode === 'training'
            ? buildTrainingModePrompt(trainingSession)
            : `${FITNESS_COACH_PROMPT}${FREE_CHAT_PROMPT_SUFFIX}`;

        const reply = await chatWithGemini(userText, modePrompt, freeChatHistoryRef.current);

        const assistantText = (
          reply?.trim() || '我在，告诉我你今天的训练目标和状态。'
        ).slice(0, 100);

        freeChatHistoryRef.current = [
          ...freeChatHistoryRef.current,
          { role: 'user', parts: [{ text: userText }] },
          { role: 'model', parts: [{ text: assistantText }] },
        ].slice(-16);

        addMessage('ai', assistantText);
        void appendTrainingLog('assistant', assistantText);
      } catch {
        addMessage('ai', '网络波动，请稍后再试。');
      } finally {
        setSending(false);
      }
    })();
  };

  const currentIntakeStep = COACH_INTAKE_STEPS[intakeStepIndex];
  const isCoachInputLocked =
    mode === 'coach' &&
    (coachStage === 'loading' ||
      coachStage === 'assessment' ||
      coachStage === 'intake' ||
      coachStage === 'generating');
  const inputPlaceholder =
    mode === 'training'
      ? '请输入训练相关问题...'
      : isCoachInputLocked
        ? '请先完成上方教练流程...'
        : '告诉我你今天的训练目标或状态...';

  return (
    <div className="h-screen bg-bg-dark flex flex-col relative z-50 animate-fade-in">
      <div className="px-4 py-4 flex items-center gap-3 border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-10">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-transform"
        >
          <span className="material-icons-round text-white">arrow_back</span>
        </button>
        <div>
          <h1 className="text-base font-bold text-white tracking-wide">AI 教练</h1>
          <p className="text-[10px] text-primary font-medium tracking-wider">在线 · 实时</p>
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
              {msg.text}
              <div className="text-[10px] text-gray-500 mt-2">{msg.time}</div>
            </div>
          </div>
        ))}

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
          <div className="flex-1 bg-white/[0.03] rounded-2xl flex items-center px-4 py-2 border border-white/5 focus-within:border-primary/50 focus-within:bg-white/[0.05] transition-all duration-300">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
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
