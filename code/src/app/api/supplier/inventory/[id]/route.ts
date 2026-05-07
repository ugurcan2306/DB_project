import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { requireSupplierSession } from "@/lib/supplier-auth";
import { logSupplierAction } from "@/lib/supplier-history";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSupplierSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await request.json()) as {
    unitPrice?: number;
    currentStock?: number;
    isActive?: boolean;
    removeQuantity?: number;
  };

  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const prev = await client.query<{ ingredient_id: string; current_stock: string }>(
      `SELECT ingredient_id, current_stock
       FROM supplier_inventory_items
       WHERE id = $1 AND supplier_id = $2`,
      [id, session.user.id],
    );

    if (!prev.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Inventory item not found." }, { status: 404 });
    }

    const before = Number(prev.rows[0].current_stock);
    let after = body.currentStock ?? before;

    if (body.removeQuantity != null) {
      if (body.removeQuantity <= 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "removeQuantity must be > 0." }, { status: 400 });
      }
      if (body.removeQuantity > before) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Cannot remove more than current stock." }, { status: 400 });
      }
      after = before - body.removeQuantity;
    }

    await client.query(
      `UPDATE supplier_inventory_items
       SET unit_price = COALESCE($1, unit_price),
           current_stock = $2,
           is_active = COALESCE($3, is_active),
           updated_at = NOW()
       WHERE id = $4 AND supplier_id = $5`,
      [body.unitPrice ?? null, after, body.isActive ?? null, id, session.user.id],
    );

    await logSupplierAction(
      {
        supplierId: session.user.id,
        actionType: body.removeQuantity != null ? "remove_stock" : "manual_update",
        inventoryItemId: id,
        ingredientId: prev.rows[0].ingredient_id,
        quantityChange: after - before,
        note: body.removeQuantity != null ? `Removed ${body.removeQuantity} from stock.` : "Manual inventory item update.",
      },
      client,
    );
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Could not update inventory item." }, { status: 500 });
  } finally {
    client.release();
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSupplierSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ ingredient_id: string; current_stock: string }>(
      `SELECT ingredient_id, current_stock
       FROM supplier_inventory_items
       WHERE id = $1 AND supplier_id = $2`,
      [id, session.user.id],
    );

    if (!existing.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Inventory item not found." }, { status: 404 });
    }

    await logSupplierAction(
      {
        supplierId: session.user.id,
        actionType: "remove_ingredient",
        inventoryItemId: id,
        ingredientId: existing.rows[0].ingredient_id,
        quantityChange: -Math.abs(Number(existing.rows[0].current_stock)),
        note: "Ingredient removed from supplier inventory.",
      },
      client,
    );

    await client.query(`DELETE FROM supplier_inventory_items WHERE id = $1 AND supplier_id = $2`, [id, session.user.id]);
    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Could not remove ingredient." }, { status: 500 });
  } finally {
    client.release();
  }
}
