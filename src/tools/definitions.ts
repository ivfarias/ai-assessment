import { OpenAI } from "openai";

export const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "start_assessment",
      description: "Starts a new business assessment for a user.",
      parameters: {
        type: "object",
        properties: {
          assessment_name: {
            type: "string",
            description: "The internal key of the assessment. Choose the one that matches the user intent. For example, use 'simulateProfit' if the user asks to simulate profit, or 'financialHealthRadar' for questions about financial health.",
            // Enum mappings:
            // "Simular Lucro" → "simulateProfit"
            // "Radar de Saúde Financeira" → "financialHealthRadar"
            // "Teste de Independência Operacional" → "operationalIndependenceTest"
            // "Scanner de Ferramentas" → "toolScanner"
            // "Termômetro de Padronização" → "standardizationThermometer"
            // "Painel de Fidelização de Clientes" → "customerLoyaltyPanel"
            // "Mapa de Aquisição de Clientes" → "customerAcquisitionMap"
            // "Scanner de Estratégia de Mercado" → "marketStrategyScanner"
            // "Raio-X Organizacional" → "organizationalXray"
            // "Diagnóstico de Contexto" → "contextDiagnosis"
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
      description: "Submits the user's answer to the current assessment question and gets the next question's goal.",
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