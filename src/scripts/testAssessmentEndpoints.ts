import { getDb } from '../config/mongodb.js';
import { AssessmentService } from '../services/assessment.service.js';
import { AssessmentRagService } from '../services/assessmentRagService.js';
import { AssessmentEmbeddingService } from '../services/assessmentEmbeddingService.js';

async function testAssessmentSystem() {
  try {
    console.log('🧪 Testing assessment system...\n');
    const db = getDb();
    
    // Test 1: Initialize embedding service
    console.log('1. Testing embedding service initialization...');
    const embeddingService = new AssessmentEmbeddingService(db);
    await embeddingService.initializeKnowledgeBase();
    console.log('✅ Embedding service initialized successfully!\n');
    
    // Test 2: Test assessment suggestions
    console.log('2. Testing assessment suggestions...');
    const suggestions = await embeddingService.getAssessmentSuggestions('Quero melhorar a saúde financeira do meu negócio');
    console.log(`✅ Found ${suggestions.length} suggestions:`, suggestions.map(s => s.suggestedAssessment));
    console.log('');
    
    // Test 3: Test RAG service
    console.log('3. Testing RAG service...');
    const ragService = new AssessmentRagService(db);
    const testUserId = 'test-user-rag-' + Date.now();
    
    const result1 = await ragService.processMessage(testUserId, 'Quero fazer uma avaliação financeira');
    console.log(`✅ RAG result 1:`, result1);
    
    const result2 = await ragService.processMessage(testUserId, 'sim');
    console.log(`✅ RAG result 2:`, result2);
    console.log('');
    
    // Test 4: Test assessment service
    console.log('4. Testing assessment service...');
    const assessmentService = new AssessmentService(db);
    const testUserId2 = 'test-user-assessment-' + Date.now();
    
    // Start assessment
    const startResult = await assessmentService.startAssessment('simulateProfit', testUserId2);
    console.log(`✅ Started assessment: ${startResult.status}`);
    console.log(`   Current step: ${startResult.currentStep?.key}`);
    console.log(`   Progress: ${startResult.progress.current}/${startResult.progress.total}`);
    console.log('');
    
    // Process first answer
    const answer1Result = await assessmentService.processAnswer('simulateProfit', testUserId2, '5000', 'faturamentoMensal');
    console.log(`✅ Processed answer 1: ${answer1Result.status}`);
    console.log(`   Next step: ${answer1Result.nextStep?.key}`);
    console.log(`   Progress: ${answer1Result.progress.current}/${answer1Result.progress.total}`);
    console.log('');
    
    // Process second answer
    const answer2Result = await assessmentService.processAnswer('simulateProfit', testUserId2, '3000', 'custoProdutos');
    console.log(`✅ Processed answer 2: ${answer2Result.status}`);
    console.log(`   Next step: ${answer2Result.nextStep?.key}`);
    console.log(`   Progress: ${answer2Result.progress.current}/${answer2Result.progress.total}`);
    console.log('');
    
    // Process third answer
    const answer3Result = await assessmentService.processAnswer('simulateProfit', testUserId2, '20', 'percentualReinvestido');
    console.log(`✅ Processed answer 3: ${answer3Result.status}`);
    if (answer3Result.status === 'completed') {
      console.log(`   Assessment completed!`);
      console.log(`   Insights: ${answer3Result.insights?.length || 0} insights generated`);
    }
    console.log('');
    
    // Test 5: Test direct assessment detection
    console.log('5. Testing direct assessment detection...');
    const directTests = [
      'Quero simular lucro',
      'Saúde financeira',
      'Ferramentas',
      'Fidelização de clientes'
    ];
    
    for (const test of directTests) {
      const result = await ragService.processMessage('test-direct-' + Date.now(), test);
      console.log(`   "${test}" -> ${result.action} (${result.assessmentName})`);
    }
    console.log('');
    
    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testAssessmentSystem()
  .then(() => {
    console.log('✅ Assessment system test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Assessment system test failed:', error);
    process.exit(1);
  }); 