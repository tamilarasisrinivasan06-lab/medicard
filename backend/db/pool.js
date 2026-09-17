require("dotenv").config();
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not defined. Add it to backend/.env");
}

const ssl = process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false };

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
});

pool.on("error", (err) => {
  console.error("Unexpected pg pool error:", err.message);
});

module.exports = pool;