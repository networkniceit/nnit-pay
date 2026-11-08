// Keeps NNIT Pay users, wallets and transactions in a real PostgreSQL database.
// Set DATABASE_URL (Railway Postgres) and balances survive every redeploy.
// Without DATABASE_URL the app runs exactly as before (in memory).
import pg from "pg";
import { db } from "./db.js";

const KEY = "state";

export async function initPersistence() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("🗄️  Database: DATABASE_URL not set — data is kept in memory only");
    return;
  }
  const pool = new pg.Pool({
    connectionString: url,
    ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
  await pool.query(
    "CREATE TABLE IF NOT EXISTS pay_state (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz DEFAULT now())"
  );
  const saved = await pool.query("SELECT value FROM pay_state WHERE key=$1", [KEY]);
  if (saved.rows.length) {
    const v = saved.rows[0].value;
    for (const name of ["users", "wallets", "transactions"]) {
      if (Array.isArray(v[name])) db[name].splice(0, db[name].length, ...v[name]);
    }
    console.log(`🗄️  Database: restored ${db.users.length} users, ${db.wallets.length} wallets, ${db.transactions.length} transactions`);
  } else {
    console.log("🗄️  Database: empty, saving the starting state");
  }

  let last = "";
  const save = async () => {
    const snap = JSON.stringify({ users: db.users, wallets: db.wallets, transactions: db.transactions });
    if (snap === last) return;
    await pool.query(
      "INSERT INTO pay_state (key, value, updated_at) VALUES ($1, $2::jsonb, now()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()",
      [KEY, snap]
    );
    last = snap;
  };
  await save();
  setInterval(() => save().catch((e) => console.error("DB save failed:", e.message)), 1500);
  const bye = async () => { try { await save(); } catch {} process.exit(0); };
  process.on("SIGTERM", bye);
  process.on("SIGINT", bye);
}
