import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { requireAdminSession } from "@/lib/admin-auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await request.json()) as {
    is_active?: boolean;
    is_verified?: boolean;
    balance?: number;
  };

  if (body.balance !== undefined) {
    if (!Number.isFinite(body.balance) || body.balance < 0) {
      return NextResponse.json({ error: "Balance must be a non-negative number." }, { status: 400 });
    }
  }

  const client = await getDb().connect();
  try {
    await client.query("BEGIN");

    if (body.is_active !== undefined) {
      await client.query(
        `UPDATE users SET is_active = $1 WHERE id = $2`,
        [body.is_active, id],
      );
    }

    if (body.is_verified !== undefined) {
      await client.query(
        `UPDATE verified_chefs SET is_verified = $1 WHERE user_id = $2`,
        [body.is_verified, id],
      );
    }

    if (body.balance !== undefined) {
      await client.query(
        `UPDATE users SET balance = $1::numeric WHERE id = $2`,
        [body.balance, id],
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  } finally {
    client.release();
  }
}
