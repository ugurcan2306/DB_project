import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { requireSupplierSession } from "@/lib/supplier-auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSupplierSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await request.json()) as { status?: "pending" | "accepted" | "packed" | "fulfilled" | "cancelled" };
  if (!body.status) {
    return NextResponse.json({ error: "status is required." }, { status: 400 });
  }

  await getDb().query(
    `UPDATE supplier_orders
     SET status = $1, updated_at = NOW()
     WHERE id = $2 AND supplier_id = $3`,
    [body.status, id, session.user.id],
  );

  return NextResponse.json({ success: true });
}
