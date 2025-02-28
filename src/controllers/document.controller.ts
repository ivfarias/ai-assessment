import { FastifyReply, FastifyRequest } from 'fastify';
import { processAndStoreDocument } from '../scripts/documentEmbeddingService.js';
import { documentsPayloadSchema, TDocumentsPayload } from '../domain/schemas/document.validation.js';
import { CleanupService } from '../services/cleanup.service.js';

export class DocumentController {
  private cleanupService: CleanupService;

  constructor() {
    this.cleanupService = new CleanupService();
  }

  async processDocuments(request: FastifyRequest<{ Body: TDocumentsPayload }>, reply: FastifyReply) {
    try {
      const validationResult = documentsPayloadSchema.safeParse(request.body);
      
      if (!validationResult.success) {
        return reply.status(400).send({
          status: 'error',
          message: 'Invalid request body',
          errors: validationResult.error.errors.map(error => ({
            path: error.path.join('.'),
            message: error.message
          }))
        });
      }

      const results = [];
      const { articles } = validationResult.data;

      for (const article of articles) {
        const result = await processAndStoreDocument({
          content: article.content,
          language: article.language,
          root_cause: article.root_cause,
        });
        results.push(result);
      }

      return reply.status(200).send({
        status: 'success',
        data: {
          processed: results.length,
          total: articles.length,
        }
      });
    } catch (error) {
      console.error('Error processing documents:', error);
      return reply.status(500).send({ 
        status: 'error',
        message: 'Failed to process documents'
      });
    }
  }

  async cleanDocuments(_: FastifyRequest, reply: FastifyReply) {
    try {
      await this.cleanupService.cleanDocuments();
      return reply.status(200).send({
        status: 'success',
        message: 'Documents cleaned successfully'
      });
    } catch (error) {
      console.error('Error cleaning documents:', error);
      return reply.status(500).send({
        status: 'error',
        message: 'Failed to clean documents'
      });
    }
  }

  async cleanChatHistory(_: FastifyRequest, reply: FastifyReply) {
    try {
      await this.cleanupService.cleanChatHistory();
      return reply.status(200).send({
        status: 'success',
        message: 'Chat history cleaned successfully'
      });
    } catch (error) {
      console.error('Error cleaning chat history:', error);
      return reply.status(500).send({
        status: 'error',
        message: 'Failed to clean chat history'
      });
    }
  }
}
