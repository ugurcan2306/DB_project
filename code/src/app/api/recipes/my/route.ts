import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { requireRecipeCreatorSession } from "@/lib/recipe-auth";

export async function GET() {
  const session = await requireRecipeCreatorSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();

  const recipesResult = await db.query<{
    id: string;
    title: string;
    description: string | null;
    servings: number;
    cooking_time_minutes: number;
    difficulty: string;
    dietary_tags: string[];
    cover_image_url: string | null;
    created_at: string;
  }>(
    `SELECT id, title, description, servings, cooking_time_minutes, difficulty, dietary_tags, cover_image_url, created_at
     FROM recipes
     WHERE author_id = $1
     ORDER BY created_at DESC`,
    [session.user.id],
  );

  const recipes = recipesResult.rows;

  if (recipes.length === 0) {
    return NextResponse.json({ recipes: [] });
  }

  const ids = recipes.map((r) => r.id);
  const stepsResult = await db.query<{
    recipe_id: string;
    step_number: number;
    instruction: string;
  }>(
    `SELECT recipe_id, step_number, instruction
     FROM recipe_steps
     WHERE recipe_id = ANY($1)
     ORDER BY recipe_id, step_number`,
    [ids],
  );

  const stepsByRecipe: Record<string, { step_number: number; instruction: string }[]> = {};
  for (const step of stepsResult.rows) {
    if (!stepsByRecipe[step.recipe_id]) stepsByRecipe[step.recipe_id] = [];
    stepsByRecipe[step.recipe_id].push({ step_number: step.step_number, instruction: step.instruction });
  }

  const result = recipes.map((r) => ({
    ...r,
    steps: stepsByRecipe[r.id] ?? [],
  }));

  return NextResponse.json({ recipes: result });
}
