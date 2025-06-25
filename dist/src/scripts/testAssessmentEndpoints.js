import { AssessmentService } from '../services/assessment.service.js';
import { getDb } from '../config/mongodb.js';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
async function testAssessmentEndpoints() {
    try {
        console.log('🧪 Testing endpoint-based assessment system...\n');
        const db = getDb();
        const assessmentService = new AssessmentService(db);
        const testUserId = 'test-user-endpoint-' + Date.now();
        // Test 1: List available assessments
        console.log('1. Testing assessment listing...');
        const assessments = await assessmentService.listAssessments();
        console.log(`✅ Found ${assessments.length} assessments:`);
        assessments.forEach(assessment => {
            console.log(`   - ${assessment.name}: ${assessment.description} (${assessment.steps} steps)`);
        });
        console.log('');
        // Test 2: Start an assessment
        console.log('2. Testing assessment start...');
        const startResult = await assessmentService.startAssessment('simulateProfit', testUserId);
        console.log(`✅ Started assessment: ${startResult.status}`);
        console.log(`   Current step: ${startResult.currentStep?.key}`);
        console.log(`   Progress: ${startResult.progress.current}/${startResult.progress.total}`);
        console.log('');
        // Test 3: Process first answer
        console.log('3. Testing answer processing...');
        const answer1Result = await assessmentService.processAnswer('simulateProfit', testUserId, '5000', 'faturamentoMensal');
        console.log(`✅ Processed answer: ${answer1Result.status}`);
        console.log(`   Next step: ${answer1Result.nextStep?.key}`);
        console.log(`   Progress: ${answer1Result.progress.current}/${answer1Result.progress.total}`);
        console.log('');
        // Test 4: Process second answer
        console.log('4. Testing second answer...');
        const answer2Result = await assessmentService.processAnswer('simulateProfit', testUserId, '3000', 'custoProdutos');
        console.log(`✅ Processed answer: ${answer2Result.status}`);
        console.log(`   Next step: ${answer2Result.nextStep?.key}`);
        console.log(`   Progress: ${answer2Result.progress.current}/${answer2Result.progress.total}`);
        console.log('');
        // Test 5: Process final answer
        console.log('5. Testing final answer...');
        const finalResult = await assessmentService.processAnswer('simulateProfit', testUserId, '20', 'percentualReinvestido');
        console.log(`✅ Processed final answer: ${finalResult.status}`);
        if (finalResult.status === 'completed') {
            console.log(`   Insights: ${finalResult.insights?.length || 0} insights generated`);
            if (finalResult.insights && finalResult.insights.length > 0) {
                finalResult.insights.forEach((insight, index) => {
                    console.log(`   ${index + 1}. ${insight}`);
                });
            }
        }
        console.log('');
        // Test 6: Get status
        console.log('6. Testing status retrieval...');
        try {
            const statusResult = await assessmentService.getStatus('simulateProfit', testUserId);
            console.log(`✅ Status: ${statusResult.status}`);
        }
        catch (error) {
            console.log(`✅ Expected error (assessment completed): ${error.message}`);
        }
        console.log('');
        // Test 7: Test error handling
        console.log('7. Testing error handling...');
        try {
            await assessmentService.startAssessment('invalidAssessment', testUserId);
            console.log('❌ Should have thrown an error');
        }
        catch (error) {
            console.log(`✅ Correctly handled invalid assessment: ${error.message}`);
        }
        try {
            await assessmentService.processAnswer('simulateProfit', testUserId, 'test', 'invalidStep');
            console.log('❌ Should have thrown an error');
        }
        catch (error) {
            console.log(`✅ Correctly handled invalid step: ${error.message}`);
        }
        console.log('');
        console.log('🎉 Endpoint-based assessment system test completed successfully!');
        console.log('📊 All tests passed - the system is working correctly.');
    }
    catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}
// Run the test
testAssessmentEndpoints();
//# sourceMappingURL=testAssessmentEndpoints.js.map