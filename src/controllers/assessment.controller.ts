import { FastifyRequest, FastifyReply } from 'fastify';
import { AssessmentService } from '../services/assessment.service.js';
import { getDb } from '../config/mongodb.js';

interface StartAssessmentRequest {
  Params: { name: string };
  Body: { userId: string; context?: any };
}

interface ProcessAnswerRequest {
  Params: { name: string };
  Body: { userId: string; answer: string; stepKey?: string };
}

interface GetStatusRequest {
  Params: { name: string };
  Querystring: { userId: string };
}

export class AssessmentController {
  private assessmentService: AssessmentService | null = null;

  private getAssessmentService(): AssessmentService {
    if (!this.assessmentService) {
      try {
        const db = getDb();
        if (!db) {
          throw new Error('Database not available');
        }
        this.assessmentService = new AssessmentService(db);
      } catch (error) {
        console.error('Failed to initialize AssessmentService:', error);
        throw new Error('Assessment service not available');
      }
    }
    return this.assessmentService;
  }

  async startAssessment(request: FastifyRequest<StartAssessmentRequest>, reply: FastifyReply) {
    try {
      const { name } = request.params;
      const { userId, context } = request.body;

      console.log(`Starting assessment: ${name} for user: ${userId}`);

      const assessmentService = this.getAssessmentService();
      const result = await assessmentService.startAssessment(name, userId, context);

      return reply.status(200).send({
        status: 'started',
        assessmentName: name,
        currentStep: result.currentStep,
        progress: result.progress
      });

    } catch (error: any) {
      console.error('Error starting assessment:', error);
      
      if (error.message.includes('Unknown assessment')) {
        return reply.status(400).send({
          error: 'INVALID_ASSESSMENT',
          message: error.message
        });
      }

      if (error.message.includes('Assessment service not available') || error.message.includes('Database not available')) {
        return reply.status(503).send({
          error: 'SERVICE_UNAVAILABLE',
          message: 'Assessment service is temporarily unavailable'
        });
      }

      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to start assessment'
      });
    }
  }

  async processAnswer(request: FastifyRequest<ProcessAnswerRequest>, reply: FastifyReply) {
    try {
      const { name } = request.params;
      const { userId, answer, stepKey } = request.body;

      console.log(`Processing answer for assessment: ${name}, user: ${userId}, step: ${stepKey}`);

      const assessmentService = this.getAssessmentService();
      const result = await assessmentService.processAnswer(name, userId, answer, stepKey);

      if (result.status === 'completed') {
        return reply.status(200).send({
          status: 'completed',
          assessmentName: name,
          progress: result.progress,
          results: result.results,
          insights: result.insights
        });
      }

      return reply.status(200).send({
        status: 'in_progress',
        assessmentName: name,
        nextStep: result.nextStep,
        progress: result.progress
      });

    } catch (error: any) {
      console.error('Error processing assessment answer:', error);
      
      if (error.message.includes('No active assessment')) {
        return reply.status(400).send({
          error: 'NO_ACTIVE_ASSESSMENT',
          message: error.message
        });
      }

      if (error.message.includes('Invalid step')) {
        return reply.status(400).send({
          error: 'INVALID_STEP',
          message: error.message
        });
      }

      if (error.message.includes('Assessment service not available') || error.message.includes('Database not available')) {
        return reply.status(503).send({
          error: 'SERVICE_UNAVAILABLE',
          message: 'Assessment service is temporarily unavailable'
        });
      }

      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to process assessment answer'
      });
    }
  }

  async getStatus(request: FastifyRequest<GetStatusRequest>, reply: FastifyReply) {
    try {
      const { name } = request.params;
      const { userId } = request.query;

      console.log(`Getting status for assessment: ${name}, user: ${userId}`);

      const assessmentService = this.getAssessmentService();
      const result = await assessmentService.getStatus(name, userId);

      return reply.status(200).send({
        status: result.status,
        assessmentName: name,
        currentStep: result.currentStep,
        progress: result.progress,
        answers: result.answers
      });

    } catch (error: any) {
      console.error('Error getting assessment status:', error);
      
      if (error.message.includes('No active assessment')) {
        return reply.status(404).send({
          error: 'NO_ACTIVE_ASSESSMENT',
          message: error.message
        });
      }

      if (error.message.includes('Assessment service not available') || error.message.includes('Database not available')) {
        return reply.status(503).send({
          error: 'SERVICE_UNAVAILABLE',
          message: 'Assessment service is temporarily unavailable'
        });
      }

      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to get assessment status'
      });
    }
  }

  async listAssessments(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('Listing available assessments');

      const assessmentService = this.getAssessmentService();
      const assessments = await assessmentService.listAssessments();

      return reply.status(200).send({
        assessments
      });

    } catch (error: any) {
      console.error('Error listing assessments:', error);
      
      if (error.message.includes('Assessment service not available') || error.message.includes('Database not available')) {
        return reply.status(503).send({
          error: 'SERVICE_UNAVAILABLE',
          message: 'Assessment service is temporarily unavailable'
        });
      }

      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to list assessments'
      });
    }
  }
} 