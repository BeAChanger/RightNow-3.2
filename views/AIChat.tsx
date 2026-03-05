import React, { useEffect, useRef, useState } from 'react';
import AssessmentCard, { AssessmentData } from '../components/coach/AssessmentCard';
import IntakeQuestion from '../components/coach/IntakeQuestion';
import FirstDayPlanCard, { FirstDayPlanData } from '../components/coach/FirstDayPlanCard';
import WeekSummaryCard from '../components/coach/WeekSummaryCard';
import { aiCoachApi, getApiErrorMessage, todosApi } from '../api';
import type { FirstDayPlan, CoachAssessment } from '../api';
import type { CoachProfile } from '../api';
import { FITNESS_COACH_PROMPT, chatWithGemini, generateFirstDayPlan } from '../services/gemini';
import type { GeminiMessage } from '../services/gemini';

interface Props {
  onBack: () => void;
  coachTrigger?: boolean;
}

type MessageType =
  | 'text'
  | 'assessment'
  | 'intake-foundation'
  | 'intake-limitations'
  | 'intake-environment'
  | 'intake-equipment'
  | 'intake-frequency'
  | 'intake-duration'
  | 'intake-timepreference'
  | 'intake-dietpreference'
  | 'first-day-plan'
  | 'week-summary';

interface DisplayMessage {
  id: string;
  text?: string;
  sender: 'user' | 'ai';
  time: string;
  type: MessageType;
  isAnswered?: boolean;
}

const GOAL_DIRECTION_LABELS: Record<string, string> = {
  fat_loss: '减脂塑形',
  recomposition: '体态重塑',
  muscle_gain: '增肌构建',
};

const STAGE_LABELS: Record<string, string> = {
  foundation: '基础适应期',
  build: '增肌构建期',
  cut: '减脂塑形期',
  maintain: '巩固维持期',
};

const mapApiAssessment = (api: CoachAssessment): AssessmentData => {
  const safeRate = 0.5;
  const current = api.bodyFatEstimate ?? 20;
  const target = api.targetBodyFatEstimate ?? 12;
  const minWeeks = Math.max(8, Math.ceil((current - target) / safeRate));

  return {
    currentBodyFat: api.bodyFatEstimate ? `${api.bodyFatEstimate}%` : '待评估',
    targetBodyFat: api.targetBodyFatEstimate ? `${api.targetBodyFatEstimate}%` : '12%',
    goalDirection: GOAL_DIRECTION_LABELS[api.goalDirection] || '减脂塑形',
    bmr: api.bmr,
    bmi: api.bmi,
    tdee: api.tdee,
    phaseJudgment: STAGE_LABELS[api.stage] || '适应期',
    recommendedCycle: `建议周期：${api.targetWeeks} 周`,
    minWeeks,
    isVisualAssessment: api.isVisualAssessment,
  };
};

const fallbackAssessment: AssessmentData = {
  currentBodyFat: '18%',
  targetBodyFat: '12%',
  goalDirection: '减脂塑形',
  bmr: 1650,
  bmi: 22.4,
  tdee: 2100,
  phaseJudgment: '适应期',
  recommendedCycle: '建议周期：12周',
  minWeeks: 12,
};

const mockFirstDayPlan: FirstDayPlanData = {
  title: '首日唤醒计划',
  description: '让我们从基础开始，唤醒你的肌肉。',
  tasks: [
    { id: '1', title: '徒手深蹲', subtitle: '4组 x 15次', icon: 'fitness_center', type: 'workout' },
    { id: '2', title: '核心激活', subtitle: '平板支撑 3x30秒', icon: 'self_improvement', type: 'workout' },
    { id: '3', title: '饮水提醒', subtitle: '目标: 2500ml', icon: 'water_drop', type: 'hydration' },
  ],
};

const buildApiPlanFromUi = (ui: FirstDayPlanData): FirstDayPlan => ({
  headline: ui.title,
  nutritionNote: '今日先按计划执行，优先保证蛋白与补水。',
  recoveryNote: '训练后拉伸放松并保证睡眠。',
  coachMessage: ui.description,
  tasks: ui.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    category: task.type === 'hydration' ? 'recovery' : 'training',
    detail: task.subtitle,
    completed: false,
  })),
});

const buildUiPlanFromApi = (plan: FirstDayPlan): FirstDayPlanData => ({
  title: plan.headline || '首日唤醒计划',
  description: plan.coachMessage || '继续按计划推进。',
  tasks: plan.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    subtitle: task.detail,
    icon: task.category === 'nutrition' ? 'restaurant' : task.category === 'recovery' ? 'water_drop' : 'fitness_center',
    type: task.category === 'recovery' ? 'hydration' : 'workout',
  })),
});

const buildUiPlanFromProfile = (profile: CoachProfile): FirstDayPlanData => {
  const dayOne = profile.fitnessPlan.weeklyTrainingPlan[0];
  const tasks = (dayOne?.tasks || []).slice(0, 3).map((task, idx) => ({
    id: `profile-${idx + 1}`,
    title: task,
    subtitle: `${dayOne?.durationMinutes || 45}分钟`,
    icon: 'fitness_center',
    type: 'workout' as const,
  }));

  tasks.push({
    id: 'profile-water',
    title: '饮水计划',
    subtitle: `目标 ${profile.hydrationPlan.dailyTargetMl} ml`,
    icon: 'water_drop',
    type: 'hydration',
  });

  return {
    title: '首日唤醒计划',
    description: profile.recommendationSummary || '继续按你的专属档案执行。',
    tasks,
  };
};

const normalizeTaskCategory = (
  category: string,
): 'training' | 'nutrition' | 'recovery' | 'habit' => {
  if (category === 'training' || category === 'nutrition' || category === 'recovery' || category === 'habit') {
    return category;
  }
  return 'training';
};

const buildPlanGenerationContext = (
  context: Awaited<ReturnType<typeof aiCoachApi.prepareFirstPlan>>,
): Parameters<typeof generateFirstDayPlan>[0] => {
  const assessment = context.assessment;
  const intake = context.intake;
  return {
    assessmentSummary: [
      `goalDirection=${assessment.goalDirection}`,
      `stage=${assessment.stage}`,
      `bmi=${assessment.bmi}`,
      `bmr=${assessment.bmr}`,
      `tdee=${assessment.tdee}`,
      `targetWeeks=${assessment.targetWeeks}`,
    ].join(' | '),
    intakeSummary: intake
      ? [
          `trainingExperience=${intake.trainingExperience}`,
          `injuryHistory=${intake.injuryHistory}`,
          `trainingDaysPerWeek=${intake.trainingDaysPerWeek}`,
          `sessionDurationMinutes=${intake.sessionDurationMinutes}`,
        ].join(' | ')
      : undefined,
    dayIndex: 1,
    constraints: [
      `minTrainingDays=${context.constraints.minTrainingDays}`,
      `hardRejectUnderMinDays=${context.constraints.hardRejectUnderMinDays}`,
      `knowledgeDomains=${context.constraints.knowledgeDomains.join(',')}`,
    ],
  };
};

const AIChat: React.FC<Props> = ({ onBack, coachTrigger }) => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [firstDayPlanData, setFirstDayPlanData] = useState<FirstDayPlanData>(mockFirstDayPlan);
  const [assessmentData, setAssessmentData] = useState<AssessmentData>(fallbackAssessment);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasStartedFlow = useRef(false);
  const freeChatHistoryRef = useRef<GeminiMessage[]>([]);
  const intakeDraft = useRef<{
    trainingExperience?: string;
    injuryHistory?: string;
    trainingEnvironment?: string;
    equipmentList?: string[];
    trainingDaysPerWeek?: number;
    sessionDurationMinutes?: number;
    timePreference?: string;
    timePreferenceOther?: string;
    dietPreference?: string;
    dietRestrictions?: string;
  }>({});
  const selectedWeeksRef = useRef<number>(12);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (msg: Omit<DisplayMessage, 'id' | 'time'>) => {
    const newMsg: DisplayMessage = {
      ...msg,
      id: `${msg.sender}-${Date.now()}-${Math.random()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  const markLastQuestionAnswered = () => {
    setMessages((prev) => {
      const newMsgs = [...prev];
      for (let i = newMsgs.length - 1; i >= 0; i -= 1) {
        if (newMsgs[i].type.startsWith('intake-')) {
          newMsgs[i].isAnswered = true;
          break;
        }
      }
      return newMsgs;
    });
  };

  const normalizeAnswer = (answer: string | string[]) => (Array.isArray(answer) ? answer.join('；') : answer);

const parseTrainingDays = (value: string): number => {
  // Backend requires at least 3 training days for AI coach planning.
  if (value.includes('1-2')) return 3;
  if (value.includes('3')) return 3;
  if (value.includes('4')) return 4;
  return 5;
};

const parseDurationMinutes = (value: string): number => {
  if (value.includes('15-30')) return 30;
  if (value.includes('30-45')) return 45;
  if (value.includes('45-60')) return 60;
  return 75;
};

const FREE_CHAT_PROMPT_SUFFIX = '\n额外要求：回复用中文，不超过100字，不要使用*号或markdown。';

const sanitizeCoachReply = (text: string): string => {
  const cleaned = text
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return '我在，继续说你的目标或今天的情况。';
  }
  if (cleaned.length <= 100) {
    return cleaned;
  }
  return `${cleaned.slice(0, 100).trim()}...`;
};

  useEffect(() => {
    if (hasStartedFlow.current) return;
    hasStartedFlow.current = true;

    const startFlow = async () => {
      const userName = '朋友';

      // Always check for existing progress first
      try {
        const progress = await aiCoachApi.getProgress();
        if (progress.activePlan) {
          setFirstDayPlanData(buildUiPlanFromApi(progress.activePlan));
          addMessage({ sender: 'ai', type: 'text', text: `欢迎回来，${userName}。你的私教档案已同步，继续今天的计划。` });
          setTimeout(() => {
            addMessage({ sender: 'ai', type: 'first-day-plan' });
          }, 800);
          return;
        }
      } catch {
        try {
          const profile = await aiCoachApi.getProfile();
          if (profile.intakeSnapshot) {
            setFirstDayPlanData(buildUiPlanFromProfile(profile));
            addMessage({ sender: 'ai', type: 'text', text: `欢迎回来，${userName}。你的私教档案已同步，继续今天的计划。` });
            setTimeout(() => {
              addMessage({ sender: 'ai', type: 'first-day-plan' });
            }, 800);
            return;
          }
        } catch {
          // fallback below
        }
      }

      // No existing progress — branch based on coachTrigger
      if (coachTrigger) {
        // Coach mode: fetch real assessment and start flow
        let realAssessment: AssessmentData | null = null;
        try {
          const apiAssessment = await aiCoachApi.getAssessment();
          realAssessment = mapApiAssessment(apiAssessment);
          setAssessmentData(realAssessment);
        } catch {
          // Use fallback assessment
        }

        setTimeout(() => {
          addMessage({
            sender: 'ai',
            type: 'text',
            text: `你好，${userName}！我是你的专属显化教练。根据你刚上传的信息，我已经完成了初步体测评估；如果你有专业设备数据，也可以手动修改。`,
          });
        }, 800);

        setTimeout(() => {
          addMessage({ sender: 'ai', type: 'assessment' });
        }, 2500);
      } else {
        // Free chat mode: just greet
        setTimeout(() => {
          addMessage({
            sender: 'ai',
            type: 'text',
            text: `你好，${userName}！我是你的 AI 健身教练，有什么健身问题随时问我。`,
          });
        }, 800);
      }
    };

    void startFlow();
  }, []);

  const handleAssessmentConfirm = (id: string, selectedWeeks?: number) => {
    if (selectedWeeks) {
      selectedWeeksRef.current = selectedWeeks;
    }
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isAnswered: true } : m)));

    setTimeout(() => {
      addMessage({
        sender: 'ai',
        type: 'text',
        text: '太好了，数据确认无误。为了给你制定更精准的首周计划，我需要再确认几个关键信息，点击选项即可。',
      });
    }, 500);

    setTimeout(() => {
      addMessage({ sender: 'ai', type: 'intake-foundation' });
    }, 2000);
  };

  const handleIntakeAnswer = (
    answer: string | string[],
    nextType: MessageType,
    currentType: MessageType,
  ) => {
    const answerText = Array.isArray(answer) ? answer.join('；') : answer;
    const normalized = normalizeAnswer(answer);

    if (currentType === 'intake-foundation') {
      intakeDraft.current.trainingExperience = normalized;
    } else if (currentType === 'intake-limitations') {
      intakeDraft.current.injuryHistory = normalized;
    } else if (currentType === 'intake-environment') {
      intakeDraft.current.trainingEnvironment = normalized;
    } else if (currentType === 'intake-equipment') {
      intakeDraft.current.equipmentList = Array.isArray(answer) ? answer : [answer];
    } else if (currentType === 'intake-frequency') {
      intakeDraft.current.trainingDaysPerWeek = parseTrainingDays(normalized);
    } else if (currentType === 'intake-duration') {
      intakeDraft.current.sessionDurationMinutes = parseDurationMinutes(normalized);
    } else if (currentType === 'intake-timepreference') {
      if (normalized.startsWith('其他')) {
        intakeDraft.current.timePreference = 'other';
        intakeDraft.current.timePreferenceOther = normalized.replace('其他: ', '');
      } else {
        intakeDraft.current.timePreference = normalized;
      }
    } else if (currentType === 'intake-dietpreference') {
      intakeDraft.current.dietPreference = normalized;
      if (Array.isArray(answer) && answer.length > 1) {
        intakeDraft.current.dietRestrictions = answer.slice(1).join('；');
      }
    }

    markLastQuestionAnswered();

    setTimeout(() => {
      addMessage({ sender: 'user', type: 'text', text: answerText });
    }, 300);

    setTimeout(() => {
      if (nextType !== 'first-day-plan') {
        addMessage({ sender: 'ai', type: nextType });
        return;
      }

      setSending(true);
      void (async () => {
        let saved = false;
        let usedFallbackPlan = false;
        try {
          await aiCoachApi.saveIntake({
            trainingExperience: intakeDraft.current.trainingExperience || '未填写',
            injuryHistory: intakeDraft.current.injuryHistory || '无',
            trainingDaysPerWeek: intakeDraft.current.trainingDaysPerWeek || 3,
            sessionDurationMinutes: intakeDraft.current.sessionDurationMinutes || 45,
            trainingEnvironment: intakeDraft.current.trainingEnvironment,
            equipmentList: intakeDraft.current.equipmentList,
            timePreference: intakeDraft.current.timePreference,
            timePreferenceOther: intakeDraft.current.timePreferenceOther,
            dietPreference: intakeDraft.current.dietPreference,
            dietRestrictions: intakeDraft.current.dietRestrictions,
          });

          const fallbackPlan = buildApiPlanFromUi(mockFirstDayPlan);
          let apiPlan: FirstDayPlan = fallbackPlan;

          try {
            const planContext = await aiCoachApi.prepareFirstPlan();
            const aiPlan = await generateFirstDayPlan(buildPlanGenerationContext(planContext));
            if (Array.isArray(aiPlan.tasks) && aiPlan.tasks.length > 0) {
              apiPlan = {
                headline: aiPlan.headline || fallbackPlan.headline,
                nutritionNote: aiPlan.nutritionNote || fallbackPlan.nutritionNote,
                recoveryNote: aiPlan.recoveryNote || fallbackPlan.recoveryNote,
                coachMessage: aiPlan.coachMessage || fallbackPlan.coachMessage,
                tasks: aiPlan.tasks.map((task, index) => ({
                  id: task.id || `task-${index + 1}`,
                  title: task.title || `Task ${index + 1}`,
                  category: normalizeTaskCategory(task.category || 'training'),
                  detail: task.detail || '',
                  completed: false,
                })),
              };
            }
          } catch {
            apiPlan = fallbackPlan;
          }

          const saveResult = await aiCoachApi.saveFirstPlan(apiPlan);
          setFirstDayPlanData(buildUiPlanFromApi(saveResult.plan || apiPlan));
          try {
            await todosApi.ensureDaily(new Date().toISOString().slice(0, 10));
          } catch {
            // Best effort: plan save success should not be blocked by todo sync failure.
          }
          saved = true;
        } catch (error) {
          const fallbackPlan = buildApiPlanFromUi(mockFirstDayPlan);
          setFirstDayPlanData(buildUiPlanFromApi(fallbackPlan));
          saved = true;
          usedFallbackPlan = true;
          const message = getApiErrorMessage(error, '保存失败');
          addMessage({
            sender: 'ai',
            type: 'text',
            text: `${message}，已先为你匹配一份基础方案，你可以先开始执行。`,
          });
        } finally {
          setSending(false);
          if (!saved) {
            return;
          }
          addMessage({
            sender: 'ai',
            type: 'text',
            text: usedFallbackPlan
              ? '方案已加载，我们先从首日计划开始，后续再持续优化。'
              : '信息收到。我已经为你生成首日唤醒计划，我们马上开始执行。',
          });
          setTimeout(() => {
            addMessage({ sender: 'ai', type: 'first-day-plan' });
          }, 1000);
        }
      })();
    }, 1200);
  };

  const handleSendText = () => {
    const userText = inputValue.trim();
    if (!userText || sending) return;
    addMessage({ sender: 'user', type: 'text', text: userText });
    setInputValue('');
    setSending(true);

    void (async () => {
      try {
        const reply = await chatWithGemini(
          userText,
          `${FITNESS_COACH_PROMPT}${FREE_CHAT_PROMPT_SUFFIX}`,
          freeChatHistoryRef.current,
        );
        const assistantText = sanitizeCoachReply(reply?.trim() || '我在，继续说你的目标或今天的情况。');
        freeChatHistoryRef.current = [
          ...freeChatHistoryRef.current,
          { role: 'user', parts: [{ text: userText }] },
          { role: 'model', parts: [{ text: assistantText }] },
        ].slice(-16);
        addMessage({ sender: 'ai', type: 'text', text: assistantText });
      } catch {
        addMessage({ sender: 'ai', type: 'text', text: '当前网络不稳定，稍后再试一次。' });
      } finally {
        setSending(false);
      }
    })();
    return;

    setTimeout(() => {
      addMessage({ sender: 'ai', type: 'text', text: '好的，我已经记录你的反馈。有问题随时问我。' });
      setSending(false);
    }, 1000);
  };

  const renderMessageContent = (msg: DisplayMessage) => {
    switch (msg.type) {
      case 'text':
        return (
          <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-lg ${msg.sender === 'user'
            ? 'bg-primary text-black rounded-tr-none font-medium'
            : 'bg-[#1A1A1A] text-gray-200 rounded-tl-none border border-white/5'
            }`}>
            {msg.text}
          </div>
        );
      case 'assessment':
        return <AssessmentCard data={assessmentData} isConfirmed={msg.isAnswered} onConfirm={(weeks) => handleAssessmentConfirm(msg.id, weeks)} />;
      case 'intake-foundation':
        return (
          <IntakeQuestion
            question="你的日常运动基础是？"
            type="single"
            options={['几乎不运动', '偶尔运动 (每周1-2次)', '有规律运动 (每周3次以上)', '资深训练者']}
            isAnswered={msg.isAnswered}
            onAnswer={(ans) => handleIntakeAnswer(ans, 'intake-limitations', 'intake-foundation')}
          />
        );
      case 'intake-limitations':
        return (
          <IntakeQuestion
            question="是否有任何伤病或受限情况？(可多选)"
            type="multi-with-text"
            options={['无伤病，完全健康', '膝盖/关节不适', '腰背部疼痛', '肩颈不适']}
            otherPlaceholder="如果有其他伤病，请描述..."
            isAnswered={msg.isAnswered}
            onAnswer={(ans) => handleIntakeAnswer(ans, 'intake-environment', 'intake-limitations')}
          />
        );
      case 'intake-environment':
        return (
          <IntakeQuestion
            question="你打算在哪里训练？"
            type="single"
            options={['在家训练', '去健身房']}
            isAnswered={msg.isAnswered}
            onAnswer={(ans) => {
              const normalized = Array.isArray(ans) ? ans.join('；') : ans;
              if (normalized.includes('在家')) {
                handleIntakeAnswer(ans, 'intake-equipment', 'intake-environment');
              } else {
                handleIntakeAnswer(ans, 'intake-frequency', 'intake-environment');
              }
            }}
          />
        );
      case 'intake-equipment':
        return (
          <IntakeQuestion
            question="家里有哪些训练器械？(可多选)"
            type="multi-with-text"
            options={['什么都没有（徒手）', '哑铃', '弹力带', '瑜伽垫']}
            otherPlaceholder="其他器械，请描述..."
            isAnswered={msg.isAnswered}
            onAnswer={(ans) => handleIntakeAnswer(ans, 'intake-frequency', 'intake-equipment')}
          />
        );
      case 'intake-frequency':
        return (
          <IntakeQuestion
            question="你期望每周投入几天训练？"
            type="frequency"
            options={['1-2天', '3天', '4天', '5天及以上']}
            isAnswered={msg.isAnswered}
            onAnswer={(ans) => handleIntakeAnswer(ans, 'intake-duration', 'intake-frequency')}
          />
        );
      case 'intake-duration':
        return (
          <IntakeQuestion
            question="你期望单次训练时长是？"
            type="single"
            options={['15-30分钟 (碎片时间)', '30-45分钟 (高效燃脂)', '45-60分钟 (完整训练)', '60分钟以上 (重度突破)']}
            isAnswered={msg.isAnswered}
            onAnswer={(ans) => handleIntakeAnswer(ans, 'intake-timepreference', 'intake-duration')}
          />
        );
      case 'intake-timepreference':
        return (
          <IntakeQuestion
            question="你喜欢什么时候训练？"
            type="multi-with-text"
            options={['早餐前', '早餐后', '午餐前', '午餐后', '晚饭前', '晚饭后']}
            otherPlaceholder="其他时间段，请描述..."
            isAnswered={msg.isAnswered}
            onAnswer={(ans) => handleIntakeAnswer(ans, 'intake-dietpreference', 'intake-timepreference')}
          />
        );
      case 'intake-dietpreference':
        return (
          <IntakeQuestion
            question="最后聊聊你的饮食习惯？"
            type="multi-with-text"
            options={['自己做饭为主', '外卖为主', '有忌口/特殊饮食']}
            otherPlaceholder="其他饮食偏好或忌口，请描述..."
            isAnswered={msg.isAnswered}
            onAnswer={(ans) => handleIntakeAnswer(ans, 'first-day-plan', 'intake-dietpreference')}
          />
        );
      case 'first-day-plan':
        return <FirstDayPlanCard data={firstDayPlanData} onCheckInClick={() => alert('打卡功能开发中...')} />;
      case 'week-summary':
        return <WeekSummaryCard data={{ daysCompleted: 5, totalWorkouts: 24, aiPraise: '太棒了', badgeLevel: '黄金自律', userFeeling: '充满活力' }} onNextWeekClick={() => { }} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-bg-dark flex flex-col relative z-50 animate-fade-in">
      <div className="px-4 py-4 flex items-center gap-3 border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-transform">
          <span className="material-icons-round text-white">arrow_back</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#7aab00] flex items-center justify-center shadow-[0_0_15px_rgba(184,255,0,0.3)]">
              <span className="material-icons-round text-black text-xl">smart_toy</span>
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full shadow-sm"></div>
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">AI 教练</h1>
            <p className="text-[10px] text-primary flex items-center gap-1 font-medium tracking-wider">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_5px_rgba(184,255,0,0.8)]"></span>
              在线 · 为你服务
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gradient-to-b from-[#050505] to-[#0A0A0A]">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
            {msg.sender === 'ai' && msg.type === 'text' && (
              <div className="w-6 h-6 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center border border-primary/30 mr-2 mt-1">
                <span className="material-icons-round text-primary text-[12px]">smart_toy</span>
              </div>
            )}
            <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} ${msg.type === 'text' ? 'max-w-[75%]' : 'w-full max-w-sm'}`}>
              {renderMessageContent(msg)}
              {msg.type === 'text' && <span className="text-[9px] text-gray-600 mt-1 px-1 font-medium">{msg.time}</span>}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start animate-fade-in-up">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center border border-primary/30 mr-2 mt-1">
              <span className="material-icons-round text-primary text-[12px]">smart_toy</span>
            </div>
            <div className="p-4 rounded-2xl rounded-tl-none bg-[#1A1A1A] border border-white/5">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      <div className="p-4 bg-black/80 backdrop-blur-md border-t border-white/5 pb-safe relative z-20">
        <div className="flex gap-2 items-end">
          <button className="p-3 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5 active:scale-95">
            <span className="material-icons-round">add_circle_outline</span>
          </button>
          <div className="flex-1 bg-white/[0.03] rounded-2xl flex items-center px-4 py-2 border border-white/5 focus-within:border-primary/50 focus-within:bg-white/[0.05] transition-all duration-300">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
              placeholder="任何健身问题，直接问我..."
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none min-h-[40px] font-medium"
            />
          </div>
          <button
            onClick={handleSendText}
            disabled={!inputValue.trim() || sending}
            className={`p-3 rounded-full flex items-center justify-center transition-all duration-300 ${inputValue.trim() && !sending
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
