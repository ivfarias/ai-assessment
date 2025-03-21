/**
 * Service responsible for generating AI-powered responses using OpenAI
 */
export default class CompletionService {
    openAIService;
    constructor(openAIService) {
        this.openAIService = openAIService;
    }
    /**
     * Generates a friendly greeting response for the given query
     * @param query - The user's input message
     * @returns A generated greeting response
     */
    async generateGreetingResponse(query) {
        const response = await this.openAIService.createChatCompletion({
            messages: [
                { role: 'system', content: process.env.SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `Query: "${query}"\n\nRespond with a friendly and brief greeting in a conversational tone.`,
                },
            ],
        });
        return response.choices[0].message.content;
    }
    /**
     * Generates a contextual response based on the user's query, intent, and relevant context
     * @param query - The user's input message
     * @param intent - The analyzed intent of the user's message
     * @param vectorResults - Relevant context vectors from the knowledge base
     * @param historySummary - Summary of the conversation history
     * @returns A generated contextual response
     */
    async generateContextualResponse({ intent, historySummary, query, vectorResults, }) {
        const context = this.formatVectorResults(vectorResults);
        const content = [
            `Query: "${query}"`,
            `Intent: ${JSON.stringify(intent)}`,
            '',
            'Conversation Summary:',
            historySummary,
            '',
            'Relevant contexts:',
            context,
        ].join('\n');
        console.log('Contextual response content:', content);
        const response = await this.openAIService.createChatCompletion({
            messages: [
                {
                    role: 'system',
                    content: process.env.SYSTEM_PROMPT,
                },
                {
                    role: 'user',
                    content,
                },
            ],
        });
        return (response.choices[0].message.content);
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
}
//# sourceMappingURL=completion.service.js.map