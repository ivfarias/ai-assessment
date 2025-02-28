import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../config/mongodb.js';
import { IArticleInput } from '../domain/interfaces/document.js';

// Configuration
const BATCH_SIZE = 10;
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 100;
const BATCH_DELAY = 2000;

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-ada-002',
});

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
  separators: ['===', '\n\n', '. '],
});

// Helper Functions
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Process a document and store its embeddings in DB
 */
export async function processAndStoreDocument(document: IArticleInput) {
  try {
    const db = getDb();
    const collection = db.collection('teste');
    const documentId = uuidv4();

    const combinedContent = `Root Cause: ${document.root_cause}\nContent: ${document.content}`;
    const chunks = await textSplitter.createDocuments([combinedContent]);

    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);
    const results = [];

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, chunks.length);
      const batchChunks = chunks.slice(start, end);
      
      const batchTexts = batchChunks.map(chunk => chunk.pageContent);
      const batchVectors = await embeddings.embedDocuments(batchTexts);
      
      const batchDocs = batchChunks.map((chunk, index) => ({
        ...document,
        id: `${documentId}-${start + index}`,
        parentId: documentId,
        text: chunk.pageContent,
        embedding: batchVectors[index],
        chunkIndex: start + index,
        totalChunks: chunks.length,
        createdAt: new Date().toISOString(),
      }));

      await collection.insertMany(batchDocs);
      results.push(...batchDocs.map(doc => doc.id));

      if (batchIndex < totalBatches - 1) {
        await delay(BATCH_DELAY);
      }
    }

    return { 
      documentId,
      chunkIds: results,
      totalChunks: chunks.length
    };
  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
}