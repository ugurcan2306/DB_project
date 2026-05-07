import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function requireCookSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const { role } = session.user;
  if (role !== "home_cook" && role !== "verified_chef") return null;
  return session;
}

export async function GET() {
  const session = await requireCookSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const result = await db.query(
    `SELECT ml.id, ml.name, ml.description, ml.created_at,
            COUNT(mlr.recipe_id)::int AS recipe_count
     FROM meal_lists ml
     LEFT JOIN meal_list_recipes mlr ON mlr.list_id = ml.id
     WHERE ml.user_id = $1
     GROUP BY ml.id
     ORDER BY ml.created_at DESC`,
    [session.user.id],
  );

  return NextResponse.json({ lists: result.rows });
}

export async function POST(request: Request) {
  const session = await requireCookSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as { name?: string; description?: string };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "List name is required." }, { status: 400 });
  }

  const db = getDb();
  const result = await db.query(
    `INSERT INTO meal_lists (user_id, name, description) VALUES ($1, $2, $3) RETURNING id, name, description, created_at`,
    [session.user.id, body.name.trim(), body.description?.trim() ?? null],
  );

  return NextResponse.json({ list: { ...result.rows[0], recipe_count: 0 } }, { status: 201 });
}
