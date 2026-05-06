import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await getDb().query(
    `SELECT ia.id, ia.alias_name, ia.canonical_ingredient_id, i.ingredient_name AS canonical_name
     FROM ingredient_aliases ia
     JOIN ingredients i ON i.id = ia.canonical_ingredient_id
     ORDER BY ia.alias_name ASC`,
  );
  return NextResponse.json({ aliases: result.rows });
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    alias_name?: string;
    canonical_ingredient_id?: string;
  };
  if (!body.alias_name?.trim() || !body.canonical_ingredient_id) {
    return NextResponse.json({ error: "alias_name and canonical_ingredient_id are required." }, { status: 400 });
  }

  try {
    const result = await getDb().query(
      `INSERT INTO ingredient_aliases (alias_name, canonical_ingredient_id)
       VALUES ($1, $2)
       RETURNING id, alias_name, canonical_ingredient_id`,
      [body.alias_name.trim(), body.canonical_ingredient_id],
    );
    return NextResponse.json({ alias: result.rows[0] });
  } catch {
    return NextResponse.json({ error: "Alias already exists or canonical ingredient not found." }, { status: 409 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  await getDb().query(`DELETE FROM ingredient_aliases WHERE id = $1`, [body.id]);
  return NextResponse.json({ success: true });
}