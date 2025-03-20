import { IQueryOptions, IQueryResponse } from '../domain/interfaces/queryService.js';
import OpenAIService from './openai.service.js';
import MessageCache from '../infrastructure/cache/MessageCache.js';
import ConversationManager from '../infrastructure/memory/ConversationMemoryManager.js';
import VectorRepository from '../repositories/vector.repository.js';
import AnalyzeUserIntentService from './analyzeUserIntent.service.js';
import SummaryService from './summary.service.js';
import CompletionService from './completion.service.js';
import { getDb } from '../config/mongodb.js';
import { IintentMessage } from '../domain/interfaces/assistant.js';

/**
 * Service for processing and handling user queries
 */
export default class QueryService {
  private completionService: CompletionService;
  private openAIService: OpenAIService;
  private messageCache: MessageCache;
  private vectorRepository: VectorRepository;
  private conversationManager: ConversationManager;
  private analyzeUserIntent: AnalyzeUserIntentService;
  private summaryService: SummaryService;

  constructor() {
    this.openAIService = new OpenAIService();
    this.messageCache = new MessageCache();
    this.vectorRepository = new VectorRepository();
    this.conversationManager = new ConversationManager(getDb().collection('chat-history'));
    this.analyzeUserIntent = new AnalyzeUserIntentService();
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

    const intent = await this.analyzeUserIntent.getQueryIntent(query);
    const result = await this.processQuery(query, intent, options);

    this.cacheResults(query, options, result);
    return result;
  }

  /**
   * Processes a query based on intent analysis
   * @param query - The user's query
   * @param intent - The analyzed intent
   * @param options - Query processing options
   * @returns Promise containing the processed query response
   */
  private async processQuery(
    query: string,
    intent: any,
    options: IQueryOptions,
  ): Promise<IQueryResponse> {
    if (this.isSimpleGreeting(intent)) {
      return this.prcessSimpleQuery(query);
    }
    return this.processComplexQuery(query, intent, options);
  }

  /**
   * Checks if the intent is a simple greeting
   * @param intent - The analyzed intent
   * @returns boolean indicating if the intent is a simple greeting
   */
  private isSimpleGreeting(intent: IintentMessage): boolean {
    return intent.isGreeting && !intent.hasQuestion && !intent.needsSupport;
  }

  /**
   * Handles a simple greeting query
   * @param query - The user's query
   * @returns Promise containing the query response
   */
  private async prcessSimpleQuery(query: string): Promise<IQueryResponse> {
    const answer = await this.completionService.generateGreetingResponse(query);
    return { matches: [], answer };
  }

  /**
   * Handles a complex query based on intent and context
   * @param query - The user's query
   * @param intent - The analyzed intent
   * @param options - Query processing options
   * @returns Promise containing the query response
   */
  private async processComplexQuery(
    query: string,
    intent: IintentMessage,
    options: IQueryOptions,
  ): Promise<IQueryResponse> {
    const docsCollection = getDb().collection('docs');
    const macroCsCollection = getDb().collection('collectionDemo');
    const queryVector = await this.openAIService.createEmbedding(query);
    const topK = 5;
    const docsVectorResults = await this.vectorRepository.searchSimilar({
      queryVector,
      topK,
      index: 'vectorDocsIndex',
      collection: docsCollection,
    });
    const macroCsVectorResults = await this.vectorRepository.searchSimilar({
      queryVector,
      topK,
      index: 'vectorIndex',
      collection: macroCsCollection,
    });
    const topResults = [...docsVectorResults, ...macroCsVectorResults]
      .sort((a, b) => b.score - a.score)
      .filter((_, index) => index <= topK);

    const memory = await this.conversationManager.getMemory(options.userId);
    const chatHistory = await memory.loadMemoryVariables({});

    const historySummary = await this.summaryService.summarizeChatHistory(chatHistory);

    const answer = await this.completionService.generateContextualResponse({
      query,
      intent,
      vectorResults: topResults,
      historySummary,
    });

    await memory.saveContext({ input: query }, { output: answer });

    return {
      matches: topResults,
      answer,
    };
  }

  /**
   * Caches the query results
   * @param query - The user's query
   * @param options - Query processing options
   * @param result - The query response
   */
  private cacheResults(query: string, options: IQueryOptions, result: IQueryResponse): void {
    if (options.messageId) {
      this.messageCache.markMessageAsProcessed(options.messageId);
    }
    this.messageCache.setQueryResult(query, options, result);
  }
}
