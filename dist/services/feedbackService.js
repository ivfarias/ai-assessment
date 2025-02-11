import { sendMessageToWhatsApp } from './whatsappService.js';
import dotenv from 'dotenv';
dotenv.config();
const templateMap = {
    es: 'ai_feedback_es',
    pt: 'ai_feedback_pt',
    en: 'ai_feedback_en',
};
export async function collectFeedback(userId, language) {
    const template = templateMap[language] || 'ai_feedback_en';
    await sendMessageToWhatsApp(userId, {
        type: 'template',
        template: {
            name: template,
            language: {
                code: language,
            },
        },
    });
}
//# sourceMappingURL=feedbackService.js.map