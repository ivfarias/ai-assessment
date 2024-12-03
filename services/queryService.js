import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();


// Assuming these are set in your .env file
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function queryEmbeddings(query, options = {}) {
  console.log(`Query: "${query}"`);

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "text-embedding-3-large",
  });

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

  console.log('AI Response:', completion.choices[0].message.content);

  return {
    matches: contexts,
    answer: completion.choices[0].message.content
  };
}

