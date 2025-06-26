import { getDb } from '../config/mongodb.js';
export class CleanupService {
    async cleanDocuments() {
        const db = getDb();
        const collection = db.collection('MacroCS');
        await collection.deleteMany({});
    }
    async cleanChatHistory() {
        const db = getDb();
        const collection = db.collection('ChatHistory');
        await collection.deleteMany({});
    }
    async cleanToolMessagesFromChatHistory() {
        const db = getDb();
        const collection = db.collection('ChatHistory');
        // Find all documents and remove tool messages from them
        const documents = await collection.find({}).toArray();
        let cleanedCount = 0;
        for (const doc of documents) {
            if (doc.messages && Array.isArray(doc.messages)) {
                const originalLength = doc.messages.length;
                doc.messages = doc.messages.filter((msg) => {
                    return !(msg.type === 'tool' || msg.role === 'tool' || msg._getType === 'tool');
                });
                if (doc.messages.length !== originalLength) {
                    await collection.updateOne({ _id: doc._id }, { $set: { messages: doc.messages } });
                    cleanedCount++;
                }
            }
        }
        console.log(`Cleaned tool messages from ${cleanedCount} chat history documents`);
    }
}
//# sourceMappingURL=cleanup.service.js.map