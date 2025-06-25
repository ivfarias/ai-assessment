import fastifyMongodb from '@fastify/mongodb';
import fp from 'fastify-plugin';
let db = null;
export const getDb = () => {
    if (!db) {
        throw new Error('Database not initialized. Make sure the MongoDB plugin is registered.');
    }
    return db;
};
const mongoPlugin = fp(async (fastify) => {
    try {
        const uri = process.env.MONGODB_CONNECTION_STRING;
        const dbName = process.env.KYTE_DATA_DBNAME;
        if (!uri) {
            throw new Error('MongoDB connection string is required');
        }
        await fastify.register(fastifyMongodb, {
            forceClose: true,
            url: uri,
            database: dbName,
        });
        const isConnected = await fastify.mongo.client.db().command({ ping: 1 });
        if (isConnected.ok) {
            db = fastify.mongo.db;
            fastify.log.info(`Connected successfully to MongoDB database: ${dbName}`);
            // Ensure indexes
            await db.collection('user_profiles').createIndex({ 'progress.currentAssessment': 1 });
        }
    }
    catch (err) {
        fastify.log.error('Failed to connect to MongoDB:', err);
        throw err;
    }
}, {
    name: 'mongodb',
    dependencies: [],
});
export default mongoPlugin;
//# sourceMappingURL=mongodb.js.map