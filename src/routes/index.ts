import { FastifyInstance } from 'fastify';
import { webhookRoutes } from './webhook.routes.js';
import { healthRoutes } from './health.routes.js';

async function routes(app: FastifyInstance) {
  await healthRoutes(app);
  await webhookRoutes(app);
}

export default routes;
