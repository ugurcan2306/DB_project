import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await getDb().query(
    `SELECT id, category_name FROM ingredient_categories ORDER BY category_name ASC`,
  );
  return NextResponse.json({ categories: result.rows });
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as { category_name?: string };
  if (!body.category_name?.trim()) {
    return NextResponse.json({ error: "category_name is required." }, { status: 400 });
  }

  const result = await getDb().query(
    `INSERT INTO ingredient_categories (category_name)
     VALUES ($1)
     ON CONFLICT (category_name) DO UPDATE SET category_name = EXCLUDED.category_name
     RETURNING id, category_name`,
    [body.category_name.trim()],
  );
  return NextResponse.json({ category: result.rows[0] });
}

export async function DELETE(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  await getDb().query(`DELETE FROM ingredient_categories WHERE id = $1`, [body.id]);
  return NextResponse.json({ success: true });
}