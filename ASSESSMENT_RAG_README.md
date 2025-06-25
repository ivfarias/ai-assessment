# RAG-Based Assessment System

This document describes the new RAG (Retrieval-Augmented Generation) based assessment system that makes assessment processing more reliable and intelligent.

## Overview

The new system uses LangChain and vector embeddings to:
1. **Detect assessment intent** more accurately using semantic similarity
2. **Process assessment answers** reliably without relying on AI tool calls
3. **Suggest relevant assessments** based on user queries
4. **Provide contextual responses** using a knowledge base of assessment information

## Architecture

### Core Components

1. **AssessmentRagService** (`src/services/assessmentRagService.ts`)
   - Main service that handles assessment detection and processing
   - Uses RAG to determine if a user wants to start an assessment
   - Processes assessment answers and manages the flow

2. **AssessmentEmbeddingService** (`src/services/assessmentEmbeddingService.ts`)
   - Manages the knowledge base of assessment-related information
   - Creates and searches embeddings for assessment content
   - Provides assessment suggestions based on user queries

3. **Updated WhatsApp Service** (`src/services/whatsapp.service.ts`)
   - Integrates the RAG-based assessment system
   - Prioritizes assessment processing over general queries
   - Maintains backward compatibility

### Knowledge Base

The system maintains a knowledge base with the following types of content:

- **Assessment Descriptions**: Detailed explanations of what each assessment does
- **Business Tips**: General advice related to different business areas
- **Question Examples**: Sample questions and their purposes
- **Assessment Steps**: Individual steps within each assessment

## How It Works

### 1. Assessment Intent Detection

When a user sends a message, the system:

1. Checks if the user is currently in an assessment (process answer)
2. Uses RAG to detect if they want to start a new assessment
3. Falls back to cosine similarity if RAG doesn't find a match
4. Routes to general query processing if no assessment intent is detected

### 2. Assessment Processing

For assessment answers:
1. Processes the answer through the existing assessment orchestrator
2. Returns the next question or completion message
3. Saves results to MongoDB as before

### 3. Assessment Suggestions

The AI can suggest relevant assessments using the `suggest_assessment` tool:
1. Analyzes user query for business-related concerns
2. Searches the knowledge base for relevant assessments
3. Provides reasoning for the suggestion
4. Offers to start the assessment if the user agrees

## Benefits

### Reliability
- **No dependency on AI tool calls** for assessment processing
- **Fallback mechanisms** ensure the system always works
- **Direct assessment detection** using semantic similarity

### Intelligence
- **Contextual understanding** of user intent
- **Smart assessment suggestions** based on business needs
- **Rich knowledge base** for better responses

### Maintainability
- **Modular design** with clear separation of concerns
- **Easy to extend** with new assessments or knowledge
- **Comprehensive logging** for debugging

## Usage

### Starting an Assessment

Users can start assessments in several ways:

1. **Direct request**: "I want to analyze my profitability"
2. **Question-based**: "How can I improve my profit margins?"
3. **General concern**: "I'm having trouble with cash flow"

The system will automatically detect the intent and suggest or start the appropriate assessment.

### During Assessment

Users simply answer the questions naturally. The system:
- Processes each answer
- Provides the next question
- Shows progress
- Delivers insights upon completion

### Assessment Suggestions

The AI can proactively suggest assessments when users ask business-related questions:

```
User: "I'm not sure if my pricing is right"
AI: "💡 Based on your question about pricing, I suggest the analysis: simulateProfit

📋 What this analysis does:
Analyzes business profitability by calculating revenue, costs, and profit margins...

🤔 Why it would be helpful: This will help you understand if your pricing strategy is working...

✅ Would you like to start this analysis now?
```

## Technical Details

### Vector Search

The system uses MongoDB's vector search capabilities:
- **Index**: `assessment_knowledge_index`
- **Embedding model**: `text-embedding-ada-002`
- **Similarity threshold**: 0.6 for suggestions, 0.7 for direct detection

### Database Collections

- **AssessmentKnowledge**: Stores assessment-related content with embeddings
- **user_profiles**: Existing collection for user data and assessment progress

### Environment Variables

No new environment variables are required. The system uses existing:
- `OPENAI_API_KEY`: For embeddings and completions
- MongoDB connection settings

## Migration

The new system is **backward compatible**:
- Existing assessments continue to work
- User profiles and progress are preserved
- No changes needed to existing assessment modules

## Future Enhancements

1. **Dynamic Knowledge Base**: Add new assessment content automatically
2. **User Feedback Integration**: Learn from user interactions
3. **Multi-language Support**: Extend to other languages
4. **Assessment Combinations**: Suggest multiple related assessments
5. **Progress Tracking**: Better visualization of assessment progress

## Troubleshooting

### Common Issues

1. **Assessment not detected**: Check if the knowledge base is initialized
2. **Low confidence scores**: Review assessment descriptions and user queries
3. **Vector search errors**: Verify MongoDB vector search index exists

### Debugging

Enable debug logging by setting:
```bash
DEBUG=assessment-rag
```

### Manual Initialization

If the knowledge base fails to initialize automatically:

```bash
npm run init-assessment-knowledge
```

This will create the knowledge base manually and can be run multiple times safely. 