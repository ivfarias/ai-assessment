import { Db } from "mongodb";
import OpenAI from "openai";
import { UserProfile } from "../../types/profile.js";

export async function runAssessment(userId: string, input: any, db: Db, user: UserProfile): Promise<any> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { ferramentasUsadas, canaisComunicacao } = input;

  const rawData = {
    ferramentasUsadas,
    canaisComunicacao
  };

  const analysisPrompt = `
    A small business owner in Brazil provides the following information about their tools:
    - Management Tools Used: ${ferramentasUsadas}
    - Customer Communication Channels: ${canaisComunicacao}

    Here is additional context about their business:
    - Overall Business Stage: ${user.scoring?.momentoGeral || 'Not yet calculated'}
    - Stated 6-Month Goal: ${user.profile.contexto?.objetivo6Meses || 'Not specified'}
    - Stated Biggest Challenge: ${user.profile.contexto?.desafioAtual || 'Not specified'}

    Based on ALL of this information, provide one single, highly relevant, and actionable tip.
    If the user's tools are manual (like 'caderno', 'planilhas', 'whatsapp') and their challenges involve sales, inventory, or customer management, you should suggest using the Kyte app as a solution. Frame it as a helpful recommendation to solve their specific problem.
    Format the output as a JSON object with a single key "insights" which is an array containing just one string.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert small business consultant for the Brazilian market, specializing in digital tools and automation. Your goal is to provide a single, actionable tip based on all available context, and intelligently recommend the Kyte app where appropriate.',
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
    console.error("Error generating insights in toolScanner:", error);
    return {
      ...rawData,
      insights: [],
    };
  }
} 