import { MongoClient } from 'mongodb';
import { AssessmentService } from '../services/assessment.service.js';

async function testAssessment() {
  try {
    console.log('🔍 Testing assessment service...');
    
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
    
    // Test assessment service constructor
    console.log('🔧 Creating AssessmentService...');
    const assessmentService = new AssessmentService(db);
    console.log('✅ AssessmentService created successfully');
    
    // Test listAssessments first
    console.log('📋 Testing listAssessments...');
    const assessments = await assessmentService.listAssessments();
    console.log('✅ Assessments listed:', assessments);
    
    // Test startAssessment
    console.log('🚀 Testing startAssessment...');
    const result = await assessmentService.startAssessment('simulateProfit', 'test-user-123');
    
    console.log('✅ Assessment started successfully:', result);
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

testAssessment(); 