import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  constructor(private readonly configService: ConfigService) {}

  async extractTrainingData(input: {
    description?: string;
    photoUrl?: string;
    rawInput?: any;
  }) {
    const apiKey = this.configService.get('GEMINI_API_KEY');
    const prompt = `你是健身数据提取专家。请从以下用户输入中提取训练数据，返回 JSON 格式。

用户输入：
${input.description || ''}

要求：
1. 提取动作名称、组数、次数、重量（kg）、休息时间（秒）
2. 如果信息不完整，用 null 填充
3. 返回格式：
{
  "exercises": [
    {
      "name": "深蹲",
      "sets": [
        { "reps": 12, "weight": 60, "duration": null, "restTime": 90 }
      ]
    }
  ],
  "totalDuration": 45,
  "needsFollowUp": false,
  "missingFields": []
}

只返回 JSON，不要其他文字。`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 1024
          }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    return JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
  }

  async generateFeedback(structuredData: any): Promise<any> {
    const apiKey = this.configService.get('GEMINI_API_KEY');
    const prompt = `基于以下训练数据，生成鼓励式反馈：

${JSON.stringify(structuredData, null, 2)}

要求：
1. 标题：简短有力（如"今日训练完成！"）
2. 内容：鼓励为主，避免批评
3. 高亮数据：总组数、总重量、完成动作数
4. 建议：1-2 条改进建议（可选）

返回 JSON：
{
  "title": "...",
  "content": "...",
  "highlights": { "totalSets": 12, "totalWeight": 720 },
  "encouragement": "...",
  "suggestions": "..."
}

只返回 JSON，不要其他文字。`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    return JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
  }
}
