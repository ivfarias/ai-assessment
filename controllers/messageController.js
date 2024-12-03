import { queryEmbeddings } from "../services/queryService.js";
import { sendMessageToWhatsApp, markMessageAsRead } from "../services/whatsappService.js";

export async function handleIncomingMessage(req, res) {
    try {
        const body = req.body;

        // Check if this is a status update
        if (body.entry?.[0]?.changes?.[0]?.value?.statuses) {
            handleStatusUpdate(body);
            return res.sendStatus(200);
        }

        // Validate incoming message structure
        const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        if (!message || message.type !== "text") {
            console.error("Invalid or unsupported message format");
            return res.sendStatus(400); // Bad Request
        }

        const userMessage = message.text.body;
        const userId = message.from;
        console.log(`Received message from ${userId}: ${userMessage}`);

        try {
            const aiResponse = await queryEmbeddings(userMessage);
            console.log(`AI Response: ${aiResponse.answer}`);

            await sendMessageToWhatsApp(userId, aiResponse.answer);
            await markMessageAsRead(message.id);
        } catch (error) {
            console.error("Error processing WhatsApp message:", error);
            await sendMessageToWhatsApp(
                userId,
                "I'm experiencing technical difficulties. Please try again later."
            );
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("Unexpected error in handleIncomingMessage:", error);
        res.sendStatus(500); // Internal Server Error
    }
}

function handleStatusUpdate(body) {
    const status = body.entry[0].changes[0].value.statuses[0];
    console.log(`Message status update: ${status.id} - ${status.status}`);
}

