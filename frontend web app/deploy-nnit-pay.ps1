# NNIT PAY - ONE COMMAND FULL DEPLOY
# Save this as: C:\Users\netwo\deploy-nnit-pay.ps1
# Then run: powershell -ExecutionPolicy Bypass -File "C:\Users\netwo\deploy-nnit-pay.ps1"

$base = "C:\Users\netwo\nnit-pay"
$backend = "$base\backend"

Write-Host "`n NNIT Pay - Full Deploy Starting..." -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor DarkGray

# Create directories
"$backend\routes","$backend\middleware","$backend\config","$base\frontend" | ForEach-Object {
  New-Item -ItemType Directory -Force -Path $_ | Out-Null
}
Write-Host "[1/4] Directories ready" -ForegroundColor Green

# Write package.json
@'
{"name":"nnit-pay-backend","version":"2.0.0","type":"module","main":"server.js","scripts":{"dev":"node server.js","start":"node server.js"},"dependencies":{"express":"^4.18.2","uuid":"^9.0.0","bcryptjs":"^2.4.3","jsonwebtoken":"^9.0.0","cors":"^2.8.5","dotenv":"^16.0.0"}}
'@ | Set-Content "$backend\package.json" -Force

# Write .env
@'
PORT=5002
JWT_SECRET=nnitpay_super_secret_2024
NODE_ENV=development
'@ | Set-Content "$backend\.env" -Force

# Write config/db.js
@'
export const db={users:[],wallets:[],transactions:[],exchangeRates:{USD:1,EUR:0.92,GBP:0.79,NGN:1550,GHS:15.2,KES:130,ZAR:18.6,CAD:1.36,AUD:1.53,JPY:149,INR:83,MXN:17.2}};
'@ | Set-Content "$backend\config\db.js" -Force

# Write middleware/auth.js
@'
import jwt from "jsonwebtoken";
export const authenticate=(req,res,next)=>{const token=req.headers.authorization?.split(" ")[1];if(!token)return res.status(401).json({error:"No token provided"});try{const decoded=jwt.verify(token,process.env.JWT_SECRET||"nnitpay_secret");req.userId=decoded.userId;next();}catch{res.status(401).json({error:"Invalid token"});}};
'@ | Set-Content "$backend\middleware\auth.js" -Force

# Write routes/auth.js
@'
import express from "express";import{v4 as uuidv4}from"uuid";import bcrypt from"bcryptjs";import jwt from"jsonwebtoken";import{db}from"../config/db.js";
const router=express.Router();
router.post("/register",async(req,res)=>{try{const{name,email,password,phone,country}=req.body;if(!name||!email||!password)return res.status(400).json({error:"Name, email and password required"});if(db.users.find(u=>u.email===email))return res.status(409).json({error:"Email already registered"});const hashedPassword=await bcrypt.hash(password,10);const user={id:uuidv4(),name,email,phone:phone||"",country:country||"DE",password:hashedPassword,kycStatus:"pending",createdAt:new Date()};db.users.push(user);db.wallets.push({id:uuidv4(),userId:user.id,balance:0,currency:"EUR"});const token=jwt.sign({userId:user.id},process.env.JWT_SECRET||"nnitpay_secret",{expiresIn:"7d"});const{password:_,...safeUser}=user;res.status(201).json({message:"Registration successful",user:safeUser,token});}catch(err){res.status(500).json({error:err.message});}});
router.post("/login",async(req,res)=>{try{const{email,password}=req.body;const user=db.users.find(u=>u.email===email);if(!user)return res.status(401).json({error:"Invalid credentials"});const valid=await bcrypt.compare(password,user.password);if(!valid)return res.status(401).json({error:"Invalid credentials"});const token=jwt.sign({userId:user.id},process.env.JWT_SECRET||"nnitpay_secret",{expiresIn:"7d"});const{password:_,...safeUser}=user;res.json({message:"Login successful",user:safeUser,token});}catch(err){res.status(500).json({error:err.message});}});
router.get("/me",(req,res)=>{const token=req.headers.authorization?.split(" ")[1];if(!token)return res.status(401).json({error:"Unauthorized"});try{const{userId}=jwt.verify(token,process.env.JWT_SECRET||"nnitpay_secret");const user=db.users.find(u=>u.id===userId);if(!user)return res.status(404).json({error:"User not found"});const{password:_,...safeUser}=user;res.json(safeUser);}catch{res.status(401).json({error:"Invalid token"});}});
export default router;
'@ | Set-Content "$backend\routes\auth.js" -Force

# Write routes/wallet.js
@'
import express from"express";import{db}from"../config/db.js";import{authenticate}from"../middleware/auth.js";
const router=express.Router();
router.get("/",authenticate,(req,res)=>{const wallet=db.wallets.find(w=>w.userId===req.userId);if(!wallet)return res.status(404).json({error:"Wallet not found"});res.json(wallet);});
router.get("/rates",(req,res)=>{res.json(db.exchangeRates);});
router.post("/topup",authenticate,(req,res)=>{const{amount}=req.body;if(!amount||amount<=0)return res.status(400).json({error:"Invalid amount"});const wallet=db.wallets.find(w=>w.userId===req.userId);if(!wallet)return res.status(404).json({error:"Wallet not found"});wallet.balance=parseFloat((wallet.balance+parseFloat(amount)).toFixed(2));res.json({message:"Top-up successful",wallet});});
export default router;
'@ | Set-Content "$backend\routes\wallet.js" -Force

# Write routes/transfer.js
@'
import express from"express";import{v4 as uuidv4}from"uuid";import{db}from"../config/db.js";import{authenticate}from"../middleware/auth.js";
const router=express.Router();
const convert=(amount,from,to)=>{const rates=db.exchangeRates;if(!rates[from]||!rates[to])throw new Error(`Unsupported currency`);return parseFloat(((amount/rates[from])*rates[to]).toFixed(2));};
router.post("/",authenticate,(req,res)=>{try{const{receiverEmail,amount,currency,note}=req.body;if(!receiverEmail||!amount||!currency)return res.status(400).json({error:"receiverEmail, amount and currency required"});if(parseFloat(amount)<=0)return res.status(400).json({error:"Amount must be positive"});const sender=db.users.find(u=>u.id===req.userId);const receiver=db.users.find(u=>u.email===receiverEmail);if(!receiver)return res.status(404).json({error:"Receiver not found. Ask them to register first."});if(sender.id===receiver.id)return res.status(400).json({error:"Cannot send to yourself"});const senderWallet=db.wallets.find(w=>w.userId===sender.id);const receiverWallet=db.wallets.find(w=>w.userId===receiver.id);const amountInEUR=convert(parseFloat(amount),currency,"EUR");const fee=parseFloat((amountInEUR*0.015).toFixed(2));const totalDeducted=parseFloat((amountInEUR+fee).toFixed(2));if(senderWallet.balance<totalDeducted)return res.status(400).json({error:`Insufficient funds. Need EUR ${totalDeducted} (incl EUR ${fee} fee), have EUR ${senderWallet.balance}`});senderWallet.balance=parseFloat((senderWallet.balance-totalDeducted).toFixed(2));receiverWallet.balance=parseFloat((receiverWallet.balance+amountInEUR).toFixed(2));const tx={id:uuidv4(),senderId:sender.id,senderName:sender.name,senderEmail:sender.email,receiverId:receiver.id,receiverName:receiver.name,receiverEmail:receiver.email,amount:parseFloat(amount),currency,amountInEUR,fee,totalDeducted,note:note||"",status:"completed",type:"transfer",createdAt:new Date()};db.transactions.push(tx);res.json({message:"Transfer successful",transaction:tx});}catch(err){res.status(500).json({error:err.message});}});
router.post("/quote",(req,res)=>{try{const{amount,fromCurrency,toCurrency}=req.body;if(!amount||!fromCurrency||!toCurrency)return res.status(400).json({error:"amount, fromCurrency, toCurrency required"});const parsedAmount=parseFloat(amount);const fee=parseFloat((parsedAmount*0.015).toFixed(2));const amountAfterFee=parsedAmount-fee;const converted=convert(amountAfterFee,fromCurrency,toCurrency);const rate=convert(1,fromCurrency,toCurrency);res.json({send:parsedAmount,fromCurrency,fee,amountAfterFee,toCurrency,receiverGets:converted,exchangeRate:rate,estimatedTime:"1-3 minutes"});}catch(err){res.status(400).json({error:err.message});}});
export default router;
'@ | Set-Content "$backend\routes\transfer.js" -Force

# Write routes/transactions.js
@'
import express from"express";import{db}from"../config/db.js";import{authenticate}from"../middleware/auth.js";
const router=express.Router();
router.get("/",authenticate,(req,res)=>{const txs=db.transactions.filter(t=>t.senderId===req.userId||t.receiverId===req.userId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(t=>({...t,direction:t.senderId===req.userId?"sent":"received"}));res.json(txs);});
router.get("/:id",authenticate,(req,res)=>{const tx=db.transactions.find(t=>t.id===req.params.id&&(t.senderId===req.userId||t.receiverId===req.userId));if(!tx)return res.status(404).json({error:"Transaction not found"});res.json({...tx,direction:tx.senderId===req.userId?"sent":"received"});});
export default router;
'@ | Set-Content "$backend\routes\transactions.js" -Force

# Write server.js
@'
import express from"express";import cors from"cors";import dotenv from"dotenv";import authRoutes from"./routes/auth.js";import walletRoutes from"./routes/wallet.js";import transferRoutes from"./routes/transfer.js";import transactionRoutes from"./routes/transactions.js";
dotenv.config();
const app=express();
app.use(cors());app.use(express.json());
app.use("/auth",authRoutes);app.use("/wallet",walletRoutes);app.use("/transfer",transferRoutes);app.use("/transactions",transactionRoutes);
app.get("/",(req,res)=>res.json({name:"NNIT Pay API",version:"2.0.0",status:"running",endpoints:{auth:["POST /auth/register","POST /auth/login","GET /auth/me"],wallet:["GET /wallet","GET /wallet/rates","POST /wallet/topup"],transfer:["POST /transfer","POST /transfer/quote"],transactions:["GET /transactions","GET /transactions/:id"]}}));
app.use((req,res)=>res.status(404).json({error:"Route not found"}));
const PORT=process.env.PORT||5002;
app.listen(PORT,()=>{console.log("\n NNIT Pay API running on http://localhost:"+PORT);console.log(" Open frontend: file:///C:/Users/netwo/nnit-pay/frontend/index.html\n");});
'@ | Set-Content "$backend\server.js" -Force

Write-Host "[2/4] All code files written" -ForegroundColor Green

# Install
Set-Location $backend
Write-Host "[3/4] Installing npm packages..." -ForegroundColor Yellow
npm install --silent
Write-Host "[3/4] Packages installed" -ForegroundColor Green

Write-Host "[4/4] Starting NNIT Pay backend...`n" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor DarkGray
Write-Host " FRONTEND: Open this file in your browser:" -ForegroundColor Cyan
Write-Host " file:///C:/Users/netwo/nnit-pay/frontend/index.html" -ForegroundColor White
Write-Host "======================================`n" -ForegroundColor DarkGray

node server.js