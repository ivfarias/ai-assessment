import { Db } from "mongodb";
import { UserProfile } from "../types/profile.js";
import { updateUserProfileSection } from "./profile.service.js";
import { ScoringService } from "./scoring.service.js";

// Import all assessment modules
import * as simulateProfit from "./assessments/simulateProfit.js";
import * as financialHealthRadar from "./assessments/financialHealthRadar.js";
import * as operationalIndependenceTest from "./assessments/operationalIndependenceTest.js";
import * as toolScanner from "./assessments/toolScanner.js";
import * as standardizationThermometer from "./assessments/standardizationThermometer.js";
import * as customerLoyaltyPanel from "./assessments/customerLoyaltyPanel.js";
import * as customerAcquisitionMap from "./assessments/customerAcquisitionMap.js";
import * as marketStrategyScanner from "./assessments/marketStrategyScanner.js";
import * as organizationalXray from "./assessments/organizationalXray.js";
import * as contextDiagnosis from "./assessments/contextDiagnosis.js";

interface AssessmentStep {
  key: string;
  goal_prompt: string;
  expected_type?: 'number' | '1-5' | 'text';
  examples?: string[];
}

interface AssessmentDefinition {
  module: any;
  profileSection: keyof UserProfile["profile"];
  steps: AssessmentStep[];
  finalAssessment?: boolean;
  description: string;
  category: string;
}

interface AssessmentResult {
  status: 'started' | 'in_progress' | 'completed';
  currentStep?: AssessmentStep;
  nextStep?: AssessmentStep;
  progress: { current: number; total: number };
  results?: any;
  insights?: string[];
}

export class AssessmentService {
  private db: Db;
  private assessmentsMap: Record<string, AssessmentDefinition>;

  constructor(db: Db) {
    this.db = db;
    this.assessmentsMap = {
      simulateProfit: {
        module: simulateProfit,
        profileSection: "finance",
        description: "Analyzes business profitability by calculating revenue, costs, and profit margins",
        category: "finance",
        steps: [
          { key: "faturamentoMensal", goal_prompt: "Qual é sua receita mensal atual? Isso nos ajuda a entender o tamanho do seu negócio e potencial de crescimento." },
          { key: "custoProdutos", goal_prompt: "Qual é o custo aproximado dos seus produtos ou serviços (CPV)? Isso ajuda a calcular sua margem bruta." },
          { key: "percentualReinvestido", goal_prompt: "Que porcentagem da sua receita você reinveste no negócio? Isso mostra seu compromisso com o crescimento." }
        ]
      },
      financialHealthRadar: {
        module: financialHealthRadar,
        profileSection: "finance",
        description: "Evaluates financial stability through revenue predictability and cash flow management",
        category: "finance",
        steps: [
          { key: "previsibilidadeScore", goal_prompt: "Em uma escala de 1 a 5, quão bem você consegue prever a receita do próximo mês? Previsibilidade é um sinal de um negócio estável." },
          { key: "caixaScore", goal_prompt: "Em uma escala de 1 a 5, com que frequência você fica sem dinheiro para repor o estoque? Isso mede a saúde do seu fluxo de caixa." }
        ]
      },
      operationalIndependenceTest: {
        module: operationalIndependenceTest,
        profileSection: "operacional",
        description: "Measures how dependent the business is on the owner and identifies automation opportunities",
        category: "operations",
        steps: [
          { key: "horasSemana", goal_prompt: "Quantas horas por semana você dedica ao negócio? Isso ajuda a entender seu nível de envolvimento." },
          { key: "processosDocumentados", goal_prompt: "Você tem processos ou rotinas escritas? Isso indica maturidade do negócio." },
          { key: "dependenciaDoDonoScore", goal_prompt: "Em uma escala de 1 a 5, quão substituível você é nas operações do dia a dia? Isso mede a dependência do proprietário." }
        ]
      },
      toolScanner: {
        module: toolScanner,
        profileSection: "ferramentas",
        description: "Analyzes current tools and technology stack for digital transformation opportunities",
        category: "technology",
        steps: [
          { key: "ferramentasUsadas", goal_prompt: "Que ferramentas você usa para gestão (ex: caderno, planilhas, aplicativo)? Isso ajuda a entender sua stack tecnológica atual." },
          { key: "canaisComunicacao", goal_prompt: "Que canais você usa para se comunicar com clientes (ex: WhatsApp, Instagram)? Isso revela sua estratégia de engajamento com clientes." }
        ]
      },
      standardizationThermometer: {
        module: standardizationThermometer,
        profileSection: "padronizacao",
        description: "Evaluates product/service consistency and quality standards",
        category: "operations",
        steps: [
          { key: "consistenciaScore", goal_prompt: "Em uma escala de 1 a 5, seus produtos/serviços sempre seguem o mesmo padrão de qualidade? Isso mede a consistência." }
        ]
      },
      customerLoyaltyPanel: {
        module: customerLoyaltyPanel,
        profileSection: "clientes",
        description: "Analyzes customer retention and loyalty metrics",
        category: "customers",
        steps: [
          { key: "baseAtiva", goal_prompt: "Qual é o número aproximado de clientes ativos? Isso mostra o tamanho da sua base de clientes." },
          { key: "frequenciaCompra", goal_prompt: "Com que frequência seus clientes compram de você? Isso mede a frequência de compra." },
          { key: "ticketMedio", goal_prompt: "Qual é seu ticket médio por venda? Esta é uma métrica chave de receita." },
          { key: "fidelizacaoPercent", goal_prompt: "Qual é a porcentagem aproximada de clientes que retornam para comprar novamente? Isso indica a fidelização de clientes." }
        ]
      },
      customerAcquisitionMap: {
        module: customerAcquisitionMap,
        profileSection: "aquisicao",
        description: "Maps customer acquisition channels and strategies",
        category: "marketing",
        steps: [
          { key: "canais", goal_prompt: "Como você consegue novos clientes hoje (ex: indicações, redes sociais)? Isso mapeia seus canais de aquisição." }
        ]
      },
      marketStrategyScanner: {
        module: marketStrategyScanner,
        profileSection: "estrategia",
        description: "Evaluates competitive positioning and strategic planning",
        category: "strategy",
        steps: [
          { key: "diferencial", goal_prompt: "Como você se diferencia da concorrência? Isso revela sua proposta de valor única." },
          { key: "planosScore", goal_prompt: "Em uma escala de 1 a 5, quão claros são seus planos para os próximos 12 meses? Isso mede a clareza estratégica." },
          { key: "concorrenciaScore", goal_prompt: "Em uma escala de 1 a 5, quão bem você conhece e monitora seus concorrentes? Isso avalia a consciência de mercado." },
          { key: "novosProdutosScore", goal_prompt: "Em uma escala de 1 a 5, com que frequência você lança novos produtos ou serviços? Isso indica a taxa de inovação." }
        ]
      },
      organizationalXray: {
        module: organizationalXray,
        profileSection: "organizacao",
        description: "Analyzes team structure, responsibilities, and company culture",
        category: "organization",
        steps: [
          { key: "equipe", goal_prompt: "Quantas pessoas trabalham no seu negócio, incluindo você? Isso determina o tamanho da equipe." },
          { key: "divisaoResponsabilidadesScore", goal_prompt: "Em uma escala de 1 a 5, quão clara é a divisão de responsabilidades? Isso avalia a estrutura organizacional." },
          { key: "culturaScore", goal_prompt: "Em uma escala de 1 a 5, como você descreveria a cultura ou valores do seu negócio? Isso dá insight sobre a identidade da sua empresa." }
        ]
      },
      contextDiagnosis: {
        module: contextDiagnosis,
        profileSection: "contexto",
        description: "Comprehensive business context analysis including history, goals, and challenges",
        category: "overview",
        finalAssessment: true,
        steps: [
          { key: "tempoNegocio", goal_prompt: "Há quanto tempo você trabalha neste negócio? Isso fornece contexto histórico." },
          { key: "canalPrincipal", goal_prompt: "Qual é seu principal canal de vendas hoje? Isso identifica sua principal fonte de receita." },
          { key: "objetivoNegocio", goal_prompt: "Qual é seu principal objetivo com o negócio? Isso esclarece sua visão de longo prazo." },
          { key: "desafioAtual", goal_prompt: "Qual é seu maior desafio atual? Isso ajuda a fornecer conselhos direcionados." },
          { key: "objetivo6Meses", goal_prompt: "O que você gostaria de alcançar nos próximos 6 meses? Isso define uma meta de curto prazo." }
        ]
      }
    };
  }

  async startAssessment(assessmentName: string, userId: string, context?: any): Promise<AssessmentResult> {
    // Validate assessment exists
    if (!this.assessmentsMap[assessmentName]) {
      throw new Error(`Unknown assessment: ${assessmentName}`);
    }

    const assessment = this.assessmentsMap[assessmentName];

    // Get or create user profile
    let user = await this.db.collection<UserProfile>("user_profiles").findOne({ _id: userId });
    if (!user) {
      user = {
        _id: userId,
        updatedAt: new Date(),
        progress: { currentAssessment: null, stepIndex: 0, answers: {} },
        profile: {}
      };
      await this.db.collection<UserProfile>("user_profiles").insertOne(user as any);
    }

    // Guard: If already in progress for this assessment, return in_progress status
    if (user?.progress?.currentAssessment === assessmentName) {
      return {
        status: 'in_progress',
        currentStep: assessment.steps[user.progress.stepIndex || 0],
        progress: { current: user.progress.stepIndex || 0, total: assessment.steps.length }
      };
    }

    // Start the assessment
    const progress = {
      currentAssessment: assessmentName,
      stepIndex: 0,
      answers: {}
    };

    await this.db.collection<UserProfile>("user_profiles").updateOne(
      { _id: userId },
      { $set: { progress, updatedAt: new Date() } }
    );

    return {
      status: 'started',
      currentStep: assessment.steps[0],
      progress: { current: 0, total: assessment.steps.length }
    };
  }

  async processAnswer(assessmentName: string, userId: string, answer: string, stepKey?: string): Promise<AssessmentResult> {
    // Validate assessment exists
    if (!this.assessmentsMap[assessmentName]) {
      throw new Error(`Unknown assessment: ${assessmentName}`);
    }

    const assessment = this.assessmentsMap[assessmentName];

    // Get user profile
    const user = await this.db.collection<UserProfile>("user_profiles").findOne({ _id: userId });
    if (!user || !user.progress || user.progress.currentAssessment !== assessmentName) {
      throw new Error(`No active assessment: ${assessmentName} for user: ${userId}`);
    }

    let currentStepIndex = user.progress.stepIndex || 0;
    let answers = user.progress.answers || {};

    // Determine which step to process
    let targetStepKey = stepKey;
    if (!targetStepKey) {
      // If no stepKey provided, use the current step
      if (currentStepIndex < assessment.steps.length) {
        targetStepKey = assessment.steps[currentStepIndex].key;
      } else {
        throw new Error('Assessment already completed');
      }
    }

    if (!targetStepKey) {
      throw new Error('Invalid step: No step key provided and no current step');
    }

    // Find the step index
    const stepIndex = assessment.steps.findIndex(step => step.key === targetStepKey);
    if (stepIndex === -1) {
      throw new Error(`Invalid step: ${targetStepKey}`);
    }

    // Process the answer
    answers[targetStepKey] = answer;
    currentStepIndex = stepIndex + 1;

    // Update progress
    await this.db.collection<UserProfile>("user_profiles").updateOne(
      { _id: userId },
      { $set: { "progress.stepIndex": currentStepIndex, "progress.answers": answers, updatedAt: new Date() } }
    );

    // Check if assessment is complete
    if (currentStepIndex >= assessment.steps.length) {
      // Run the assessment analysis
      const result = await assessment.module.runAssessment(userId, answers, this.db, user);
      
      // Update user profile
      await updateUserProfileSection(userId, assessment.profileSection, result, this.db);
      
      // Calculate new scores
      const scoringService = new ScoringService();
      const updatedUser = await this.db.collection<UserProfile>("user_profiles").findOne({ _id: userId });
      let newScores;
      if (updatedUser) {
        newScores = scoringService.calculateOverallScore(updatedUser.profile);
        await this.db.collection<UserProfile>("user_profiles").updateOne(
          { _id: userId },
          { $set: { scoring: newScores, "progress.currentAssessment": null, "progress.stepIndex": 0, "progress.answers": {} } }
        );
      }

      return {
        status: 'completed',
        progress: { current: assessment.steps.length, total: assessment.steps.length },
        results: result,
        insights: result.insights || []
      };
    }

    // Return next step
    return {
      status: 'in_progress',
      nextStep: assessment.steps[currentStepIndex],
      progress: { current: currentStepIndex, total: assessment.steps.length }
    };
  }

  async getStatus(assessmentName: string, userId: string): Promise<{
    status: string;
    currentStep?: AssessmentStep;
    progress: { current: number; total: number };
    answers: any;
  }> {
    // Validate assessment exists
    if (!this.assessmentsMap[assessmentName]) {
      throw new Error(`Unknown assessment: ${assessmentName}`);
    }

    const assessment = this.assessmentsMap[assessmentName];

    // Get user profile
    const user = await this.db.collection<UserProfile>("user_profiles").findOne({ _id: userId });
    if (!user || !user.progress || user.progress.currentAssessment !== assessmentName) {
      throw new Error(`No active assessment: ${assessmentName} for user: ${userId}`);
    }

    const currentStepIndex = user.progress.stepIndex || 0;
    const answers = user.progress.answers || {};

    if (currentStepIndex >= assessment.steps.length) {
      return {
        status: 'completed',
        progress: { current: assessment.steps.length, total: assessment.steps.length },
        answers
      };
    }

    return {
      status: 'in_progress',
      currentStep: assessment.steps[currentStepIndex],
      progress: { current: currentStepIndex, total: assessment.steps.length },
      answers
    };
  }

  async listAssessments(): Promise<Array<{
    name: string;
    description: string;
    category: string;
    steps: number;
  }>> {
    return Object.entries(this.assessmentsMap).map(([name, assessment]) => ({
      name,
      description: assessment.description,
      category: assessment.category,
      steps: assessment.steps.length
    }));
  }
} 