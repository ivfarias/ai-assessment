import { BufferMemory } from 'langchain/memory';

export interface IConversationMemoryManager {
  getMemory(userId: string): Promise<BufferMemory>;
}