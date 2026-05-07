import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/db/pool";

type IngredientInput = {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
};

type SupplierStock = {
  supplier_id: string;
  ingredient_id: string;
  ingredient_name: string;
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
  };
  if (!body.ingredients?.length) {
    return NextResponse.json({ error: "Ingredients are required." }, { status: 400 });
  }

  const db = getDb();
  const shortages: Array<{ ingredientName: string; required: number; available: number; unit: string }> = [];
  const suppliersUsed = new Set<string>();
  const substitutionNotes: Array<{ requested: string; usedAlternatives: string[] }> = [];
  let totalPrice = 0;

  for (const ingredient of body.ingredients) {
    const required = Number(ingredient.quantity);
    if (!required || required <= 0) continue;

    const stockResult = await db.query<SupplierStock>(
      `SELECT sii.supplier_id, sii.ingredient_id, i.ingredient_name, sii.unit_price, sii.current_stock
       FROM supplier_inventory_items sii
       JOIN ingredients i ON i.id = sii.ingredient_id
       WHERE sii.ingredient_id = $1
         AND sii.is_active = TRUE
         AND sii.current_stock > 0
       ORDER BY sii.unit_price ASC, sii.current_stock DESC`,
      [ingredient.ingredientId],
    );

    const categoryResult = await db.query<{ category_id: string | null }>(
      `SELECT category_id FROM ingredients WHERE id = $1`,
      [ingredient.ingredientId],
    );

    let remaining = required;
    let availableTotal = 0;
    for (const row of stockResult.rows) {
      const available = Number(row.current_stock);
      availableTotal += available;
      if (remaining <= 0) break;
      const take = Math.min(remaining, available);
      if (take <= 0) continue;
      totalPrice += take * Number(row.unit_price);
      suppliersUsed.add(row.supplier_id);
      remaining -= take;
    }

    if (remaining > 0 && categoryResult.rows[0]?.category_id) {
      const altResult = await db.query<SupplierStock>(
        `SELECT sii.supplier_id, sii.ingredient_id, i.ingredient_name, sii.unit_price, sii.current_stock
         FROM supplier_inventory_items sii
         JOIN ingredients i ON i.id = sii.ingredient_id
         WHERE i.category_id = $1
           AND sii.ingredient_id <> $2
           AND sii.is_active = TRUE
           AND sii.current_stock > 0
         ORDER BY sii.unit_price ASC, sii.current_stock DESC`,
        [categoryResult.rows[0].category_id, ingredient.ingredientId],
      );

      const usedAltNames = new Set<string>();
      for (const row of altResult.rows) {
        const available = Number(row.current_stock);
        availableTotal += available;
        if (remaining <= 0) break;
        const take = Math.min(remaining, available);
        if (take <= 0) continue;
        totalPrice += take * Number(row.unit_price);
        suppliersUsed.add(row.supplier_id);
        remaining -= take;
        usedAltNames.add(row.ingredient_name);
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
  });
}
