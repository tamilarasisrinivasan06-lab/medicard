require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("./pool");
const { getDBStatus } = require("./status");

async function migrate() {
  if (!process.env.DATABASE_URL && !process.env.DB_NAME) {
    console.error("Neither DATABASE_URL nor DB_NAME is defined in environment variables.");
    process.exit(1);
  }

  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       version TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`
  );

  const dir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let applied = 0;

  for (const file of files) {
    const { rows } = await pool.query("SELECT 1 FROM schema_migrations WHERE version = $1", [file]);
    if (rows.length > 0) continue;

    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
      await client.query("COMMIT");
      applied += 1;
      console.log(`Applied migration: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  if (applied === 0) {
    console.log("No pending migrations.");
  }

  getDBStatus(true);
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});