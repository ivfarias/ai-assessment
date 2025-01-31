import express from "express";
import { handleIncomingMessage } from "../controllers/messageController.js";
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Kyte AI API is running' });
});

// Webhook endpoint for WhatsApp
router.post("/webhook", async (req, res) => {
  console.log("Received POST request to /webhook");
  console.log("Request body:", JSON.stringify(req.body, null, 2));

  try {
    const { entry } = req.body;

    // Check if the entry contains valid messages
    if (entry && entry[0].changes && entry[0].changes[0].value.messages) {
      // Process the message
      await handleIncomingMessage(req.body);
    }

    // Always respond with 200 to acknowledge receipt of the webhook
    res.sendStatus(200);
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Webhook verification endpoint
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("Received GET request to /webhook");
  console.log(`Mode: ${mode}, Token: ${token}, Challenge: ${challenge}`);

  // Verify the webhook
  if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log("Webhook verified successfully!");
    res.status(200).send(challenge);
  } else {
    console.log("Webhook verification failed.");
    res.sendStatus(403);
  }
});

export default router;