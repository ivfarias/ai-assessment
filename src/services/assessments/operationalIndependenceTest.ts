import { Db } from "mongodb";
import OpenAI from "openai";
import { UserProfile } from "../../types/profile.js";

export async function runAssessment(userId: string, input: any, db: Db, user: UserProfile): Promise<any> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { horasSemana, processosDocumentados, dependenciaDoDonoScore } = input;

  const rawData = {
    horasSemana,
    processosDocumentados,
    dependenciaDoDonoScore
  };

  const analysisPrompt = `
    A small business owner in Brazil provides the following information about their operational independence:
    - Hours worked per week: ${horasSemana}
    - Are processes documented?: ${processosDocumentados}
    - Owner dependency score (1-5, 5 being very dependent): ${dependenciaDoDonoScore}

    Here is additional context about their business:
    - Overall Business Stage: ${user.scoring?.momentoGeral || 'Not yet calculated'}
    - Stated 6-Month Goal: ${user.profile.contexto?.objetivo6Meses || 'Not specified'}
    - Stated Biggest Challenge: ${user.profile.contexto?.desafioAtual || 'Not specified'}

    Based on ALL of this information, provide one single, highly relevant, and actionable tip to help them reduce their dependency on the business and improve operational efficiency.
    Format the output as a JSON object with a single key "insights" which is an array containing just one string.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert small business consultant for the Brazilian market, specializing in operational efficiency and automation. Your goal is to provide a single, actionable tip based on all available context.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const insights = JSON.parse(response.choices[0].message.content || '{"insights": []}');

    return {
      ...rawData,
      insights: insights.insights || [],
    };

  } catch (error) {
    console.error("Error generating insights in operationalIndependenceTest:", error);
    return {
      ...rawData,
      insights: [],
    };
  }
} 