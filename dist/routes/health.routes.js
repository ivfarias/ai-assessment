import { healthCheckSchema } from '../schemas/system.schema.js';
import { getDb } from '../config/mongodb.js';
export async function healthRoutes(app) {
    app.get('/', {
        schema: healthCheckSchema
    }, async (_, reply) => {
        const db = getDb();
        console.log('Connected to MongoDB:', db.databaseName);
        console.log('database', process.env.MONGODB_CONNECTION_STRING);
        reply.status(200).send({ message: 'Kyte AI API is running' });
    });
}
//# sourceMappingURL=health.routes.js.map