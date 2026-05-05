import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { requireSupplierSession } from "@/lib/supplier-auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSupplierSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await request.json()) as {
    unitPrice?: number;
    currentStock?: number;
    isActive?: boolean;
  };

  await getDb().query(
    `UPDATE supplier_inventory_items
     SET unit_price = COALESCE($1, unit_price),
         current_stock = COALESCE($2, current_stock),
         is_active = COALESCE($3, is_active),
         updated_at = NOW()
     WHERE id = $4 AND supplier_id = $5`,
    [body.unitPrice ?? null, body.currentStock ?? null, body.isActive ?? null, id, session.user.id],
  );

  return NextResponse.json({ success: true });
}
