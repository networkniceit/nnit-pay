import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import authRoutes from "./auth.js";
import walletRoutes from "./wallet.js";
import transferRoutes from "./transfer.js";
import transactionRoutes from "./transactions.js";
import paymentRoutes from "./payment.js";

dotenv.config();

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/wallet", walletRoutes);
app.use("/transfer", transferRoutes);
app.use("/transactions", transactionRoutes);
app.use("/payment", paymentRoutes);

app.get("/", (req, res) => res.sendFile(join(__dirname, "index.html")));

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, req, res, next) => { console.error(err.stack); res.status(500).json({ error: "Internal server error" }); });

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`\n✅ NNIT Pay API v3.0 running on http://localhost:${PORT}`);
  console.log(`💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? "connected" : "MISSING KEY"}`);
  console.log(`📋 API info: http://localhost:${PORT}/\n`);
});
