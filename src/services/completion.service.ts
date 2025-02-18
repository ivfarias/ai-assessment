import { IintentMessage } from '@/domain/interfaces/assistant.js';
import { IVectorResult } from '../domain/interfaces/vectorRepository.js';
import OpenAIService from './openai.service.js';

export default class CompletionService {
  constructor(private openAIService: OpenAIService) {}

  async generateGreetingResponse(query: string): Promise<string> {
    const response = await this.openAIService.createChatCompletion({
      messages: [
        { role: 'system', content: process.env.SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Query: "${query}"\n\nRespond with a friendly and brief greeting in a conversational tone.`,
        },
      ],
    });

    return response.choices[0].message.content;
  }

  async generateContextualResponse({
    intent,
    historySummary,
    query,
    vectorResults,
  }: {
    query: string;
    intent: IintentMessage;
    vectorResults: IVectorResult[];
    historySummary: string;
  }): Promise<string> {
    const context = this.formatVectorResults(vectorResults);
    const content = [
      `Query: "${query}"`,
      `Intent: ${JSON.stringify(intent)}`,
      '',
      'Conversation Summary:',
      historySummary,
      '',
      'Relevant contexts:',
      context,
    ].join('\n');

    console.log('Contextual response content:', content);

    const response = await this.openAIService.createChatCompletion({
      messages: [
        {
          role: 'system',
          content: process.env.SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content,
        },
      ],
    });

    return (
      response.choices[0].message.content
    );
  }

  private formatVectorResults(results: IVectorResult[]): string {
    return results.map((result, index) => `${index + 1}. ${result.text}`).join('\n');
  }
}
