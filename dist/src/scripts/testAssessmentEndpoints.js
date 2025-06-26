import { MongoClient } from 'mongodb';
import { AssessmentRagService } from '../services/assessmentRagService.js';
async function testAssessmentEndpoints() {
    try {
        console.log('🧪 Testing assessment endpoints...\n');
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
        assessments.forEach(a => console.log(`   - ${a.name}: ${a.description}`));
        console.log('');
        // Test 2: Get user assessment status
        console.log('2. Testing getUserAssessmentStatus...');
        const testUserId = 'test-user-' + Date.now();
        const status = await ragService.getUserAssessmentStatus(testUserId);
        console.log(`   User status: ${JSON.stringify(status)}`);
        console.log('');
        // Test 3: Start an assessment
        console.log('3. Testing startAssessment...');
        const startResult = await ragService.startAssessment(testUserId, 'simulateProfit');
        console.log(`   Start result: ${JSON.stringify(startResult)}`);
        console.log('');
        // Test 4: Process assessment answer
        console.log('4. Testing processAssessmentAnswer...');
        const answerResult = await ragService.processAssessmentAnswer(testUserId, '5000');
        console.log(`   Answer result: ${JSON.stringify(answerResult)}`);
        console.log('');
        // Test 5: Process another answer
        console.log('5. Testing second answer...');
        const answerResult2 = await ragService.processAssessmentAnswer(testUserId, '3000');
        console.log(`   Second answer result: ${JSON.stringify(answerResult2)}`);
        console.log('');
        // Test 6: Process final answer
        console.log('6. Testing final answer...');
        const answerResult3 = await ragService.processAssessmentAnswer(testUserId, '20');
        console.log(`   Final answer result: ${JSON.stringify(answerResult3)}`);
        console.log('');
        await client.close();
        console.log('✅ All tests completed successfully!');
    }
    catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}
testAssessmentEndpoints();
//# sourceMappingURL=testAssessmentEndpoints.js.map