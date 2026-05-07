import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { requireSupplierSession } from "@/lib/supplier-auth";
import { logSupplierAction } from "@/lib/supplier-history";

export async function GET() {
  const session = await requireSupplierSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await getDb().query(
    `SELECT sii.id, sii.ingredient_id, i.ingredient_name, sii.unit, sii.unit_price, sii.current_stock, sii.is_active, sii.updated_at
     FROM supplier_inventory_items sii
     JOIN ingredients i ON i.id = sii.ingredient_id
     WHERE sii.supplier_id = $1
     ORDER BY i.ingredient_name ASC`,
    [session.user.id],
  );

  return NextResponse.json({ items: result.rows });
}

export async function POST(request: Request) {
  const session = await requireSupplierSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    ingredientName?: string;
    unit?: string;
    unitPrice?: number;
    initialStock?: number;
  };

  if (!body.ingredientName || !body.unit || body.unitPrice == null || body.initialStock == null) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const ingredientResult = await client.query<{ id: string }>(
      `INSERT INTO ingredients (ingredient_name)
       VALUES ($1)
       ON CONFLICT (ingredient_name) DO UPDATE SET ingredient_name = EXCLUDED.ingredient_name
       RETURNING id`,
      [body.ingredientName.trim()],
    );

    const ingredientId = ingredientResult.rows[0].id;

    const itemResult = await client.query<{ id: string }>(
      `INSERT INTO supplier_inventory_items (supplier_id, ingredient_id, unit, unit_price, current_stock)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (supplier_id, ingredient_id)
       DO UPDATE SET unit = EXCLUDED.unit,
                     unit_price = EXCLUDED.unit_price,
                     current_stock = supplier_inventory_items.current_stock + EXCLUDED.current_stock,
                     updated_at = NOW()
       RETURNING id`,
      [session.user.id, ingredientId, body.unit.trim(), body.unitPrice, body.initialStock],
    );

    const inventoryItemId = itemResult.rows[0].id;

    await client.query(
      `INSERT INTO supplier_inventory_batches (inventory_item_id, quantity_added, expires_at, status)
       VALUES ($1, $2, NULL, 'fresh')`,
      [inventoryItemId, body.initialStock],
    );

    await logSupplierAction(
      {
        supplierId: session.user.id,
        actionType: "initialize_stock",
        inventoryItemId,
        ingredientId,
        quantityChange: body.initialStock,
        note: `Initialized or increased stock for ${body.ingredientName.trim()}.`,
      },
      client,
    );

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Could not add inventory item." }, { status: 500 });
  } finally {
    client.release();
  }
}
