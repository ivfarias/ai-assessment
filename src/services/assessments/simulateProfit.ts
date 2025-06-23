import { Db } from "mongodb";
import OpenAI from "openai";
import { UserProfile } from "../../types/profile.js";

export async function runAssessment(userId: string, input: any, db: Db, user: UserProfile): Promise<any> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { faturamentoMensal, custoProdutos, percentualReinvestido } = input;

  // Perform calculations locally for accuracy
  const faturamento = Number(faturamentoMensal) || 0;
  const custos = Number(custoProdutos) || 0;
  const reinvestimento = Number(percentualReinvestido) || 0;
  const margem = faturamento > 0 ? (faturamento - custos) / faturamento : 0;

  const rawData = {
    faturamento,
    custos,
    margem,
    reinvestimentoPercent: reinvestimento
  };

  const analysisPrompt = `
    A small business owner in Brazil provides the following financial data:
    - Monthly Revenue: R$${faturamento.toFixed(2)}
    - Cost of Goods Sold: R$${custos.toFixed(2)}
    - Reinvestment Percentage: ${reinvestimento}%
    - Calculated Profit Margin: ${(margem * 100).toFixed(2)}%

    Here is additional context about their business:
    - Overall Business Stage: ${user.scoring?.momentoGeral || 'Not yet calculated'}
    - Stated 6-Month Goal: ${user.profile.contexto?.objetivo6Meses || 'Not specified'}
    - Stated Biggest Challenge: ${user.profile.contexto?.desafioAtual || 'Not specified'}

    Based on ALL of this information, provide one single, highly relevant, and actionable tip to help them improve their profitability.
    Format the output as a JSON object with a single key "insights" which is an array containing just one string.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert small business consultant for the Brazilian market, specializing in profitability. Your goal is to provide a single, actionable tip based on all available context.',
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
    console.error("Error generating insights in simulateProfit:", error);
    return {
      ...rawData,
      insights: [],
    };
  }
} 