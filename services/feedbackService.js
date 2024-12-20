// services/feedbackService.js
import { sendMessageToWhatsApp } from "./whatsappService.js";
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const languageDetectionAI = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function collectFeedback(userId, language) {
    const templateMap = {
        'es': 'ai_feedback_es',
        'pt': 'ai_feedback_pt',
        'en': 'ai_feedback_en'
    };

    const template = templateMap[language] || 'ai_feedback_en';

    await sendMessageToWhatsApp(userId, {
        type: "template",
        template: {
            name: template,
            language: {
                code: language
            }
        }
    });
}

export async function detectLanguage(text) {
    const response = await languageDetectionAI.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {role: "system", content: "You are a language detection tool. Respond with only the ISO 639-1 two-letter language code."},
            {role: "user", content: `Detect the language of this text: "${text}"`}
        ]
    });

    return response.choices[0].message.content.trim().toLowerCase();
}