import fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import indexRouter from './routes/index.js';
import { logger } from './middleware/logger.js';

dotenv.config();

const app = fastify();

app.addHook('onRequest', logger);

// Middleware
app.register(fastifyCookie);
app.register(fastifyHelmet);
app.register(cors);

// Routes
app.register(indexRouter);

// Catch 404 and forward to error handler
app.setNotFoundHandler((_, reply) => {
  reply.status(404).send({ error: 'Not Found' });
});

// Error handler
app.setErrorHandler((error, request, reply) => {
  // Log the error with more details
  console.error('Error details:', {
    message: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    body: request.body,
  });

  // Send error response
  reply.status(error.statusCode || 500).send({
    message: error.message,
    error: process.env.NODE_ENV === 'development' ? error : {},
  });
});

// For Vercel serverless deployment and local development
export default app;

// For local development server
if (process.env.NODE_ENV !== 'production') {
  const PORT = Number(process.env.PORT) || 3000;
  console.log(`Starting server on port ${PORT}`);
  app.listen({
    port: PORT,
  });
}
