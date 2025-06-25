import { Db } from "mongodb";
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import OpenAI from 'openai';
import { UserProfile } from "../types/profile.js";
import { AssessmentEmbeddingService } from "./assessmentEmbeddingService.js";
import { AssessmentService } from "./assessment.service.js";

interface AssessmentStep {
  key: string;
  goal_prompt: string;
}

interface AssessmentDefinition {
  name: string;
  description: string;
  steps: AssessmentStep[];
  profileSection: string;
  finalAssessment?: boolean;
}

interface AssessmentApiResponse {
  status: string;
  assessmentName: string;
  currentStep?: { key: string; prompt: string };
  nextStep?: { key: string; prompt: string };
  progress: { current: number; total: number };
  results?: any;
  insights?: string[];
}

export class AssessmentRagService {
  private openai: OpenAI;
  private embeddings: OpenAIEmbeddings;
  private textSplitter: RecursiveCharacterTextSplitter;
  private db: Db;
  private embeddingService: AssessmentEmbeddingService;
  private assessmentService: AssessmentService;

  constructor(db: Db) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-ada-002',
    });
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    this.db = db;
    this.embeddingService = new AssessmentEmbeddingService(db);
    this.assessmentService = new AssessmentService(db);
  }

  // Assessment definitions with detailed descriptions
  private assessmentDefinitions: AssessmentDefinition[] = [
    {
      name: "simulateProfit",
      description: "Analyzes business profitability by calculating revenue, costs, and profit margins. Helps understand financial performance and identify improvement opportunities.",
      profileSection: "finance",
      steps: [
        { key: "faturamentoMensal", goal_prompt: "Ask for their current monthly revenue to understand business size and growth potential." },
        { key: "custoProdutos", goal_prompt: "Ask for the approximate cost of products/services to calculate gross margin." },
        { key: "percentualReinvestido", goal_prompt: "Ask what percentage of revenue they reinvest to show growth commitment." }
      ]
    },
    {
      name: "financialHealthRadar",
      description: "Evaluates financial stability through revenue predictability and cash flow management. Identifies financial health indicators.",
      profileSection: "finance",
      steps: [
        { key: "previsibilidadeScore", goal_prompt: "Rate revenue predictability on 1-5 scale to assess business stability." },
        { key: "caixaScore", goal_prompt: "Rate cash flow issues on 1-5 scale to measure financial health." }
      ]
    },
    {
      name: "operationalIndependenceTest",
      description: "Measures how dependent the business is on the owner. Evaluates operational efficiency and automation potential.",
      profileSection: "operacional",
      steps: [
        { key: "horasSemana", goal_prompt: "Ask weekly hours dedicated to business to understand involvement level." },
        { key: "processosDocumentados", goal_prompt: "Ask if they have written processes to indicate business maturity." },
        { key: "dependenciaDoDonoScore", goal_prompt: "Rate owner replaceability on 1-5 scale to measure dependency." }
      ]
    },
    {
      name: "toolScanner",
      description: "Analyzes current tools and technology stack. Identifies opportunities for digital transformation and automation.",
      profileSection: "ferramentas",
      steps: [
        { key: "ferramentasUsadas", goal_prompt: "Ask what management tools they use to understand current tech stack." },
        { key: "canaisComunicacao", goal_prompt: "Ask customer communication channels to reveal engagement strategy." }
      ]
    },
    {
      name: "standardizationThermometer",
      description: "Evaluates product/service consistency and quality standards. Measures operational standardization.",
      profileSection: "padronizacao",
      steps: [
        { key: "consistenciaScore", goal_prompt: "Rate product/service consistency on 1-5 scale to measure quality standards." }
      ]
    },
    {
      name: "customerLoyaltyPanel",
      description: "Analyzes customer retention and loyalty metrics. Evaluates customer relationship strength and repeat business.",
      profileSection: "clientes",
      steps: [
        { key: "baseAtiva", goal_prompt: "Ask for approximate number of active customers to show customer base size." },
        { key: "frequenciaCompra", goal_prompt: "Ask how often customers buy to measure purchase frequency." },
        { key: "ticketMedio", goal_prompt: "Ask for average ticket per sale as a key revenue metric." },
        { key: "fidelizacaoPercent", goal_prompt: "Ask for percentage of returning customers to indicate loyalty." }
      ]
    },
    {
      name: "customerAcquisitionMap",
      description: "Maps customer acquisition channels and strategies. Identifies growth opportunities and marketing effectiveness.",
      profileSection: "aquisicao",
      steps: [
        { key: "canais", goal_prompt: "Ask how they get new customers to map acquisition channels." }
      ]
    },
    {
      name: "marketStrategyScanner",
      description: "Evaluates competitive positioning and strategic planning. Analyzes market awareness and innovation rate.",
      profileSection: "estrategia",
      steps: [
        { key: "diferencial", goal_prompt: "Ask how they differentiate from competition to reveal unique value proposition." },
        { key: "planosScore", goal_prompt: "Rate 12-month plan clarity on 1-5 scale to measure strategic clarity." },
        { key: "concorrenciaScore", goal_prompt: "Rate competitor monitoring on 1-5 scale to assess market awareness." },
        { key: "novosProdutosScore", goal_prompt: "Rate new product launch frequency on 1-5 scale to indicate innovation." }
      ]
    },
    {
      name: "organizationalXray",
      description: "Analyzes team structure, responsibilities, and company culture. Evaluates organizational maturity.",
      profileSection: "organizacao",
      steps: [
        { key: "equipe", goal_prompt: "Ask how many people work in the business to determine team size." },
        { key: "divisaoResponsabilidadesScore", goal_prompt: "Rate responsibility clarity on 1-5 scale to assess organizational structure." },
        { key: "culturaScore", goal_prompt: "Rate business culture/values on 1-5 scale to understand company identity." }
      ]
    },
    {
      name: "contextDiagnosis",
      description: "Comprehensive business context analysis including history, goals, and challenges. Provides overall business understanding.",
      profileSection: "contexto",
      finalAssessment: true,
      steps: [
        { key: "tempoNegocio", goal_prompt: "Ask how long they've been in business to provide historical context." },
        { key: "canalPrincipal", goal_prompt: "Ask their main sales channel to identify primary revenue stream." },
        { key: "objetivoNegocio", goal_prompt: "Ask their main business goal to clarify long-term vision." },
        { key: "desafioAtual", goal_prompt: "Ask their biggest current challenge to provide targeted advice." },
        { key: "objetivo6Meses", goal_prompt: "Ask their 6-month goals to set short-term objectives." }
      ]
    }
  ];

  /**
   * Initialize the service and knowledge base
   */
  async initialize(): Promise<void> {
    await this.embeddingService.initializeKnowledgeBase();
  }

  /**
   * Process user message and determine if it's an assessment-related request
   */
  async processMessage(userId: string, userMessage: string): Promise<{
    isAssessmentRequest: boolean;
    action: 'start_assessment' | 'process_answer' | 'general_query' | 'suggest_assessment';
    assessmentName?: string;
    input?: string;
    response?: string;
  }> {
    console.log(`🔍 Processing message: "${userMessage}" for user: ${userId}`);
    
    // Get user profile to check current assessment status
    const user = await this.db.collection<UserProfile>("user_profiles").findOne({ _id: userId });
    const currentAssessment = user?.progress?.currentAssessment;
    const currentStepIndex = user?.progress?.stepIndex || 0;

    console.log(`📊 User assessment status: current=${currentAssessment}, step=${currentStepIndex}`);

    // If user is in the middle of an assessment, process their answer
    if (currentAssessment && currentStepIndex > 0) {
      console.log(`🔄 User is in assessment: ${currentAssessment}, processing answer`);
      return {
        isAssessmentRequest: true,
        action: 'process_answer',
        input: userMessage,
        response: await this.processAssessmentAnswer(userId, userMessage, currentAssessment)
      };
    }

    // Check if user is confirming an assessment suggestion
    const lastConversation = user?.progress?.lastAssessmentSuggestion;
    if (lastConversation && this.isConfirmation(userMessage)) {
      console.log(`✅ User confirmed assessment suggestion: ${lastConversation}`);
      return {
        isAssessmentRequest: true,
        action: 'start_assessment',
        assessmentName: lastConversation,
        response: await this.startAssessment(userId, lastConversation)
      };
    }

    // Check if user wants to start an assessment using RAG
    console.log(`🤖 Checking for assessment intent using RAG...`);
    const assessmentIntent = await this.detectAssessmentIntentWithRag(userMessage);
    if (assessmentIntent) {
      console.log(`🎯 Assessment intent detected: ${assessmentIntent}`);
      // Store the suggested assessment for confirmation
      await this.db.collection<UserProfile>("user_profiles").updateOne(
        { _id: userId },
        { $set: { "progress.lastAssessmentSuggestion": assessmentIntent } }
      );
      
      // Return assessment suggestion without hardcoded text - let AI handle conversation
      return {
        isAssessmentRequest: true,
        action: 'suggest_assessment',
        assessmentName: assessmentIntent,
        response: undefined // Let AI handle the conversation
      };
    }

    console.log(`💬 No assessment intent detected, treating as general query`);
    // General query
    return {
      isAssessmentRequest: false,
      action: 'general_query'
    };
  }

  /**
   * Check if user message is a confirmation
   */
  private isConfirmation(message: string): boolean {
    const confirmations = ['sim', 'yes', 'ok', 'claro', 'quero', 'vamos', 'começar', 'start', 'go'];
    return confirmations.some(conf => message.toLowerCase().includes(conf));
  }

  /**
   * Start a new assessment via direct service call
   */
  private async startAssessment(userId: string, assessmentName: string): Promise<string> {
    try {
      const result = await this.assessmentService.startAssessment(assessmentName, userId);
      
      if (result.currentStep) {
        return result.currentStep.goal_prompt;
      }

      return `Vamos começar a análise de ${assessmentName}. Por favor, forneça as informações necessárias.`;
    } catch (error) {
      console.error('Error starting assessment:', error);
      return 'Desculpe, houve um erro ao iniciar a análise. Tente novamente.';
    }
  }

  /**
   * Process assessment answer via direct service call
   */
  private async processAssessmentAnswer(userId: string, input: string, assessmentName: string): Promise<string> {
    try {
      const result = await this.assessmentService.processAnswer(assessmentName, userId, input);
      
      if (result.status === 'completed') {
        return this.generateCompletionMessage({
          status: 'completed',
          assessmentName,
          results: result.results,
          insights: result.insights,
          progress: result.progress
        });
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
   * Detect assessment intent using RAG-based approach
   */
  private async detectAssessmentIntentWithRag(userMessage: string): Promise<string | null> {
    try {
      console.log(`🔍 RAG detection for: "${userMessage}"`);
      
      // Get assessment suggestions from the embedding service
      const suggestions = await this.embeddingService.getAssessmentSuggestions(userMessage);
      
      console.log(`📋 RAG suggestions:`, suggestions);
      
      if (suggestions.length > 0 && suggestions[0].confidence > 0.8) {
        console.log(`✅ High confidence suggestion: ${suggestions[0].suggestedAssessment} (${suggestions[0].confidence})`);
        return suggestions[0].suggestedAssessment;
      }
      
      console.log(`❌ No high confidence suggestions, trying fallback method`);
      // Fallback to cosine similarity with assessment definitions
      return await this.detectAssessmentIntent(userMessage);
    } catch (error) {
      console.error('Error in RAG-based assessment detection:', error);
      // Fallback to original method
      return await this.detectAssessmentIntent(userMessage);
    }
  }

  /**
   * Detect if user wants to start a specific assessment (fallback method)
   */
  private async detectAssessmentIntent(userMessage: string): Promise<string | null> {
    const queryVector = await this.embeddings.embedQuery(userMessage);
    
    // Create embeddings for assessment descriptions
    const assessmentTexts = this.assessmentDefinitions.map(assessment => 
      `${assessment.name}: ${assessment.description}`
    );
    
    const assessmentEmbeddings = await this.embeddings.embedDocuments(assessmentTexts);
    
    // Find the most similar assessment
    let bestMatch = null;
    let bestScore = 0;
    
    for (let i = 0; i < assessmentEmbeddings.length; i++) {
      const similarity = this.cosineSimilarity(queryVector, assessmentEmbeddings[i]);
      if (similarity > bestScore && similarity > 0.7) { // Threshold for relevance
        bestScore = similarity;
        bestMatch = this.assessmentDefinitions[i].name;
      }
    }
    
    return bestMatch;
  }

  /**
   * Generate completion message for finished assessment
   */
  private generateCompletionMessage(result: AssessmentApiResponse): string {
    const assessmentName = result.assessmentName;
    const insights = result.insights || [];
    
    let message = `✅ Análise de ${assessmentName} concluída!\n\n`;
    
    if (insights.length > 0) {
      message += "💡 Principais insights:\n";
      insights.forEach((insight: string, index: number) => {
        message += `${index + 1}. ${insight}\n`;
      });
    }
    
    return message;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Get available assessments for the AI to suggest
   */
  getAvailableAssessments(): AssessmentDefinition[] {
    return this.assessmentDefinitions;
  }
} 