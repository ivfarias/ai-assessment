import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import OpenAI from "openai";
import dotenv from 'dotenv';
import NodeCache from "node-cache";

dotenv.config();

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-large",
});

const cache = new NodeCache({ stdTTL: 3600, maxKeys: 1000 });

async function retry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i)));
    }
  }
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

  const results = await retry(() => index.query({
    topK: options.topK || 5,
    vector: queryVector,
    includeMetadata: true,
  }));

  const contexts = results.matches.map(match => ({
    text: match.metadata.text,
    language: match.metadata.language,
    source: match.metadata.source,
    score: match.score
  }));

  console.log('Retrieved contexts:', contexts);


  const systemPrompt = process.env.SYSTEM_PROMPT;

  const completion = await retry(() => openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Query: "${query}"\n\nContexts:\n${contexts.map(c => c.text).join('\n\n')}` }
    ],
    temperature: 0.3
  }));

  console.log('AI Response:', completion.choices[0].message.content);

  const result = {
    matches: contexts,
    answer: completion.choices[0].message.content
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