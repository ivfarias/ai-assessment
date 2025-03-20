import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MessageController } from '../controllers/message.controller.js';
import { webhookPostSchema, webhookVerificationSchema } from '../schemas/webhook.schema.js';
import dotenv from 'dotenv';

dotenv.config();

const processedMessages = new Set<string>();

export async function webhookRoutes(app: FastifyInstance) {
  const messageController = new MessageController();

  app.post('/webhook', {
    schema: webhookPostSchema
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    console.log('Received POST request to /webhook');
    console.log('Request body:', JSON.stringify(request.body, null, 2));

    try {
      const { entry } = request.body as any;

      if (entry && entry[0].changes && entry[0].changes[0].value.messages) {
        const message = entry[0].changes[0].value.messages[0];
        const messageId = message.id;

        if (processedMessages.has(messageId)) {
          console.log(`Message ${messageId} has already been processed. Skipping.`);
          return reply.status(200).send();
        }

        processedMessages.add(messageId);
        await messageController.handleWebhook(request, reply);

        const timeout = 5 * 60 * 1000;
        setTimeout(() => {
          processedMessages.delete(messageId);
        }, timeout);
      }
      
      return reply.status(200).send({ status: 'success' });
    } catch (error) {
      console.error('Error processing webhook:', error);
      reply.status(500).send({ error: 'Internal server error' });
    }
  });

  app.get('/webhook', {
    schema: webhookVerificationSchema
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const mode = request.query['hub.mode'];
    const token = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];

    console.log('Received GET request to /webhook');
    console.log(`Mode: ${mode}, Token: ${token}, Challenge: ${challenge}`);

    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      console.log('Webhook verified successfully!');
      reply.status(200).send(challenge);
    } else {
      console.log('Webhook verification failed.');
      reply.status(403).send({ error: 'Webhook verification failed' });
    }
  });
}
