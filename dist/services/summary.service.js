import OpenAI from 'openai';
import { formatChatHistory } from '../utils/conversation.js';
import LanguageService from './language.service.js';
/**
 * Service for generating summaries of chat conversations
 */
export default class SummaryService {
    openai;
    languageService;
    SUMMARY_SYSTEM_PROMPT = `You are a specialized AI focused on summarizing conversations. Your task is to:

  1. Identify the main topics discussed
  2. Extract key information and decisions made
  3. Highlight any pending questions or unresolved issues
  4. Maintain context that might be relevant for future interactions
  5. Ignore casual greetings and small talk unless they provide important context

  IMPORTANT: You MUST match the language of the conversation exactly:

  For Portuguese (pt):
  - Comece com "Resumo:"
  - Use português formal mas acessível
  - Estruture os pontos principais com marcadores
  - Mantenha um tom profissional e claro

  Para Español (es):
  - Comience con "Resumen:"
  - Use español formal pero accesible
  - Estructure los puntos principales con viñetas
  - Mantenga un tono profesional y claro

  For English (en):
  - Start with "Summary:"
  - Use formal but accessible English
  - Structure main points with bullets
  - Keep a professional and clear tone

  Keep it concise (maximum 150 words) and preserve all important details like:
  - Names and dates
  - Specific requirements
  - Technical terms
  - Action items`;
    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.languageService = new LanguageService();
    }
    /**
     * Generates a summary of the chat history in the detected language
     * @param chatHistory - The chat history to summarize
     * @returns Promise containing the generated summary
     */
    async summarizeChatHistory(chatHistory) {
        if (!chatHistory || chatHistory.length === 0) {
            return '';
        }
        const formattedHistory = formatChatHistory(chatHistory);
        const language = await this.languageService.detectLanguage(formattedHistory);
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: this.SUMMARY_SYSTEM_PROMPT,
                    },
                    {
                        role: 'user',
                        content: `Detected language: ${language}\n\nPlease summarize this conversation:\n${formattedHistory}`,
                    },
                ],
                temperature: 0.3,
                max_tokens: 250,
            });
            return response.choices[0].message.content;
        }
        catch (error) {
            console.error('Failed to summarize chat history:', error);
            return '';
        }
    }
}
//# sourceMappingURL=summary.service.js.map