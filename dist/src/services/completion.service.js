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
        const systemMessage = {
            role: 'system',
            content: process.env.SYSTEM_PROMPT,
        };
        let userMessages = [];
        if (query) {
            // Determine if this is a simple greeting to reduce context
            const isSimpleGreeting = this.isSimpleGreeting(query);
            const isAssessmentQuery = this.isAssessmentRelatedQuery(query);
            let content;
            if (isSimpleGreeting) {
                // For simple greetings, provide minimal context
                content = `User Query: "${query}"`;
            }
            else if (isAssessmentQuery) {
                // For assessment queries, focus on assessment context
                content = [
                    `User Query: "${query}"`,
                    `User Profile Context: ${JSON.stringify(context, null, 2)}`,
                    '',
                    'Conversation Summary:',
                    historySummary,
                    '',
                    'Relevant business context:',
                    vectorContext,
                ].join('\n');
            }
            else {
                // For other queries, provide full context
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
                // Skip tool messages immediately
                if (message.role === 'tool') {
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
                    // Skip tool messages
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
    async handleStartAssessment(args) {
        const { assessment_name, user_id } = args;
        try {
            const result = await this.assessmentRagService.assessmentService.startAssessment(assessment_name, user_id);
            if (result.currentStep) {
                return result.currentStep.goal_prompt;
            }
            return `Vamos começar a análise de ${assessment_name}. Por favor, forneça as informações necessárias.`;
        }
        catch (error) {
            console.error('Error starting assessment:', error);
            return 'Desculpe, houve um erro ao iniciar a análise. Tente novamente.';
        }
    }
    /**
     * Handle processing assessment answers using the AssessmentService directly
     */
    async handleProcessAssessmentAnswer(args) {
        const { user_id, input } = args;
        try {
            // Get the current assessment from user profile
            const user = await getDb().collection("user_profiles").findOne({ _id: user_id });
            const currentAssessment = user?.progress?.currentAssessment;
            const currentStepIndex = user?.progress?.stepIndex || 0;
            if (!currentAssessment) {
                return 'Não há uma análise ativa no momento.';
            }
            // If stepIndex is 0, the user hasn't started answering questions yet
            // This might be a greeting or confirmation, not an actual answer
            if (currentStepIndex === 0) {
                // Check if this looks like a confirmation to start the assessment
                const isConfirmation = this.isConfirmation(input);
                if (isConfirmation) {
                    // Start the assessment properly
                    const result = await this.assessmentRagService.assessmentService.startAssessment(currentAssessment, user_id);
                    if (result.currentStep) {
                        return result.currentStep.goal_prompt;
                    }
                }
                else {
                    // If it's not a confirmation, just ask the first question
                    const result = await this.assessmentRagService.assessmentService.getStatus(currentAssessment, user_id);
                    if (result.currentStep) {
                        return result.currentStep.goal_prompt;
                    }
                }
            }
            // Process the actual answer
            const result = await this.assessmentRagService.assessmentService.processAnswer(currentAssessment, user_id, input);
            if (result.status === 'completed') {
                let message = `✅ Análise de ${currentAssessment} concluída!\n\n`;
                if (result.insights && result.insights.length > 0) {
                    message += "💡 Principais insights:\n";
                    result.insights.forEach((insight, index) => {
                        message += `${index + 1}. ${insight}\n`;
                    });
                }
                return message;
            }
            if (result.nextStep) {
                return result.nextStep.goal_prompt;
            }
            return 'Por favor, continue respondendo as perguntas da análise.';
        }
        catch (error) {
            console.error('Error processing assessment answer:', error);
            return 'Desculpe, houve um erro ao processar sua resposta. Tente novamente.';
        }
    }
    /**
     * Determines if a message is a confirmation to start an assessment
     */
    isConfirmation(message) {
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
    /**
     * Determines if a query is assessment-related
     */
    isAssessmentRelatedQuery(query) {
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
//# sourceMappingURL=completion.service.js.map