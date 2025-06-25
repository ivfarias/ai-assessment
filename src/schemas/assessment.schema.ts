export const assessmentSchemas = {
  startAssessment: {
    $id: 'startAssessment',
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

  processAnswer: {
    $id: 'processAnswer',
    type: 'object',
    properties: {
      userId: { type: 'string' },
      answer: { type: 'string' },
      stepKey: { type: 'string' }
    },
    required: ['userId', 'answer']
  },

  getStatus: {
    $id: 'getStatus',
    type: 'object',
    properties: {
      userId: { type: 'string' }
    },
    required: ['userId']
  }
}; 