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
}
//# sourceMappingURL=cleanup.service.js.map