import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { requireSupplierSession } from "@/lib/supplier-auth";
import { logSupplierAction } from "@/lib/supplier-history";

export async function GET() {
  const session = await requireSupplierSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await getDb().query(
    `SELECT sii.id,
            sii.ingredient_id,
            i.ingredient_name,
            sii.alias_id,
            ia.alias_name,
            sii.unit,
            sii.unit_price,
            sii.current_stock,
            sii.is_active,
            sii.updated_at
     FROM supplier_inventory_items sii
     JOIN ingredients i ON i.id = sii.ingredient_id
     LEFT JOIN ingredient_aliases ia ON ia.id = sii.alias_id
     WHERE sii.supplier_id = $1
       AND sii.current_stock > 0
     ORDER BY i.ingredient_name ASC, ia.alias_name ASC NULLS LAST`,
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
    aliasId?: string;
    unit?: string;
    unitPrice?: number;
    initialStock?: number;
  };

  if ((!body.ingredientName && !body.ingredientId && !body.aliasId) || !body.unit || body.unitPrice == null || body.initialStock == null) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const inputName = body.ingredientName?.trim() ?? "";

  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    // Preferred: canonical ingredient selection by id (UI selects from namespace).
    // Preferred: alias selection by id (separate stock by taxonomy alias).
    // Fallback: resolve via ingredient/alias name match (backward compatible).
    let ingredientId: string | null = body.ingredientId?.trim() || null;
    let aliasId: string | null = body.aliasId?.trim() || null;
    let resolvedNameForNote = inputName;

    if (aliasId) {
      const alias = await client.query<{ alias_name: string; canonical_ingredient_id: string }>(
        `SELECT alias_name, canonical_ingredient_id
         FROM ingredient_aliases
         WHERE id = $1`,
        [aliasId],
      );
      if (!alias.rowCount) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Selected alias does not exist." }, { status: 400 });
      }
      ingredientId = alias.rows[0].canonical_ingredient_id;
      resolvedNameForNote = alias.rows[0].alias_name;
    } else if (ingredientId) {
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

      const aliasMatch = await client.query<{ id: string; canonical_ingredient_id: string; alias_name: string }>(
        `SELECT id, canonical_ingredient_id, alias_name
         FROM ingredient_aliases
         WHERE LOWER(alias_name) = LOWER($1)
         LIMIT 1`,
        [inputName],
      );

      ingredientId = aliasMatch.rows[0]?.canonical_ingredient_id ?? null;
      aliasId = aliasMatch.rows[0]?.id ?? null;
      if (aliasMatch.rowCount) {
        resolvedNameForNote = aliasMatch.rows[0].alias_name;
      }

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

    let inventoryItemId: string;
    if (aliasId) {
      const aliasSpecific = await client.query<{ id: string }>(
        `SELECT id
         FROM supplier_inventory_items
         WHERE supplier_id = $1 AND ingredient_id = $2 AND alias_id = $3
         LIMIT 1
         FOR UPDATE`,
        [session.user.id, ingredientId, aliasId],
      );

      if (aliasSpecific.rowCount) {
        inventoryItemId = aliasSpecific.rows[0].id;
        await client.query(
          `UPDATE supplier_inventory_items
           SET unit = $1,
               unit_price = $2,
               current_stock = current_stock + $3,
               updated_at = NOW()
           WHERE id = $4`,
          [body.unit.trim(), body.unitPrice, body.initialStock, inventoryItemId],
        );
      } else {
        const legacyCanonical = await client.query<{ id: string }>(
          `SELECT id
           FROM supplier_inventory_items
           WHERE supplier_id = $1 AND ingredient_id = $2 AND alias_id IS NULL
           LIMIT 1
           FOR UPDATE`,
          [session.user.id, ingredientId],
        );

        if (legacyCanonical.rowCount) {
          inventoryItemId = legacyCanonical.rows[0].id;
          await client.query(
            `UPDATE supplier_inventory_items
             SET alias_id = $1,
                 unit = $2,
                 unit_price = $3,
                 current_stock = current_stock + $4,
                 updated_at = NOW()
             WHERE id = $5`,
            [aliasId, body.unit.trim(), body.unitPrice, body.initialStock, inventoryItemId],
          );
        } else {
          const inserted = await client.query<{ id: string }>(
            `INSERT INTO supplier_inventory_items (supplier_id, ingredient_id, alias_id, unit, unit_price, current_stock)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [session.user.id, ingredientId, aliasId, body.unit.trim(), body.unitPrice, body.initialStock],
          );
          inventoryItemId = inserted.rows[0].id;
        }
      }
    } else {
      const itemResult = await client.query<{ id: string }>(
        `INSERT INTO supplier_inventory_items (supplier_id, ingredient_id, alias_id, unit, unit_price, current_stock)
         VALUES ($1, $2, NULL, $3, $4, $5)
         ON CONFLICT (supplier_id, ingredient_id, alias_id)
         DO UPDATE SET unit = EXCLUDED.unit,
                       unit_price = EXCLUDED.unit_price,
                       current_stock = supplier_inventory_items.current_stock + EXCLUDED.current_stock,
                       updated_at = NOW()
         RETURNING id`,
        [session.user.id, ingredientId, body.unit.trim(), body.unitPrice, body.initialStock],
      );
      inventoryItemId = itemResult.rows[0].id;
    }

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
