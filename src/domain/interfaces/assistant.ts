export interface IWhatsAppMessage {
  id: string;
  text: { body: string };
  from: string;
  type: string;
  timestamp?: number;
}

export interface IMessageResponse {
  answer: string;
  matches?: any[];
  apiResults?: any[];
  language: string;
}

export interface IintentMessage {
  isGreeting: boolean;
  hasQuestion: boolean;
  needsSupport: boolean;
  topic: string;
}
