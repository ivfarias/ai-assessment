import express from "express";
import { handleIncomingMessage } from "../controllers/messageController.js";
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Webhook endpoint for WhatsApp
router.post("/webhook", (req, res) => {
  console.log("Received POST request to /webhook");
  console.log("Request body:", JSON.stringify(req.body, null, 2));
  handleIncomingMessage(req, res);
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

