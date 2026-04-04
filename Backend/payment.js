import express from "express";
import { db } from "./db.js";
import { authenticate } from "./auth.js";
const router = express.Router();

router.get("/config", (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "not_configured", currency: "eur" });
});

router.post("/create-intent", authenticate, (req, res) => {
  try {
    const { amount, currency } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
    const intent = { id: "pi_" + Date.now(), amount, currency: currency || "eur", status: "requires_confirmation", clientSecret: "pi_" + Date.now() + "_secret_" + Math.random().toString(36).slice(2) };
    res.json(intent);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/confirm", authenticate, (req, res) => {
  try {
    const { intentId } = req.body;
    res.json({ id: intentId, status: "succeeded", message: "Payment confirmed" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/bank-transfer", authenticate, (req, res) => {
  try {
    const { amount, currency, bankDetails } = req.body;
    if (!amount || !bankDetails) return res.status(400).json({ error: "amount and bankDetails required" });
    const transfer = { id: "bt_" + Date.now(), amount, currency: currency || "eur", bankDetails, status: "processing", createdAt: new Date() };
    res.json({ message: "Bank transfer initiated", transfer });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

