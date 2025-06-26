import { tools } from '../tools/definitions.js';
import { AssessmentRagService } from './assessmentRagService.js';
import { getDb } from '../config/mongodb.js';
/**
 * Service responsible for generating AI-powered responses using OpenAI
 */
export default class CompletionService {
    openAIService;
    assessmentRagService;
    constructor(openAIService) {
        this.openAIService = openAIService;
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
    async generateContextualResponse({ query, context, vectorResults, historySummary, messages = [], }) {
        const vectorContext = this.formatVectorResults(vectorResults);
        // Get assessment information for context
        const availableAssessments = this.assessmentRagService.getAvailableAssessments();
        const assessmentInfo = availableAssessments.map(a => `${a.name} (${a.category}): ${a.description}`).join('\n');
        const systemMessage = {
            role: 'system',
            content: `${process.env.SYSTEM_PROMPT || `You are "Kyte AI", a specialist business assistant for small and micro-business owners in Brazil. Your personality is encouraging, practical, and extremely helpful. You are a coach, not just a search engine.

Core Mission:
Help small business owners grow their businesses by providing clear, actionable advice and guiding them through relevant business assessments.

Assessment Strategy:
You have access to 10 different business assessments that analyze various aspects of a business:
- simulateProfit: Analyzes profitability and margins
- financialHealthRadar: Evaluates financial stability and cash flow
- operationalIndependenceTest: Measures business dependency on the owner
- toolScanner: Analyzes current tools and technology stack
- standardizationThermometer: Evaluates product/service consistency
- customerLoyaltyPanel: Analyzes customer retention and loyalty
- customerAcquisitionMap: Maps customer acquisition channels
- marketStrategyScanner: Evaluates competitive positioning
- organizationalXray: Analyzes team structure and culture
- contextDiagnosis: Comprehensive business context analysis

Your Approach:
1. **Active Listening**: Pay attention to what users share about their business challenges, goals, and situations
2. **Proactive Suggestions**: When you identify business needs or improvement opportunities, naturally suggest relevant assessments
3. **Contextual Recommendations**: Base your suggestions on their specific situation, business stage, and what you've learned about them
4. **Natural Presentation**: Present assessments as helpful tools, not tests. Use phrases like "Que tal fazermos uma análise específica do seu negócio?"
5. **Adaptive Learning**: Use their business stage (Momento Sobrevivência, Organização, Crescimento) to tailor your approach

When to Suggest Assessments:
- When users mention business challenges or problems
- When they ask for help improving specific areas
- When they express growth goals or ambitions
- When you identify gaps in their business understanding
- When they're new and need guidance on where to start

How to Present Assessments:
Offer them naturally in conversation, highlighting why they're relevant to their specific situation. For example:
"Baseado no que você me contou sobre [their specific challenge], acho que uma análise de [specific assessment] pode te ajudar muito. Que tal fazermos isso?"

Use the assessment tools when users want to:
- Start a specific assessment (use start_assessment)
- Answer assessment questions (use process_assessment_answer)
- Get assessment suggestions (use suggest_assessment)

Always maintain natural conversation flow and be genuinely helpful.`}

Available Business Assessments:
${assessmentInfo}

You can help users with business analysis by:
1. Having natural conversations about their business
2. Proactively suggesting relevant assessments based on their needs
3. Starting assessments when users want to do them
4. Processing assessment answers and providing insights

Use the assessment tools when users want to:
- Start a specific assessment (use start_assessment)
- Answer assessment questions (use process_assessment_answer)
- Get assessment suggestions (use suggest_assessment)

Always maintain natural conversation flow and be proactive in helping their business grow.`,
        };
        let userMessages = [];
        if (query) {
            // Determine if this is a simple greeting to reduce context
            const isSimpleGreeting = this.isSimpleGreeting(query);
            let content;
            if (isSimpleGreeting) {
                content = `User Query: "${query}"`;
            }
            else {
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
        const allMessages = [
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
    convertMessagesToOpenAIFormat(messages) {
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
                }
                else if (type === 'ai') {
                    return { role: 'assistant', content: message.content };
                }
                else if (type === 'system') {
                    return { role: 'system', content: message.content };
                }
                else if (type === 'tool') {
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
    async handleAssessmentSuggestion(args) {
        const { user_id, user_query } = args;
        try {
            // Get available assessments
            const availableAssessments = this.assessmentRagService.getAvailableAssessments();
            // Create a simple, clean assessment menu
            const assessmentMenu = availableAssessments.map(a => `• **${a.name}**: ${a.description}`).join('\n');
            return `🎯 Que tal fazermos uma análise específica do seu negócio? Tenho várias opções que podem te ajudar:

📊 **Análises Disponíveis:**
${assessmentMenu}

💡 **Dica**: Baseado no que você me contou, posso recomendar as análises mais relevantes para sua situação. Qual área você gostaria de melhorar primeiro? 🤔`;
        }
        catch (error) {
            console.error('Error handling assessment suggestion:', error);
            return 'Desculpe, houve um erro ao sugerir análises. Pode me contar mais sobre o que você gostaria de melhorar no seu negócio?';
        }
    }
    /**
     * Detect direct assessment requests by name (fallback method)
     */
    detectDirectAssessmentRequest(userQuery) {
        const lowerQuery = userQuery.toLowerCase();
        // Map common terms to assessment names
        const assessmentMap = {
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
    async handleStartAssessment(args) {
        const { assessment_name, user_id } = args;
        try {
            const result = await this.assessmentRagService.startAssessment(user_id, assessment_name);
            if (result.success && result.currentStep) {
                return result.currentStep;
            }
            else {
                return `Desculpe, não foi possível iniciar a análise "${assessment_name}". ${result.error || 'Tente novamente.'}`;
            }
        }
        catch (error) {
            console.error('Error starting assessment:', error);
            return 'Desculpe, houve um erro ao iniciar a análise. Tente novamente.';
        }
    }
    /**
     * Handle processing an assessment answer
     */
    async handleProcessAssessmentAnswer(args) {
        const { user_id, input } = args;
        try {
            const result = await this.assessmentRagService.processAssessmentAnswer(user_id, input);
            if (result.success) {
                if (result.completed) {
                    return `✅ Análise concluída!\n\n💡 Principais insights:\n${result.insights?.map((insight, i) => `${i + 1}. ${insight}`).join('\n') || 'Análise concluída com sucesso.'}`;
                }
                else if (result.nextStep) {
                    return result.nextStep;
                }
                else {
                    return 'Por favor, continue respondendo as perguntas da análise.';
                }
            }
            else {
                return `Desculpe, houve um erro ao processar sua resposta. ${result.error || 'Tente novamente.'}`;
            }
        }
        catch (error) {
            console.error('Error processing assessment answer:', error);
            return 'Desculpe, houve um erro ao processar sua resposta. Tente novamente.';
        }
    }
    /**
     * Formats vector results into a readable string
     */
    formatVectorResults(results) {
        return results.map((result, index) => `${index + 1}. ${result.text}`).join('\n');
    }
    /**
     * Determines if a query is a simple greeting
     */
    isSimpleGreeting(query) {
        const greetingKeywords = [
            'olá', 'oi', 'hello', 'hi', 'hey', 'bom dia', 'good morning', 'boa tarde',
            'good afternoon', 'boa noite', 'good evening', 'tudo bem', 'how are you'
        ];
        const lowerQuery = query.toLowerCase().trim();
        return greetingKeywords.some(keyword => lowerQuery === keyword || lowerQuery.startsWith(keyword + ' '));
    }
}
//# sourceMappingURL=completion.service.js.map