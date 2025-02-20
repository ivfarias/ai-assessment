
export const healthCheckSchema = {
  tags: ['system'],
  description: 'Health check endpoint',
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  }
};