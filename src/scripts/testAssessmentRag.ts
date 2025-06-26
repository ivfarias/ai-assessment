import { MongoClient } from 'mongodb';
import { AssessmentRagService } from '../services/assessmentRagService.js';

async function testAssessmentRag() {
  try {
    console.log('🧪 Testing simplified assessment RAG...\n');
    
    // Connect to MongoDB
    const uri = process.env.MONGODB_CONNECTION_STRING;
    const dbName = process.env.KYTE_DATA_DBNAME;
    
    if (!uri) {
      throw new Error('MONGODB_CONNECTION_STRING not set');
    }
    
    console.log('📡 Connecting to MongoDB...');
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    
    console.log('✅ Connected to MongoDB');
    
    // Test assessment service
    const ragService = new AssessmentRagService(db);
    
    // Test 1: Get available assessments
    console.log('1. Testing getAvailableAssessments...');
    const assessments = ragService.getAvailableAssessments();
    console.log(`   Found ${assessments.length} assessments`);
    console.log('');
    
    // Test 2: Test different user queries
    console.log('2. Testing user queries...');
    const testQueries = [
      'Quero simular lucro',
      'Saúde financeira',
      'Ferramentas',
      'Fidelização de clientes',
      'Olá, como você pode me ajudar?'
    ];
    
    for (const query of testQueries) {
      console.log(`   Query: "${query}"`);
      // Just show available assessments for context
      const relevantAssessments = assessments.filter(a => 
        query.toLowerCase().includes(a.name.toLowerCase()) ||
        a.description.toLowerCase().includes(query.toLowerCase())
      );
      console.log(`   Relevant assessments: ${relevantAssessments.map(a => a.name).join(', ') || 'none'}`);
    }
    console.log('');
    
    // Test 3: Test assessment flow
    console.log('3. Testing assessment flow...');
    const testUserId = 'test-user-' + Date.now();
    
    // Start assessment
    const startResult = await ragService.startAssessment(testUserId, 'simulateProfit');
    console.log(`   Start result: ${JSON.stringify(startResult)}`);
    
    if (startResult.success) {
      // Process answers
      const answer1 = await ragService.processAssessmentAnswer(testUserId, '5000');
      console.log(`   Answer 1 result: ${JSON.stringify(answer1)}`);
      
      const answer2 = await ragService.processAssessmentAnswer(testUserId, '3000');
      console.log(`   Answer 2 result: ${JSON.stringify(answer2)}`);
      
      const answer3 = await ragService.processAssessmentAnswer(testUserId, '20');
      console.log(`   Answer 3 result: ${JSON.stringify(answer3)}`);
    }
    console.log('');
    
    await client.close();
    console.log('✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testAssessmentRag(); 