import { AssessmentRagService } from '../services/assessmentRagService.js';
import { AssessmentEmbeddingService } from '../services/assessmentEmbeddingService.js';
import { getDb } from '../config/mongodb.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testAssessmentRag() {
  try {
    console.log('🧪 Testing RAG-based assessment system...\n');
    
    const db = getDb();
    const ragService = new AssessmentRagService(db);
    const embeddingService = new AssessmentEmbeddingService(db);
    
    // Initialize knowledge base
    console.log('1. Initializing knowledge base...');
    await embeddingService.initializeKnowledgeBase();
    console.log('✅ Knowledge base ready\n');
    
    // Test assessment suggestions
    console.log('2. Testing assessment suggestions...');
    const testQueries = [
      'I want to improve my profit margins',
      'How can I get more customers?',
      'My cash flow is terrible',
      'I need to organize my business better',
      'What tools should I use for my business?'
    ];
    
    for (const query of testQueries) {
      console.log(`\nQuery: "${query}"`);
      const suggestions = await embeddingService.getAssessmentSuggestions(query);
      
      if (suggestions.length > 0) {
        console.log(`Top suggestion: ${suggestions[0].suggestedAssessment} (confidence: ${(suggestions[0].confidence * 100).toFixed(1)}%)`);
        console.log(`Reasoning: ${suggestions[0].reasoning.substring(0, 100)}...`);
      } else {
        console.log('No suggestions found');
      }
    }
    
    // Test assessment intent detection
    console.log('\n3. Testing assessment intent detection...');
    const intentQueries = [
      'I want to analyze my profitability',
      'Can you help me with customer loyalty?',
      'I need a financial health check',
      'How do I make my business more efficient?'
    ];
    
    for (const query of intentQueries) {
      console.log(`\nQuery: "${query}"`);
      const result = await ragService.processMessage('test-user-id', query);
      
      if (result.isAssessmentRequest) {
        console.log(`✅ Assessment detected: ${result.action}`);
        if (result.assessmentName) {
          console.log(`Assessment: ${result.assessmentName}`);
        }
      } else {
        console.log('❌ No assessment detected');
      }
    }
    
    console.log('\n🎉 RAG-based assessment system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testAssessmentRag(); 