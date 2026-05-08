import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/db/pool";

type IngredientInput = {
  ingredientId: string;
  aliasId?: string | null;
  ingredientName: string;
  quantity: number;
  unit: string;
};

type SupplierStock = {
  supplier_id: string;
  ingredient_id: string;
  alias_id: string | null;
  display_name: string; // alias name if alias_id else canonical name
  unit_price: string;
  current_stock: string;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    ingredients?: IngredientInput[];
    scale?: number;
  };
  if (!body.ingredients?.length) {
    return NextResponse.json({ error: "Ingredients are required." }, { status: 400 });
  }

  const scale = Number.isFinite(body.scale) && (body.scale ?? 1) > 0 ? Number(body.scale) : 1;

  const db = getDb();
  const shortages: Array<{ ingredientName: string; required: number; available: number; unit: string }> = [];
  const suppliersUsed = new Set<string>();
  const substitutionNotes: Array<{ requested: string; usedAlternatives: string[] }> = [];
  let totalPrice = 0;

  for (const ingredient of body.ingredients) {
    const required = Number(ingredient.quantity) * scale;
    if (!required || required <= 0) continue;

    const requestedAliasId = ingredient.aliasId ?? null;

    // Phase 1 — exact match: same ingredient_id AND same alias_id (NULL = NULL).
    // We use IS NOT DISTINCT FROM so NULL on either side compares as equal.
    const exactRes = await db.query<SupplierStock>(
      `SELECT sii.supplier_id,
              sii.ingredient_id,
              sii.alias_id,
              COALESCE(ia.alias_name, i.ingredient_name) AS display_name,
              sii.unit_price,
              sii.current_stock
       FROM supplier_inventory_items sii
       JOIN ingredients i ON i.id = sii.ingredient_id
       LEFT JOIN ingredient_aliases ia ON ia.id = sii.alias_id
       WHERE sii.ingredient_id = $1
         AND sii.alias_id IS NOT DISTINCT FROM $2::uuid
         AND sii.is_active = TRUE
         AND sii.current_stock > 0
       ORDER BY sii.unit_price ASC, sii.current_stock DESC`,
      [ingredient.ingredientId, requestedAliasId],
    );

    let remaining = required;
    let availableTotal = 0;
    for (const row of exactRes.rows) {
      const available = Number(row.current_stock);
      availableTotal += available;
      if (remaining <= 0) break;
      const take = Math.min(remaining, available);
      if (take <= 0) continue;
      totalPrice += take * Number(row.unit_price);
      suppliersUsed.add(row.supplier_id);
      remaining -= take;
    }

    // Phase 2 — substitute: same ingredient_id, DIFFERENT alias_id.
    // This covers both: (a) recipe wants generic, only variants in stock; and
    // (b) recipe wants a specific variant, only other variants/generic in stock.
    if (remaining > 0) {
      const substRes = await db.query<SupplierStock>(
        `SELECT sii.supplier_id,
                sii.ingredient_id,
                sii.alias_id,
                COALESCE(ia.alias_name, i.ingredient_name) AS display_name,
                sii.unit_price,
                sii.current_stock
         FROM supplier_inventory_items sii
         JOIN ingredients i ON i.id = sii.ingredient_id
         LEFT JOIN ingredient_aliases ia ON ia.id = sii.alias_id
         WHERE sii.ingredient_id = $1
           AND sii.alias_id IS DISTINCT FROM $2::uuid
           AND sii.is_active = TRUE
           AND sii.current_stock > 0
         ORDER BY sii.unit_price ASC, sii.current_stock DESC`,
        [ingredient.ingredientId, requestedAliasId],
      );

      const usedAltNames = new Set<string>();
      for (const row of substRes.rows) {
        const available = Number(row.current_stock);
        availableTotal += available;
        if (remaining <= 0) break;
        const take = Math.min(remaining, available);
        if (take <= 0) continue;
        totalPrice += take * Number(row.unit_price);
        suppliersUsed.add(row.supplier_id);
        remaining -= take;
        usedAltNames.add(row.display_name);
      }

      if (usedAltNames.size) {
        substitutionNotes.push({
          requested: ingredient.ingredientName,
          usedAlternatives: Array.from(usedAltNames),
        });
      }
    }

    if (remaining > 0) {
      shortages.push({
        ingredientName: ingredient.ingredientName,
        required,
        available: availableTotal,
        unit: ingredient.unit,
      });
    }
  }

  return NextResponse.json({
    totalPrice: totalPrice.toFixed(2),
    canFulfill: shortages.length === 0,
    suppliersUsed: suppliersUsed.size,
    shortages,
    substitutionsUsed: substitutionNotes.length > 0,
    substitutionNotes,
    scaleApplied: scale,
  });
}
