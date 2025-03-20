import WhatsAppService from './whatsapp.service.js';
/**
 * Service responsible for handling user feedback collection through WhatsApp
 */
export default class FeedbackService {
    templateMap = {
        es: 'ai_feedback_es',
        pt: 'ai_feedback_pt',
        en: 'ai_feedback_en',
    };
    whatsappService = new WhatsAppService();
    /**
     * Sends a feedback collection message to the user using a language-specific template
     * @param userId - The WhatsApp user ID to send the feedback request to
     * @param language - The preferred language code (es, pt, or en)
     */
    async collectFeedback(userId, language) {
        const template = this.templateMap[language] || 'ai_feedback_en';
        await this.whatsappService.sendMessage(userId, {
            type: 'template',
            template: {
                name: template,
                language: {
                    code: language,
                },
            },
        });
    }
}
//# sourceMappingURL=feedback.service.js.map