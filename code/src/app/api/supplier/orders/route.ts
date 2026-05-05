import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { requireSupplierSession } from "@/lib/supplier-auth";

export async function GET() {
  const session = await requireSupplierSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ordersResult = await getDb().query(
    `SELECT id, status, total_price, created_at, updated_at
     FROM supplier_orders
     WHERE supplier_id = $1
     ORDER BY created_at DESC`,
    [session.user.id],
  );

  return NextResponse.json({ orders: ordersResult.rows });
}
