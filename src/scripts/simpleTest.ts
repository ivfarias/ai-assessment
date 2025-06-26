import { getDb } from '../config/mongodb.js';
import { AssessmentService } from '../services/assessment.service.js';

async function testAssessmentFlow() {
  try {
    console.log('🚀 Testing assessment flow...');
    
    const db = getDb();
    const assessmentService = new AssessmentService(db);
    const userId = 'test-user-' + Date.now();
    
    // Test 1: Start assessment
    console.log('\n📋 Test 1: Starting simulateProfit assessment...');
    const startResult = await assessmentService.startAssessment('simulateProfit', userId);
    console.log('Start result:', JSON.stringify(startResult, null, 2));
    
    if (startResult.status === 'started' && startResult.currentStep) {
      console.log('✅ Assessment started successfully');
      console.log('First question:', startResult.currentStep.goal_prompt);
      
      // Test 2: Answer first question
      console.log('\n📝 Test 2: Answering first question...');
      const answer1 = '35000';
      const result1 = await assessmentService.processAnswer('simulateProfit', userId, answer1);
      console.log('Answer 1 result:', JSON.stringify(result1, null, 2));
      
      if (result1.status === 'in_progress' && result1.nextStep) {
        console.log('✅ First answer processed successfully');
        console.log('Second question:', result1.nextStep.goal_prompt);
        
        // Test 3: Answer second question
        console.log('\n📝 Test 3: Answering second question...');
        const answer2 = '25000';
        const result2 = await assessmentService.processAnswer('simulateProfit', userId, answer2);
        console.log('Answer 2 result:', JSON.stringify(result2, null, 2));
        
        if (result2.status === 'in_progress' && result2.nextStep) {
          console.log('✅ Second answer processed successfully');
          console.log('Third question:', result2.nextStep.goal_prompt);
          
          // Test 4: Answer third question
          console.log('\n📝 Test 4: Answering third question...');
          const answer3 = '20';
          const result3 = await assessmentService.processAnswer('simulateProfit', userId, answer3);
          console.log('Answer 3 result:', JSON.stringify(result3, null, 2));
          
          if (result3.status === 'completed') {
            console.log('✅ Assessment completed successfully!');
            console.log('Results:', result3.results);
            console.log('Insights:', result3.insights);
          } else {
            console.log('❌ Assessment did not complete as expected');
          }
        } else {
          console.log('❌ Second answer processing failed');
        }
      } else {
        console.log('❌ First answer processing failed');
      }
    } else {
      console.log('❌ Assessment start failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAssessmentFlow().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 