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

/**
 * Chama determinada vector store com base em contexto. 
 * Placeholder para caso desejem implementar mais funcionalidades.
 */
async function queryVectorStore(storeName, queryVector, options = {}) {
  if (storeName === "pinecone") {
    return retry(() => index.query({
      topK: options.topK || 5,
      vector: queryVector,
      includeMetadata: true,
    }));
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
  return { data: "Mock API response" };
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

  // Retorna o contexto da vector store (base de conhecimento) primária (pinecone) 
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
    temperature: 0.3,

    // Parte avançada do prompt-engineering. Deixei as opções abaixo comentadas para caso precisem ser utilizadas:

    // Limite de tokens da responsta:
    // max_tokens: 500,

    // Configuração para punir repetições (-2.0 to 2.0)
    // frequency_penalty: 0.5,

    // Configuração para punir novos tópicos de conversa (-2.0 to 2.0)
    // presence_penalty: 0.2,

    // Recurso de probabilidades de log (log probabilities) na API da OpenAI. 
    // Isso faz com que a API retorne os valores de probabilidade logarítmica para os tokens mais relevantes.

    // logprobs: 5, 

    // Número de completions para trazer e então escolher a melhor
    // n: 3, 

    // Stream response (processar dados em tempo real)
    // stream: true, 

    // Stop sequence para definir o final de uma resposta
    // stop: ["\n", "END"]

    // PS: Não cheguei a testar todas.
  }));

  console.log('AI Response:', completion.choices[0].message.content);

  const result = {
    matches: contexts,
    apiResults,
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