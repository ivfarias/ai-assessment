import { OpenAI } from "openai";

export const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "start_assessment",
      description: "Starts a specific diagnostic assessment when the user shows clear intent to begin an analysis of a part of their business. This should be used when the user agrees to start a specific assessment that was suggested to them, or asks a question that directly maps to one.",
      parameters: {
        type: "object",
        properties: {
          assessmentName: {
            type: "string",
            description: "The name of the assessment to start.",
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
              "contextDiagnosis",
            ],
          },
        },
        required: ["assessmentName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "process_assessment_answer",
      description: "Submits the user's answer to the current assessment question and gets the next question's goal.",
      parameters: {
        type: "object",
        properties: {
          answer: {
            type: "string",
            description: "The user's answer, extracted from their message.",
          },
        },
        required: ["answer"],
      },
    },
  }
]; 