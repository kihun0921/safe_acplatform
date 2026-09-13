import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("No POSTGRES_URL_NON_POOLING / POSTGRES_URL found in .env.local");
  process.exit(1);
}

const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

const sanitizedConnectionString = connectionString.replace(/([?&])sslmode=[^&]*/i, "$1sslmode=no-verify");
const client = new pg.Client({
  connectionString: sanitizedConnectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("Schema applied successfully.");
} catch (err) {
  console.error("Schema apply failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
