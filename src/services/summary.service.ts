import OpenAI from 'openai';
import { MemoryVariables } from 'langchain/memory';
import { formatChatHistory } from '../utils/conversation.js';
import LanguageService from './language.service.js';

/**
 * Service for generating summaries of chat conversations
 */
export default class SummaryService {
  private openai: OpenAI;
  private languageService: LanguageService;
  private readonly SUMMARY_SYSTEM_PROMPT = `You are a hyper-efficient AI assistant responsible for creating structured summaries of user conversations. Your primary goal is to distill the dialogue into a machine-readable JSON object that will serve as the short-term memory for another AI.

Your Task:
Analyze the provided conversation and generate a JSON object with the following schema. Adhere to the schema strictly.

JSON Schema:
{
  "language": "string", // The ISO 639-1 code for the conversation's language (e.g., "pt", "en", "es").
  "user_sentiment": "string", // A brief, one-to-three word description of the user's current emotional state (e.g., "confused", "optimistic about growth", "worried about costs").
  "primary_goal": "string", // What is the user's main objective in this part of the conversation? (e.g., "find new customers", "understand profit margin", "choose a management tool").
  "key_discussion_points": [
    "string" // An array of strings, with each string being a key topic or decision made. (e.g., "User's sales have dropped recently.", "AI suggested a 'buy 3 get 4' promotion.", "User asked about financial apps.").
  ],
  "pending_ai_question": "string | null", // If the AI's last message was a question to the user, what was it? Otherwise, null.
  "narrative_summary": "string" // A concise, one-paragraph narrative summary of the conversation in the detected language. This should be natural-sounding and human-readable.
}

Instructions & Constraints:
- Accuracy is paramount. The JSON fields must accurately reflect the conversation.
- Be concise. Keep all string values brief and to the point. The entire narrative_summary should not exceed 100 words.
- Analyze the final state. Your summary should reflect the very end of the conversation provided.
- Do not add any text outside of the JSON object. Your entire output must be a single, valid JSON object.
- If the conversation is just a greeting or too short to analyze, return an empty JSON object: {}.`;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.languageService = new LanguageService();
  }

  /**
   * Generates a summary of the chat history in the detected language
   * @param chatHistory - The chat history to summarize
   * @returns Promise containing the generated summary
   */
  public async summarizeChatHistory(chatHistory: MemoryVariables): Promise<string> {
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
    } catch (error) {
      console.error('Failed to summarize chat history:', error);
      return '';
    }
  }
}
