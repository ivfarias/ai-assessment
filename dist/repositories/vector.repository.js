import { getDb } from '../config/mongodb.js';
/**
 * Repository class for handling vector-based document searches in MongoDB
 */
export default class VectorRepository {
    collection;
    constructor() {
        this.collection = getDb().collection('docs');
    }
    /**
     * Searches for documents similar to the provided vector embedding
     * @param queryVector - The vector embedding to search against
     * @param topK - Number of similar documents to return (default: 5)
     * @returns Promise containing array of vector search results
     */
    async searchSimilar({ queryVector, topK = 5, index, collection, }) {
        const results = await collection
            .aggregate([
            {
                $search: {
                    index,
                    knnBeta: {
                        vector: queryVector,
                        path: 'embedding',
                        k: topK,
                    },
                },
            },
            {
                $project: {
                    text: 1,
                    metadata: 1,
                    score: { $meta: 'searchScore' },
                    _id: 0,
                },
            },
        ])
            .toArray();
        return results.map((doc) => ({
            text: doc.text,
            score: doc.score,
        }));
    }
}
//# sourceMappingURL=vector.repository.js.map