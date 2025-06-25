import { FastifyInstance } from 'fastify';
import { webhookRoutes } from './webhook.routes.js';
import { healthRoutes } from './health.routes.js';
import { documentRoutes } from './document.routes.js';
import assessmentRoutes from './assessment.routes.js';

async function routes(app: FastifyInstance) {
  await healthRoutes(app);
  await webhookRoutes(app);
  await documentRoutes(app);
  await assessmentRoutes(app);
}

export default routes;
