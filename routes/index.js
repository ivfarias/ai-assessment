import express from "express";
import { handleIncomingMessage } from "../controllers/messageController.js";
import dotenv from 'dotenv';
import LRU from 'lru-cache';

dotenv.config();

const router = express.Router();

// Configure LRU cache for message deduplication
const processedMessages = new LRU({
  max: 1000, // Maximum number of message IDs to store
  ttl: 5 * 60 * 1000, // Auto-expire entries after 5 minutes (300 seconds)
});

router.get('/', (req, res) => {
  res.status(200).json({ message: 'Kyte AI API is running' });
});

// Webhook endpoint for WhatsApp
router.post("/webhook", async (req, res) => {
  console.log("Received POST request to /webhook");
  console.log("Request body:", JSON.stringify(req.body, null, 2));

  try {
    const { entry } = req.body;

    if (entry?.[0]?.changes?.[0]?.value?.messages) {
      const message = entry[0].changes[0].value.messages[0];
      const messageId = message.id;

      // Check for duplicate messages using LRU cache
      if (processedMessages.has(messageId)) {
        console.log(`Message ${messageId} already processed. Skipping.`);
        return res.sendStatus(200);
      }

      // Add to processed messages cache
      processedMessages.set(messageId, true);

      // Process the message
      await handleIncomingMessage(req.body);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
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