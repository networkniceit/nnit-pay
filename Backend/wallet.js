import express from "express";
import { db } from "./db.js";
import { authenticate } from "./auth.js";

const router = express.Router();

// GET /wallet - Get user wallet
router.get("/", authenticate, (req, res) => {
  const wallet = db.wallets.find(w => w.userId === req.userId);
  if (!wallet) return res.status(404).json({ error: "Wallet not found" });
  res.json(wallet);
});

// GET /wallet/rates - Get exchange rates (public)
router.get("/rates", (req, res) => {
  res.json(db.exchangeRates);
});

// POST /wallet/topup - Add funds (sandbox only - replace with real payment gateway)
router.post("/topup", authenticate, (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0)
    return res.status(400).json({ error: "Invalid amount" });

  const wallet = db.wallets.find(w => w.userId === req.userId);
  if (!wallet) return res.status(404).json({ error: "Wallet not found" });

  wallet.balance = parseFloat((wallet.balance + parseFloat(amount)).toFixed(2));
  res.json({ message: "Top-up successful", wallet });
});

export default router;
