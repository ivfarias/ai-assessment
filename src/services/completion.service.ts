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

    const choice = response.choices[0];

    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0];
      const { name, arguments: args } = toolCall.function;

      const parsedArgs = JSON.parse(args);

      if (name === 'start_assessment') {
        const { startAssessmentByName } = await import('./assessmentOrchestrator.js');
        const result = await startAssessmentByName(parsedArgs.user_id, parsedArgs.assessment_name, undefined);
        return { role: 'assistant', content: result.prompt ?? '[Avaliação iniciada]', refusal: "false" };
      }

      if (name === 'process_assessment_answer') {
        const { processAssessment } = await import('./assessmentOrchestrator.js');
        const result = await processAssessment(parsedArgs.user_id, undefined, undefined, parsedArgs.input);
        return { role: 'assistant', content: result.current_step_goal ?? '[Resposta registrada]', refusal: "false" };
      }

      return { role: 'assistant', content: '[Função reconhecida, mas sem ação definida]', refusal: "false" };
    }

    return choice.message;
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
