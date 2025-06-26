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
export class AssessmentService {
    db;
    assessmentsMap;
    constructor(db) {
        this.db = db;
        this.assessmentsMap = {
            simulateProfit: {
                module: simulateProfit,
                profileSection: "finance",
                description: "Analyzes business profitability by calculating revenue, costs, and profit margins",
                category: "finance",
                steps: [
                    { key: "faturamentoMensal", goal_prompt: "What is your current monthly revenue? This helps us understand your business size and growth potential." },
                    { key: "custoProdutos", goal_prompt: "What is the approximate cost of your products or services (COGS)? This helps calculate your gross margin." },
                    { key: "percentualReinvestido", goal_prompt: "What percentage of your revenue do you reinvest back into the business? This shows your commitment to growth." }
                ]
            },
            financialHealthRadar: {
                module: financialHealthRadar,
                profileSection: "finance",
                description: "Evaluates financial stability through revenue predictability and cash flow management",
                category: "finance",
                steps: [
                    { key: "previsibilidadeScore", goal_prompt: "On a scale of 1 to 5, how well can you predict next month's revenue? Predictability is a sign of a stable business." },
                    { key: "caixaScore", goal_prompt: "On a scale of 1 to 5, how often do you run out of money to replenish stock? This measures your cash flow health." }
                ]
            },
            operationalIndependenceTest: {
                module: operationalIndependenceTest,
                profileSection: "operacional",
                description: "Measures how dependent the business is on the owner and identifies automation opportunities",
                category: "operations",
                steps: [
                    { key: "horasSemana", goal_prompt: "How many hours per week do you dedicate to the business? This helps understand your level of involvement." },
                    { key: "processosDocumentados", goal_prompt: "Do you have written processes or routines? This indicates business maturity." },
                    { key: "dependenciaDoDonoScore", goal_prompt: "On a scale of 1 to 5, how replaceable are you in day-to-day operations? This measures owner dependency." }
                ]
            },
            toolScanner: {
                module: toolScanner,
                profileSection: "ferramentas",
                description: "Analyzes current tools and technology stack for digital transformation opportunities",
                category: "technology",
                steps: [
                    { key: "ferramentasUsadas", goal_prompt: "What tools do you use for management (e.g., notebook, spreadsheets, app)? This helps understand your current tech stack." },
                    { key: "canaisComunicacao", goal_prompt: "What channels do you use to communicate with customers (e.g., WhatsApp, Instagram)? This reveals your customer engagement strategy." }
                ]
            },
            standardizationThermometer: {
                module: standardizationThermometer,
                profileSection: "padronizacao",
                description: "Evaluates product/service consistency and quality standards",
                category: "operations",
                steps: [
                    { key: "consistenciaScore", goal_prompt: "On a scale of 1 to 5, do your products/services always follow the same quality standard? This measures consistency." }
                ]
            },
            customerLoyaltyPanel: {
                module: customerLoyaltyPanel,
                profileSection: "clientes",
                description: "Analyzes customer retention and loyalty metrics",
                category: "customers",
                steps: [
                    { key: "baseAtiva", goal_prompt: "What is the approximate number of active customers? This shows the size of your customer base." },
                    { key: "frequenciaCompra", goal_prompt: "How often do your customers buy from you? This measures purchase frequency." },
                    { key: "ticketMedio", goal_prompt: "What is your average ticket per sale? This is a key revenue metric." },
                    { key: "fidelizacaoPercent", goal_prompt: "What is the approximate percentage of customers who return to buy again? This indicates customer loyalty." }
                ]
            },
            customerAcquisitionMap: {
                module: customerAcquisitionMap,
                profileSection: "aquisicao",
                description: "Maps customer acquisition channels and strategies",
                category: "marketing",
                steps: [
                    { key: "canais", goal_prompt: "How do you get new customers today (e.g., referrals, social media)? This maps out your acquisition channels." }
                ]
            },
            marketStrategyScanner: {
                module: marketStrategyScanner,
                profileSection: "estrategia",
                description: "Evaluates competitive positioning and strategic planning",
                category: "strategy",
                steps: [
                    { key: "diferencial", goal_prompt: "How do you differentiate yourself from the competition? This reveals your unique value proposition." },
                    { key: "planosScore", goal_prompt: "On a scale of 1 to 5, how clear are your plans for the next 12 months? This measures strategic clarity." },
                    { key: "concorrenciaScore", goal_prompt: "On a scale of 1 to 5, how well do you know and monitor your competitors? This assesses market awareness." },
                    { key: "novosProdutosScore", goal_prompt: "On a scale of 1 to 5, how often do you launch new products or services? This indicates innovation rate." }
                ]
            },
            organizationalXray: {
                module: organizationalXray,
                profileSection: "organizacao",
                description: "Analyzes team structure, responsibilities, and company culture",
                category: "organization",
                steps: [
                    { key: "equipe", goal_prompt: "How many people work in your business, including yourself? This determines team size." },
                    { key: "divisaoResponsabilidadesScore", goal_prompt: "On a scale of 1 to 5, how clear is the division of responsibilities? This assesses organizational structure." },
                    { key: "culturaScore", goal_prompt: "On a scale of 1 to 5, how would you describe the culture or values of your business? This gives insight into your company's identity." }
                ]
            },
            contextDiagnosis: {
                module: contextDiagnosis,
                profileSection: "contexto",
                description: "Comprehensive business context analysis including history, goals, and challenges",
                category: "overview",
                finalAssessment: true,
                steps: [
                    { key: "tempoNegocio", goal_prompt: "How long have you been working on this business? This provides historical context." },
                    { key: "canalPrincipal", goal_prompt: "What is your main sales channel today? This identifies your primary revenue stream." },
                    { key: "objetivoNegocio", goal_prompt: "What is your main goal with the business? This clarifies your long-term vision." },
                    { key: "desafioAtual", goal_prompt: "What is your biggest current challenge? This helps in providing targeted advice." },
                    { key: "objetivo6Meses", goal_prompt: "What would you like to achieve in the next 6 months? This sets a short-term goal." }
                ]
            }
        };
    }
    async startAssessment(assessmentName, userId, context) {
        // Validate assessment exists
        if (!this.assessmentsMap[assessmentName]) {
            throw new Error(`Unknown assessment: ${assessmentName}`);
        }
        const assessment = this.assessmentsMap[assessmentName];
        // Get or create user profile
        let user = await this.db.collection("user_profiles").findOne({ _id: userId });
        if (!user) {
            user = {
                _id: userId,
                updatedAt: new Date(),
                progress: { currentAssessment: null, stepIndex: 0, answers: {} },
                profile: {}
            };
            await this.db.collection("user_profiles").insertOne(user);
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
        await this.db.collection("user_profiles").updateOne({ _id: userId }, { $set: { progress, updatedAt: new Date() } });
        return {
            status: 'started',
            currentStep: assessment.steps[0],
            progress: { current: 0, total: assessment.steps.length }
        };
    }
    async processAnswer(assessmentName, userId, answer, stepKey) {
        // Validate assessment exists
        if (!this.assessmentsMap[assessmentName]) {
            throw new Error(`Unknown assessment: ${assessmentName}`);
        }
        const assessment = this.assessmentsMap[assessmentName];
        // Get user profile
        const user = await this.db.collection("user_profiles").findOne({ _id: userId });
        if (!user || !user.progress || user.progress.currentAssessment !== assessmentName) {
            throw new Error(`No active assessment: ${assessmentName} for user: ${userId}`);
        }
        let currentStepIndex = user.progress.stepIndex || 0;
        let answers = user.progress.answers || {};
        // Determine which step to process
        let targetStepKey = stepKey;
        if (!targetStepKey) {
            if (currentStepIndex > 0) {
                // Get the previous step that was just answered
                targetStepKey = assessment.steps[currentStepIndex - 1].key;
            }
            else {
                // If we're at step 0, this might be a confirmation to start the assessment
                // In this case, we should start with the first step
                currentStepIndex = 0;
                targetStepKey = assessment.steps[0].key;
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
        await this.db.collection("user_profiles").updateOne({ _id: userId }, { $set: { "progress.stepIndex": currentStepIndex, "progress.answers": answers, updatedAt: new Date() } });
        // Check if assessment is complete
        if (currentStepIndex >= assessment.steps.length) {
            // Run the assessment analysis
            const result = await assessment.module.runAssessment(userId, answers, this.db, user);
            // Update user profile
            await updateUserProfileSection(userId, assessment.profileSection, result, this.db);
            // Calculate new scores
            const scoringService = new ScoringService();
            const updatedUser = await this.db.collection("user_profiles").findOne({ _id: userId });
            let newScores;
            if (updatedUser) {
                newScores = scoringService.calculateOverallScore(updatedUser.profile);
                await this.db.collection("user_profiles").updateOne({ _id: userId }, { $set: { scoring: newScores, "progress.currentAssessment": null, "progress.stepIndex": 0, "progress.answers": {} } });
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
    async getStatus(assessmentName, userId) {
        // Validate assessment exists
        if (!this.assessmentsMap[assessmentName]) {
            throw new Error(`Unknown assessment: ${assessmentName}`);
        }
        const assessment = this.assessmentsMap[assessmentName];
        // Get user profile
        const user = await this.db.collection("user_profiles").findOne({ _id: userId });
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
    async listAssessments() {
        return Object.entries(this.assessmentsMap).map(([name, assessment]) => ({
            name,
            description: assessment.description,
            category: assessment.category,
            steps: assessment.steps.length
        }));
    }
}
//# sourceMappingURL=assessment.service.js.map