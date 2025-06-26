import axios from 'axios';
import LanguageService from './language.service.js';
import { IMessageResponse, IWhatsAppMessage } from '../domain/interfaces/assistant.js';
import QueryService from './query.service.js';
import { UserProfile } from '../types/profile.js';
import MessageCache from '../infrastructure/cache/MessageCache.js';
import { getDb } from '../config/mongodb.js';
import { AssessmentRagService } from './assessmentRagService.js';

interface IMessagePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text' | 'template';
  text?: { body: string };
  template?: any;
}

/**
 * Service for handling WhatsApp message operations
 */
export default class WhatsAppService {
  private queryService: QueryService;
  private languageService: LanguageService;
  private messageCache: MessageCache;
  private assessmentRagService: AssessmentRagService;
  private baseUrl: string;

  constructor() {
    this.queryService = new QueryService();
    this.languageService = new LanguageService();
    this.messageCache = new MessageCache();
    this.assessmentRagService = new AssessmentRagService(getDb());
    this.baseUrl = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`;
  }

  /**
   * Sends a message to a WhatsApp user
   * @param to - The recipient's phone number
   * @param message - The message content or template to send
   */
  public async sendMessage(to: string, message: string | { type: 'template'; template: any }) {
    try {
      let payload: IMessagePayload;
      if (typeof message === 'string') {
        payload = {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        };
      } else if (message.type === 'template') {
        payload = {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: message.template,
        };
      } else {
        throw new Error('Unsupported message type');
      }

      const response = await axios.post(`${this.baseUrl}/messages`, payload, {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        },
      });
      console.log('Message sent:', response.data);
    } catch (error: any) {
      console.error('Error sending message:', error.response?.data || error.message);
    }
  }

  /**
   * Marks a WhatsApp message as read
   * @param messageId - The ID of the message to mark as read
   */
  public async markMessageAsRead(messageId: string) {
    try {
      await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          },
        },
      );
      console.log('Message marked as read:', messageId);
    } catch (error: any) {
      console.error('Error marking message as read:', error.response?.data || error.message);
    }
  }

  /**
   * Processes an incoming WhatsApp message
   * @param message - The incoming WhatsApp message
   * @returns Promise containing the message response
   */
  public async handleMessage(message: IWhatsAppMessage): Promise<IMessageResponse> {
    const userMessage = message.text.body;
    if (!message.text?.body) {
      throw new Error("Unsupported or empty message body");
    }
    const userId = message.from;
    const db = getDb();

    // Reactivate user if they were inactive
    const userProfile = await db.collection<UserProfile>("user_profiles").findOne({ _id: userId });
    if (userProfile?.status === 'inactive') {
      await db.collection<UserProfile>("user_profiles").updateOne(
        { _id: userId },
        { $set: { status: 'active', updatedAt: new Date() } }
      );
      // Refetch profile to ensure subsequent logic uses the updated version
    } else if (userProfile) {
      // Also update timestamp for active users on new message
      await db.collection<UserProfile>("user_profiles").updateOne(
        { _id: userId },
        { $set: { updatedAt: new Date() } }
      );
    }

    // Always let the AI handle the user's message first
    const userLanguage = await this.languageService.detectLanguage(userMessage);
    const lastConversation = this.messageCache.getLastConversation(userId);

    const response = await this.queryService.query(userMessage, {
      userId,
      messageId: message.id,
      context: {
        ...lastConversation,
        scoring: userProfile?.scoring,
        progress: userProfile?.progress
      }
    });

    if (!response?.answer) {
      console.error('No response returned by queryService for message:', userMessage);
    }
    const finalAnswer = response?.answer || '[Resposta não encontrada]';

    this.messageCache.setLastConversation(userId, {
      query: userMessage,
      response: finalAnswer,
    });

    return {
      answer: finalAnswer,
      language: userLanguage,
    };
  }
}
