import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../config/mongodb.js';
import fastify from 'fastify';
import mongodb from '../config/mongodb.js';
import path from 'path';
import fs from 'fs/promises';
dotenv.config();
const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'text-embedding-ada-002',
});
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 100,
    separators: ['===', '\n\n', '\n', '. '],
});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function readMacroFiles(directoryPath) {
    try {
        const files = await fs.readdir(directoryPath);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        const documents = [];
        for (const file of jsonFiles) {
            const content = await fs.readFile(path.join(directoryPath, file), 'utf-8');
            const data = JSON.parse(content);
            data.forEach((doc) => {
                documents.push({
                    root_cause: doc.root_cause,
                    language: doc.language,
                    text: doc.content,
                    suggested_links: doc.suggested_links,
                });
            });
        }
        return documents;
    }
    catch (error) {
        console.error('Error reading macro files:', error);
        throw error;
    }
}
async function storeMacroEmbedding(document) {
    try {
        const app = fastify({ logger: true });
        await app.register(mongodb);
        const db = getDb();
        const chunks = await textSplitter.createDocuments([document.text]);
        console.log(`Created ${chunks.length} chunks from document`);
        console.log('\n\n\nchunks', chunks, '\n\n\n');
        const collection = db.collection('docs');
        const documentId = uuidv4();
        const batchSize = 10;
        const totalBatches = Math.ceil(chunks.length / batchSize);
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const start = batchIndex * batchSize;
            const end = Math.min(start + batchSize, chunks.length);
            const batchChunks = chunks.slice(start, end);
            const batchTexts = batchChunks.map(chunk => chunk.pageContent);
            const batchVectors = await embeddings.embedDocuments(batchTexts);
            const batchDocs = batchChunks.map((chunk, index) => ({
                id: `${documentId}-${start + index}`,
                parentId: documentId,
                text: chunk.pageContent,
                embedding: batchVectors[index],
                chunkIndex: start + index,
                totalChunks: chunks.length,
                createdAt: new Date().toISOString(),
                ...document
            }));
            await collection.insertMany(batchDocs);
            console.log(`Processed batch ${batchIndex + 1}/${totalBatches}`);
            if (batchIndex < totalBatches - 1) {
                await delay(2000);
            }
        }
        return documentId;
    }
    catch (error) {
        console.error('Error storing macro embedding:', error);
        throw error;
    }
}
export async function processAndStoreMacroFiles() {
    try {
        const macroPath = path.join(process.cwd(), 'data', 'macroCs');
        const documents = await readMacroFiles(macroPath);
        // console.log(`Found ${documents.length} macro documents to process`);
        // console.log('documents', documents);
        for (const document of documents) {
            try {
                const documentId = await storeMacroEmbedding(document);
                console.log(`Successfully processed document with ID: ${documentId}`);
                await delay(4000); // Delay between documents
            }
            catch (error) {
                console.error('Error processing document:', error);
                continue;
            }
        }
        return { status: 'complete', message: `Processed ${documents.length} macro documents` };
    }
    catch (error) {
        console.error('Error processing macro files:', error);
        throw error;
    }
}
// Uncomment to run the processor
processAndStoreMacroFiles();
//# sourceMappingURL=macroEmbeddingService.js.map