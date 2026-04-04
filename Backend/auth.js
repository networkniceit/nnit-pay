import jwt from "jsonwebtoken";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db.js";
const router = express.Router();
export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "nnitpay_secret");
    req.userId = decoded.userId;
    next();
  } catch { res.status(401).json({ error: "Invalid token" }); }
};
router.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "All fields required" });
  if (db.users.find(u => u.email === email)) return res.status(400).json({ error: "Email already registered" });
  const user = { id: uuidv4(), name, email, password, createdAt: new Date() };
  db.users.push(user);
  db.wallets.push({ userId: user.id, balance: 100.00, currency: "EUR" });
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "nnitpay_secret", { expiresIn: "7d" });
  res.json({ message: "Registered successfully", token, user: { id: user.id, name, email } });
});
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid email or password" });
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "nnitpay_secret", { expiresIn: "7d" });
  res.json({ message: "Login successful", token, user: { id: user.id, name: user.name, email } });
});
router.get("/me", authenticate, (req, res) => {
  const user = db.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user.id, name: user.name, email: user.email });
});
router.post("/forgot-password", (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ error: "Email and new password required" });
  if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  const user = db.users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: "No account found with that email" });
  user.password = newPassword;
  res.json({ message: "Password reset successful. You can now login." });
});
export default router;

