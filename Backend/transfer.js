import express from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db.js";
import { authenticate } from "./auth.js";

const router = express.Router();

// Currency conversion helper
const convert = (amount, from, to) => {
  const rates = db.exchangeRates;
  if (!rates[from] || !rates[to]) throw new Error(`Unsupported currency: ${from} or ${to}`);
  const inUSD = amount / rates[from];
  return parseFloat((inUSD * rates[to]).toFixed(2));
};

// POST /transfer - Send money
router.post("/", authenticate, (req, res) => {
  try {
    const { receiverEmail, amount, currency, note } = req.body;
    if (!receiverEmail || !amount || !currency)
      return res.status(400).json({ error: "receiverEmail, amount and currency required" });
    if (parseFloat(amount) <= 0)
      return res.status(400).json({ error: "Amount must be positive" });

    const sender = db.users.find(u => u.id === req.userId);
    const receiver = db.users.find(u => u.email === receiverEmail);
    if (!receiver) return res.status(404).json({ error: "Receiver not found. Ask them to register first." });
    if (sender.id === receiver.id)
      return res.status(400).json({ error: "Cannot send to yourself" });

    const senderWallet = db.wallets.find(w => w.userId === sender.id);
    const receiverWallet = db.wallets.find(w => w.userId === receiver.id);

    // Convert amount to EUR for processing
    const amountInEUR = convert(parseFloat(amount), currency, "EUR");
    const fee = parseFloat((amountInEUR * 0.015).toFixed(2)); // 1.5% transfer fee
    const totalDeducted = parseFloat((amountInEUR + fee).toFixed(2));

    if (senderWallet.balance < totalDeducted)
      return res.status(400).json({
        error: `Insufficient funds. You need €${totalDeducted} (including €${fee} fee) but have €${senderWallet.balance}`
      });

    // Execute transfer
    senderWallet.balance = parseFloat((senderWallet.balance - totalDeducted).toFixed(2));
    receiverWallet.balance = parseFloat((receiverWallet.balance + amountInEUR).toFixed(2));

    const tx = {
      id: uuidv4(),
      senderId: sender.id,
      senderName: sender.name,
      senderEmail: sender.email,
      receiverId: receiver.id,
      receiverName: receiver.name,
      receiverEmail: receiver.email,
      amount: parseFloat(amount),
      currency,
      amountInEUR,
      fee,
      totalDeducted,
      note: note || "",
      status: "completed",
      type: "transfer",
      createdAt: new Date()
    };

    db.transactions.push(tx);
    res.json({ message: "Transfer successful", transaction: tx });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /transfer/quote - Preview transfer cost before sending
router.post("/quote", (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;
    if (!amount || !fromCurrency || !toCurrency)
      return res.status(400).json({ error: "amount, fromCurrency, toCurrency required" });

    const parsedAmount = parseFloat(amount);
    const fee = parseFloat((parsedAmount * 0.015).toFixed(2));
    const amountAfterFee = parsedAmount - fee;
    const converted = convert(amountAfterFee, fromCurrency, toCurrency);
    const rate = convert(1, fromCurrency, toCurrency);

    res.json({
      send: parsedAmount,
      fromCurrency,
      fee,
      amountAfterFee,
      toCurrency,
      receiverGets: converted,
      exchangeRate: rate,
      estimatedTime: "1-3 minutes"
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
