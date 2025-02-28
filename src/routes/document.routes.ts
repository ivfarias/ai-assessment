import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { processAndStoreDocument } from '../scripts/documentEmbeddingService.js';
import { documentSchema } from '../schemas/document.schema.js';
import { documentsPayloadSchema, type TDocumentsPayload } from '../domain/schemas/document.validation.js';

export async function documentRoutes(app: FastifyInstance) {
  app.post('/process-document', {
    schema: documentSchema
  }, async (request: FastifyRequest<{ Body: TDocumentsPayload }>, reply: FastifyReply) => {
    try {
      // Validate request body
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
  });
}
