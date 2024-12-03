import express from "express";
import { handleIncomingMessage } from "../controllers/messageController.js";
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Add a Set to keep track of processed message IDs
const processedMessages = new Set();

// Webhook endpoint for WhatsApp
router.post("/webhook", async (req, res) => {
  console.log("Received POST request to /webhook");
  console.log("Request body:", JSON.stringify(req.body, null, 2));

  try {
    const { entry } = req.body;
    
    if (entry && entry[0].changes && entry[0].changes[0].value.messages) {
      const message = entry[0].changes[0].value.messages[0];
      const messageId = message.id;

      // Check if the message has already been processed
      if (processedMessages.has(messageId)) {
        console.log(`Message ${messageId} has already been processed. Skipping.`);
        return res.sendStatus(200);
      }

      // Add the message ID to the set of processed messages
      processedMessages.add(messageId);

      // Process the message
      await handleIncomingMessage(req, res);

      // Remove the message ID from the set after some time (e.g., 5 minutes)
      setTimeout(() => {
        processedMessages.delete(messageId);
      }, 5 * 60 * 1000);
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
  }

  res.sendStatus(200);
});

// Webhook verification
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("Received GET request to /webhook");
  console.log(`Mode: ${mode}, Token: ${token}, Challenge: ${challenge}`);

  if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log("Webhook verified successfully!");
    res.status(200).send(challenge);
  } else {
    console.log("Webhook verification failed.");
    res.sendStatus(403);
  }
});

export default router;

