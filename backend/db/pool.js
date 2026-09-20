require("dotenv").config();
const { Pool } = require("pg");
const ssl = process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false };

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl,
    }
  : {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "medicard",
      ssl,
    };

if (!process.env.DATABASE_URL && !process.env.DB_NAME) {
  console.error("Neither DATABASE_URL nor DB_NAME is defined. Add them to backend/.env");
}

const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("Unexpected pg pool error:", err.message);
});

module.exports = pool;