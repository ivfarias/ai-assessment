import FeedbackService from '../services/feedback.service.js';
import WhatsAppService from '../services/whatsapp.service.js';
import MessageCache from '../infrastructure/cache/MessageCache.js';
export class MessageController {
    whatsAppService;
    feedbackService;
    messageCache;
    constructor() {
        this.whatsAppService = new WhatsAppService();
        this.feedbackService = new FeedbackService();
        this.messageCache = new MessageCache();
    }
    async handleWebhook(request, reply) {
        const body = request.body;
        const statuses = body.entry?.[0]?.changes?.[0]?.value?.statuses;
        const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        const userId = message?.from;
        try {
            if (statuses) {
                const status = statuses[0];
                console.log(`Message status update: ${status.id} - ${status.status}`);
                return reply.send({ status: 'ok' });
            }
            if (!message || message.type !== 'text') {
                return reply.status(400).send({ error: 'Invalid message format' });
            }
            const isDuplicateMessage = this.messageCache.isDuplicateMessage(userId);
            if (isDuplicateMessage) {
                return reply.send({ status: 'Duplicated message' });
            }
            const response = await this.whatsAppService.handleMessage(message);
            await this.whatsAppService.sendMessage(message.from, response.answer);
            await this.whatsAppService.markMessageAsRead(message.id);
            this.scheduleFeedbackRequest(message.from, response.language);
        }
        catch (error) {
            console.error('Message processing error:', error);
            await this.whatsAppService.sendMessage(userId, "I'm experiencing technical difficulties. Please try again later.");
            return reply.status(500).send({ error: 'Internal server error' });
        }
    }
    scheduleFeedbackRequest(userId, language) {
        setTimeout(() => {
            this.feedbackService
                .collectFeedback(userId, language)
                .catch((error) => console.error('Feedback request failed:', error));
        }, 10 * 60 * 1000); // 10 minutes
    }
}
//# sourceMappingURL=message.controller.js.map