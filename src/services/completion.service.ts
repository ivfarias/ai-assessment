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

    // Get assessment information for context
    const availableAssessments = this.assessmentRagService.getAvailableAssessments();
    const assessmentInfo = availableAssessments.map(a => 
      `${a.name} (${a.category}): ${a.description}`
    ).join('\n');

    const systemMessage: ChatCompletionMessageParam = {
      role: 'system',
      content: `${process.env.SYSTEM_PROMPT || 'You are a helpful business consultant AI assistant.'}

Available Business Assessments:
${assessmentInfo}

You can help users with business analysis by:
1. Having natural conversations about their business
2. Suggesting relevant assessments when appropriate
3. Starting assessments when users want to do them
4. Processing assessment answers and providing insights

Use the assessment tools when users want to:
- Start a specific assessment (use start_assessment)
- Answer assessment questions (use process_assessment_answer)
- Get assessment suggestions (use suggest_assessment)

Always maintain natural conversation flow and only use assessments when the user explicitly wants them.`,
    };

    let userMessages: ChatCompletionMessageParam[] = [];
    if (query) {
      // Determine if this is a simple greeting to reduce context
      const isSimpleGreeting = this.isSimpleGreeting(query);
      
      let content: string;
      
      if (isSimpleGreeting) {
        content = `User Query: "${query}"`;
      } else {
        content = [
          `User Query: "${query}"`,
          `User Profile Context: ${JSON.stringify(context, null, 2)}`,
          '',
          'Conversation Summary:',
          historySummary,
          '',
          'Relevant information from knowledge base:',
          vectorContext,
        ].join('\n');
      }
      
      userMessages.push({ role: 'user', content });
    }

    // Convert any LangChain messages to OpenAI format
    const convertedMessages = this.convertMessagesToOpenAIFormat(messages);

    // Simple filter to remove any tool messages
    const safeMessages = convertedMessages.filter(message => message.role !== 'tool');

    // Debug logging
    const toolMessagesInConverted = convertedMessages.filter(msg => msg.role === 'tool');
    if (toolMessagesInConverted.length > 0) {
      console.log('⚠️ Found tool messages in converted messages:', toolMessagesInConverted);
    }

    const allMessages: ChatCompletionMessageParam[] = [
      systemMessage,
      ...safeMessages,
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
      // If it's already in OpenAI format, check if it's a tool message first
      if (message.role) {
        // Keep assessment-related tool messages
        if (message.role === 'tool') {
          if (message.content?.includes('"current_step_goal"') || 
              message.content?.includes('"goal_prompt"') ||
              message.content?.includes('assessment') ||
              message.content?.includes('step')) {
            return message;
          }
          // Skip other tool messages
          return null;
        }
        // Return other messages as-is
        if (message.content || message.tool_calls) {
          return message;
        }
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
          // Check if it's an assessment-related tool message
          if (message.content?.includes('"current_step_goal"') || 
              message.content?.includes('"goal_prompt"') ||
              message.content?.includes('assessment') ||
              message.content?.includes('step')) {
            return { role: 'tool', content: message.content };
          }
          // Skip other tool messages
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
    
    try {
      // Get available assessments and suggest based on user query
      const availableAssessments = this.assessmentRagService.getAvailableAssessments();
      
      // Simple keyword matching for suggestions
      const lowerQuery = user_query.toLowerCase();
      const suggestions = availableAssessments.filter(assessment => {
        const keywords = [
          'lucro', 'profit', 'financeiro', 'financial', 'dinheiro', 'money',
          'ferramentas', 'tools', 'tecnologia', 'technology',
          'clientes', 'customers', 'fidelização', 'loyalty',
          'operacional', 'operational', 'processos', 'processes',
          'estratégia', 'strategy', 'mercado', 'market',
          'organização', 'organization', 'equipe', 'team'
        ];
        
        return keywords.some(keyword => 
          lowerQuery.includes(keyword) || 
          assessment.description.toLowerCase().includes(keyword)
        );
      });

      if (suggestions.length === 0) {
        return 'Desculpe, não consegui identificar uma análise adequada para sua situação. Pode me contar mais sobre o que você gostaria de melhorar no seu negócio?';
      }

      const bestSuggestion = suggestions[0];
      const assessmentList = suggestions.map(a => `• ${a.name}: ${a.description}`).join('\n');
      
      return `Com base no que você mencionou, aqui estão algumas análises que podem ajudar:\n\n${assessmentList}\n\nQual dessas análises você gostaria de fazer?`;
    } catch (error) {
      console.error('Error handling assessment suggestion:', error);
      return 'Desculpe, houve um erro ao sugerir análises. Pode me contar mais sobre o que você gostaria de melhorar no seu negócio?';
    }
  }

  /**
   * Detect direct assessment requests by name (fallback method)
   */
  private detectDirectAssessmentRequest(userQuery: string): string | null {
    const lowerQuery = userQuery.toLowerCase();
    
    // Map common terms to assessment names
    const assessmentMap: Record<string, string> = {
      'simular lucro': 'simulateProfit',
      'simulação de lucro': 'simulateProfit',
      'lucro': 'simulateProfit',
      'profit': 'simulateProfit',
      'profit simulation': 'simulateProfit',
      
      'radar de saúde financeira': 'financialHealthRadar',
      'saúde financeira': 'financialHealthRadar',
      'financial health': 'financialHealthRadar',
      'financial health radar': 'financialHealthRadar',
      
      'teste de independência operacional': 'operationalIndependenceTest',
      'independência operacional': 'operationalIndependenceTest',
      'operational independence': 'operationalIndependenceTest',
      
      'scanner de ferramentas': 'toolScanner',
      'ferramentas': 'toolScanner',
      'tools': 'toolScanner',
      'tool scanner': 'toolScanner',
      
      'termômetro de padronização': 'standardizationThermometer',
      'padronização': 'standardizationThermometer',
      'standardization': 'standardizationThermometer',
      
      'painel de fidelização': 'customerLoyaltyPanel',
      'fidelização': 'customerLoyaltyPanel',
      'loyalty': 'customerLoyaltyPanel',
      'customer loyalty': 'customerLoyaltyPanel',
      
      'mapa de aquisição': 'customerAcquisitionMap',
      'aquisição': 'customerAcquisitionMap',
      'acquisition': 'customerAcquisitionMap',
      
      'scanner de estratégia': 'marketStrategyScanner',
      'estratégia': 'marketStrategyScanner',
      'strategy': 'marketStrategyScanner',
      
      'raio-x organizacional': 'organizationalXray',
      'organização': 'organizationalXray',
      'organization': 'organizationalXray',
      
      'diagnóstico de contexto': 'contextDiagnosis',
      'contexto': 'contextDiagnosis',
      'context': 'contextDiagnosis',
      'diagnosis': 'contextDiagnosis'
    };
    
    for (const [term, assessment] of Object.entries(assessmentMap)) {
      if (lowerQuery.includes(term)) {
        return assessment;
      }
    }
    
    return null;
  }

  /**
   * Handle starting an assessment
   */
  private async handleStartAssessment(args: any): Promise<string> {
    const { assessment_name, user_id } = args;
    
    try {
      const result = await this.assessmentRagService.startAssessment(user_id, assessment_name);
      
      if (result.success && result.currentStep) {
        return result.currentStep;
      } else {
        return `Desculpe, não foi possível iniciar a análise "${assessment_name}". ${result.error || 'Tente novamente.'}`;
      }
    } catch (error) {
      console.error('Error starting assessment:', error);
      return 'Desculpe, houve um erro ao iniciar a análise. Tente novamente.';
    }
  }

  /**
   * Handle processing an assessment answer
   */
  private async handleProcessAssessmentAnswer(args: any): Promise<string> {
    const { user_id, input } = args;
    
    try {
      const result = await this.assessmentRagService.processAssessmentAnswer(user_id, input);
      
      if (result.success) {
        if (result.completed) {
          return `✅ Análise concluída!\n\n💡 Principais insights:\n${result.insights?.map((insight, i) => `${i + 1}. ${insight}`).join('\n') || 'Análise concluída com sucesso.'}`;
        } else if (result.nextStep) {
          return result.nextStep;
        } else {
          return 'Por favor, continue respondendo as perguntas da análise.';
        }
      } else {
        return `Desculpe, houve um erro ao processar sua resposta. ${result.error || 'Tente novamente.'}`;
      }
    } catch (error) {
      console.error('Error processing assessment answer:', error);
      return 'Desculpe, houve um erro ao processar sua resposta. Tente novamente.';
    }
  }

  /**
   * Determines if a message is a confirmation to start an assessment
   */
  private isConfirmation(message: string): boolean {
    const confirmations = ['sim', 'yes', 'ok', 'claro', 'quero', 'vamos', 'começar', 'start', 'go', 'okay'];
    const lowerMessage = message.toLowerCase().trim();
    return confirmations.some(conf => lowerMessage.includes(conf));
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

  /**
   * Determines if a query is a simple greeting
   */
  private isSimpleGreeting(query: string): boolean {
    const greetingKeywords = [
      'olá', 'oi', 'hello', 'hi', 'hey', 'bom dia', 'good morning', 'boa tarde',
      'good afternoon', 'boa noite', 'good evening', 'tudo bem', 'how are you'
    ];
    
    const lowerQuery = query.toLowerCase().trim();
    return greetingKeywords.some(keyword => lowerQuery === keyword || lowerQuery.startsWith(keyword + ' '));
  }

  /**
   * Determines if a query is assessment-related
   */
  private isAssessmentRelatedQuery(query: string): boolean {
    const assessmentKeywords = [
      'avaliação', 'assessment', 'análise', 'analysis', 'diagnóstico', 'diagnosis',
      'simular', 'simulate', 'lucro', 'profit', 'saúde financeira', 'financial health',
      'radar', 'independência operacional', 'operational independence', 'ferramentas',
      'tools', 'padronização', 'standardization', 'fidelização', 'loyalty', 'clientes',
      'customers', 'aquisição', 'acquisition', 'estratégia', 'strategy', 'mercado',
      'market', 'organização', 'organization', 'contexto', 'context'
    ];
    
    const lowerQuery = query.toLowerCase();
    return assessmentKeywords.some(keyword => lowerQuery.includes(keyword));
  }
}