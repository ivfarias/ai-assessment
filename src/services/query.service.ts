import { IQueryOptions, IQueryResponse } from '../domain/interfaces/queryService.js';
import OpenAIService from './openai.service.js';
import MessageCache from '../infrastructure/cache/MessageCache.js';
import ConversationManager from '../infrastructure/memory/ConversationMemoryManager.js';
import VectorRepository from '../repositories/vector.repository.js';
import SummaryService from './summary.service.js';
import CompletionService from './completion.service.js';
import { getDb } from '../config/mongodb.js';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

/**
 * Service for processing and handling user queries
 */
export default class QueryService {
  private completionService: CompletionService;
  private openAIService: OpenAIService;
  private messageCache: MessageCache;
  private vectorRepository: VectorRepository;
  private conversationManager: ConversationManager;
  private summaryService: SummaryService;

  constructor() {
    this.openAIService = new OpenAIService();
    this.messageCache = new MessageCache();
    this.vectorRepository = new VectorRepository();
    this.conversationManager = new ConversationManager(getDb().collection('ChatHistory'));
    this.summaryService = new SummaryService();
    this.completionService = new CompletionService(this.openAIService);
  }

  /**
   * Process a query against embedded documents
   * @param query - The user's query string
   * @param options - Query processing options
   * @returns Promise containing the query response
   */
  public async queryEmbeddings(
    query: string,
    options: IQueryOptions,
  ): Promise<IQueryResponse | null> {
    const cachedResult = this.messageCache.getQueryResult(query, options);
    if (cachedResult) {
      return cachedResult;
    }

    const result = await this.processComplexQuery(query, options);

    this.cacheResults(query, options, result);
    return result;
  }

  public async query(query: string, options: IQueryOptions): Promise<IQueryResponse> {
    return this.processComplexQuery(query, options);
  }

  /**
   * Handles a complex query based on intent and context
   * @param query - The user's query
   * @param options - Query processing options
   * @returns Promise containing the query response
   */
  private async processComplexQuery(
    query: string,
    options: IQueryOptions,
  ): Promise<IQueryResponse> {
    const docsCollection = getDb().collection('KyteDocs');
    const macroCsCollection = getDb().collection('MacroCS');
    const queryVector = await this.openAIService.createEmbedding(query);
    
    // Determine query type to optimize context retrieval
    const isAssessmentQuery = this.isAssessmentRelatedQuery(query);
    const isSupportQuery = this.isSupportRelatedQuery(query);
    const isSimpleGreeting = this.isSimpleGreeting(query);
    
    let topResults: any[] = [];
    
    // Only retrieve context if it's not a simple greeting
    if (!isSimpleGreeting) {
      const topK = isAssessmentQuery ? 3 : 5; // Less context for assessment queries
      
      if (isSupportQuery) {
        // For support queries, prioritize support documentation
        const docsVectorResults = await this.vectorRepository.searchSimilar({
          queryVector,
          topK,
          index: 'docs_search_index',
          collection: docsCollection,
        });
        topResults = docsVectorResults;
      } else if (isAssessmentQuery) {
        // For assessment queries, prioritize business context
        const macroCsVectorResults = await this.vectorRepository.searchSimilar({
          queryVector,
          topK,
          index: 'macro_cs_search_index',
          collection: macroCsCollection,
        });
        topResults = macroCsVectorResults;
      } else {
        // For general queries, get both but limit results
        const docsVectorResults = await this.vectorRepository.searchSimilar({
          queryVector,
          topK: 3,
          index: 'docs_search_index',
          collection: docsCollection,
        });
        const macroCsVectorResults = await this.vectorRepository.searchSimilar({
          queryVector,
          topK: 3,
          index: 'macro_cs_search_index',
          collection: macroCsCollection,
        });

        topResults = [...docsVectorResults, ...macroCsVectorResults]
          .sort((a, b) => b.score - a.score)
          .filter((_, index) => index <= topK);
      }
    }

    const memory = await this.conversationManager.getMemory(options.userId);
    const chatHistory = await memory.loadMemoryVariables({});

    const historySummary = await this.summaryService.summarizeChatHistory(chatHistory);

    // Filter tool messages, but keep those containing "current_step_goal"
    const cleanHistory = chatHistory.chat_history?.filter(
      m => m.role !== 'tool' || m.content?.includes('"current_step_goal"')
    ) ?? [];

    const firstResponse = await this.completionService.generateContextualResponse({
      query,
      context: options.context,
      vectorResults: topResults,
      historySummary,
      messages: cleanHistory,
    });

    let finalAnswer = firstResponse.content || "I'm not sure how to respond to that.";

    if (firstResponse.tool_calls?.length) {
      const toolCall = firstResponse.tool_calls[0];
      
      // Create a proper tool response message
      const toolResponse = {
        role: "tool" as const,
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: "Tool execution completed successfully."
      };

      // For the followup call, only include the current response and tool response
      // Don't include any history that might have problematic tool messages
      const followup = await this.completionService.generateContextualResponse({
        query,
        context: options.context,
        vectorResults: topResults,
        historySummary,
        messages: [
          firstResponse,
          toolResponse
        ]
      });
      finalAnswer = followup.content || finalAnswer;
    }

    await memory.chatHistory.addMessages([
      new HumanMessage(query),
      new AIMessage(finalAnswer),
    ]);

    return {
      matches: topResults,
      answer: finalAnswer,
    };
  }

  /**
   * Completely removes all tool messages from the conversation history
   * @param messages - Array of chat history messages
   * @returns Array of messages without any tool messages
   */
  private removeAllToolMessages(messages: any[]): any[] {
    console.log('🗑️ Removing all tool messages from history, original length:', messages.length);
    
    const filtered = messages.filter(message => {
      // Simple check for tool messages
      const isToolMessage = message.role === 'tool' || 
                           (message._getType && message._getType() === 'tool');
      
      if (isToolMessage) {
        console.log(`❌ Removing tool message:`, message);
        return false;
      }
      
      return true;
    });

    console.log('🗑️ After removing tool messages, length:', filtered.length);
    return filtered;
  }

  /**
   * Caches the query results
   * @param query - The user's query
   * @param options - Query processing options
   * @param result - The query response
   */
  private cacheResults(query: string, options: IQueryOptions, result: IQueryResponse): void {
    this.messageCache.setQueryResult(query, options, result);
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
    return assessmentKeywords.some(keyword => lowerQuery.split(/\s+/).includes(keyword));
  }

  /**
   * Determines if a query is support-related
   */
  private isSupportRelatedQuery(query: string): boolean {
    const supportKeywords = [
      'ajuda', 'help', 'suporte', 'support', 'como', 'how', 'cadastrar', 'register',
      'produto', 'product', 'configurar', 'configure', 'problema', 'problem',
      'erro', 'error', 'funcionalidade', 'feature', 'kyte', 'app', 'aplicativo'
    ];
    
    const lowerQuery = query.toLowerCase();
    return supportKeywords.some(keyword => lowerQuery.includes(keyword));
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
}
