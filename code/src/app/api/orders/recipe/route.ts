import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/db/pool";
import { logSupplierAction } from "@/lib/supplier-history";
import { randomUUID } from "node:crypto";

type IngredientInput = {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
};

type SupplierStock = {
  inventory_item_id: string;
  supplier_id: string;
  ingredient_id: string;
  ingredient_name: string;
  unit_price: string;
  current_stock: string;
  unit: string;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "home_cook") {
    return NextResponse.json({ error: "Only home cooks can place orders." }, { status: 403 });
  }

  const body = (await request.json()) as {
    recipeId?: string;
    recipeTitle?: string;
    ingredients?: IngredientInput[];
  };
  if (!body.recipeId || !body.ingredients?.length) {
    return NextResponse.json({ error: "Recipe and ingredients are required." }, { status: 400 });
  }

  const db = getDb();
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const userBalanceResult = await client.query<{ balance: string }>(
      `SELECT balance FROM users WHERE id = $1 FOR UPDATE`,
      [session.user.id],
    );
    if (!userBalanceResult.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const userBalance = Number(userBalanceResult.rows[0].balance);
    const allocations: Array<{
      supplierId: string;
      inventoryItemId: string;
      ingredientId: string;
      ingredientName: string;
      requestedIngredientName: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      lineTotal: number;
    }> = [];
    const shortages: Array<{ ingredientName: string; required: number; available: number; unit: string }> = [];
    const substitutionNotes: Array<{ requested: string; usedAlternatives: string[] }> = [];
    let totalPrice = 0;

    for (const ingredient of body.ingredients) {
      const needed = Number(ingredient.quantity);
      if (!needed || needed <= 0) continue;

      const stockResult = await client.query<SupplierStock>(
        `SELECT sii.id AS inventory_item_id,
                sii.supplier_id,
                sii.ingredient_id,
                i.ingredient_name,
                sii.unit_price,
                sii.current_stock,
                sii.unit
         FROM supplier_inventory_items sii
         JOIN ingredients i ON i.id = sii.ingredient_id
         WHERE sii.ingredient_id = $1
           AND sii.is_active = TRUE
           AND sii.current_stock > 0
         ORDER BY sii.unit_price ASC, sii.current_stock DESC`,
        [ingredient.ingredientId],
      );

      const categoryResult = await client.query<{ category_id: string | null }>(
        `SELECT category_id FROM ingredients WHERE id = $1`,
        [ingredient.ingredientId],
      );

      let remaining = needed;
      let availableTotal = 0;
      for (const row of stockResult.rows) {
        const available = Number(row.current_stock);
        availableTotal += available;
        if (remaining <= 0) break;
        const take = Math.min(remaining, available);
        if (take <= 0) continue;
        const unitPrice = Number(row.unit_price);
        const lineTotal = unitPrice * take;
        allocations.push({
          supplierId: row.supplier_id,
          inventoryItemId: row.inventory_item_id,
          ingredientId: row.ingredient_id,
          ingredientName: row.ingredient_name,
          requestedIngredientName: ingredient.ingredientName,
          quantity: take,
          unit: row.unit || ingredient.unit,
          unitPrice,
          lineTotal,
        });
        totalPrice += lineTotal;
        remaining -= take;
      }

      if (remaining > 0 && categoryResult.rows[0]?.category_id) {
        const altResult = await client.query<SupplierStock>(
          `SELECT sii.id AS inventory_item_id,
                  sii.supplier_id,
                  sii.ingredient_id,
                  i.ingredient_name,
                  sii.unit_price,
                  sii.current_stock,
                  sii.unit
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
          const unitPrice = Number(row.unit_price);
          const lineTotal = unitPrice * take;
          allocations.push({
            supplierId: row.supplier_id,
            inventoryItemId: row.inventory_item_id,
            ingredientId: row.ingredient_id,
            ingredientName: row.ingredient_name,
            requestedIngredientName: ingredient.ingredientName,
            quantity: take,
            unit: row.unit || ingredient.unit,
            unitPrice,
            lineTotal,
          });
          totalPrice += lineTotal;
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
          required: needed,
          available: availableTotal,
          unit: ingredient.unit,
        });
      }
    }

    if (shortages.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: "Some ingredients are unavailable right now.",
          shortages,
        },
        { status: 409 },
      );
    }

    if (userBalance < totalPrice) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: "Insufficient balance.",
          balance: userBalance.toFixed(2),
          required: totalPrice.toFixed(2),
        },
        { status: 400 },
      );
    }

    const orderBySupplier = new Map<string, { total: number; orderId?: string }>();
    const shoppingCartId = randomUUID();
    for (const a of allocations) {
      const current = orderBySupplier.get(a.supplierId) ?? { total: 0 };
      current.total += a.lineTotal;
      orderBySupplier.set(a.supplierId, current);
    }

    for (const [supplierId, info] of orderBySupplier.entries()) {
      const orderResult = await client.query<{ id: string }>(
        `INSERT INTO supplier_orders (supplier_id, home_cook_id, shopping_cart_id, status, total_price)
         VALUES ($1, $2, $3, 'pending', $4)
         RETURNING id`,
        [supplierId, session.user.id, shoppingCartId, info.total],
      );
      info.orderId = orderResult.rows[0].id;
    }

    for (const a of allocations) {
      const lockResult = await client.query<{ current_stock: string }>(
        `SELECT current_stock
         FROM supplier_inventory_items
         WHERE id = $1
         FOR UPDATE`,
        [a.inventoryItemId],
      );
      const currentStock = Number(lockResult.rows[0]?.current_stock ?? 0);
      if (currentStock < a.quantity) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Stock changed during checkout. Please retry." }, { status: 409 });
      }

      await client.query(
        `UPDATE supplier_inventory_items
         SET current_stock = current_stock - $1,
             updated_at = NOW()
         WHERE id = $2`,
        [a.quantity, a.inventoryItemId],
      );

      const supplierOrderId = orderBySupplier.get(a.supplierId)?.orderId;
      await client.query(
        `INSERT INTO supplier_order_items
          (supplier_order_id, ingredient_id, quantity, unit, price_per_unit, line_total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [supplierOrderId, a.ingredientId, a.quantity, a.unit, a.unitPrice, a.lineTotal],
      );

      await logSupplierAction(
        {
          supplierId: a.supplierId,
          inventoryItemId: a.inventoryItemId,
          ingredientId: a.ingredientId,
          supplierOrderId: supplierOrderId ?? null,
          actionType: "remove_stock",
          quantityChange: -a.quantity,
          note:
            a.ingredientName !== a.requestedIngredientName
              ? `Stock deducted for recipe checkout (substitute ${a.ingredientName} for ${a.requestedIngredientName}): ${body.recipeTitle ?? body.recipeId}.`
              : `Stock deducted for recipe checkout: ${body.recipeTitle ?? body.recipeId}.`,
        },
        client,
      );
    }

    await client.query(
      `UPDATE users
       SET balance = balance - $1::numeric
       WHERE id = $2`,
      [totalPrice, session.user.id],
    );

    // Mock cook action so chef royalty metrics can be updated from existing cook_logs-based analytics.
    await client.query(
      `INSERT INTO cook_logs (user_id, recipe_id, rating)
       VALUES ($1, $2, 5)
       ON CONFLICT (user_id, recipe_id)
       DO UPDATE SET cooked_at = NOW()`,
      [session.user.id, body.recipeId],
    );

    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      shoppingCartId,
      totalPrice: totalPrice.toFixed(2),
      remainingBalance: (userBalance - totalPrice).toFixed(2),
      supplierOrdersCreated: Array.from(orderBySupplier.values()).length,
      substitutionsUsed: substitutionNotes.length > 0,
      substitutionNotes,
    });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Failed to process checkout." }, { status: 500 });
  } finally {
    client.release();
  }
}

