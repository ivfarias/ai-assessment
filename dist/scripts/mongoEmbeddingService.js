import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../config/mongodb.js';
import fastify from 'fastify';
import mongodb from '../config/mongodb.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'text-embedding-ada-002',
});
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 700,
    chunkOverlap: 100,
    separators: ['===', '\n\n', '\n', '. '],
});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function getProgress() {
    try {
        const progressPath = path.resolve(__dirname, '../services/embedding_progress.json');
        const content = await fs.readFile(progressPath, 'utf-8');
        return JSON.parse(content);
    }
    catch (error) {
        return { lastProcessedFile: '', lastProcessedConversation: '' };
    }
}
export async function updateProgress(filename) {
    const progressPath = path.resolve(__dirname, '../services/embedding_progress.json');
    await fs.writeFile(progressPath, JSON.stringify({
        lastProcessedFile: filename,
        lastProcessedConversation: new Date().toISOString(),
    }, null, 2));
}
export async function readJsonFilesFromDirectory(directoryPath) {
    const dataDirectory = path.resolve(__dirname, process.env.DATA_DIRECTORY || directoryPath);
    const progress = await getProgress();
    const files = await fs.readdir(dataDirectory);
    let jsonFiles = files.filter((file) => file.endsWith('.json'));
    if (progress.lastProcessedFile) {
        const lastIndex = jsonFiles.indexOf(progress.lastProcessedFile);
        console.log({ lastIndex });
        if (lastIndex !== -1) {
            jsonFiles = jsonFiles.slice(lastIndex + 1);
        }
    }
    const fileContents = await Promise.all(jsonFiles.map(async (file) => {
        const filePath = path.join(dataDirectory, file);
        const content = await fs.readFile(filePath, 'utf-8');
        return {
            filename: file,
            content: JSON.parse(content),
        };
    }));
    return fileContents;
}
async function processConversation(conversation) {
    const conversationText = conversation.conversation
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n\n');
    return {
        text: conversationText,
        metadata: {
            intent: conversation.intent,
            category: conversation.category,
            subcategory: conversation.subcategory,
            language: conversation.language,
            root_cause: conversation.root_cause,
            resolution: conversation.resolution,
            key_phrases: conversation.conversation.flatMap((msg) => msg.annotations.key_phrases),
        },
    };
}
export async function storeEmbedding(document) {
    try {
        const app = fastify({ logger: true });
        await app.register(mongodb);
        const db = getDb();
        if (!document?.text) {
            throw new Error('No document text provided');
        }
        const chunks = await textSplitter.createDocuments([document.text]);
        console.log(`Created ${chunks.length} chunks from document`);
        const collection = db.collection('teste');
        const documentId = uuidv4();
        // Process chunks in smaller batches
        const batchSize = 10;
        const totalBatches = Math.ceil(chunks.length / batchSize);
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const start = batchIndex * batchSize;
            const end = Math.min(start + batchSize, chunks.length);
            const batchChunks = chunks.slice(start, end);
            // Generate embeddings for current batch
            const batchTexts = batchChunks.map((chunk) => chunk.pageContent);
            const batchVectors = await embeddings.embedDocuments(batchTexts);
            const batchDocs = batchChunks.map((chunk, index) => ({
                id: `${documentId}-${start + index}`,
                parentId: documentId,
                text: chunk.pageContent,
                embedding: batchVectors[index],
                metadata: document.metadata,
                chunkIndex: start + index,
                totalChunks: chunks.length,
                processedAt: document.processedAt
            }));
            await collection.insertMany(batchDocs);
            console.log(`Processed batch ${batchIndex + 1}/${totalBatches}`);
            if (batchIndex < totalBatches - 1) {
                await delay(2000);
            }
        }
        console.log(`Successfully stored ${chunks.length} embeddings for document ${document.filename}`);
        return documentId;
    }
    catch (error) {
        console.error('Error storing embedding:', error);
        throw error;
    }
}
export async function processAndStoreJsonFiles(directoryPath) {
    try {
        const jsonFiles = await readJsonFilesFromDirectory(directoryPath);
        console.log(`Found ${jsonFiles.length} files to process in ${directoryPath}`);
        const delayBetweenFiles = 4000; // 4 seconds between files to avoid rate limiting
        for (const file of jsonFiles) {
            try {
                console.log(`Processing file: ${file.filename}`);
                const supportDoc = file.content;
                const processedDoc = await processConversation(supportDoc);
                console.log('processedDoc', processedDoc);
                const documentId = await storeEmbedding({
                    text: processedDoc.text,
                    filename: file.filename,
                    processedAt: new Date().toISOString(),
                    metadata: {
                        ...processedDoc.metadata,
                        source: file.filename,
                    },
                });
                await updateProgress(file.filename);
                console.log(`Successfully processed: ${file.filename} with ID: ${documentId}`);
                await delay(delayBetweenFiles);
            }
            catch (error) {
                console.error(`Error processing file ${file.filename}:`, error);
                continue;
            }
        }
        return { status: 'complete', message: `Processed ${jsonFiles.length} files` };
    }
    catch (error) {
        console.error('Error in batch processing:', error);
        throw error;
    }
}
processAndStoreJsonFiles('../../data/processed');
//# sourceMappingURL=mongoEmbeddingService.js.map