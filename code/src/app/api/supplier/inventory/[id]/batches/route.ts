import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { requireSupplierSession } from "@/lib/supplier-auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSupplierSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await request.json()) as { quantityAdded?: number; expiresAt?: string | null; status?: string };

  if (!body.quantityAdded || body.quantityAdded <= 0) {
    return NextResponse.json({ error: "quantityAdded must be > 0." }, { status: 400 });
  }

  const client = await getDb().connect();
  try {
    await client.query("BEGIN");

    const ownership = await client.query(
      `SELECT id FROM supplier_inventory_items WHERE id = $1 AND supplier_id = $2`,
      [id, session.user.id],
    );
    if (!ownership.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Inventory item not found." }, { status: 404 });
    }

    await client.query(
      `INSERT INTO supplier_inventory_batches (inventory_item_id, quantity_added, expires_at, status)
       VALUES ($1, $2, $3, $4)`,
      [id, body.quantityAdded, body.expiresAt ?? null, body.status?.trim() || "fresh"],
    );

    await client.query(
      `UPDATE supplier_inventory_items
       SET current_stock = current_stock + $1, updated_at = NOW()
       WHERE id = $2`,
      [body.quantityAdded, id],
    );

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Could not add supply batch." }, { status: 500 });
  } finally {
    client.release();
  }
}
