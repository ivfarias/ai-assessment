import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-large",
});

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

/**
 * Calls a specific vector store based on context.
 * Placeholder for additional functionality.
 */
async function queryVectorStore(storeName, queryVector, options = {}) {
  if (storeName === "pinecone") {
    return await retry(() => index.query({
      topK: options.topK || 5,
      vector: queryVector,
      includeMetadata: true,
    }));
  }
  // Placeholder for additional vector stores.
  throw new Error(`Vector store "${storeName}" is not implemented.`);
}

/**
 * Placeholder for external API calls.
 */
async function queryExternalAPI(apiName, payload) {
  // Implement API call logic here
  console.log(`Calling API: ${apiName} with payload:`, payload);
  return { data: "Mock API response" };
}

export async function queryEmbeddings(query, options = {}) {
  console.log(`Query: "${query}"`);

  // Ensure all async operations are awaited
  const queryVector = await retry(() => embeddings.embedQuery(query));

  // Retrieve context from the primary vector store (Pinecone)
  const vectorResults = await queryVectorStore("pinecone", queryVector, options);

  const contexts = vectorResults.matches.map(match => ({
    text: match.metadata.text,
    language: match.metadata.language,
    source: match.metadata.source,
    score: match.score
  }));

  console.log('Retrieved contexts:', contexts);

  const systemPrompt = process.env.SYSTEM_PROMPT;

  let apiResults = [];
  if (options.enableAPIQuery) {
    apiResults = await queryExternalAPI("mockAPI", { query, contexts });
  }

  // Ensure OpenAI API call is configured to return a single response (n: 1)
  const completion = await retry(() => openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Query: "${query}"\n\nContexts:\n${contexts.map(c => c.text).join('\n\n')}\n\nAPI Results:\n${JSON.stringify(apiResults)}` }
    ],
    temperature: 0.4,
    // Ensure n: 1 (default) is not overridden
    n: 1, // Explicitly set to 1 to avoid multiple responses
  }));

  console.log('AI Response:', completion.choices[0].message.content);

  const result = {
    matches: contexts,
    apiResults,
    answer: completion.choices[0].message.content
  };

  return result;
}