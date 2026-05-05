import { getDb } from "@/db/pool";
import { hashPassword } from "@/lib/auth-utils";
import type { UserRole } from "@/types/user";

type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  deliveryAddress?: string;
  businessName?: string;
  businessAddress?: string;
};

export async function registerUser(input: RegisterInput) {
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");

    const passwordHash = await hashPassword(input.password);
    const normalizedEmail = input.email.trim().toLowerCase();

    const userInsert = await client.query<{ id: string }>(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [input.fullName.trim(), normalizedEmail, passwordHash, input.role],
    );

    const userId = userInsert.rows[0].id;

    if (input.role === "home_cook") {
      await client.query(
        `INSERT INTO home_cooks (user_id, delivery_address)
         VALUES ($1, $2)`,
        [userId, input.deliveryAddress?.trim() || null],
      );
    } else if (input.role === "verified_chef") {
      await client.query("INSERT INTO verified_chefs (user_id) VALUES ($1)", [userId]);
    } else if (input.role === "local_supplier") {
      await client.query(
        `INSERT INTO local_suppliers (user_id, business_name, business_address)
         VALUES ($1, $2, $3)`,
        [userId, input.businessName?.trim() || null, input.businessAddress?.trim() || null],
      );
    } else if (input.role === "admin") {
      await client.query("INSERT INTO admins (user_id) VALUES ($1)", [userId]);
    }

    await client.query("COMMIT");
    return { userId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
