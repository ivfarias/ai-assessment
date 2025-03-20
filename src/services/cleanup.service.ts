import { getDb } from '../config/mongodb.js';

export class CleanupService {
  async cleanDocuments(): Promise<void> {
    const db = getDb();
    const collection = db.collection('MacroCS');
    await collection.deleteMany({});
  }

  async cleanChatHistory(): Promise<void> {
    const db = getDb();
    const collection = db.collection('ChatHistory');
    await collection.deleteMany({});
  }
}
