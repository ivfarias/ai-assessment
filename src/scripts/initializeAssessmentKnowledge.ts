import { AssessmentEmbeddingService } from '../services/assessmentEmbeddingService.js';
import { getDb } from '../config/mongodb.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function initializeAssessmentKnowledge() {
  try {
    console.log('🚀 Initializing assessment knowledge base...');
    
    const db = getDb();
    const embeddingService = new AssessmentEmbeddingService(db);
    
    await embeddingService.initializeKnowledgeBase();
    
    console.log('✅ Assessment knowledge base initialized successfully!');
    console.log('📊 You can now use RAG-based assessment detection.');
    
  } catch (error) {
    console.error('❌ Error initializing assessment knowledge base:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeAssessmentKnowledge(); 