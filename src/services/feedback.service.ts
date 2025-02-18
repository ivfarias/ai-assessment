import WhatsAppService from './whatsapp.service.js';

export default class FeedbackService {
  private templateMap: { [key: string]: string } = {
    es: 'ai_feedback_es',
    pt: 'ai_feedback_pt',
    en: 'ai_feedback_en',
  };
  private whatsappService = new WhatsAppService();

  public async collectFeedback(userId: string, language: string): Promise<void> {
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
