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

  const recipesResult = await db.query<{ id: string; title: string; description: string | null; difficulty: string; cooking_time_minutes: number; servings: number; dietary_tags: string[]; cover_image_url: string | null; is_deleted: boolean; author_name: string; added_at: string; user_rating: number | null; author_avg_rating: number | null }>(
    `SELECT r.id, r.title, r.description, r.difficulty, r.cooking_time_minutes, r.servings,
            r.dietary_tags, r.cover_image_url, r.is_deleted, u.full_name AS author_name, mlr.added_at,
            cl.rating AS user_rating,
            (SELECT ROUND(AVG(cl2.rating)::numeric, 1)
             FROM cook_logs cl2
             JOIN recipes r2 ON r2.id = cl2.recipe_id
             WHERE r2.author_id = u.id) AS author_avg_rating
     FROM meal_list_recipes mlr
     JOIN recipes r ON r.id = mlr.recipe_id
     JOIN users u ON u.id = r.author_id
     LEFT JOIN cook_logs cl ON cl.recipe_id = r.id AND cl.user_id = $2
     WHERE mlr.list_id = $1
     ORDER BY mlr.added_at DESC`,
    [id, session.user.id],
  );

  const recipes = recipesResult.rows;

  if (recipes.length === 0) return NextResponse.json({ recipes: [] });

  const ids = recipes.map((r) => r.id);

  const stepsResult = await db.query<{ recipe_id: string; step_number: number; instruction: string }>(
    `SELECT recipe_id, step_number, instruction FROM recipe_steps
     WHERE recipe_id = ANY($1) ORDER BY recipe_id, step_number`,
    [ids],
  );

  const ingredientsResult = await db.query<{ recipe_id: string; ingredient_name: string; quantity: number; unit: string }>(
    `SELECT ri.recipe_id, i.ingredient_name, ri.quantity, ri.unit
     FROM recipe_ingredients ri
     JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE ri.recipe_id = ANY($1) ORDER BY ri.recipe_id, i.ingredient_name`,
    [ids],
  );

  const stepsByRecipe: Record<string, { step_number: number; instruction: string }[]> = {};
  for (const s of stepsResult.rows) {
    if (!stepsByRecipe[s.recipe_id]) stepsByRecipe[s.recipe_id] = [];
    stepsByRecipe[s.recipe_id].push({ step_number: s.step_number, instruction: s.instruction });
  }

  const ingredientsByRecipe: Record<string, { ingredient_name: string; quantity: number; unit: string }[]> = {};
  for (const i of ingredientsResult.rows) {
    if (!ingredientsByRecipe[i.recipe_id]) ingredientsByRecipe[i.recipe_id] = [];
    ingredientsByRecipe[i.recipe_id].push({ ingredient_name: i.ingredient_name, quantity: i.quantity, unit: i.unit });
  }

  return NextResponse.json({
    recipes: recipes.map((r) => ({
      ...r,
      steps: stepsByRecipe[r.id] ?? [],
      ingredients: ingredientsByRecipe[r.id] ?? [],
    })),
  });
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
    `SELECT r.id, r.title, r.description, r.difficulty, r.cooking_time_minutes, r.servings,
            r.dietary_tags, r.cover_image_url, r.is_deleted,
            u.full_name AS author_name, NOW() AS added_at, NULL AS user_rating
     FROM recipes r
     JOIN users u ON u.id = r.author_id
     WHERE r.id = $1`,
    [body.recipeId],
  );

  return NextResponse.json({ recipe: recipe.rows[0] }, { status: 201 });
}
