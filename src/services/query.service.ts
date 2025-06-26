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
    const topK = 5;
    const docsVectorResults = await this.vectorRepository.searchSimilar({
      queryVector,
      topK,
      index: 'docs_search_index',
      collection: docsCollection,
    });
    const macroCsVectorResults = await this.vectorRepository.searchSimilar({
      queryVector,
      topK,
      index: 'macro_cs_search_index',
      collection: macroCsCollection,
    });

    const topResults = [...docsVectorResults, ...macroCsVectorResults]
      .sort((a, b) => b.score - a.score)
      .filter((_, index) => index <= topK);

    const memory = await this.conversationManager.getMemory(options.userId);
    const chatHistory = await memory.loadMemoryVariables({});

    const historySummary = await this.summaryService.summarizeChatHistory(chatHistory);

    // Completely remove all tool messages from history for the initial call
    const cleanHistory = this.removeAllToolMessages(chatHistory.chat_history || []);

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
}
