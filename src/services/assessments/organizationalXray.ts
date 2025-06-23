import { Db } from "mongodb";
import OpenAI from "openai";
import { UserProfile } from "../../types/profile.js";

export async function runAssessment(userId: string, input: any, db: Db, user: UserProfile): Promise<any> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { equipe, divisaoResponsabilidadesScore, culturaScore } = input;

  const rawData = {
    equipe,
    divisaoResponsabilidadesScore,
    culturaScore
  };

  const analysisPrompt = `
    A small business owner in Brazil provides the following information about their organization:
    - Team size (including owner): ${equipe}
    - Clarity of responsibilities (1-5): ${divisaoResponsabilidadesScore}
    - Business culture score (1-5): ${culturaScore}

    Here is additional context about their business:
    - Overall Business Stage: ${user.scoring?.momentoGeral || 'Not yet calculated'}
    - Stated 6-Month Goal: ${user.profile.contexto?.objetivo6Meses || 'Not specified'}
    - Stated Biggest Challenge: ${user.profile.contexto?.desafioAtual || 'Not specified'}

    Based on ALL of this information, provide one single, highly relevant, and actionable tip to help them improve their organizational structure or culture.
    Format the output as a JSON object with a single key "insights" which is an array containing just one string.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert small business consultant for the Brazilian market, specializing in organizational structure and team culture. Your goal is to provide a single, actionable tip based on all available context.',
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
    console.error("Error generating insights in organizationalXray:", error);
    return {
      ...rawData,
      insights: [],
    };
  }
} 