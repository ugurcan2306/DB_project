import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Set it before running db:init.");
}

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const schemaPath = path.resolve(currentDir, "../src/db/schema.sql");
const schemaSql = await fs.readFile(schemaPath, "utf8");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(schemaSql);
  console.log("Database schema initialized.");
} finally {
  await pool.end();
}
