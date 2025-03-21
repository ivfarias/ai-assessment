import { healthCheckSchema } from '../schemas/system.schema.js';
import { getDb } from '@/config/mongodb.js';
export async function healthRoutes(app) {
    app.get('/', {
        schema: healthCheckSchema
    }, async (_, reply) => {
        const db = getDb();
        reply.status(200).send({ message: 'Kyte AI API is running' });
    });
}
//# sourceMappingURL=health.routes.js.map