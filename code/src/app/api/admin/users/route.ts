import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");

  const params: string[] = [];
  const whereClause = role ? `WHERE u.role = $${params.push(role)}` : "";

  const result = await getDb().query(
    `SELECT u.id,
            u.full_name,
            u.email,
            u.role,
            u.is_active,
            u.balance,
            u.created_at,
            vc.is_verified AS chef_verified
     FROM users u
     LEFT JOIN verified_chefs vc ON vc.user_id = u.id
     ${whereClause}
     ORDER BY u.created_at DESC`,
    params,
  );

  return NextResponse.json({ users: result.rows });
}
