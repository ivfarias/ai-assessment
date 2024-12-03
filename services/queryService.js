import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();

// Initialize Pinecone and OpenAI clients
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize OpenAIEmbeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-large",
});

// Cache for storing recent query results
const queryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function queryEmbeddings(query, options = {}) {
  console.log(`Query: "${query}"`);

  // Check cache for recent identical queries
  const cacheKey = `${query}:${JSON.stringify(options)}`;
  if (queryCache.has(cacheKey)) {
    console.log("Using cached response");
    return queryCache.get(cacheKey);
  }

  try {
    const queryVector = await embeddings.embedQuery(query);

    const results = await index.query({
      topK: options.topK || 5,
      vector: queryVector,
      includeMetadata: true,
    });

    const contexts = results.matches.map(match => ({
      text: match.metadata.text,
      language: match.metadata.language,
      source: match.metadata.source,
      score: match.score
    }));

    console.log('Retrieved contexts:', contexts);

    const systemPrompt = process.env.EN_PROMPT;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Query: "${query}"\n\nContexts:\n${contexts.map(c => c.text).join('\n\n')}` }
      ]
    });

    const response = {
      matches: contexts,
      answer: completion.choices[0].message.content
    };

    console.log('AI Response:', response.answer);

    // Cache the response
    queryCache.set(cacheKey, response);
    setTimeout(() => queryCache.delete(cacheKey), CACHE_TTL);

    return response;
  } catch (error) {
    console.error("Error in queryEmbeddings:", error);
    throw error;
  }
}

