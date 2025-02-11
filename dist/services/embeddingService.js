import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import LanguageDetect from 'languagedetect';
import { retry } from 'async';
// Configure environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// Initialize language detector
const lngDetector = new LanguageDetect();
// Improved multilingual language detection
function detectLanguage(text) {
    try {
        const detections = lngDetector.detect(text, 1);
        return detections.length > 0 ? detections[0][0] : 'unknown';
    }
    catch (error) {
        console.warn('Language detection failed', error);
        return 'unknown';
    }
}
// Initialize Pinecone and OpenAI clients
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});
const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
    },
});
const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
// Advanced text splitter with multilingual support
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: parseInt(process.env.CHUNK_SIZE) || 1000,
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP) || 200,
    separators: ['\n\n', '\n', ' ', ''],
});
// Batch embedding generation with retries and error skipping
async function batchEmbeddings(chunks, batchSize = 100) {
    const allEmbeddings = [];
    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        try {
            await retry({ times: 3, interval: 1000 }, async () => {
                const batchEmbeddings = await embeddings.embedDocuments(batch.map((chunk) => chunk.pageContent));
                allEmbeddings.push(...batchEmbeddings);
            });
        }
        catch (error) {
            console.error(`Error in batch ${i} to ${i + batchSize}:`, error);
            console.error('Skipping problematic batch');
            // Continue with the next batch
        }
    }
    return allEmbeddings;
}
// Read and process JSON files
function readJsonFile(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
}
// Progress tracking
const progressFilePath = path.join(__dirname, 'embedding_progress.json');
function loadProgress() {
    if (fs.existsSync(progressFilePath)) {
        return JSON.parse(fs.readFileSync(progressFilePath, 'utf8'));
    }
    return { lastProcessedFile: null, lastProcessedConversation: null };
}
function saveProgress(progress) {
    fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
}
// Enhanced embedding generation and storage with continuation
async function generateAndStoreEmbeddings() {
    const dataDirectory = path.resolve(__dirname, process.env.DATA_DIRECTORY || '../ml/cleanup/data/processed');
    const files = fs.readdirSync(dataDirectory);
    let progress = loadProgress();
    console.log(`Resuming from: ${JSON.stringify(progress)}`);
    let startIndex = progress.lastProcessedFile ? files.indexOf(progress.lastProcessedFile) : 0;
    if (startIndex === -1)
        startIndex = 0; // If file not found, start from beginning
    console.log(`Starting embedding process for ${files.length - startIndex} files`);
    for (let fileIndex = startIndex; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        if (path.extname(file).toLowerCase() !== '.json') {
            console.log(`Skipping non-JSON file: ${file}`);
            continue;
        }
        const filePath = path.join(dataDirectory, file);
        const conversations = readJsonFile(filePath);
        console.log(`Processing file: ${file} (${conversations.length} conversations)`);
        let conversationStartIndex = 0;
        if (fileIndex === startIndex && progress.lastProcessedConversation) {
            conversationStartIndex =
                conversations.findIndex((c) => c.metadata.conversation_id === progress.lastProcessedConversation) + 1;
            if (conversationStartIndex === 0)
                conversationStartIndex = conversations.length; // If conversation not found, skip this file
        }
        for (let i = conversationStartIndex; i < conversations.length; i++) {
            const conversation = conversations[i];
            const { metadata, dialogue } = conversation;
            // Combine all messages, preserving role context
            const fullText = dialogue.map((msg) => `${msg.role}: ${msg.content}`).join('\n\n');
            const detectedLanguage = detectLanguage(fullText);
            try {
                const chunks = await textSplitter.createDocuments([fullText]);
                const batchVectors = await batchEmbeddings(chunks);
                if (batchVectors.length !== chunks.length) {
                    console.warn(`Mismatch in chunks and vectors for conversation ${metadata.conversation_id}. Skipping.`);
                    continue;
                }
                const conversationId = metadata.conversation_id || uuidv4();
                for (let j = 0; j < chunks.length; j++) {
                    try {
                        await index.upsert([
                            {
                                id: `${conversationId}-${j}`,
                                values: batchVectors[j],
                                metadata: {
                                    ...metadata,
                                    text: chunks[j].pageContent,
                                    source: file,
                                    language: detectedLanguage,
                                    detectionTimestamp: new Date().toISOString(),
                                    conversationId: conversationId,
                                    chunkIndex: j,
                                    totalChunks: chunks.length,
                                },
                            },
                        ]);
                    }
                    catch (error) {
                        console.error(`Error upserting embedding for chunk ${j} from ${file}:`, error);
                        // Continue with the next chunk
                    }
                }
                // Save progress after each conversation
                saveProgress({ lastProcessedFile: file, lastProcessedConversation: conversationId });
            }
            catch (error) {
                console.error(`Error processing conversation ${metadata.conversation_id} from ${file}:`, error);
                // Continue with the next conversation
            }
        }
    }
}
// Execute the embedding process
generateAndStoreEmbeddings()
    .then(() => {
    console.log('Multilingual embedding process completed successfully');
    // Clear progress file after successful completion
    if (fs.existsSync(progressFilePath)) {
        fs.unlinkSync(progressFilePath);
    }
    process.exit(0);
})
    .catch((error) => {
    console.error('Critical error during multilingual embedding process:', error);
    process.exit(1);
});
//# sourceMappingURL=embeddingService.js.map