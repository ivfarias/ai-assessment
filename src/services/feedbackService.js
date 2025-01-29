import { sendMessageToWhatsApp } from "./whatsappService.js";
import dotenv from 'dotenv';

dotenv.config();

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