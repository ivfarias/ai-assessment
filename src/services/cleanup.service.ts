import { getDb } from '../config/mongodb.js';

export class CleanupService {
  async cleanDocuments(): Promise<void> {
    const db = getDb();
    const collection = db.collection('teste');
    await collection.deleteMany({});
  }

  async cleanChatHistory(): Promise<void> {
    const db = getDb();
    const collection = db.collection('chat-history');
    await collection.deleteMany({});
  }
}
