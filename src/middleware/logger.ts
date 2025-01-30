import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';

export const logger = (request: FastifyRequest, _: FastifyReply, next: HookHandlerDoneFunction) => {
  console.log(`${new Date().toISOString()} - ${request.method} ${request.url}`);
  next();
};
