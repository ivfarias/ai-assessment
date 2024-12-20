// controllers/messageController.js
import { queryEmbeddings, getLastConversation, setLastConversation } from "../services/queryService.js";
import { sendMessageToWhatsApp, markMessageAsRead } from "../services/whatsappService.js";
import { sendFeedbackRequest } from "../services/feedbackService.js";
import { detectLanguage } from "../services/languageService.js";

// Add this function at the end of the file
async function sendFeedbackRequestAfterDelay(userId, language) {
  setTimeout(async () => {
    await sendFeedbackRequest(userId, language);
  }, 10 * 60 * 1000); // 10 minutes delay
}

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

    const messageId = message.id;
    const userMessage = message.text.body;
    const userId = message.from;

    // Check if the message has already been processed
    if (processedMessages.has(messageId)) {
      console.log(`Message ${messageId} has already been processed. Skipping.`);
      return res.sendStatus(200);
    }

    // Add the message ID to the set of processed messages
    processedMessages.add(messageId);

    console.log(`Received message from ${userId}: ${userMessage}`);

    const userLanguage = await detectLanguage(userMessage);
    const lastConversation = getLastConversation(userId);

    try {
      const aiResponse = await queryEmbeddings(userMessage, { context: lastConversation, language: userLanguage });
      console.log(`AI Response: ${aiResponse.answer}`);

      await sendMessageToWhatsApp(userId, aiResponse.answer);
      await markMessageAsRead(messageId);

      // Update the last conversation for this user
      setLastConversation(userId, { query: userMessage, response: aiResponse.answer });

      // Send feedback request after delay
      await sendFeedbackRequestAfterDelay(userId, userLanguage);

      // Remove the message ID from the set after processing
      processedMessages.delete(messageId);
    } catch (error) {
      console.error("Error processing WhatsApp message:", error);
      await sendMessageToWhatsApp(
        userId,
        "I'm experiencing technical difficulties. Please try again later."
      );
      // Remove the message ID from the set in case of error
      processedMessages.delete(messageId);
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