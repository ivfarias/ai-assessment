import { Db } from "mongodb";
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { v4 as uuidv4 } from 'uuid';

interface AssessmentKnowledge {
  id: string;
  type: 'assessment_description' | 'assessment_step' | 'business_tip' | 'question_example';
  assessment_name?: string;
  content: string;
  embedding: number[];
  metadata: {
    category?: string;
    difficulty?: string;
    business_stage?: string;
    tags?: string[];
  };
  score?: number;
  createdAt: Date;
}

export class AssessmentEmbeddingService {
  private embeddings: OpenAIEmbeddings;
  private textSplitter: RecursiveCharacterTextSplitter;
  private db: Db;

  constructor(db: Db) {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-ada-002',
    });
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    this.db = db;
  }

  /**
   * Initialize the assessment knowledge base with predefined content
   */
  async initializeKnowledgeBase(): Promise<void> {
    const collection = this.db.collection('AssessmentKnowledge');
    
    // Check if knowledge base already exists
    const existingCount = await collection.countDocuments();
    if (existingCount > 0) {
      console.log('Assessment knowledge base already exists, skipping initialization');
      return;
    }

    const knowledgeItems = this.generateKnowledgeItems();
    
    for (const item of knowledgeItems) {
      const embedding = await this.embeddings.embedQuery(item.content);
      await collection.insertOne({
        ...item,
        embedding,
        createdAt: new Date(),
      });
    }

    console.log(`Initialized assessment knowledge base with ${knowledgeItems.length} items`);
  }

  /**
   * Search for relevant assessment knowledge based on user query
   */
  async searchAssessmentKnowledge(query: string, topK: number = 3): Promise<AssessmentKnowledge[]> {
    const collection = this.db.collection('AssessmentKnowledge');
    const queryVector = await this.embeddings.embedQuery(query);

    const results = await collection
      .aggregate([
        {
          $vectorSearch: {
            index: 'assessment_knowledge_index',
            path: 'embedding',
            queryVector,
            limit: topK,
            numCandidates: topK * 10
          }
        },
        {
          $project: {
            id: 1,
            type: 1,
            assessment_name: 1,
            content: 1,
            metadata: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ])
      .toArray();

    return results.map(doc => ({
      id: doc.id,
      type: doc.type,
      assessment_name: doc.assessment_name,
      content: doc.content,
      embedding: [], // Not needed in response
      metadata: doc.metadata,
      score: doc.score, // Include the similarity score
      createdAt: new Date(),
    }));
  }

  /**
   * Generate predefined knowledge items for assessments
   */
  private generateKnowledgeItems(): Omit<AssessmentKnowledge, 'embedding' | 'createdAt'>[] {
    return [
      // Assessment descriptions
      {
        id: uuidv4(),
        type: 'assessment_description',
        assessment_name: 'simulateProfit',
        content: 'Profit simulation analysis helps business owners understand their financial performance by calculating revenue, costs, and profit margins. This assessment identifies improvement opportunities and helps optimize pricing strategies.',
        metadata: { category: 'finance', business_stage: 'all', tags: ['profit', 'revenue', 'costs', 'margins'] }
      },
      {
        id: uuidv4(),
        type: 'assessment_description',
        assessment_name: 'financialHealthRadar',
        content: 'Financial health radar evaluates business stability through revenue predictability and cash flow management. It identifies financial health indicators and helps prevent cash flow crises.',
        metadata: { category: 'finance', business_stage: 'all', tags: ['cash_flow', 'predictability', 'stability'] }
      },
      {
        id: uuidv4(),
        type: 'assessment_description',
        assessment_name: 'operationalIndependenceTest',
        content: 'Operational independence test measures how dependent the business is on the owner. It evaluates operational efficiency and identifies automation opportunities to reduce owner dependency.',
        metadata: { category: 'operations', business_stage: 'growth', tags: ['automation', 'efficiency', 'dependency'] }
      },
      {
        id: uuidv4(),
        type: 'assessment_description',
        assessment_name: 'customerLoyaltyPanel',
        content: 'Customer loyalty panel analyzes customer retention and loyalty metrics. It evaluates customer relationship strength and identifies strategies to increase repeat business.',
        metadata: { category: 'customers', business_stage: 'all', tags: ['loyalty', 'retention', 'customers'] }
      },
      {
        id: uuidv4(),
        type: 'assessment_description',
        assessment_name: 'marketStrategyScanner',
        content: 'Market strategy scanner evaluates competitive positioning and strategic planning. It analyzes market awareness and innovation rate to help businesses stay competitive.',
        metadata: { category: 'strategy', business_stage: 'growth', tags: ['strategy', 'competition', 'innovation'] }
      },

      // Business tips
      {
        id: uuidv4(),
        type: 'business_tip',
        content: 'To improve profitability, focus on increasing your profit margin by either raising prices strategically or reducing costs without compromising quality. Track your key metrics regularly.',
        metadata: { category: 'finance', difficulty: 'beginner', tags: ['profit', 'pricing', 'costs'] }
      },
      {
        id: uuidv4(),
        type: 'business_tip',
        content: 'Customer loyalty is built through consistent quality, excellent service, and building relationships. Consider implementing a loyalty program or personalized communication.',
        metadata: { category: 'customers', difficulty: 'beginner', tags: ['loyalty', 'service', 'relationships'] }
      },
      {
        id: uuidv4(),
        type: 'business_tip',
        content: 'Operational efficiency can be improved by documenting processes, automating repetitive tasks, and training team members to handle multiple responsibilities.',
        metadata: { category: 'operations', difficulty: 'intermediate', tags: ['efficiency', 'automation', 'processes'] }
      },
      {
        id: uuidv4(),
        type: 'business_tip',
        content: 'Market strategy should include regular competitor analysis, clear differentiation, and continuous innovation. Stay updated with industry trends and customer needs.',
        metadata: { category: 'strategy', difficulty: 'intermediate', tags: ['strategy', 'competition', 'innovation'] }
      },

      // Question examples
      {
        id: uuidv4(),
        type: 'question_example',
        content: 'What is your current monthly revenue? This helps us understand your business size and growth potential.',
        metadata: { category: 'finance', difficulty: 'beginner', tags: ['revenue', 'metrics'] }
      },
      {
        id: uuidv4(),
        type: 'question_example',
        content: 'How many active customers do you have? This shows the size of your customer base and potential for growth.',
        metadata: { category: 'customers', difficulty: 'beginner', tags: ['customers', 'base'] }
      },
      {
        id: uuidv4(),
        type: 'question_example',
        content: 'On a scale of 1-5, how well can you predict next month\'s revenue? This indicates business stability and planning capability.',
        metadata: { category: 'finance', difficulty: 'intermediate', tags: ['predictability', 'planning'] }
      },
      {
        id: uuidv4(),
        type: 'question_example',
        content: 'How do you differentiate yourself from competitors? This reveals your unique value proposition and market positioning.',
        metadata: { category: 'strategy', difficulty: 'intermediate', tags: ['differentiation', 'positioning'] }
      }
    ];
  }

  /**
   * Add new knowledge item to the database
   */
  async addKnowledgeItem(item: Omit<AssessmentKnowledge, 'embedding' | 'createdAt'>): Promise<void> {
    const collection = this.db.collection('AssessmentKnowledge');
    const embedding = await this.embeddings.embedQuery(item.content);
    
    await collection.insertOne({
      ...item,
      embedding,
      createdAt: new Date(),
    });
  }

  /**
   * Get assessment suggestions based on user query
   */
  async getAssessmentSuggestions(userQuery: string): Promise<{
    suggestedAssessment: string;
    confidence: number;
    reasoning: string;
  }[]> {
    const relevantKnowledge = await this.searchAssessmentKnowledge(userQuery, 5);
    
    if (relevantKnowledge.length === 0) {
      return [];
    }

    // Group by assessment and calculate confidence using actual similarity scores
    const assessmentScores: Record<string, { totalScore: number; count: number; reasons: string[] }> = {};
    
    for (const item of relevantKnowledge) {
      if (item.assessment_name) {
        if (!assessmentScores[item.assessment_name]) {
          assessmentScores[item.assessment_name] = { totalScore: 0, count: 0, reasons: [] };
        }
        // Use the similarity score from vector search (assuming it's available in metadata)
        const similarityScore = (item as any).score || 0.5; // Fallback if score not available
        assessmentScores[item.assessment_name].totalScore += similarityScore;
        assessmentScores[item.assessment_name].count += 1;
        assessmentScores[item.assessment_name].reasons.push(item.content);
      }
    }
    
    // Convert to suggestions with proper confidence calculation
    const suggestions = Object.entries(assessmentScores)
      .map(([assessment, data]) => ({
        suggestedAssessment: assessment,
        confidence: data.totalScore / data.count, // Average similarity score
        reasoning: data.reasons[0] || 'Relevant to your business needs'
      }))
      .filter(suggestion => suggestion.confidence > 0.7) // Higher threshold for relevance
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
    
    return suggestions;
  }
} 