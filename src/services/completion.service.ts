import { IVectorResult } from '../domain/interfaces/vectorRepository.js';
import OpenAIService from './openai.service.js';
import { tools } from '../tools/definitions.js';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { ChatCompletionMessage } from 'openai/resources/chat/completions.mjs';
import { AssessmentRagService } from './assessmentRagService.js';
import { getDb } from '../config/mongodb.js';

/**
 * Service responsible for generating AI-powered responses using OpenAI
 */
export default class CompletionService {
  private assessmentRagService: AssessmentRagService;

  constructor(private openAIService: OpenAIService) {
    this.assessmentRagService = new AssessmentRagService(getDb());
  }

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

      if (name === 'suggest_assessment') {
        const suggestion = await this.handleAssessmentSuggestion(parsedArgs);
        return { role: 'assistant', content: suggestion, tool_calls: choice.message.tool_calls, refusal: "false" };
      }

      if (name === 'start_assessment') {
        const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/assessments/${parsedArgs.assessment_name}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: parsedArgs.user_id,
            context: {}
          })
        });

        if (!response.ok) {
          return { role: 'assistant', content: 'Desculpe, houve um erro ao iniciar a análise. Tente novamente.', tool_calls: choice.message.tool_calls, refusal: "false" };
        }

        const result = await response.json() as any;
        return { role: 'assistant', content: result.currentStep?.prompt || '[Avaliação iniciada]', tool_calls: choice.message.tool_calls, refusal: "false" };
      }

      if (name === 'process_assessment_answer') {
        // Get the current assessment from user profile
        const user = await getDb().collection("user_profiles").findOne({ _id: parsedArgs.user_id });
        const currentAssessment = user?.progress?.currentAssessment;
        
        if (!currentAssessment) {
          return { role: 'assistant', content: 'Não há uma análise ativa no momento.', tool_calls: choice.message.tool_calls, refusal: "false" };
        }

        const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/assessments/${currentAssessment}/answer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: parsedArgs.user_id,
            answer: parsedArgs.input
          })
        });

        if (!response.ok) {
          return { role: 'assistant', content: 'Desculpe, houve um erro ao processar sua resposta. Tente novamente.', tool_calls: choice.message.tool_calls, refusal: "false" };
        }

        const result = await response.json() as any;
        
        if (result.status === 'completed') {
          let message = `✅ Análise de ${result.assessmentName} concluída!\n\n`;
          if (result.insights && result.insights.length > 0) {
            message += "💡 Principais insights:\n";
            result.insights.forEach((insight: string, index: number) => {
              message += `${index + 1}. ${insight}\n`;
            });
          }
          return { role: 'assistant', content: message, tool_calls: choice.message.tool_calls, refusal: "false" };
        }
        
        return { role: 'assistant', content: result.nextStep?.prompt || '[Resposta registrada]', tool_calls: choice.message.tool_calls, refusal: "false" };
      }

      return { role: 'assistant', content: '[Função reconhecida, mas sem ação definida]', tool_calls: choice.message.tool_calls, refusal: "false" };
    }

    return choice.message;
  }

  /**
   * Handle assessment suggestion and provide a helpful response
   */
  private async handleAssessmentSuggestion(args: any): Promise<string> {
    const { user_id, user_query, suggested_assessment, reasoning } = args;
    
    const assessmentDefinitions = this.assessmentRagService.getAvailableAssessments();
    const assessment = assessmentDefinitions.find(a => a.name === suggested_assessment);
    
    if (!assessment) {
      return 'Desculpe, não consegui identificar uma análise adequada para sua situação.';
    }

    let message = `💡 Baseado na sua pergunta sobre "${user_query}", sugiro a análise: **${suggested_assessment}**\n\n`;
    message += `📋 **O que esta análise faz:**\n${assessment.description}\n\n`;
    message += `🤔 **Por que seria útil:** ${reasoning}\n\n`;
    message += `✅ **Gostaria de começar esta análise agora?**\n`;
    message += `Responda "sim" para iniciar ou me diga se prefere outra abordagem.`;

    return message;
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
