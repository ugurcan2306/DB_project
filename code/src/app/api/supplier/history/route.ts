import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { requireSupplierSession } from "@/lib/supplier-auth";

export async function GET(request: Request) {
  const session = await requireSupplierSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const ingredient = url.searchParams.get("ingredient");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const filters: string[] = ["h.supplier_id = $1"];
  const values: Array<string> = [session.user.id];

  if (action && action !== "all") {
    values.push(action);
    filters.push(`h.action_type = $${values.length}`);
  }

  if (ingredient?.trim()) {
    values.push(`%${ingredient.trim()}%`);
    filters.push(`COALESCE(i.ingredient_name, '') ILIKE $${values.length}`);
  }

  if (from) {
    values.push(from);
    filters.push(`h.created_at >= $${values.length}::date`);
  }

  if (to) {
    values.push(to);
    filters.push(`h.created_at < ($${values.length}::date + INTERVAL '1 day')`);
  }

  const result = await getDb().query(
    `SELECT h.id,
            h.action_type,
            h.quantity_change,
            h.note,
            h.created_at,
            i.ingredient_name,
            h.supplier_order_id
     FROM supplier_inventory_history h
     LEFT JOIN ingredients i ON i.id = h.ingredient_id
     WHERE ${filters.join(" AND ")}
     ORDER BY h.created_at DESC
     LIMIT 300`,
    values,
  );

  return NextResponse.json({ entries: result.rows });
}
