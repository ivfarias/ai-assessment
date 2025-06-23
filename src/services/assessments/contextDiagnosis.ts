import { Db } from "mongodb";
import OpenAI from "openai";
import { UserProfile } from "../../types/profile.js";

export async function runAssessment(userId: string, input: any, db: Db, user: UserProfile): Promise<any> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const { 
    tempoNegocio, 
    canalPrincipal, 
    objetivoNegocio, 
    produtoServico, 
    desafioAtual, 
    objetivo6Meses 
  } = input;

  const rawData = {
    tempoNegocio,
    canalPrincipal,
    objetivoNegocio,
    produtoServico,
    desafioAtual,
    objetivo6Meses
  };

  const analysisPrompt = `
    Analyze the following small business profile from Brazil and provide 3-5 short, actionable, and personalized recommendations.
    The user is interacting with an AI assistant on WhatsApp. The tone should be encouraging and helpful.
    Format the output as a JSON object with a single key "insights" which is an array of strings.

    Business Profile:
    - Scoring and Business Moment: ${JSON.stringify(user.scoring)}
    - Financial Health: ${JSON.stringify(user.profile.finance)}
    - Operational Model: ${JSON.stringify(user.profile.operacional)}
    - Customer Profile: ${JSON.stringify(user.profile.clientes)}
    - Strategy: ${JSON.stringify(user.profile.estrategia)}
    - Stated Goals & Challenges: ${JSON.stringify(rawData)}
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert small business consultant for the Brazilian market. Your goal is to provide actionable advice.',
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
    console.error("Error generating insights in contextDiagnosis:", error);
    // If the analysis fails, still save the raw data so we don't lose it.
    return {
      ...rawData,
      insights: [],
    };
  }
} 