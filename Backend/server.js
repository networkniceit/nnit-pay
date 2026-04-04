import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./auth.js";
import walletRoutes from "./wallet.js";
import transferRoutes from "./transfer.js";
import transactionRoutes from "./transactions.js";
import paymentRoutes from "./payment.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/wallet", walletRoutes);
app.use("/transfer", transferRoutes);
app.use("/transactions", transactionRoutes);
app.use("/payment", paymentRoutes);

app.get("/", (req, res) => res.json({
  name: "NNIT Pay API", version: "3.0.0", status: "running",
  endpoints: {
    auth: ["POST /auth/register", "POST /auth/login", "GET /auth/me"],
    wallet: ["GET /wallet", "GET /wallet/rates", "POST /wallet/topup"],
    transfer: ["POST /transfer", "POST /transfer/quote"],
    transactions: ["GET /transactions", "GET /transactions/:id"],
    payment: ["GET /payment/config", "POST /payment/create-intent", "POST /payment/confirm", "POST /payment/bank-transfer"]
  }
}));

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, req, res, next) => { console.error(err.stack); res.status(500).json({ error: "Internal server error" }); });

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`\n✅ NNIT Pay API v3.0 running on http://localhost:${PORT}`);
  console.log(`💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? "connected" : "MISSING KEY"}`);
  console.log(`📋 API info: http://localhost:${PORT}/\n`);
});

