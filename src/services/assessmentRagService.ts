import { Db } from "mongodb";
import { UserProfile } from "../types/profile.js";
import { AssessmentService } from "./assessment.service.js";

interface AssessmentDefinition {
  name: string;
  description: string;
  steps: number;
  category: string;
}

export class AssessmentRagService {
  private db: Db;
  public assessmentService: AssessmentService;

  constructor(db: Db) {
    this.db = db;
    this.assessmentService = new AssessmentService(db);
  }

  /**
   * Get available assessments for the AI to suggest
   */
  getAvailableAssessments(): AssessmentDefinition[] {
    return [
      {
        name: "simulateProfit",
        description: "Analyzes business profitability by calculating revenue, costs, and profit margins. Helps understand financial performance and identify improvement opportunities.",
        steps: 3,
        category: "finance"
      },
      {
        name: "financialHealthRadar", 
        description: "Evaluates financial stability through revenue predictability and cash flow management. Identifies financial health indicators and helps prevent cash flow crises.",
        steps: 2,
        category: "finance"
      },
      {
        name: "operationalIndependenceTest",
        description: "Measures how dependent the business is on the owner. Evaluates operational efficiency and identifies automation opportunities to reduce owner dependency.",
        steps: 3,
        category: "operations"
      },
      {
        name: "toolScanner",
        description: "Analyzes current tools and technology stack. Identifies opportunities for digital transformation and automation.",
        steps: 2,
        category: "technology"
      },
      {
        name: "standardizationThermometer",
        description: "Evaluates product/service consistency and quality standards. Measures operational standardization.",
        steps: 1,
        category: "operations"
      },
      {
        name: "customerLoyaltyPanel",
        description: "Analyzes customer retention and loyalty metrics. Evaluates customer relationship strength and identifies strategies to increase repeat business.",
        steps: 4,
        category: "customers"
      },
      {
        name: "customerAcquisitionMap",
        description: "Maps customer acquisition channels and strategies. Identifies growth opportunities and marketing effectiveness.",
        steps: 1,
        category: "marketing"
      },
      {
        name: "marketStrategyScanner",
        description: "Evaluates competitive positioning and strategic planning. Analyzes market awareness and innovation rate to help businesses stay competitive.",
        steps: 4,
        category: "strategy"
      },
      {
        name: "organizationalXray",
        description: "Analyzes team structure, responsibilities, and company culture. Evaluates organizational maturity.",
        steps: 3,
        category: "organization"
      },
      {
        name: "contextDiagnosis",
        description: "Comprehensive business context analysis including history, goals, and challenges. Provides overall business understanding.",
        steps: 5,
        category: "overview"
      }
    ];
  }

  /**
   * Get user's current assessment status
   */
  async getUserAssessmentStatus(userId: string): Promise<{
    currentAssessment: string | null;
    stepIndex: number;
    progress: { current: number; total: number } | null;
  }> {
    try {
      const user = await this.db.collection<UserProfile>("user_profiles").findOne({ _id: userId });
      
      if (!user?.progress?.currentAssessment) {
        return {
          currentAssessment: null,
          stepIndex: 0,
          progress: null
        };
      }

      const assessment = this.getAvailableAssessments().find(a => a.name === user.progress.currentAssessment);
      
      return {
        currentAssessment: user.progress.currentAssessment,
        stepIndex: user.progress.stepIndex || 0,
        progress: assessment ? {
          current: user.progress.stepIndex || 0,
          total: assessment.steps
        } : null
      };
    } catch (error) {
      console.error('Error getting user assessment status:', error);
      return {
        currentAssessment: null,
        stepIndex: 0,
        progress: null
      };
    }
  }

  /**
   * Start an assessment
   */
  async startAssessment(userId: string, assessmentName: string): Promise<{
    success: boolean;
    currentStep?: string;
    error?: string;
  }> {
    try {
      const result = await this.assessmentService.startAssessment(assessmentName, userId);
      return {
        success: true,
        currentStep: result.currentStep?.goal_prompt
      };
    } catch (error) {
      console.error('Error starting assessment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process an assessment answer
   */
  async processAssessmentAnswer(userId: string, answer: string): Promise<{
    success: boolean;
    nextStep?: string;
    completed?: boolean;
    results?: any;
    insights?: string[];
    error?: string;
  }> {
    try {
      const user = await this.db.collection<UserProfile>("user_profiles").findOne({ _id: userId });
      const currentAssessment = user?.progress?.currentAssessment;
      
      if (!currentAssessment) {
        return {
          success: false,
          error: 'No active assessment'
        };
      }

      const result = await this.assessmentService.processAnswer(currentAssessment, userId, answer);
      
      if (result.status === 'completed') {
        return {
          success: true,
          completed: true,
          results: result.results,
          insights: result.insights
        };
      }

      return {
        success: true,
        nextStep: result.nextStep?.goal_prompt
      };
    } catch (error) {
      console.error('Error processing assessment answer:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
} 