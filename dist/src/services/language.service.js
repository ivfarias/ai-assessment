import OpenAI from 'openai';
/**
 * Service for detecting the language of text content
 */
export default class LanguageService {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    /**
     * Detects the language of the provided text
     * @param text - The text to analyze
     * @returns Promise containing the ISO 639-1 language code
     */
    async detectLanguage(text) {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a language detection tool. Respond with only the ISO 639-1 two-letter language code.',
                    },
                    {
                        role: 'user',
                        content: `Detect the language of this text: "${text}"`,
                    },
                ],
                max_tokens: 2,
            });
            return response.choices[0].message.content.trim().toLowerCase();
        }
        catch (error) {
            console.error('Language detection failed:', error);
            throw new Error('Language detection failed');
        }
    }
}
//# sourceMappingURL=language.service.js.map