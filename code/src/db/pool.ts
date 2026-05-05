import { Pool } from "pg";

const globalForDb = globalThis as unknown as { pool?: Pool };

export function getDb() {
  if (!globalForDb.pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set.");
    }
    globalForDb.pool = new Pool({ connectionString });
  }

  return globalForDb.pool;
}
