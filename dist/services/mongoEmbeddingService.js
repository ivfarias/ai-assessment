import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../config/mongodb.js';
import { readJsonFilesFromDirectory, updateProgress } from '../utils/fileUtils.js';
import fastify from 'fastify';
import mongodb from '../config/mongodb.js';
import { kyteDocsConfigPt } from '../utils/kyte-docs-config-pt.js';
dotenv.config();
const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'text-embedding-ada-002', // Switching to the model that generates 1536 dimensions
});
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 100,
    separators: ['===', '\n\n', '\n', '. '],
});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Auxiliary function for batch processing
async function processBatch(items, batchSize, delayMs, processor) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processor));
        results.push(...batchResults);
        if (i + batchSize < items.length) {
            await delay(delayMs); // Delay between batches
        }
    }
    return results;
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
            key_phrases: conversation.conversation.flatMap((msg) => msg.annotations.key_phrases),
        },
    };
}
export async function storeEmbedding(document) {
    try {
        const app = fastify({ logger: true });
        await app.register(mongodb);
        const db = getDb();
        // console.log('Processing document:', document?.text?.substring(0, 100) + '...');
        const chunks = await textSplitter.createDocuments([kyteDocsConfigPt]);
        console.log(`Created ${chunks.length} chunks from document`);
        // const vectors = await embeddings.embedDocuments(chunks.map((chunk) => chunk.pageContent));
        const collection = db.collection('docs');
        const documentId = uuidv4();
        // Process chunks in smaller batches
        const batchSize = 10;
        const totalBatches = Math.ceil(chunks.length / batchSize);
        const results = [];
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const start = batchIndex * batchSize;
            const end = Math.min(start + batchSize, chunks.length);
            const batchChunks = chunks.slice(start, end);
            // Gerar embeddings para o lote atual
            const batchTexts = batchChunks.map((chunk) => chunk.pageContent);
            const batchVectors = await embeddings.embedDocuments(batchTexts);
            const batchDocs = batchChunks.map((chunk, index) => {
                console.log({ index });
                return {
                    id: `${documentId}-${start + index}`,
                    parentId: documentId,
                    text: chunk.pageContent,
                    embedding: batchVectors[index],
                    chunkIndex: start + index,
                    totalChunks: chunks.length,
                };
            });
            await collection.insertMany(batchDocs);
            console.log(`Processed batch ${batchIndex + 1}/${totalBatches}`);
            // Aguardar um pouco entre os lotes para evitar sobrecarga
            if (batchIndex < totalBatches - 1) {
                await delay(2000);
            }
        }
        console.log(`Successfully stored ${chunks.length} embeddings for document ${document?.filename}`);
        return documentId;
    }
    catch (error) {
        console.error('Error storing embedding:', error);
        throw error;
    }
}
storeEmbedding();
export async function processAndStoreJsonFiles(directoryPath) {
    try {
        const jsonFiles = await readJsonFilesFromDirectory(directoryPath);
        // console.log(`Found ${jsonFiles.length} files to process`);
        console.log('files:', jsonFiles);
        const batchSize = 2;
        const delayBetweenFiles = 8000;
        for (const file of jsonFiles) {
            try {
                const supportDoc = file.content;
                const processedDoc = await processConversation(supportDoc);
                await storeEmbedding({
                    text: processedDoc.text,
                    processedAt: new Date().toISOString(),
                    metadata: {
                        ...processedDoc.metadata,
                    },
                });
                // Atualizar o progresso após cada arquivo processado com sucesso
                await updateProgress(file.filename);
                console.log(`Successfully processed and updated progress for: ${file.filename}`);
                // Delay entre arquivos
                await delay(delayBetweenFiles);
            }
            catch (error) {
                console.error(`Error processing file ${file.filename}:`, error);
                // Continue com o próximo arquivo mesmo se houver erro
                continue;
            }
        }
        return { status: 'complete', message: 'All files processed' };
    }
    catch (error) {
        console.error('Error in batch processing:', error);
        throw error;
    }
}
// processAndStoreJsonFiles('../../data/docs');
//# sourceMappingURL=mongoEmbeddingService.js.map