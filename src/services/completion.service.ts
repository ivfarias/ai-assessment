import { IVectorResult } from '../domain/interfaces/vectorRepository.js';
import OpenAIService from './openai.service.js';
import { tools } from '../tools/definitions.js';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { ChatCompletionMessage } from 'openai/resources/chat/completions.mjs';

/**
 * Service responsible for generating AI-powered responses using OpenAI
 */
export default class CompletionService {
  constructor(private openAIService: OpenAIService) {}

  /**
   * Generates a contextual response based on the user's query, intent, and relevant context
   * @param query - The user's input message
   * @param intent - The analyzed intent of the user's message
   * @param vectorResults - Relevant context vectors from the knowledge base
   * @param historySummary - Summary of the conversation history
   * @param messages - Previous messages in the conversation
   * @returns A generated contextual response
   */
  async generateContextualResponse({
    query,
    context,
    vectorResults,
    historySummary,
    messages = [],
  }: {
    query: string;
    context: any; // Using 'any' for now to match the flexible context object
    vectorResults: IVectorResult[];
    historySummary: string;
    messages?: ChatCompletionMessageParam[];
  }): Promise<ChatCompletionMessage> {
    const vectorContext = this.formatVectorResults(vectorResults);

    const systemMessage: ChatCompletionMessageParam = {
      role: 'system',
      content: process.env.SYSTEM_PROMPT,
    };

    let userMessages: ChatCompletionMessageParam[] = [];
    if (query) {
      const content = [
        `User Query: "${query}"`,
        `User Profile Context: ${JSON.stringify(context, null, 2)}`,
        '',
        'Conversation Summary:',
        historySummary,
        '',
        'Relevant information from knowledge base:',
        vectorContext,
      ].join('\n');
      userMessages.push({ role: 'user', content });
    }

    const allMessages: ChatCompletionMessageParam[] = [
      systemMessage,
      ...messages,
      ...userMessages,
    ];

    console.log('Messages sent to OpenAI:', JSON.stringify(allMessages, null, 2));

    const response = await this.openAIService.createChatCompletion({
      messages: allMessages,
      tools,
    });

    return response.choices[0].message;
  }

  /**
   * Formats vector results into a readable string
   * @param results - Array of vector results to format
   * @returns Formatted string of vector results
   * @private
   */
  private formatVectorResults(results: IVectorResult[]): string {
    return results.map((result, index) => `${index + 1}. ${result.text}`).join('\n');
  }
}
