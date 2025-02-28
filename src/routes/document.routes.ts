import { FastifyInstance, FastifyRequest } from 'fastify';
import { cleanupSchema, documentSchema } from '../schemas/document.schema.js';
import { DocumentController } from '../controllers/document.controller.js';
import { TDocumentsPayload } from '../domain/schemas/document.validation.js';

export async function documentRoutes(app: FastifyInstance) {
  const documentController = new DocumentController();

  app.post(
    '/document',
    { schema: documentSchema },
    async (request: FastifyRequest<{ Body: TDocumentsPayload }>, reply) => {
      await documentController.processDocuments(request, reply);
    }
  );

  app.delete(
    '/document',
    { schema: cleanupSchema },
    async (request, reply) => {
      documentController.cleanDocuments(request, reply);
    }
  );

  app.delete(
    '/chat-history',
    { schema: cleanupSchema },
    async (request, reply) => {
      documentController.cleanChatHistory(request, reply);
    }
  );
}
