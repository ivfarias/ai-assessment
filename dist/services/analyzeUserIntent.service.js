import OpenAI from 'openai';
/**
 * Service responsible for analyzing and classifying user message intents
 */
export default class AnalyzeUserIntentService {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    /**
     * Analyzes a user's message to determine its intent and classification
     * @param query - The user's input message to analyze
     * @returns An object containing intent analysis (isGreeting, hasQuestion, needsSupport, topic)
     */
    async getQueryIntent(query) {
        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `Analyze the user's message intent and classify it in a JSON format with the following fields:
                - isGreeting (boolean): contains any kind of greeting or salutation
                - hasQuestion (boolean): contains a question or inquiry
                - needsSupport (boolean): requires technical or customer support
                - topic (string): main topic of the message (or "none" if there isn't one)
                
                Examples:
                "hello" -> {"isGreeting": true, "hasQuestion": false, "needsSupport": false, "topic": "none"}
                "hi, how do I change my email?" -> {"isGreeting": true, "hasQuestion": true, "needsSupport": true, "topic": "email"}
                "I'm having issues with payment" -> {"isGreeting": false, "hasQuestion": false, "needsSupport": true, "topic": "payment"}
                "buenas tardes, necesito ayuda con mi cuenta" -> {"isGreeting": true, "hasQuestion": false, "needsSupport": true, "topic": "account"}
                "olá, tudo bem?" -> {"isGreeting": true, "hasQuestion": true, "needsSupport": false, "topic": "none"}
    
                Notes:
                - The user may write in English, Portuguese or Spanish
                - A greeting alone should not be considered as needing support
                - The topic should be specific and relevant to support context
                - Casual questions like "how are you?" should not be marked as needsSupport`,
                    },
                    { role: 'user', content: query },
                ],
                temperature: 0,
                response_format: { type: 'json_object' },
            });
            return JSON.parse(completion.choices[0].message.content);
        }
        catch (error) {
            console.error('Language detection failed:', error);
            throw new Error('Language detection failed');
        }
    }
}
//# sourceMappingURL=analyzeUserIntent.service.js.map