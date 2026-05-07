import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const db = getDb();

  const ownerCheck = await db.query(
    `SELECT id FROM meal_lists WHERE id = $1 AND user_id = $2`,
    [id, session.user.id],
  );
  if (ownerCheck.rows.length === 0) {
    return NextResponse.json({ error: "List not found or not yours." }, { status: 404 });
  }

  const result = await db.query(
    `SELECT r.id, r.title, r.difficulty, r.cooking_time_minutes, r.servings,
            u.full_name AS author_name, mlr.added_at
     FROM meal_list_recipes mlr
     JOIN recipes r ON r.id = mlr.recipe_id
     JOIN users u ON u.id = r.author_id
     WHERE mlr.list_id = $1
     ORDER BY mlr.added_at DESC`,
    [id],
  );

  return NextResponse.json({ recipes: result.rows });
}

export async function POST(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json() as { recipeId?: string };

  if (!body.recipeId) {
    return NextResponse.json({ error: "recipeId is required." }, { status: 400 });
  }

  const db = getDb();

  const ownerCheck = await db.query(
    `SELECT id FROM meal_lists WHERE id = $1 AND user_id = $2`,
    [id, session.user.id],
  );
  if (ownerCheck.rows.length === 0) {
    return NextResponse.json({ error: "List not found or not yours." }, { status: 404 });
  }

  try {
    await db.query(
      `INSERT INTO meal_list_recipes (list_id, recipe_id) VALUES ($1, $2)`,
      [id, body.recipeId],
    );
  } catch {
    return NextResponse.json({ error: "Recipe already in this list." }, { status: 409 });
  }

  const recipe = await db.query(
    `SELECT r.id, r.title, r.difficulty, r.cooking_time_minutes, r.servings,
            u.full_name AS author_name, NOW() AS added_at
     FROM recipes r
     JOIN users u ON u.id = r.author_id
     WHERE r.id = $1`,
    [body.recipeId],
  );

  return NextResponse.json({ recipe: recipe.rows[0] }, { status: 201 });
}
