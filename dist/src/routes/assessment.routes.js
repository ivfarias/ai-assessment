import { AssessmentController } from '../controllers/assessment.controller.js';
import { assessmentSchemas } from '../schemas/assessment.schema.js';
export default async function assessmentRoutes(fastify) {
    const assessmentController = new AssessmentController();
    // Register schemas
    fastify.addSchema(assessmentSchemas.startAssessment);
    fastify.addSchema(assessmentSchemas.processAnswer);
    fastify.addSchema(assessmentSchemas.getStatus);
    // Assessment endpoints
    fastify.post('/assessments/:name/start', {
        schema: {
            tags: ['assessments'],
            description: 'Start a new assessment',
            params: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Assessment name',
                        enum: [
                            'simulateProfit',
                            'financialHealthRadar',
                            'operationalIndependenceTest',
                            'toolScanner',
                            'standardizationThermometer',
                            'customerLoyaltyPanel',
                            'customerAcquisitionMap',
                            'marketStrategyScanner',
                            'organizationalXray',
                            'contextDiagnosis'
                        ]
                    }
                },
                required: ['name']
            },
            body: {
                type: 'object',
                properties: {
                    userId: { type: 'string' },
                    context: {
                        type: 'object',
                        additionalProperties: true
                    }
                },
                required: ['userId']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        assessmentName: { type: 'string' },
                        currentStep: {
                            type: 'object',
                            properties: {
                                key: { type: 'string' },
                                prompt: { type: 'string' }
                            }
                        },
                        progress: {
                            type: 'object',
                            properties: {
                                current: { type: 'number' },
                                total: { type: 'number' }
                            }
                        }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, assessmentController.startAssessment);
    fastify.post('/assessments/:name/answer', {
        schema: {
            tags: ['assessments'],
            description: 'Submit an answer for the current assessment step',
            params: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Assessment name'
                    }
                },
                required: ['name']
            },
            body: {
                type: 'object',
                properties: {
                    userId: { type: 'string' },
                    answer: { type: 'string' },
                    stepKey: { type: 'string' }
                },
                required: ['userId', 'answer']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        assessmentName: { type: 'string' },
                        nextStep: {
                            type: 'object',
                            properties: {
                                key: { type: 'string' },
                                prompt: { type: 'string' }
                            }
                        },
                        progress: {
                            type: 'object',
                            properties: {
                                current: { type: 'number' },
                                total: { type: 'number' }
                            }
                        },
                        results: {
                            type: 'object',
                            additionalProperties: true
                        },
                        insights: {
                            type: 'array',
                            items: { type: 'string' }
                        }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, assessmentController.processAnswer);
    fastify.get('/assessments/:name/status', {
        schema: {
            tags: ['assessments'],
            description: 'Get the current status of an assessment',
            params: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Assessment name'
                    }
                },
                required: ['name']
            },
            querystring: {
                type: 'object',
                properties: {
                    userId: { type: 'string' }
                },
                required: ['userId']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        assessmentName: { type: 'string' },
                        currentStep: {
                            type: 'object',
                            properties: {
                                key: { type: 'string' },
                                prompt: { type: 'string' }
                            }
                        },
                        progress: {
                            type: 'object',
                            properties: {
                                current: { type: 'number' },
                                total: { type: 'number' }
                            }
                        },
                        answers: {
                            type: 'object',
                            additionalProperties: true
                        }
                    }
                }
            }
        }
    }, assessmentController.getStatus);
    fastify.get('/assessments', {
        schema: {
            tags: ['assessments'],
            description: 'Get list of available assessments',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        assessments: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    description: { type: 'string' },
                                    category: { type: 'string' },
                                    steps: { type: 'number' }
                                }
                            }
                        }
                    }
                }
            }
        }
    }, assessmentController.listAssessments);
}
//# sourceMappingURL=assessment.routes.js.map