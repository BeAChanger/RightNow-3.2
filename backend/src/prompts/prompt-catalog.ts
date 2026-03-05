export type ModelPromptCode =
  | 'training.extract_data'
  | 'training.generate_feedback'
  | 'training.daily_change_feedback'
  | 'core.fitness_coach_system'
  | 'core.coach_assessment_system'
  | 'core.coach_knowledge_intro'
  | 'core.food_analysis_system'
  | 'core.visual_assessment_system'
  | 'chat.free_chat_system'
  | 'app.generate_fitness_plan_user_prompt'
  | 'image.safe_bg_prompt'
  | 'image.generate_ideal_body.with_refinement_and_reference'
  | 'image.generate_ideal_body.with_refinement_and_image'
  | 'image.generate_ideal_body.with_refinement_text_only'
  | 'image.generate_ideal_body.with_image'
  | 'image.generate_ideal_body.text_only'
  | 'food.analyze_text_user_prompt'
  | 'food.analyze_image_user_prompt'
  | 'insights.generate_data_insights_user_prompt'
  | 'coach.generate_first_day_plan_user_prompt'
  | 'coach.generate_follow_up_user_prompt'
  | 'coach.generate_week_summary_user_prompt'
  | 'coach.visual_assessment_user_prompt'
  | 'evolution.analyze_body_with_image_user_prompt'
  | 'evolution.refinement_ack_user_prompt'
  | 'evolution.face_merge_refinement_text'
  | 'community.progress_draft';

export interface ModelPromptBinding {
  code: ModelPromptCode;
  scene: string;
  key: string;
  title: string;
  description: string;
  variables: string[];
  fallbackContent: string;
}

export const MODEL_PROMPT_BINDINGS: ModelPromptBinding[] = [
  {
    code: 'training.extract_data',
    scene: 'training',
    key: 'extract_training_data',
    title: 'Training Data Extraction',
    description: 'Parse user training text into structured JSON for persistence.',
    variables: ['description', 'photoUrl', 'rawInputJson'],
    fallbackContent: [
      'You are a fitness data extraction assistant.',
      'Extract structured workout data from user input.',
      '',
      'User description:',
      '{{description}}',
      '',
      'Photo URL (optional):',
      '{{photoUrl}}',
      '',
      'Raw input JSON (optional):',
      '{{rawInputJson}}',
      '',
      'Return JSON only (no markdown fences) using this schema:',
      '{',
      '  "exercises": [',
      '    {',
      '      "name": "Squat",',
      '      "sets": [',
      '        { "reps": 12, "weight": 60, "duration": null, "restTime": 90 }',
      '      ]',
      '    }',
      '  ],',
      '  "totalDuration": 45,',
      '  "needsFollowUp": false,',
      '  "missingFields": []',
      '}',
      '',
      'Rules:',
      '1. Keep unknown values as null.',
      '2. weight is in kg, restTime is in seconds.',
      '3. Return valid JSON only.',
    ].join('\n'),
  },
  {
    code: 'training.generate_feedback',
    scene: 'training',
    key: 'generate_training_feedback',
    title: 'Training Feedback Generation',
    description: 'Create motivational feedback card from structured training data.',
    variables: ['structuredDataJson'],
    fallbackContent: [
      'You are a supportive fitness coach.',
      'Generate concise motivational feedback in Chinese based on structured training data.',
      '',
      'Structured data:',
      '{{structuredDataJson}}',
      '',
      'Return JSON only with this schema:',
      '{',
      '  "title": "...",',
      '  "content": "...",',
      '  "highlights": { "totalSets": 12, "totalWeight": 720 },',
      '  "encouragement": "...",',
      '  "suggestions": "..."',
      '}',
      '',
      'Rules:',
      '1. Tone must be positive and practical.',
      '2. Keep suggestions to 1-2 concrete points.',
      '3. Return valid JSON only.',
    ].join('\n'),
  },
  {
    code: 'training.daily_change_feedback',
    scene: 'training',
    key: 'generate_daily_change_feedback',
    title: 'Daily Change Summary',
    description: 'Compare today and previous records, then generate a daily change card.',
    variables: ['recordsJson', 'lastRecordJson'],
    fallbackContent: [
      'You are a fitness progress analyst.',
      'Compare today\'s training data with previous records and generate a "today change" summary in Chinese.',
      '',
      'Today records:',
      '{{recordsJson}}',
      '',
      'Previous record:',
      '{{lastRecordJson}}',
      '',
      'Return JSON only with this schema:',
      '{',
      '  "title": "...",',
      '  "content": "...",',
      '  "highlights": { "totalSets": 12, "totalWeight": 720 },',
      '  "encouragement": "...",',
      '  "suggestions": "..."',
      '}',
      '',
      'Rules:',
      '1. Highlight measurable progress if available.',
      '2. If regression exists, provide constructive coaching tone.',
      '3. Return valid JSON only.',
    ].join('\n'),
  },
  {
    code: 'core.fitness_coach_system',
    scene: 'core',
    key: 'fitness_coach_system',
    title: 'Fitness Coach System Prompt',
    description: 'Default system prompt for general coach chat.',
    variables: [],
    fallbackContent: [
      '你是 RightNow Fitness 的 AI 健身教练。',
      '请使用简体中文回答，语气专业、简洁、鼓励。',
      '优先提供可执行的训练、饮食和恢复建议。',
    ].join(' '),
  },
  {
    code: 'core.coach_assessment_system',
    scene: 'core',
    key: 'coach_assessment_system',
    title: 'Coach Assessment System Prompt',
    description: 'System prompt for assessment-related planning responses.',
    variables: [],
    fallbackContent: [
      '你是 RightNow Fitness 的 AI 教练评估引擎。',
      '请基于健康与运动科学给出稳健建议。',
      '输出默认使用简体中文；如要求 JSON 时仅输出 JSON。',
      '当用户目标周期不现实时，自动给出更安全可行的区间。',
    ].join(' '),
  },
  {
    code: 'core.coach_knowledge_intro',
    scene: 'core',
    key: 'coach_knowledge_intro',
    title: 'Coach Knowledge Intro',
    description: 'RAG preface injected before retrieved knowledge context.',
    variables: [],
    fallbackContent: [
      '你正在基于 RightNow Fitness 知识库生成教练回复。',
      '请优先使用下方知识内容作为事实依据。',
      '如用户提供实测数据，与估算冲突时以实测数据为准。',
    ].join(' '),
  },
  {
    code: 'core.food_analysis_system',
    scene: 'food',
    key: 'food_analysis_system',
    title: 'Food Analysis System Prompt',
    description: 'System prompt for food nutrition extraction.',
    variables: [],
    fallbackContent: [
      '你是专业营养师。根据用户描述估算营养成分。',
      '必须返回纯 JSON（不要 markdown 代码块），格式：',
      '{"name":"食物名","calories":数字,"protein":数字,"fat":数字,"carbs":数字,"mealType":"早餐|午餐|晚餐|加餐"}',
      '所有数值为整数；calories 单位为千卡，其他单位为克。',
    ].join('\n'),
  },
  {
    code: 'core.visual_assessment_system',
    scene: 'coach',
    key: 'visual_assessment_system',
    title: 'Visual Assessment System Prompt',
    description: 'System prompt for two-image body fat estimation.',
    variables: [],
    fallbackContent: [
      '你是专业的体脂评估助手。',
      '根据两张身体照片估算体脂率：第一张是当前身材，第二张是理想身材。',
      '返回纯 JSON（不要 markdown 代码块）：',
      '{"currentBodyFat": number, "targetBodyFat": number}',
      '数值保留 1 位小数。',
    ].join('\n'),
  },
  {
    code: 'chat.free_chat_system',
    scene: 'chat',
    key: 'free_chat_system',
    title: 'Free Chat System Prompt',
    description: 'System prompt for lightweight coach free chat in app.',
    variables: [],
    fallbackContent: [
      '你是 RightNow Fitness 的 AI 健身教练。',
      '回复用中文，不超过100字，不要使用*号或markdown。',
      '语气专业、友好、可执行。',
    ].join(' '),
  },
  {
    code: 'app.generate_fitness_plan_user_prompt',
    scene: 'fitness_plan',
    key: 'generate_fitness_plan_user_prompt',
    title: 'Generate Fitness Plan User Prompt',
    description: 'User prompt template for full personalized plan generation.',
    variables: [
      'genderLabel',
      'height',
      'weight',
      'age',
      'bodyStyle',
      'exerciseBase',
      'dietHabit',
      'sleepPattern',
      'occupation',
    ],
    fallbackContent: [
      '基于以下用户信息，生成一份详细的个性化健身方案：',
      '用户信息：',
      '- 性别：{{genderLabel}}',
      '- 身高：{{height}}cm，体重：{{weight}}kg，年龄：{{age}}岁',
      '- 目标体型：{{bodyStyle}}',
      '- 运动基础：{{exerciseBase}}',
      '- 饮食习惯：{{dietHabit}}',
      '- 作息规律：{{sleepPattern}}',
      '- 职业：{{occupation}}',
      '',
      '请生成包含以下内容的方案（用 JSON 格式）：',
      '1. mealPlan: 每日三餐具体食谱（早/中/晚/加餐）',
      '2. waterPlan: 喝水时间表（具体时间点和水量）',
      '3. trainingPlan: 每周训练计划（每天训练内容、组数、时长）',
      '4. summary: 一段鼓励性总结（2-3句话）',
      '',
      '请直接返回 JSON，不要 markdown 代码块。',
    ].join('\n'),
  },
  {
    code: 'image.safe_bg_prompt',
    scene: 'image_gen',
    key: 'safe_background_prompt',
    title: 'Safe Background Prompt',
    description: 'Reusable safe background style instruction for generated images.',
    variables: [],
    fallbackContent: 'Use a clean dark charcoal gray seamless background without gradients, noise, or shadows.',
  },
  {
    code: 'image.generate_ideal_body.with_refinement_and_reference',
    scene: 'image_gen',
    key: 'ideal_body_with_refinement_and_reference',
    title: 'Ideal Body Prompt: Refinement + Reference',
    description: 'Prompt when both body image and face reference image are provided with refinement.',
    variables: ['safeIdentityInstruction', 'refinement', 'safePhotoStyle'],
    fallbackContent:
      'Image 1 is current body and image 2 is face reference. Blend face traits from image 2 into image 1 while preserving body posture. {{safeIdentityInstruction}} Additional adjustment: {{refinement}}. {{safePhotoStyle}}',
  },
  {
    code: 'image.generate_ideal_body.with_refinement_and_image',
    scene: 'image_gen',
    key: 'ideal_body_with_refinement_and_image',
    title: 'Ideal Body Prompt: Refinement + Current Image',
    description: 'Prompt when current body image and refinement are provided.',
    variables: ['safeIdentityInstruction', 'refinement', 'safePhotoStyle'],
    fallbackContent:
      "Adjust this person's body according to: {{refinement}}. Keep overall identity consistent. {{safeIdentityInstruction}} {{safePhotoStyle}}",
  },
  {
    code: 'image.generate_ideal_body.with_refinement_text_only',
    scene: 'image_gen',
    key: 'ideal_body_with_refinement_text_only',
    title: 'Ideal Body Prompt: Text Only Refinement',
    description: 'Prompt when no image is provided and user gives refinement text.',
    variables: ['genderLabel', 'target', 'refinement', 'safePhotoStyle'],
    fallbackContent:
      'Generate a full-body {{genderLabel}} fitness photo with {{target}} body type. Extra requirement: {{refinement}}. {{safePhotoStyle}}',
  },
  {
    code: 'image.generate_ideal_body.with_image',
    scene: 'image_gen',
    key: 'ideal_body_with_image',
    title: 'Ideal Body Prompt: Current Image',
    description: 'Prompt when current body image is provided without refinement.',
    variables: ['target', 'safeIdentityInstruction', 'safePhotoStyle'],
    fallbackContent:
      'Based on this person photo, transform body type toward {{target}}. Keep identity and improve body proportion naturally. {{safeIdentityInstruction}} {{safePhotoStyle}}',
  },
  {
    code: 'image.generate_ideal_body.text_only',
    scene: 'image_gen',
    key: 'ideal_body_text_only',
    title: 'Ideal Body Prompt: Text Only',
    description: 'Prompt when no source image is provided.',
    variables: ['genderLabel', 'target', 'safePhotoStyle'],
    fallbackContent:
      'Generate a realistic full-body {{genderLabel}} fitness photo with {{target}} body type. {{safePhotoStyle}}',
  },
  {
    code: 'food.analyze_text_user_prompt',
    scene: 'food',
    key: 'analyze_food_text_user_prompt',
    title: 'Analyze Food Text Prompt',
    description: 'Prompt that asks model to parse nutrition from text input.',
    variables: ['query'],
    fallbackContent: '分析这个食物的营养成分：{{query}}',
  },
  {
    code: 'food.analyze_image_user_prompt',
    scene: 'food',
    key: 'analyze_food_image_user_prompt',
    title: 'Analyze Food Image Prompt',
    description: 'Prompt that asks model to parse nutrition from image input.',
    variables: ['photoUrl'],
    fallbackContent: [
      '识别这张图片中的食物并估算营养成分，返回纯 JSON。',
      '如果提供了图片URL，请将其作为辅助上下文：{{photoUrl}}',
    ].join('\n'),
  },
  {
    code: 'insights.generate_data_insights_user_prompt',
    scene: 'insights',
    key: 'generate_data_insights_user_prompt',
    title: 'Generate Data Insights Prompt',
    description: 'Prompt for daily dashboard AI suggestions.',
    variables: ['totalCalories', 'totalProtein', 'totalFat', 'totalCarbs', 'latestWeight', 'weightTrend', 'checkinCount'],
    fallbackContent: [
      '你是健身营养顾问。请根据以下今日数据给出 2-3 条中文建议（每条不超过 30 字）。',
      '直接返回 JSON 数组，如 ["建议1","建议2"]，不要 markdown。',
      '今日摄入：{{totalCalories}} 千卡',
      '蛋白质：{{totalProtein}}g，脂肪：{{totalFat}}g，碳水：{{totalCarbs}}g',
      '最新体重：{{latestWeight}} kg',
      '体重趋势：{{weightTrend}}',
      '近30天打卡：{{checkinCount}} 天',
    ].join('\n'),
  },
  {
    code: 'coach.generate_first_day_plan_user_prompt',
    scene: 'coach',
    key: 'generate_first_day_plan_user_prompt',
    title: 'Generate First Day Plan Prompt',
    description: 'Prompt for coach first-day task planning.',
    variables: ['assessmentSummary', 'intakeSummary', 'constraintsText'],
    fallbackContent: [
      '根据用户评估数据，生成首日教练计划，并严格返回 JSON。',
      '返回字段：headline、tasks、nutritionNote、recoveryNote、coachMessage。',
      '每个 task 包含：id、title、category(training/nutrition/recovery/habit)、detail。',
      '用户体测摘要：{{assessmentSummary}}',
      '{{intakeSummary}}',
      '{{constraintsText}}',
    ].join('\n'),
  },
  {
    code: 'coach.generate_follow_up_user_prompt',
    scene: 'coach',
    key: 'generate_follow_up_user_prompt',
    title: 'Generate Follow Up Prompt',
    description: 'Prompt for daily coach follow-up message.',
    variables: ['dayIndex', 'assessmentSummary', 'intakeSummary'],
    fallbackContent: [
      '生成一条简洁的中文每日教练跟进消息，用于 AI 教练每日签到。',
      '当前是第 {{dayIndex}} 天。',
      '用户体测摘要：{{assessmentSummary}}',
      '{{intakeSummary}}',
    ].join('\n'),
  },
  {
    code: 'coach.generate_week_summary_user_prompt',
    scene: 'coach',
    key: 'generate_week_summary_user_prompt',
    title: 'Generate Week Summary Prompt',
    description: 'Prompt for weekly review and next week guidance.',
    variables: ['assessmentSummary', 'intakeSummary', 'constraintsText'],
    fallbackContent: [
      '生成一段简洁的中文周总结，回顾用户本周表现。',
      '突出执行趋势、坚持程度，以及下周最值得微调的一个方向。',
      '用户体测摘要：{{assessmentSummary}}',
      '{{intakeSummary}}',
      '{{constraintsText}}',
    ].join('\n'),
  },
  {
    code: 'coach.visual_assessment_user_prompt',
    scene: 'coach',
    key: 'visual_assessment_user_prompt',
    title: 'Visual Assessment User Prompt',
    description: 'Prompt text sent with two photos for body fat assessment.',
    variables: ['genderLabel'],
    fallbackContent:
      '用户性别：{{genderLabel}}。请分析以下两张照片，第一张是当前身材，第二张是理想身材，并估算各自体脂率。',
  },
  {
    code: 'evolution.analyze_body_with_image_user_prompt',
    scene: 'evolution',
    key: 'analyze_body_with_image_user_prompt',
    title: 'Evolution Analyze Body Prompt',
    description: 'Prompt for initial body analysis from uploaded photo.',
    variables: ['styleLabel'],
    fallbackContent:
      '请分析这张身体照片，用户目标是“{{styleLabel}}”体型。给出简短身体评估（2-3句话），然后告诉用户可以通过对话描述想要的调整，比如“手臂再粗一点”“腰再细一点”来PS理想身材。',
  },
  {
    code: 'evolution.refinement_ack_user_prompt',
    scene: 'evolution',
    key: 'refinement_ack_user_prompt',
    title: 'Evolution Refinement Ack Prompt',
    description: 'Prompt for acknowledging user refinement request.',
    variables: ['userText'],
    fallbackContent:
      '用户想调整理想身材：“{{userText}}”。请简短确认（1-2句话），告诉用户正在根据要求重新生成。',
  },
  {
    code: 'evolution.face_merge_refinement_text',
    scene: 'evolution',
    key: 'face_merge_refinement_text',
    title: 'Evolution Face Merge Refinement',
    description: 'Default refinement text when user uploads face reference image.',
    variables: [],
    fallbackContent: '将这张正脸照的面部特征融合到身材图上，保持身材不变，替换面部。',
  },
  {
    code: 'community.progress_draft',
    scene: 'community',
    key: 'progress_draft',
    title: 'Community Progress Draft',
    description: 'Generate progress report draft from training and weight data.',
    variables: ['trainingCount', 'weightChange', 'streak'],
    fallbackContent: [
      '你是 RightNow Fitness 的 AI 内容助手。',
      '根据用户最近的训练和体重数据，生成一篇简洁的进步报告草稿（中文）。',
      '',
      '数据摘要：',
      '- 最近7天训练次数：{{trainingCount}} 次',
      '- 体重变化：{{weightChange}}',
      '- 连续打卡天数：{{streak}} 天',
      '',
      '返回纯 JSON（不要 markdown 代码块）：',
      '{"content": "草稿文案，2-3句话，突出进步和坚持"}',
      '',
      '要求：',
      '1. 语气真诚、鼓励，避免夸张',
      '2. 突出可量化的进步（训练次数、体重变化、连续天数）',
      '3. 控制在 80 字以内',
    ].join('\n'),
  },
];

export function getModelPromptBinding(code: ModelPromptCode): ModelPromptBinding {
  const found = MODEL_PROMPT_BINDINGS.find((item) => item.code === code);
  if (!found) {
    throw new Error(`Unknown model prompt code: ${code}`);
  }
  return found;
}

export function getModelPromptBindingBySceneAndKey(scene: string, key: string): ModelPromptBinding | undefined {
  return MODEL_PROMPT_BINDINGS.find((item) => item.scene === scene && item.key === key);
}

export function toPromptBindingIdentity(scene: string, key: string): string {
  return `${scene}::${key}`;
}
