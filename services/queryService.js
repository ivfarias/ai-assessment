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

async function queryVectorStore(storeName, queryVector, options = {}) {
  if (storeName === "pinecone") {
    return retry(() => index.query({
      topK: options.topK || 5,
      vector: queryVector,
      includeMetadata: true,
    }));
  }
  throw new Error(`Vector store "${storeName}" is not implemented.`);
}

async function queryExternalAPI(apiName, payload) {
  console.log(`Calling API: ${apiName} with payload:`, payload);
  return { data: "Mock API response" };
}

export async function queryEmbeddings(query, options = {}) {
  console.log(`Query: "${query}"`);

  const queryVector = await retry(() => embeddings.embedQuery(query));
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

  const completion = await retry(() => openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Query: "${query}"\n\nContexts:\n${contexts.map(c => c.text).join('\n\n')}\n\nAPI Results:\n${JSON.stringify(apiResults)}` }
    ],
    temperature: 0.5,
    max_tokens: 500,
    presence_penalty: 0.5
  }));

  console.log('AI Response:', completion.choices[0].message.content);

  return {
    matches: contexts,
    apiResults,
    answer: completion.choices[0].message.content
  };
}