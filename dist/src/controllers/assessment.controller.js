import { AssessmentService } from '../services/assessment.service.js';
import { getDb } from '../config/mongodb.js';
export class AssessmentController {
    assessmentService;
    constructor() {
        this.assessmentService = new AssessmentService(getDb());
    }
    async startAssessment(request, reply) {
        try {
            const { name } = request.params;
            const { userId, context } = request.body;
            console.log(`Starting assessment: ${name} for user: ${userId}`);
            const result = await this.assessmentService.startAssessment(name, userId, context);
            return reply.status(200).send({
                status: 'started',
                assessmentName: name,
                currentStep: result.currentStep,
                progress: result.progress
            });
        }
        catch (error) {
            console.error('Error starting assessment:', error);
            if (error.message.includes('Unknown assessment')) {
                return reply.status(400).send({
                    error: 'INVALID_ASSESSMENT',
                    message: error.message
                });
            }
            return reply.status(500).send({
                error: 'INTERNAL_ERROR',
                message: 'Failed to start assessment'
            });
        }
    }
    async processAnswer(request, reply) {
        try {
            const { name } = request.params;
            const { userId, answer, stepKey } = request.body;
            console.log(`Processing answer for assessment: ${name}, user: ${userId}, step: ${stepKey}`);
            const result = await this.assessmentService.processAnswer(name, userId, answer, stepKey);
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
        }
        catch (error) {
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
            return reply.status(500).send({
                error: 'INTERNAL_ERROR',
                message: 'Failed to process assessment answer'
            });
        }
    }
    async getStatus(request, reply) {
        try {
            const { name } = request.params;
            const { userId } = request.query;
            console.log(`Getting status for assessment: ${name}, user: ${userId}`);
            const result = await this.assessmentService.getStatus(name, userId);
            return reply.status(200).send({
                status: result.status,
                assessmentName: name,
                currentStep: result.currentStep,
                progress: result.progress,
                answers: result.answers
            });
        }
        catch (error) {
            console.error('Error getting assessment status:', error);
            if (error.message.includes('No active assessment')) {
                return reply.status(404).send({
                    error: 'NO_ACTIVE_ASSESSMENT',
                    message: error.message
                });
            }
            return reply.status(500).send({
                error: 'INTERNAL_ERROR',
                message: 'Failed to get assessment status'
            });
        }
    }
    async listAssessments(request, reply) {
        try {
            console.log('Listing available assessments');
            const assessments = await this.assessmentService.listAssessments();
            return reply.status(200).send({
                assessments
            });
        }
        catch (error) {
            console.error('Error listing assessments:', error);
            return reply.status(500).send({
                error: 'INTERNAL_ERROR',
                message: 'Failed to list assessments'
            });
        }
    }
}
//# sourceMappingURL=assessment.controller.js.map