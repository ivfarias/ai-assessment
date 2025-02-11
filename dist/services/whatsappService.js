import axios from "axios";
export async function sendMessageToWhatsApp(to, message) {
    try {
        let payload;
        if (typeof message === "string") {
            payload = {
                messaging_product: "whatsapp",
                to,
                type: "text",
                text: { body: message },
            };
        }
        else if (message.type === "template") {
            payload = {
                messaging_product: "whatsapp",
                to,
                type: "template",
                template: message.template,
            };
        }
        else {
            throw new Error("Unsupported message type");
        }
        const response = await axios.post(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, payload, {
            headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            },
        });
        console.log("Message sent:", response.data);
    }
    catch (error) {
        console.error("Error sending message:", error.response?.data || error.message);
    }
}
export async function markMessageAsRead(messageId) {
    try {
        await axios.post(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
            messaging_product: "whatsapp",
            status: "read",
            message_id: messageId,
        }, {
            headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            },
        });
        console.log("Message marked as read:", messageId);
    }
    catch (error) {
        console.error("Error marking message as read:", error.response?.data || error.message);
    }
}
//# sourceMappingURL=whatsappService.js.map