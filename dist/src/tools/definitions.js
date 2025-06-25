export const tools = [
    {
        type: "function",
        function: {
            name: "suggest_assessment",
            description: "Suggests a relevant business assessment based on the user's query or business needs. Use this when the user asks about business analysis, improvement, or specific business areas.",
            parameters: {
                type: "object",
                properties: {
                    user_id: {
                        type: "string",
                        description: "The WhatsApp user ID"
                    },
                    user_query: {
                        type: "string",
                        description: "The user's original query or concern"
                    },
                    suggested_assessment: {
                        type: "string",
                        description: "The assessment that would be most helpful for the user's situation",
                        enum: [
                            "simulateProfit",
                            "financialHealthRadar",
                            "operationalIndependenceTest",
                            "toolScanner",
                            "standardizationThermometer",
                            "customerLoyaltyPanel",
                            "customerAcquisitionMap",
                            "marketStrategyScanner",
                            "organizationalXray",
                            "contextDiagnosis"
                        ]
                    },
                    reasoning: {
                        type: "string",
                        description: "Brief explanation of why this assessment would be helpful"
                    }
                },
                required: ["user_id", "user_query", "suggested_assessment", "reasoning"]
            }
        },
    },
    {
        type: "function",
        function: {
            name: "start_assessment",
            description: "Starts a new business assessment for a user via the assessment API endpoint.",
            parameters: {
                type: "object",
                properties: {
                    assessment_name: {
                        type: "string",
                        description: "The name of the assessment to start. Choose the one that matches the user intent.",
                        enum: [
                            "simulateProfit",
                            "financialHealthRadar",
                            "operationalIndependenceTest",
                            "toolScanner",
                            "standardizationThermometer",
                            "customerLoyaltyPanel",
                            "customerAcquisitionMap",
                            "marketStrategyScanner",
                            "organizationalXray",
                            "contextDiagnosis"
                        ]
                    },
                    user_id: {
                        type: "string",
                        description: "The WhatsApp user ID"
                    }
                },
                required: ["assessment_name", "user_id"]
            }
        },
    },
    {
        type: "function",
        function: {
            name: "process_assessment_answer",
            description: "Submits the user's answer to the current assessment question via the assessment API endpoint.",
            parameters: {
                type: "object",
                properties: {
                    user_id: {
                        type: "string",
                        description: "The WhatsApp user ID"
                    },
                    input: {
                        type: "string",
                        description: "The user's answer, extracted from their message."
                    }
                },
                required: ["user_id", "input"]
            },
        },
    }
];
//# sourceMappingURL=definitions.js.map