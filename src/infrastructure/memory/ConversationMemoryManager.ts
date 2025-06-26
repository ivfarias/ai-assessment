import { BufferMemory } from 'langchain/memory';
import { MongoDBChatMessageHistory } from '@langchain/mongodb';
import { Collection } from 'mongodb';
import { IConversationMemoryManager } from '../../domain/interfaces/conversation.js';

export default class ConversationMemoryManager implements IConversationMemoryManager {
  private memories: Map<string, BufferMemory>;
  private collection: Collection;

  constructor(collection: Collection) {
    this.memories = new Map();
    this.collection = collection;
  }

  async getMemory(userId: string): Promise<BufferMemory> {
    if (!this.memories.has(userId)) {
      const chatHistory = new MongoDBChatMessageHistory({
        collection: this.collection,
        sessionId: userId,
      });

      const memory = new BufferMemory({
        chatHistory,
        returnMessages: true,
        memoryKey: 'chat_history',
        inputKey: 'input',
        outputKey: 'output',
      });

      this.memories.set(userId, memory);
    }
    
    return this.memories.get(userId)!;
  }
}
