import { getDb } from "@/db/pool";
import type { UserRole } from "@/types/user";

export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  balance: string;
  avatarUrl: string | null;
  deliveryAddress: string | null;
  businessName: string | null;
  businessAddress: string | null;
  chefBio: string | null;
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const result = await getDb().query<{
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
    balance: string;
    avatar_url: string | null;
    delivery_address: string | null;
    business_name: string | null;
    business_address: string | null;
    chef_bio: string | null;
  }>(
    `SELECT u.id,
            u.full_name,
            u.email,
            u.role,
            u.balance,
            u.avatar_url,
            hc.delivery_address,
            ls.business_name,
            ls.business_address,
            vc.bio AS chef_bio
     FROM users u
     LEFT JOIN home_cooks hc ON hc.user_id = u.id
     LEFT JOIN local_suppliers ls ON ls.user_id = u.id
     LEFT JOIN verified_chefs vc ON vc.user_id = u.id
     WHERE u.id = $1`,
    [userId],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    balance: row.balance,
    avatarUrl: row.avatar_url,
    deliveryAddress: row.delivery_address,
    businessName: row.business_name,
    businessAddress: row.business_address,
    chefBio: row.chef_bio,
  };
}

export async function updateUserProfile(
  userId: string,
  role: UserRole,
  input: {
    fullName: string;
    avatarUrl?: string | null;
    deliveryAddress?: string | null;
    businessName?: string | null;
    businessAddress?: string | null;
    chefBio?: string | null;
  },
) {
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE users
       SET full_name = $1, avatar_url = $2
       WHERE id = $3`,
      [input.fullName.trim(), input.avatarUrl?.trim() || null, userId],
    );

    if (role === "home_cook") {
      await client.query(
        `UPDATE home_cooks
         SET delivery_address = $1
         WHERE user_id = $2`,
        [input.deliveryAddress?.trim() || null, userId],
      );
    }

    if (role === "local_supplier") {
      await client.query(
        `UPDATE local_suppliers
         SET business_name = $1,
             business_address = $2
         WHERE user_id = $3`,
        [input.businessName?.trim() || null, input.businessAddress?.trim() || null, userId],
      );
    }

    if (role === "verified_chef") {
      await client.query(
        `UPDATE verified_chefs
         SET bio = $1
         WHERE user_id = $2`,
        [input.chefBio?.trim() || null, userId],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
