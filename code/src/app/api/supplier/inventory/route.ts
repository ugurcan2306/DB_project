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
    ingredientId?: string;
    unit?: string;
    unitPrice?: number;
    initialStock?: number;
  };

  if ((!body.ingredientName && !body.ingredientId) || !body.unit || body.unitPrice == null || body.initialStock == null) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const inputName = body.ingredientName?.trim() ?? "";

  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    // Preferred: canonical ingredient selection by id (UI selects from namespace).
    // Fallback: resolve strictly via alias/canonical name match (backward compatible).
    let ingredientId: string | null = body.ingredientId?.trim() || null;
    let resolvedNameForNote = inputName;

    if (ingredientId) {
      const canonical = await client.query<{ ingredient_name: string }>(
        `SELECT ingredient_name FROM ingredients WHERE id = $1`,
        [ingredientId],
      );
      if (!canonical.rowCount) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Selected ingredient does not exist." }, { status: 400 });
      }
      resolvedNameForNote = canonical.rows[0].ingredient_name;
    } else {
      if (!inputName) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Ingredient is required." }, { status: 400 });
      }

      const aliasMatch = await client.query<{ canonical_ingredient_id: string; alias_name: string }>(
        `SELECT canonical_ingredient_id, alias_name
         FROM ingredient_aliases
         WHERE LOWER(alias_name) = LOWER($1)
         LIMIT 1`,
        [inputName],
      );

      ingredientId = aliasMatch.rows[0]?.canonical_ingredient_id ?? null;

      if (!ingredientId) {
        const canonicalMatch = await client.query<{ id: string; ingredient_name: string }>(
          `SELECT id, ingredient_name
           FROM ingredients
           WHERE LOWER(ingredient_name) = LOWER($1)
           LIMIT 1`,
          [inputName],
        );
        ingredientId = canonicalMatch.rows[0]?.id ?? null;
        if (canonicalMatch.rowCount) {
          resolvedNameForNote = canonicalMatch.rows[0].ingredient_name;
        }
      }

      if (!ingredientId) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error: "Ingredient not found in taxonomy. Please search and select from the list.",
          },
          { status: 400 },
        );
      }
    }

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
        note: `Initialized or increased stock for ${resolvedNameForNote}.`,
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
