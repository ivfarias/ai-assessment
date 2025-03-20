import { BufferMemory } from 'langchain/memory';
import { MongoDBChatMessageHistory } from '@langchain/mongodb';
export default class ConversationMemoryManager {
    memories;
    collection;
    constructor(collection) {
        this.memories = new Map();
        this.collection = collection;
    }
    async getMemory(userId) {
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
        return this.memories.get(userId);
    }
}
//# sourceMappingURL=ConversationMemoryManager.js.map