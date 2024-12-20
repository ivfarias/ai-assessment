// services/languageService.js
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function detectLanguage(text) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a language detection tool. Respond with only the ISO 639-1 two-letter language code." },
        { role: "user", content: `Detect the language of this text: "${text}"` }
      ],
      max_tokens: 2
    });
    return response.choices[0].message.content.trim().toLowerCase();
  } catch (error) {
    console.error('Language detection failed:', error);
    return 'pt';
  }
}