import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db.js";
const router = express.Router();
// Token secret: set JWT_SECRET on the server. Without it a random one is made at every start (logins then end on redeploy) - never a known default.
const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
if (!process.env.JWT_SECRET) console.warn("JWT_SECRET is not set: using a random secret for this run");
const isHash = (p) => typeof p === "string" && /^\$2[aby]\$/.test(p);
if(!db.users.find(u=>u.email==="networkniceit@gmail.com")){db.users.push({id:"owner-001",name:"Solomon Ayodele",email:"networkniceit@gmail.com",password:"NNIT@2024",createdAt:new Date()});db.wallets.push({userId:"owner-001",balance:10000.00,currency:"EUR"});}
export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.userId;
    next();
  } catch { res.status(401).json({ error: "Invalid token" }); }
};
router.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "All fields required" });
  if (db.users.find(u => u.email === email)) return res.status(400).json({ error: "Email already registered" });
  const user = { id: uuidv4(), name, email, password: bcrypt.hashSync(password, 10), createdAt: new Date() };
  db.users.push(user);
  db.wallets.push({ userId: user.id, balance: 100.00, currency: "EUR" });
  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "7d" });
  res.json({ message: "Registered successfully", token, user: { id: user.id, name, email } });
});
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email);
  let ok = false;
  if (user && typeof password === "string") {
    if (isHash(user.password)) ok = bcrypt.compareSync(password, user.password);
    else if (user.password === password) { ok = true; user.password = bcrypt.hashSync(password, 10); } // old plain password: upgrade to a hash on first login
  }
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });
  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "7d" });
  res.json({ message: "Login successful", token, user: { id: user.id, name: user.name, email } });
});
router.get("/me", authenticate, (req, res) => {
  const user = db.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user.id, name: user.name, email: user.email });
});
// Closed on purpose: it let anyone reset any account's password knowing only the email. Needs an email-code step first.
router.post("/forgot-password", (req, res) => {
  res.status(501).json({ error: "Password reset by email is not set up yet. Please contact NNIT support." });
});
export default router;


