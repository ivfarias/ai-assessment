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

    // Convert any LangChain messages to OpenAI format
    const convertedMessages = this.convertMessagesToOpenAIFormat(messages);

    // Additional safety check to remove any remaining tool messages
    const safeMessages = convertedMessages.filter(message => {
      const isToolMessage = message.role === 'tool' || 
                           ('tool_call_id' in message && !('tool_calls' in message));
      if (isToolMessage) {
        console.log(`❌ Removing tool message in final check:`, message);
        return false;
      }
      return true;
    });

    const allMessages: ChatCompletionMessageParam[] = [
      systemMessage,
      ...safeMessages,
      ...userMessages,
    ];

    console.log('Messages sent to OpenAI:', JSON.stringify(allMessages, null, 2));

    // Additional debug logging for tool messages
    const toolMessages = allMessages.filter(msg => msg.role === 'tool');
    if (toolMessages.length > 0) {
      console.log('⚠️ Warning: Found tool messages in final message array:', toolMessages);
    }

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
        const result = await this.handleStartAssessment(parsedArgs);
        return { role: 'assistant', content: result, tool_calls: choice.message.tool_calls, refusal: "false" };
      }

      if (name === 'process_assessment_answer') {
        const result = await this.handleProcessAssessmentAnswer(parsedArgs);
        return { role: 'assistant', content: result, tool_calls: choice.message.tool_calls, refusal: "false" };
      }

      return { role: 'assistant', content: '[Função reconhecida, mas sem ação definida]', tool_calls: choice.message.tool_calls, refusal: "false" };
    }

    return choice.message;
  }

  /**
   * Converts LangChain messages to OpenAI format
   * @param messages - Array of messages that might be LangChain or OpenAI format
   * @returns Array of messages in OpenAI format
   */
  private convertMessagesToOpenAIFormat(messages: any[]): ChatCompletionMessageParam[] {
    return messages.map(message => {
      // If it's already in OpenAI format, return as is
      if (message.role && (message.content || message.tool_calls)) {
        return message;
      }
      
      // If it's a LangChain message, convert it
      if (message._getType) {
        const type = message._getType();
        if (type === 'human') {
          return { role: 'user', content: message.content };
        } else if (type === 'ai') {
          return { role: 'assistant', content: message.content };
        } else if (type === 'system') {
          return { role: 'system', content: message.content };
        } else if (type === 'tool') {
          // Skip tool messages as they don't have corresponding tool_calls in history
          console.log(`❌ Skipping tool message in conversion:`, message);
          return null;
        }
      }
      
      // If it's an unknown format, try to extract role and content
      if (message.role) {
        return message;
      }
      
      // Default fallback - treat as user message
      console.warn('Unknown message format, treating as user message:', message);
      return { role: 'user', content: message.content || JSON.stringify(message) };
    }).filter(message => message && message.role && (message.content || message.tool_calls));
  }

  /**
   * Handle assessment suggestion using RAG for intelligent suggestions
   */
  private async handleAssessmentSuggestion(args: any): Promise<string> {
    const { user_id, user_query } = args;
    
    // Use RAG to get intelligent assessment suggestions
    const suggestions = await this.assessmentRagService.embeddingService.getAssessmentSuggestions(user_query);
    
    if (suggestions.length === 0) {
      return 'Desculpe, não consegui identificar uma análise adequada para sua situação. Pode me contar mais sobre o que você gostaria de melhorar no seu negócio?';
    }

    const bestSuggestion = suggestions[0];
    const assessmentDefinitions = this.assessmentRagService.getAvailableAssessments();
    const assessment = assessmentDefinitions.find(a => a.name === bestSuggestion.suggestedAssessment);
    
    if (!assessment) {
      return 'Desculpe, não consegui identificar uma análise adequada para sua situação.';
    }

    let message = `💡 Baseado na sua pergunta sobre "${user_query}", sugiro a análise: **${assessment.name}**\n\n`;
    message += `📋 **O que esta análise faz:**\n${assessment.description}\n\n`;
    message += `🤔 **Por que seria útil:** ${bestSuggestion.reasoning}\n\n`;
    message += `✅ **Gostaria de começar esta análise agora?**\n`;
    message += `Responda "sim" para iniciar ou me diga se prefere outra abordagem.`;

    return message;
  }

  /**
   * Handle starting an assessment using the AssessmentService directly
   */
  private async handleStartAssessment(args: any): Promise<string> {
    const { assessment_name, user_id } = args;
    
    try {
      const result = await this.assessmentRagService.assessmentService.startAssessment(assessment_name, user_id);
      
      if (result.currentStep) {
        return result.currentStep.goal_prompt;
      }

      return `Vamos começar a análise de ${assessment_name}. Por favor, forneça as informações necessárias.`;
    } catch (error) {
      console.error('Error starting assessment:', error);
      return 'Desculpe, houve um erro ao iniciar a análise. Tente novamente.';
    }
  }

  /**
   * Handle processing assessment answers using the AssessmentService directly
   */
  private async handleProcessAssessmentAnswer(args: any): Promise<string> {
    const { user_id, input } = args;
    
    try {
      // Get the current assessment from user profile
      const user = await getDb().collection("user_profiles").findOne({ _id: user_id });
      const currentAssessment = user?.progress?.currentAssessment;
      
      if (!currentAssessment) {
        return 'Não há uma análise ativa no momento.';
      }

      const result = await this.assessmentRagService.assessmentService.processAnswer(currentAssessment, user_id, input);
      
      if (result.status === 'completed') {
        let message = `✅ Análise de ${currentAssessment} concluída!\n\n`;
        if (result.insights && result.insights.length > 0) {
          message += "💡 Principais insights:\n";
          result.insights.forEach((insight: string, index: number) => {
            message += `${index + 1}. ${insight}\n`;
          });
        }
        return message;
      }
      
      if (result.nextStep) {
        return result.nextStep.goal_prompt;
      }
      
      return 'Por favor, continue respondendo as perguntas da análise.';
    } catch (error) {
      console.error('Error processing assessment answer:', error);
      return 'Desculpe, houve um erro ao processar sua resposta. Tente novamente.';
    }
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