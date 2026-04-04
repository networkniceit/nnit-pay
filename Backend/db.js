// In-memory database (replace with PostgreSQL for production)
export const db = {
  users: [{ id: "owner-001", name: "Solomon Ayodele", email: "networkniceit@gmail.com", password: "NNIT@2024", createdAt: new Date() }],
  wallets: [{ userId: "owner-001", balance: 10000.00, currency: "EUR" }],
  transactions: [],
  exchangeRates: {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    NGN: 1550,
    GHS: 15.2,
    KES: 130,
    ZAR: 18.6,
    CAD: 1.36,
    AUD: 1.53,
    JPY: 149,
    INR: 83,
    MXN: 17.2
  }
};

