import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await getDb().query(
    `SELECT i.id, i.ingredient_name, i.category_id, ic.category_name
     FROM ingredients i
     LEFT JOIN ingredient_categories ic ON ic.id = i.category_id
     ORDER BY i.ingredient_name ASC`,
  );
  return NextResponse.json({ ingredients: result.rows });
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as { ingredient_name?: string; category_id?: string };
  if (!body.ingredient_name?.trim()) {
    return NextResponse.json({ error: "ingredient_name is required." }, { status: 400 });
  }

  const result = await getDb().query(
    `INSERT INTO ingredients (ingredient_name, category_id)
     VALUES ($1, $2)
     ON CONFLICT (ingredient_name) DO UPDATE
       SET category_id = COALESCE(EXCLUDED.category_id, ingredients.category_id)
     RETURNING id, ingredient_name, category_id`,
    [body.ingredient_name.trim(), body.category_id ?? null],
  );
  return NextResponse.json({ ingredient: result.rows[0] });
}

export async function DELETE(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  await getDb().query(`DELETE FROM ingredients WHERE id = $1`, [body.id]);
  return NextResponse.json({ success: true });
}
