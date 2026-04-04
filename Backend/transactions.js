import express from "express";
import { db } from "./db.js";
import { authenticate } from "./auth.js";

const router = express.Router();

// GET /transactions - Get all user transactions (sent + received)
router.get("/", authenticate, (req, res) => {
  const txs = db.transactions
    .filter(t => t.senderId === req.userId || t.receiverId === req.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Add direction label
  const labeled = txs.map(t => ({
    ...t,
    direction: t.senderId === req.userId ? "sent" : "received"
  }));

  res.json(labeled);
});

// GET /transactions/:id - Get single transaction detail
router.get("/:id", authenticate, (req, res) => {
  const tx = db.transactions.find(
    t => t.id === req.params.id &&
    (t.senderId === req.userId || t.receiverId === req.userId)
  );
  if (!tx) return res.status(404).json({ error: "Transaction not found" });

  res.json({ ...tx, direction: tx.senderId === req.userId ? "sent" : "received" });
});

export default router;
