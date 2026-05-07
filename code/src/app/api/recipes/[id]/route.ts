import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { requireRecipeCreatorSession } from "@/lib/recipe-auth";

type Params = { params: Promise<{ id: string }> };

const VALID_DIFFICULTIES = ["easy", "medium", "hard"];
const VALID_TAGS = ["vegan", "vegetarian", "keto", "gluten_free", "dairy_free", "nut_free", "halal", "paleo"];

export async function GET(
  _request: Request,
  { params }: Params,
) {
  const session = await requireRecipeCreatorSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const db = getDb();

  const recipeResult = await db.query(
    `SELECT id, title, description, servings, cooking_time_minutes, difficulty, dietary_tags, cover_image_url
     FROM recipes
     WHERE id = $1 AND author_id = $2`,
    [id, session.user.id],
  );

  if (recipeResult.rows.length === 0) {
    return NextResponse.json({ error: "Recipe not found or not yours." }, { status: 404 });
  }

  const stepsResult = await db.query(
    `SELECT step_number, instruction FROM recipe_steps WHERE recipe_id = $1 ORDER BY step_number`,
    [id],
  );

  const ingredientsResult = await db.query(
    `SELECT ri.ingredient_id, i.ingredient_name, ri.quantity, ri.unit
     FROM recipe_ingredients ri
     JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE ri.recipe_id = $1`,
    [id],
  );

  return NextResponse.json({
    recipe: recipeResult.rows[0],
    steps: stepsResult.rows,
    ingredients: ingredientsResult.rows,
  });
}

export async function PUT(
  request: Request,
  { params }: Params,
) {
  const session = await requireRecipeCreatorSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const body = await request.json() as {
    title?: string;
    description?: string;
    servings?: number;
    cookingTimeMinutes?: number;
    difficulty?: string;
    dietaryTags?: string[];
    coverImageUrl?: string;
    steps?: { instruction: string }[];
    ingredients?: { ingredientId: string; quantity: number; unit: string }[];
  };

  if (!body.title?.trim()) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!body.cookingTimeMinutes || body.cookingTimeMinutes <= 0) return NextResponse.json({ error: "Cooking time must be a positive number." }, { status: 400 });
  if (!body.servings || body.servings <= 0) return NextResponse.json({ error: "Servings must be a positive number." }, { status: 400 });
  if (!body.difficulty || !VALID_DIFFICULTIES.includes(body.difficulty)) return NextResponse.json({ error: "Invalid difficulty level." }, { status: 400 });
  if (!body.ingredients?.length) return NextResponse.json({ error: "At least one ingredient is required." }, { status: 400 });
  if (!body.steps?.length) return NextResponse.json({ error: "At least one preparation step is required." }, { status: 400 });

  const tags = (body.dietaryTags ?? []).filter((t) => VALID_TAGS.includes(t));
  const db = getDb();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const check = await client.query(
      `SELECT id FROM recipes WHERE id = $1 AND author_id = $2`,
      [id, session.user.id],
    );
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Recipe not found or not yours." }, { status: 404 });
    }

    await client.query(
      `UPDATE recipes SET title=$1, description=$2, servings=$3, cooking_time_minutes=$4, difficulty=$5, dietary_tags=$6, cover_image_url=$7, updated_at=NOW()
       WHERE id=$8`,
      [body.title.trim(), body.description?.trim() ?? null, body.servings, body.cookingTimeMinutes, body.difficulty, tags, body.coverImageUrl?.trim() || null, id],
    );

    await client.query(`DELETE FROM recipe_steps WHERE recipe_id = $1`, [id]);
    for (const [i, step] of body.steps.entries()) {
      if (!step.instruction?.trim()) continue;
      await client.query(
        `INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES ($1, $2, $3)`,
        [id, i + 1, step.instruction.trim()],
      );
    }

    await client.query(`DELETE FROM recipe_ingredients WHERE recipe_id = $1`, [id]);
    for (const ing of body.ingredients) {
      if (!ing.ingredientId || !ing.quantity || !ing.unit) continue;
      await client.query(
        `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)`,
        [id, ing.ingredientId, ing.quantity, ing.unit.trim()],
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Failed to update recipe." }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(
  _request: Request,
  { params }: Params,
) {
  const session = await requireRecipeCreatorSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const db = getDb();

  const result = await db.query(
    `DELETE FROM recipes WHERE id = $1 AND author_id = $2`,
    [id, session.user.id],
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: "Recipe not found or not yours." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
