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
  private readonly SUMMARY_SYSTEM_PROMPT = `You are a summarization assistant. Only use the conversation history provided to you. Do not reference or assume access to external knowledge or documents. Do not respond with explanations. Output only a valid JSON object that adheres to the schema below.

Schema:
{
  "language": "string",
  "user_sentiment": "string",
  "primary_goal": "string",
  "key_discussion_points": [ "string" ],
  "pending_ai_question": "string | null",
  "narrative_summary": "string"
}`;

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
