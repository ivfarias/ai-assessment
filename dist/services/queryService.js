import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';
import { getDb } from '../config/mongodb.js';
import { ConversationManager } from './ConversationManager.js';
dotenv.config();
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const cache = new NodeCache({ stdTTL: 3600, maxKeys: 1000 });
const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'text-embedding-ada-002', // model that generates 1536 dimensions
});
const conversationManager = new ConversationManager();
async function retry(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        }
        catch (error) {
            if (i === maxRetries - 1)
                throw error;
            await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, i)));
        }
    }
}
async function queryMongoCollection({ collection, indexName, queryVector, topK, }) {
    const results = await collection
        .aggregate([
        {
            $search: {
                index: indexName,
                knnBeta: {
                    vector: queryVector,
                    path: 'embedding',
                    k: topK || 5,
                },
            },
        },
        {
            $project: {
                text: 1,
                metadata: 1,
                score: { $meta: 'searchScore' },
                _id: 0,
            },
        },
    ])
        .toArray();
    return results.map((doc) => ({
        metadata: {
            text: doc.text,
            ...doc.metadata,
        },
        score: doc.score,
    }));
}
async function queryVectorStore({ storeName, queryVector, options = {}, }) {
    if (storeName === 'pinecone') {
        return retry(() => index.query({
            topK: options.topK || 5,
            vector: queryVector,
            includeMetadata: true,
        }));
    }
    if (storeName === 'mongodb') {
        const db = getDb();
        const topK = options.topK || 5;
        // Search in both collections
        const [conversationResults, docsResults] = await Promise.all([
            queryMongoCollection({
                collection: db.collection('collectionDemo'),
                queryVector,
                indexName: 'vectorIndex',
                topK,
            }),
            queryMongoCollection({
                collection: db.collection('docs'),
                queryVector,
                indexName: 'vectorDocsIndex',
                topK,
            }),
        ]);
        const allResults = [...conversationResults, ...docsResults].filter((_, index) => index <= topK);
        // Sort by score and get top K results
        const topResults = allResults.sort((a, b) => b.score - a.score).slice(0, topK);
        return {
            matches: topResults.map((result) => ({
                metadata: result.metadata,
                score: result.score,
            })),
        };
    }
    // Placeholder para incluir bases de conhecimento (vectore stores) diferentes.
    throw new Error(`Vector store "${storeName}" is not implemented.`);
}
/**
 *  Aqui está um placeholder para ilustrar como podemos utilizar
 *  o langchain para fazer chamadas de api com base em contexto.
 */
async function queryExternalAPI(apiName, payload) {
    // Implement API call logic here
    console.log(`Calling API: ${apiName} with payload:`, payload);
    return [{ data: 'Mock API response' }];
}
function formatChatHistory(chatHistory) {
    if (!chatHistory.chat_history || !chatHistory.chat_history.length) {
        return 'No previous conversation';
    }
    const lastFiveMessages = chatHistory.chat_history.slice(-5);
    return lastFiveMessages.map((msg) => `${msg.type}: ${msg.content}`).join('\n');
}
function formatContexts(contexts) {
    return contexts.map((c) => c.text).join('\n\n');
}
export async function queryEmbeddings(query, options = {}) {
    console.log(`Query: "${query}"`);
    const cacheKey = `${query}:${JSON.stringify(options)}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
        console.log('Using cached result');
        return cachedResult;
    }
    const queryVector = await retry(() => embeddings.embedQuery(query));
    // Retorna o contexto da vector store (base de conhecimento) primária (mongodb)
    const vectorResults = await queryVectorStore({
        storeName: 'mongodb',
        queryVector,
        options,
    });
    const contexts = vectorResults.matches.map((match) => ({
        text: match.metadata.text,
        language: match.metadata.language,
        source: match.metadata.source,
        collection: match.metadata.source,
        score: match.score,
    }));
    const systemPrompt = process.env.SYSTEM_PROMPT;
    let apiResults = [];
    if (options.enableAPIQuery) {
        apiResults = await queryExternalAPI('mockAPI', { query, contexts });
    }
    const memory = await conversationManager.getMemory(options.userId);
    const chatHistory = await memory.loadMemoryVariables({});
    const content = [
        `Query: "${query}"`,
        '',
        'Chat History:',
        formatChatHistory(chatHistory),
        '',
        'Contexts:',
        formatContexts(contexts),
    ].join('\n');
    console.log('System Prompt:', content);
    const completion = await retry(() => openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
            { role: 'system', content: systemPrompt },
            {
                role: 'user',
                content,
            },
        ],
        temperature: 0.2,
        max_tokens: 500,
        presence_penalty: 0.1,
        frequency_penalty: 0.5,
    }));
    // Save the interaction to memory
    await memory.saveContext({ input: query }, { output: completion.choices[0].message.content });
    const result = {
        matches: contexts,
        apiResults,
        answer: completion.choices[0].message.content,
    };
    cache.set(cacheKey, result);
    return result;
}
export function getLastConversation(userId) {
    return cache.get(`lastConversation:${userId}`);
}
export function setLastConversation(userId, conversation) {
    cache.set(`lastConversation:${userId}`, conversation, 86400);
}
//# sourceMappingURL=queryService.js.map