import axios from "axios";

interface IMessagePayload {
  messaging_product: "whatsapp";
  to: string;
  type: "text" | "template";
  text?: { body: string };
  template?: any;
}

export async function sendMessageToWhatsApp(
  to: string,
  message: string | { type: "template"; template: any }
) {
  try {
    let payload: IMessagePayload;
    if (typeof message === "string") {
      payload = {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      };
    } else if (message.type === "template") {
      payload = {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: message.template,
      };
    } else {
      throw new Error("Unsupported message type");
    }

    const response = await axios.post(
      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        },
      }
    );
    console.log("Message sent:", response.data);
  } catch (error: any) {
    console.error(
      "Error sending message:",
      error.response?.data || error.message
    );
  }
}

export async function markMessageAsRead(messageId: string) {
  try {
    await axios.post(
      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        },
      }
    );
    console.log("Message marked as read:", messageId);
  } catch (error: any) {
    console.error(
      "Error marking message as read:",
      error.response?.data || error.message
    );
  }
}
