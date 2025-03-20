# Kyte AI Assistant

An AI-powered WhatsApp assistant designed to provide intelligent responses and support on kyte through WhatsApp messages.

## 🚀 Features

- WhatsApp API integration
- Multi-language support (English, Portuguese, Spanish)
- Context-aware conversations
- Intelligent intent analysis
- Conversation memory and summarization
- Vector-based semantic search
- Automatic feedback collection
- Swagger API documentation

## 🛠️ Technologies

- **Runtime:** Node.js
- **Language:** TypeScript
- **Framework:** Fastify
- **AI/ML:** OpenAI GPT-4, Embeddings
- **Database:** MongoDB
- **Documentation:** Swagger/OpenAPI
- **Messaging:** WhatsApp API

## 📦 Project Structure

```
src/
├── config/         # Configuration files
├── controllers/    # Request handlers
├── domain/        # Interfaces and types
├── infrastructure/# Cache and memory management
├── middleware/    # Application middleware
├── repositories/  # Data access layer
├── routes/        # API routes
├── schemas/       # Request/Response schemas
├── services/      # Business logic
└── utils/         # Helper functions
```

## 🔧 Setup


1. Install dependencies:
```bash
npm install
```

Required environment variables:
```
OPENAI_API_KEY=your_openai_api_key
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WEBHOOK_VERIFY_TOKEN=your_webhook_token
MONGODB_URI=your_mongodb_uri
```

2. Start the development server:
```bash
npm run dev
```

## 🌐 API Endpoints

- `GET /` - Health check endpoint
- `GET /docs` - Swagger documentation
- `GET /webhook` - WhatsApp webhook verification
- `POST /webhook` - WhatsApp message webhook

## 🤖 Key Features Documentation

### Message Processing

The system processes messages through several stages:
1. Intent Analysis
2. Language Detection
3. Context Retrieval
4. Response Generation
5. Feedback Collection

### Conversation Memory

- Maintains conversation history
- Generates summaries for context
- Uses vector embeddings for semantic search

### Multi-language Support

Automatically detects and responds in:
- English (en)
- Portuguese (pt)
- Spanish (es)

