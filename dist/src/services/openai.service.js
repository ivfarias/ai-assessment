import OpenAI from 'openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { retry } from '../utils/retry.js';
/**
 * Service for interacting with OpenAI's API
 */
export default class OpenAIService {
    openai;
    embeddings;
    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: 'text-embedding-ada-002',
        });
    }
    /**
     * Creates an embedding vector for the given text
     * @param text - The text to create an embedding for
     * @returns Promise containing the embedding vector
     */
    async createEmbedding(text) {
        return retry(() => this.embeddings.embedQuery(text));
    }
    /**
     * Creates a chat completion using OpenAI's API
     * @param params - Parameters for the chat completion
     * @param params.messages - The messages to generate completion for
     * @param params.model - The model to use (default: 'gpt-4')
     * @param params.temperature - The temperature setting (default: 0.3)
     * @param params.tools - The tools to use (optional)
     * @returns Promise containing the chat completion
     */
    async createChatCompletion({ messages, model = 'gpt-4o-mini', temperature = 0.3, tools, tool_choice, max_tokens, }) {
        const fullMessages = process.env.SYSTEM_PROMPT
            ? [{ role: "system", content: process.env.SYSTEM_PROMPT }, ...messages]
            : messages;
        return retry(() => this.openai.chat.completions.create({
            model,
            messages: fullMessages,
            temperature,
            max_tokens: max_tokens ?? 1000,
            tools,
            tool_choice: tool_choice ?? (tools ? "auto" : undefined),
        }));
    }
}
//# sourceMappingURL=openai.service.js.map