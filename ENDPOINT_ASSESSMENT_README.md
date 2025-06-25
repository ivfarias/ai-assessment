# Endpoint-Based Assessment System

This document describes the new REST API-based assessment system that provides reliable, scalable, and maintainable assessment processing.

## 🎯 **Overview**

The new system treats each assessment as a proper REST endpoint with:
- **Clear API contracts** with defined input/output
- **HTTP status codes** for proper error handling
- **Independent testing** capabilities
- **Better observability** and monitoring
- **Scalable architecture** that can be deployed independently

## 🏗️ **Architecture**

### **API Endpoints**

```
POST /assessments/:name/start     - Start a new assessment
POST /assessments/:name/answer    - Submit an answer
GET  /assessments/:name/status    - Get current status
GET  /assessments                 - List available assessments
```

### **Core Components**

1. **Assessment Routes** (`src/routes/assessment.routes.ts`)
   - REST API endpoints with OpenAPI documentation
   - Request/response validation
   - Error handling

2. **Assessment Controller** (`src/controllers/assessment.controller.ts`)
   - HTTP request handling
   - Response formatting
   - Error management

3. **Assessment Service** (`src/services/assessment.service.ts`)
   - Business logic for assessments
   - State management
   - Integration with existing assessment modules

4. **Assessment Schemas** (`src/schemas/assessment.schema.ts`)
   - Request/response validation schemas
   - OpenAPI documentation

## 📋 **API Reference**

### **Start Assessment**

```http
POST /assessments/simulateProfit/start
Content-Type: application/json

{
  "userId": "user123",
  "context": {
    "businessType": "retail",
    "region": "brazil"
  }
}
```

**Response:**
```json
{
  "status": "started",
  "assessmentName": "simulateProfit",
  "currentStep": {
    "key": "faturamentoMensal",
    "prompt": "What is your current monthly revenue?"
  },
  "progress": {
    "current": 0,
    "total": 3
  }
}
```

### **Submit Answer**

```http
POST /assessments/simulateProfit/answer
Content-Type: application/json

{
  "userId": "user123",
  "answer": "5000",
  "stepKey": "faturamentoMensal"
}
```

**Response (in progress):**
```json
{
  "status": "in_progress",
  "assessmentName": "simulateProfit",
  "nextStep": {
    "key": "custoProdutos",
    "prompt": "What is the cost of your products?"
  },
  "progress": {
    "current": 1,
    "total": 3
  }
}
```

**Response (completed):**
```json
{
  "status": "completed",
  "assessmentName": "simulateProfit",
  "progress": {
    "current": 3,
    "total": 3
  },
  "results": {
    "faturamento": 5000,
    "custos": 3000,
    "margem": 0.4
  },
  "insights": [
    "Your profit margin of 40% is excellent for your industry"
  ]
}
```

### **Get Status**

```http
GET /assessments/simulateProfit/status?userId=user123
```

**Response:**
```json
{
  "status": "in_progress",
  "assessmentName": "simulateProfit",
  "currentStep": {
    "key": "custoProdutos",
    "prompt": "What is the cost of your products?"
  },
  "progress": {
    "current": 1,
    "total": 3
  },
  "answers": {
    "faturamentoMensal": "5000"
  }
}
```

### **List Assessments**

```http
GET /assessments
```

**Response:**
```json
{
  "assessments": [
    {
      "name": "simulateProfit",
      "description": "Analyzes business profitability",
      "category": "finance",
      "steps": 3
    }
  ]
}
```

## 🔧 **Error Handling**

### **HTTP Status Codes**

- `200` - Success
- `400` - Bad Request (invalid input)
- `404` - Not Found (assessment not found)
- `500` - Internal Server Error

### **Error Response Format**

```json
{
  "error": "INVALID_ASSESSMENT",
  "message": "Unknown assessment: invalidAssessment"
}
```

### **Common Error Types**

- `INVALID_ASSESSMENT` - Assessment name doesn't exist
- `NO_ACTIVE_ASSESSMENT` - User has no active assessment
- `INVALID_STEP` - Step key is invalid
- `INTERNAL_ERROR` - Server error

## 🧪 **Testing**

### **Run Tests**

```bash
# Test the endpoint system directly
npm run test-assessment-endpoints

# Test the RAG system
npm run test-assessment-rag

# Initialize knowledge base
npm run init-assessment-knowledge
```

### **Manual Testing**

```bash
# Start an assessment
curl -X POST http://localhost:3000/assessments/simulateProfit/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "test123"}'

# Submit an answer
curl -X POST http://localhost:3000/assessments/simulateProfit/answer \
  -H "Content-Type: application/json" \
  -d '{"userId": "test123", "answer": "5000"}'

# Get status
curl "http://localhost:3000/assessments/simulateProfit/status?userId=test123"
```

## 🔄 **Integration with RAG System**

The RAG system now uses HTTP endpoints instead of direct function calls:

```typescript
// Old way (direct function calls)
const result = await startAssessmentByName(userId, assessmentName, db);

// New way (HTTP endpoints)
const response = await fetch(`${baseUrl}/assessments/${assessmentName}/start`, {
  method: 'POST',
  body: JSON.stringify({ userId, context })
});
```

## 📊 **Benefits**

### **Reliability**
- ✅ HTTP status codes for clear error handling
- ✅ Retry mechanisms built-in
- ✅ Timeout handling
- ✅ Circuit breaker patterns possible

### **Observability**
- ✅ Request/response logging
- ✅ Performance monitoring
- ✅ Error tracking
- ✅ Usage analytics

### **Maintainability**
- ✅ Clear API contracts
- ✅ Independent testing
- ✅ Version control
- ✅ Documentation

### **Scalability**
- ✅ Independent deployment
- ✅ Load balancing
- ✅ Caching strategies
- ✅ Horizontal scaling

## 🚀 **Deployment**

### **Environment Variables**

```bash
# API base URL for internal calls
API_BASE_URL=http://localhost:3000

# MongoDB connection
MONGODB_URI=mongodb://localhost:27017/kyte

# OpenAI API key
OPENAI_API_KEY=your-key-here
```

### **Health Checks**

```bash
# Check if assessments are available
curl http://localhost:3000/assessments

# Check specific assessment
curl http://localhost:3000/assessments/simulateProfit/status?userId=test
```

## 🔮 **Future Enhancements**

1. **Caching Layer**
   - Redis for assessment results
   - CDN for static content

2. **Rate Limiting**
   - Per-user limits
   - Per-assessment limits

3. **Analytics**
   - Assessment completion rates
   - User engagement metrics
   - Performance monitoring

4. **Webhooks**
   - Assessment completion notifications
   - Progress updates
   - Error alerts

5. **Batch Processing**
   - Multiple assessments at once
   - Bulk user processing

## 🐛 **Troubleshooting**

### **Common Issues**

1. **Assessment not starting**
   - Check if assessment name is valid
   - Verify user ID format
   - Check MongoDB connection

2. **Answers not processing**
   - Verify step key matches current step
   - Check user has active assessment
   - Validate answer format

3. **API errors**
   - Check server logs
   - Verify environment variables
   - Test endpoint directly

### **Debug Mode**

Enable debug logging:

```bash
DEBUG=assessment:* npm run dev
```

### **Monitoring**

Monitor these metrics:
- Assessment start success rate
- Answer processing success rate
- Average completion time
- Error rates by assessment type

## 📝 **Migration Guide**

### **From Function-Based to Endpoint-Based**

1. **Update RAG Service**
   - Replace function calls with HTTP requests
   - Add error handling for network issues
   - Update response parsing

2. **Update AI Tools**
   - Modify tool descriptions
   - Update parameter validation
   - Add retry logic

3. **Testing**
   - Run endpoint tests
   - Verify RAG integration
   - Test error scenarios

The new endpoint-based system provides a much more reliable and maintainable foundation for assessment processing, solving the reliability issues you were experiencing with the previous function-based approach. 