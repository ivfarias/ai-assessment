import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';
import { getDb } from '../config/mongodb.js';
import { ConversationManager } from './ConversationManager.js';
import { formatChatHistory, formatContexts, weightContextRelevance, } from '../utils/conversation.js';
dotenv.config();
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const cache = new NodeCache({ stdTTL: 3600, maxKeys: 1000 });
const messageCache = new NodeCache({ stdTTL: 300, maxKeys: 10000 }); // 5 minute TTL for message tracking
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
        const [docsResults] = await Promise.all([
            // queryMongoCollection({
            //   collection: db.collection('collectionDemo'),
            //   queryVector,
            //   indexName: 'vectorIndex',
            //   topK,
            // }),
            queryMongoCollection({
                collection: db.collection('docs'),
                queryVector,
                indexName: 'vectorDocsIndex',
                topK,
            }),
        ]);
        const allResults = [...docsResults].filter((_, index) => index <= topK);
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
async function analyzeUserIntent(query) {
    const completion = await openai.chat.completions.create({
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
export async function queryEmbeddings(query, options = {}) {
    const messageId = options.messageId;
    if (messageId && messageCache.get(messageId)) {
        console.log(`Duplicate message detected: ${messageId}`);
        return null;
    }
    console.log(`Query: "${query}"`);
    const cacheKey = `${query}:${JSON.stringify(options)}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
        console.log('Using cached result');
        return cachedResult;
    }
    const queryVector = await retry(() => embeddings.embedQuery(query));
    const intent = await analyzeUserIntent(query);
    const systemPrompt = process.env.SYSTEM_PROMPT;
    if (intent.isGreeting && !intent.hasQuestion && !intent.needsSupport) {
        const completion = await retry(() => openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: `Query: "${query}"\nType: Greeting\n\nRespond in a friendly and natural way, without assuming any supporting context`,
                },
            ],
            temperature: 0.7,
            max_tokens: 500,
        }));
        return {
            matches: [],
            apiResults: [],
            answer: completion.choices[0].message.content,
        };
    }
    // Retorna o contexto da vector store (base de conhecimento) primária (mongodb)
    const vectorResults = await queryVectorStore({
        storeName: 'mongodb',
        queryVector,
        options,
    });
    const contexts = weightContextRelevance(query, vectorResults.matches.map((match) => ({
        text: match.metadata.text,
        language: match.metadata.language,
        score: match.score,
    })));
    let apiResults = [];
    if (options.enableAPIQuery) {
        apiResults = await queryExternalAPI('mockAPI', { query, contexts });
    }
    const memory = await conversationManager.getMemory(options.userId);
    const chatHistory = await memory.loadMemoryVariables({});
    const content = [
        `Query: "${query}"`,
        `Intent: ${JSON.stringify(intent)}`,
        '',
        'Chat History:',
        formatChatHistory(chatHistory),
        '',
        'Relevant contexts:',
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
        // temperature: 0.3,
        max_tokens: 500,
        // presence_penalty: 0.1,
        // frequency_penalty: 0.5,
    }));
    // Save the interaction to memory
    await memory.saveContext({ input: query }, { output: completion.choices[0].message.content });
    const result = {
        matches: contexts,
        apiResults,
        answer: completion.choices[0].message.content,
    };
    if (messageId) {
        messageCache.set(messageId, true);
    }
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