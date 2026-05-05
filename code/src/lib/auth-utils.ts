import bcrypt from "bcrypt";
import { getDb } from "@/db/pool";
import type { UserRole } from "@/types/user";

export type DbUser = {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  role: UserRole;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string) {
  return bcrypt.compare(password, hashed);
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const normalized = email.trim().toLowerCase();
  const result = await getDb().query<DbUser>(
    `SELECT id, email, full_name, password_hash, role
     FROM users
     WHERE email = $1`,
    [normalized],
  );
  return result.rows[0] ?? null;
}

export function toDisplayRole(role: UserRole) {
  if (role === "home_cook") return "Home Cook";
  if (role === "verified_chef") return "Verified Chef";
  if (role === "local_supplier") return "Local Supplier";
  return "Admin";
}
