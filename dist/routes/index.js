import { handleIncomingMessage } from '../controllers/messageController.js';
import dotenv from 'dotenv';
dotenv.config();
async function routes(app) {
    app.get('/', async (_, reply) => {
        reply.status(200).send({ message: 'Kyte AI API is running' });
    });
    const processedMessages = new Set();
    // Webhook endpoint for WhatsApp
    app.post('/webhook', async (request, reply) => {
        console.log('Received POST request to /webhook');
        console.log('Request body:', JSON.stringify(request.body, null, 2));
        try {
            const { entry } = request.body;
            if (entry && entry[0].changes && entry[0].changes[0].value.messages) {
                const message = entry[0].changes[0].value.messages[0];
                const messageId = message.id;
                // Check if the message has already been processed
                if (processedMessages.has(messageId)) {
                    console.log(`Message ${messageId} has already been processed. Skipping.`);
                    return reply.status(200).send();
                }
                // Add the message ID to the set of processed messages
                processedMessages.add(messageId);
                // Process the message
                await handleIncomingMessage(request.body);
                // Remove the message ID from the set after some time (e.g., 5 minutes)
                const timeout = 5 * 60 * 1000; // 5 minutes
                setTimeout(() => {
                    processedMessages.delete(messageId);
                }, timeout);
            }
            reply.status(200).send({ success: true });
        }
        catch (error) {
            console.error('Error processing webhook:', error);
            reply.status(500).send({ error: 'Internal server error' });
        }
    });
    // Webhook verification
    app.get('/webhook', async (request, reply) => {
        const mode = request.query['hub.mode'];
        const token = request.query['hub.verify_token'];
        const challenge = request.query['hub.challenge'];
        console.log('Received GET request to /webhook');
        console.log(`Mode: ${mode}, Token: ${token}, Challenge: ${challenge}`);
        if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
            console.log('Webhook verified successfully!');
            reply.status(200).send(challenge);
        }
        else {
            console.log('Webhook verification failed.');
            reply.status(403).send({ error: 'Webhook verification failed' });
        }
    });
}
export default routes;
//# sourceMappingURL=index.js.map