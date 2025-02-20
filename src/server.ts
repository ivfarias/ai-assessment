import fastify, { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import cors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from "@fastify/swagger-ui";
import dotenv from 'dotenv';
import indexRouter from './routes/index.js';
import { logger } from './middleware/logger.js';
import db from './config/mongodb.js';

dotenv.config();

let serverInstance: FastifyInstance = null;

const setupServer = async () => {
  if (serverInstance) {
    return serverInstance;
  }

  const app = fastify({
    logger: true,
  });

  try {
    // Database
    await app.register(db);

    // Swagger docs
    await app.register(fastifySwagger, {
      swagger: {
        info: {
          title: 'Kyte AI API',
          description: 'Assistant AI API Documentation',
          version: '1.0.0'
        },
        host: process.env.NODE_ENV === 'production' ? 'https://kyte-ai.vercel.app' : 'localhost:3000',
        schemes: ['http', 'https'],
        consumes: ['application/json'],
        produces: ['application/json'],
        tags: [
          { name: 'webhook', description: 'WhatsApp Webhook endpoints' },
          { name: 'system', description: 'System endpoints' }
        ],
      }
    });

    await app.register(fastifySwaggerUI, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false
      }
    });

    // plugins
    await app.register(fastifyCookie);
    await app.register(fastifyHelmet);
    await app.register(cors);

    // Middlewares
    app.addHook('onRequest', logger);

    // Routes
    await app.register(indexRouter);

    // Catch 404
    app.setNotFoundHandler((_, reply) => {
      reply.status(404).send({ error: 'Not Found' });
    });

    // Error handler
    app.setErrorHandler((error, request, reply) => {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
        body: request.body,
      });

      reply.status(error.statusCode || 500).send({
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error : {},
      });
    });

    await app.ready();

    serverInstance = app;
    return app;
  } catch (error) {
    console.error('Failed to setup server:', error);
    throw error;
  }
};

// local development
if (process.env.NODE_ENV !== 'production') {
  const start = async () => {
    try {
      const server = await setupServer();
      await server.listen({
        port: Number(process.env.PORT) || 3000,
        host: 'localhost',
      });
    } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  };
  start();
}

export default async (req, res) => {
  try {
    const server = await setupServer();
    server.server.emit('request', req, res);
  } catch (error) {
    console.error('Error handling request:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
};
