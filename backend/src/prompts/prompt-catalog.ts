export type ModelPromptCode =
  | 'training.extract_data'
  | 'training.generate_feedback'
  | 'training.daily_change_feedback'
  | 'core.food_analysis_system'
  | 'food.analyze_image_user_prompt'
  | 'food.analyze_text_user_prompt';

interface ModelPromptBinding {
  key: string;
  scene: string;
  fallbackContent: string;
}

const PROMPT_BINDINGS: Record<ModelPromptCode, ModelPromptBinding> = {
  'training.extract_data': {
    key: 'training',
    scene: 'extract_data',
    fallbackContent:
      'Analyze the workout input and return JSON only with exercise details. Description: {{description}}. Photo URL: {{photoUrl}}. Raw Input: {{rawInputJson}}',
  },
  'training.generate_feedback': {
    key: 'training',
    scene: 'generate_feedback',
    fallbackContent:
      'Based on this structured workout data, return JSON feedback only. Data: {{structuredDataJson}}',
  },
  'training.daily_change_feedback': {
    key: 'training',
    scene: 'daily_change_feedback',
    fallbackContent:
      'Compare today with previous records and return JSON feedback only. Records: {{recordsJson}}. Last record: {{lastRecordJson}}',
  },
  'core.food_analysis_system': {
    key: 'core',
    scene: 'food_analysis_system',
    fallbackContent:
      'You are a nutrition assistant. Return strict JSON with calories, protein, fat, and carbs.',
  },
  'food.analyze_image_user_prompt': {
    key: 'food',
    scene: 'analyze_image_user_prompt',
    fallbackContent:
      'Analyze this food image and return JSON nutrition estimate only. Image URL: {{photoUrl}}',
  },
  'food.analyze_text_user_prompt': {
    key: 'food',
    scene: 'analyze_text_user_prompt',
    fallbackContent:
      'Analyze this food text and return JSON nutrition estimate only. Query: {{query}}',
  },
};

export function getModelPromptBinding(code: ModelPromptCode): ModelPromptBinding {
  return PROMPT_BINDINGS[code];
}
