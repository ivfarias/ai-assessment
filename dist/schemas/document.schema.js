export const documentSchema = {
    tags: ['documents'],
    description: 'Process and store documents',
    body: {
        type: 'object',
        required: ['articles'],
        properties: {
            articles: {
                type: 'array',
                items: {
                    type: 'object',
                    required: ['content', 'language'],
                    properties: {
                        root_cause: { type: 'string' },
                        language: { type: 'string' },
                        content: { type: 'string' },
                        metadata: {
                            type: 'object',
                            additionalProperties: true
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
                status: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        processed: { type: 'number' },
                        total: { type: 'number' },
                    }
                }
            }
        },
        400: {
            type: 'object',
            properties: {
                status: { type: 'string' },
                message: { type: 'string' },
                errors: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            path: { type: 'string' },
                            message: { type: 'string' }
                        }
                    }
                }
            }
        }
    }
};
export const cleanupSchema = {
    tags: ['documents'],
    description: 'Clean up stored documents or chat history',
    response: {
        200: {
            type: 'object',
            properties: {
                status: { type: 'string' },
                message: { type: 'string' }
            }
        },
        500: {
            type: 'object',
            properties: {
                status: { type: 'string' },
                message: { type: 'string' }
            }
        }
    }
};
//# sourceMappingURL=document.schema.js.map