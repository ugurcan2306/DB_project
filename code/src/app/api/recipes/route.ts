import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { requireRecipeCreatorSession } from "@/lib/recipe-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const result = await db.query(
    `SELECT r.id, r.title, u.full_name AS author_name
     FROM recipes r
     JOIN users u ON u.id = r.author_id
     WHERE r.is_published = TRUE AND r.is_deleted = FALSE
     ORDER BY r.title`,
  );
  return NextResponse.json({ recipes: result.rows });
}

type IngredientInput = {
  ingredientId: string;
  aliasId?: string | null;
  quantity: number;
  unit: string;
};

type StepInput = {
  instruction: string;
};

type CreateRecipeBody = {
  title?: string;
  description?: string;
  servings?: number;
  cookingTimeMinutes?: number;
  difficulty?: string;
  dietaryTags?: string[];
  coverImageUrl?: string;
  steps?: StepInput[];
  ingredients?: IngredientInput[];
};

const VALID_DIFFICULTIES = ["easy", "medium", "hard"];
const VALID_TAGS = ["vegan", "vegetarian", "keto", "gluten_free", "dairy_free", "nut_free", "halal", "paleo"];

export async function POST(request: Request) {
  const session = await requireRecipeCreatorSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as CreateRecipeBody;

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (!body.cookingTimeMinutes || body.cookingTimeMinutes <= 0) {
    return NextResponse.json({ error: "Cooking time must be a positive number." }, { status: 400 });
  }
  if (!body.servings || body.servings <= 0) {
    return NextResponse.json({ error: "Servings must be a positive number." }, { status: 400 });
  }
  if (!body.difficulty || !VALID_DIFFICULTIES.includes(body.difficulty)) {
    return NextResponse.json({ error: "Invalid difficulty level." }, { status: 400 });
  }
  if (!body.ingredients?.length) {
    return NextResponse.json({ error: "At least one ingredient is required." }, { status: 400 });
  }
  if (!body.steps?.length) {
    return NextResponse.json({ error: "At least one preparation step is required." }, { status: 400 });
  }

  const tags = (body.dietaryTags ?? []).filter((t) => VALID_TAGS.includes(t));

  const client = await getDb().connect();
  try {
    await client.query("BEGIN");

    const recipeResult = await client.query<{ id: string }>(
      `INSERT INTO recipes (author_id, title, description, servings, cooking_time_minutes, difficulty, dietary_tags, cover_image_url, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE)
       RETURNING id`,
      [
        session.user.id,
        body.title.trim(),
        body.description?.trim() ?? null,
        body.servings,
        body.cookingTimeMinutes,
        body.difficulty,
        tags,
        body.coverImageUrl?.trim() || null,
      ],
    );

    const recipeId = recipeResult.rows[0].id;

    for (const [i, step] of body.steps.entries()) {
      if (!step.instruction?.trim()) continue;
      await client.query(
        `INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES ($1, $2, $3)`,
        [recipeId, i + 1, step.instruction.trim()],
      );
    }

    for (const ing of body.ingredients) {
      if (!ing.ingredientId || !ing.quantity || !ing.unit) continue;
      await client.query(
        `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, alias_id, quantity, unit)
         VALUES ($1, $2, $3, $4, $5)`,
        [recipeId, ing.ingredientId, ing.aliasId ?? null, ing.quantity, ing.unit.trim()],
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true, recipeId });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Failed to create recipe." }, { status: 500 });
  } finally {
    client.release();
  }
}
