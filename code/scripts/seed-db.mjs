import pg from "pg";
import bcrypt from "bcrypt";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const USERS = [
  { fullName: "Alice Cook",    email: "cook@test.com",     role: "home_cook" },
  { fullName: "Chef Marco",   email: "chef@test.com",     role: "verified_chef" },
  { fullName: "FreshFarm Co", email: "supplier@test.com", role: "local_supplier" },
  { fullName: "Admin User",   email: "admin@test.com",    role: "admin" },
];

const PASSWORD = "password123";
const hash = await bcrypt.hash(PASSWORD, 12);

const client = await pool.connect();
try {
  await client.query("BEGIN");

  for (const u of USERS) {
    const res = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, role`,
      [u.fullName, u.email, hash, u.role],
    );

    if (!res.rows.length) {
      console.log(`  skip (already exists): ${u.email}`);
      continue;
    }

    const { id, role } = res.rows[0];

    if (role === "home_cook") {
      await client.query(
        `INSERT INTO home_cooks (user_id, delivery_address) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [id, "123 Main St, Ankara"],
      );
    } else if (role === "verified_chef") {
      await client.query(
        `INSERT INTO verified_chefs (user_id, bio, is_verified) VALUES ($1, $2, TRUE) ON CONFLICT DO NOTHING`,
        [id, "Professional chef with 10 years of experience."],
      );
    } else if (role === "local_supplier") {
      await client.query(
        `INSERT INTO local_suppliers (user_id, business_name, business_address) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [id, "FreshFarm Co", "456 Farm Rd, Ankara"],
      );
    } else if (role === "admin") {
      await client.query(
        `INSERT INTO admins (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [id],
      );
    }

    console.log(`  created: ${u.email} (${role})`);
  }

  await client.query("COMMIT");
  console.log(`\nAll mock users created. Password for all: "${PASSWORD}"`);
} catch (err) {
  await client.query("ROLLBACK");
  console.error("Seed failed:", err);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
