export const webhookPostSchema = {
  tags: ['webhook'],
  description: 'WhatsApp webhook endpoint for receiving messages',
  body: {
    type: 'object',
    properties: {
      entry: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            changes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  value: {
                    type: 'object',
                    properties: {
                      messaging_product: { type: 'string' },
                      metadata: {
                        type: 'object',
                        properties: {
                          display_phone_number: { type: 'string' },
                          phone_number_id: { type: 'string' }
                        }
                      },
                      contacts: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            profile: {
                              type: 'object',
                              properties: {
                                name: { type: 'string' }
                              }
                            },
                            wa_id: { type: 'string' }
                          }
                        }
                      },
                      messages: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            from: { type: 'string' },
                            id: { type: 'string' },
                            timestamp: { type: 'string' },
                            text: {
                              type: 'object',
                              properties: {
                                body: { type: 'string' }
                              }
                            },
                            type: { type: 'string' }
                          }
                        }
                      }
                    }
                  },
                  field: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' }
      }
    },
    500: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};

export const webhookVerificationSchema = {
  tags: ['webhook'],
  description: 'WhatsApp webhook verification endpoint',
  querystring: {
    type: 'object',
    properties: {
      'hub.mode': { type: 'string' },
      'hub.verify_token': { type: 'string' },
      'hub.challenge': { type: 'string' }
    },
    required: ['hub.mode', 'hub.verify_token', 'hub.challenge']
  },
  response: {
    200: { type: 'string' },
    403: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};
