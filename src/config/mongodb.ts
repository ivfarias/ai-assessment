import { FastifyPluginAsync } from 'fastify';
import fastifyMongodb from '@fastify/mongodb';
import fp from 'fastify-plugin';
import { Db } from 'mongodb';

let db: Db | null = null;

export const getDb = (): Db => {
  if (!db) {
    throw new Error('Database not initialized. Make sure the MongoDB plugin is registered.');
  }
  return db;
};

const mongoPlugin: FastifyPluginAsync = fp(
  async (fastify) => {
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
      }
    } catch (err) {
      fastify.log.error('Failed to connect to MongoDB:', err);
      throw err;
    }
  },
  {
    name: 'mongodb',
    dependencies: [],
  },
);

export default mongoPlugin;
