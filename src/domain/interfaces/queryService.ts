import { IVectorResult } from "./vectorRepository.js";

export interface IQueryOptions {
  userId: string;
  messageId?: string;
  context?: any;
  topK?: number;
}

export interface IQueryResponse {
  matches: IVectorResult[];
  answer: string;
}
