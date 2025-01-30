import OpenAI from 'openai';
import dotenv from 'dotenv';
import { queryEmbeddings } from './queryService.ts';

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function generateResponse(query) {
    try {
        // First, query embeddings to get relevant context
        const { matches, answer: embeddingAnswer } = await queryEmbeddings(query);

        // Use the embedding answer and matches as context for the final response
        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4',
            messages: [
                { role: 'system', content: process.env.SYSTEM_PROMPT },
                { role: 'user', content: `Context from embeddings:\n${embeddingAnswer}\n\nAdditional context:\n${matches.map(m => m.metadata.text || JSON.stringify(m.metadata)).join('\n')}\n\nUser query: ${query}` },
            ],
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error generating response:', error);
        throw new Error('Failed to generate response.');
    }
}

