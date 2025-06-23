import { Db } from "mongodb";
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
import { updateUserProfileSection } from "./profile.service.js";
import { UserProfile } from "../types/profile.js";
import { ScoringService } from "./scoring.service.js";

const assessmentsMap: Record<string, { 
  module: any; 
  profileSection: keyof UserProfile["profile"];
  steps: { key: string; goal_prompt: string; }[];
  finalAssessment?: boolean;
}> = {
  simulateProfit: { 
    module: simulateProfit, 
    profileSection: "finance",
    steps: [
      { key: "faturamentoMensal", goal_prompt: "Your goal is to ask the user for their current monthly revenue. Briefly explain that this metric is crucial for understanding the business's current size and growth potential. Phrase the question naturally and conversationally." },
      { key: "custoProdutos", goal_prompt: "Now, ask for the approximate cost of their products or services (COGS). Explain that knowing this helps calculate their gross margin, a key indicator of profitability." },
      { key: "percentualReinvestido", goal_prompt: "Finally, ask what percentage of the revenue they reinvest back into the business. Explain that this shows their commitment to growth." },
    ]
  },
  financialHealthRadar: { 
    module: financialHealthRadar, 
    profileSection: "finance",
    steps: [
      { key: "previsibilidadeScore", goal_prompt: "Ask the user to rate, on a scale of 1 to 5, how well they can predict next month's revenue. Explain that predictability is a sign of a stable business." },
      { key: "caixaScore", goal_prompt: "On a scale of 1 to 5, ask how often they run out of money to replenish stock. Explain that this measures their cash flow health." },
    ]
  },
  operationalIndependenceTest: {
    module: operationalIndependenceTest,
    profileSection: "operacional",
    steps: [
      { key: "horasSemana", goal_prompt: "Ask the user how many hours per week they dedicate to the business. This helps understand their level of involvement." },
      { key: "processosDocumentados", goal_prompt: "Ask if they have written processes or routines. This indicates business maturity." },
      { key: "dependenciaDoDonoScore", goal_prompt: "On a scale of 1 to 5, ask how replaceable they are in the day-to-day operations. This measures owner dependency." }
    ]
  },
  toolScanner: {
    module: toolScanner,
    profileSection: "ferramentas",
    steps: [
      { key: "ferramentasUsadas", goal_prompt: "Ask what tools they use for management (e.g., notebook, spreadsheets, app). This helps understand their current tech stack." },
      { key: "canaisComunicacao", goal_prompt: "Ask what channels they use to communicate with customers (e.g., WhatsApp, Instagram). This reveals their customer engagement strategy." }
    ]
  },
  standardizationThermometer: {
    module: standardizationThermometer,
    profileSection: "padronizacao",
    steps: [
      { key: "consistenciaScore", goal_prompt: "On a scale of 1 to 5, ask if their products/services always follow the same quality standard. This measures consistency." }
    ]
  },
  customerLoyaltyPanel: {
    module: customerLoyaltyPanel,
    profileSection: "clientes",
    steps: [
      { key: "baseAtiva", goal_prompt: "Ask for the approximate number of active customers. This shows the size of their customer base." },
      { key: "frequenciaCompra", goal_prompt: "Ask how often their customers buy from them. This measures purchase frequency." },
      { key: "ticketMedio", goal_prompt: "Ask for their average ticket per sale. This is a key revenue metric." },
      { key: "fidelizacaoPercent", goal_prompt: "Ask for the approximate percentage of customers who return to buy again. This indicates customer loyalty." }
    ]
  },
  customerAcquisitionMap: {
    module: customerAcquisitionMap,
    profileSection: "aquisicao",
    steps: [
      { key: "canais", goal_prompt: "Ask how they get new customers today (e.g., referrals, social media). This maps out their acquisition channels." }
    ]
  },
  marketStrategyScanner: {
    module: marketStrategyScanner,
    profileSection: "estrategia",
    steps: [
      { key: "diferencial", goal_prompt: "Ask how they differentiate themselves from the competition. This reveals their unique value proposition." },
      { key: "planosScore", goal_prompt: "On a scale of 1 to 5, ask how clear their plans are for the next 12 months. This measures strategic clarity." },
      { key: "concorrenciaScore", goal_prompt: "On a scale of 1 to 5, ask how well they know and monitor their competitors. This assesses market awareness." },
      { key: "novosProdutosScore", goal_prompt: "On a scale of 1 to 5, ask how often they launch new products or services. This indicates innovation rate." }
    ]
  },
  organizationalXray: {
    module: organizationalXray,
    profileSection: "organizacao",
    steps: [
      { key: "equipe", goal_prompt: "Ask how many people work in their business, including themselves. This determines team size." },
      { key: "divisaoResponsabilidadesScore", goal_prompt: "On a scale of 1 to 5, ask how clear the division of responsibilities is. This assesses organizational structure." },
      { key: "culturaScore", goal_prompt: "On a scale of 1 to 5, ask them to describe the culture or values of their business. This gives insight into their company's identity." }
    ]
  },
  contextDiagnosis: {
    module: contextDiagnosis,
    profileSection: "contexto",
    steps: [
        { key: "tempoNegocio", goal_prompt: "Ask how long they have been working on this business. This provides historical context." },
        { key: "canalPrincipal", goal_prompt: "Ask what their main sales channel is today. This identifies their primary revenue stream." },
        { key: "objetivoNegocio", goal_prompt: "Ask what their main goal is with the business. This clarifies their long-term vision." },
        { key: "desafioAtual", goal_prompt: "Ask what their biggest current challenge is. This helps in providing targeted advice." },
        { key: "objetivo6Meses", goal_prompt: "Ask what they would like to achieve in the next 6 months. This sets a short-term goal." },
    ],
    finalAssessment: true,
  }
};

const assessmentOrder = [
  "simulateProfit",
  "financialHealthRadar",
  "operationalIndependenceTest",
  "toolScanner",
  "standardizationThermometer",
  "customerLoyaltyPanel",
  "customerAcquisitionMap",
  "marketStrategyScanner",
  "organizationalXray",
  "contextDiagnosis",
];

export async function processAssessment(userId: string, db: Db, assessmentName?: string, input?: any): Promise<any> {
  let user = await db.collection<UserProfile>("user_profiles").findOne({ _id: userId });

  if (!user) {
    user = {
      _id: userId, updatedAt: new Date(), progress: { currentAssessment: null, stepIndex: 0, answers: {} }, profile: {}
    };
    await db.collection<UserProfile>("user_profiles").insertOne(user as any);
  }

  // Case 1: Starting a new assessment
  if (assessmentName) {
    user.progress = { currentAssessment: assessmentName, stepIndex: 0, answers: {} };
    // Fall through to ask the first question
  }

  const currentAssessmentName = user.progress?.currentAssessment;
  if (!currentAssessmentName) {
    return { message: "No active assessment." };
  }

  const assessment = assessmentsMap[currentAssessmentName];
  let currentStepIndex = user.progress?.stepIndex ?? 0;
  let answers = user.progress?.answers ?? {};

  // Case 2: Processing an answer for the previous step
  if (input !== undefined && currentStepIndex > 0) {
    const previousStep = assessment.steps[currentStepIndex - 1];
    answers[previousStep.key] = input;
  }
  
  // Update progress in DB before deciding next action
  await db.collection<UserProfile>("user_profiles").updateOne(
    { _id: userId },
    { $set: { "progress.currentAssessment": currentAssessmentName, "progress.stepIndex": currentStepIndex, "progress.answers": answers, updatedAt: new Date() } }
  );

  // Case 3: More steps remaining, return the goal for the next question
  if (currentStepIndex < assessment.steps.length) {
    return { current_step_goal: assessment.steps[currentStepIndex] };
  }

  // Case 4: Assessment is complete
  const result = await assessment.module.runAssessment(userId, answers, db, user);
  await updateUserProfileSection(userId, assessment.profileSection, result, db);
  
  const scoringService = new ScoringService();
  const updatedUser = await db.collection<UserProfile>("user_profiles").findOne({ _id: userId });
  let newScores;
  if (updatedUser) {
    newScores = scoringService.calculateOverallScore(updatedUser.profile);
    await db.collection<UserProfile>("user_profiles").updateOne(
      { _id: userId },
      { $set: { scoring: newScores, "progress.currentAssessment": null, "progress.stepIndex": 0, "progress.answers": {} } } // Reset progress
    );
  }

  // Return a structured result for the AI to interpret, not a hardcoded message
  return { 
    status: "completed",
    assessmentName: currentAssessmentName,
    isFinalAssessment: assessment.finalAssessment || false,
    results: result,
    scoring: newScores 
  };
}

export async function startAssessmentByName(userId: string, assessmentName: string, db: Db): Promise<any> {
  if (!assessmentOrder.includes(assessmentName)) {
    throw new Error(`Unknown or invalid assessment name: ${assessmentName}`);
  }

  // Update user's progress to start the new assessment
  await db.collection<UserProfile>("user_profiles").updateOne(
    { _id: userId },
    {
      $set: {
        "progress.currentAssessment": assessmentName,
        "progress.stepIndex": 0, // Start from the beginning
        updatedAt: new Date(),
      },
    },
    { upsert: true } 
  );

  const assessmentEntry = assessmentsMap[assessmentName];
  if (assessmentEntry.module.getFirstPrompt) {
    // Assuming assessments can export a function to get the initial prompt
    return assessmentEntry.module.getFirstPrompt();
  }

  // Fallback prompt if the module doesn't have a specific first prompt
  return { prompt: `Ok, vamos começar a análise de ${assessmentName}. Por favor, forneça as informações necessárias.` };
} 