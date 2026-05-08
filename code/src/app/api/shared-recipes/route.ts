import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const result = await db.query(
    `SELECT r.id, r.title, r.description, r.difficulty, r.cooking_time_minutes,
            r.servings, r.dietary_tags, r.cover_image_url, r.created_at,
            u.id AS author_id,
            u.full_name AS author_name,
            EXISTS (
              SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.followed_id = u.id
            ) AS is_following_author,
            (SELECT ROUND(AVG(cl.rating)::numeric, 1)
             FROM cook_logs cl
             JOIN recipes r2 ON r2.id = cl.recipe_id
             WHERE r2.author_id = u.id) AS author_avg_rating
     FROM recipes r
     JOIN users u ON u.id = r.author_id
     WHERE r.is_published = TRUE
       AND r.is_deleted = FALSE
       AND u.role = 'verified_chef'
       AND r.author_id != $1
       AND r.id NOT IN (
         SELECT mlr.recipe_id
         FROM meal_list_recipes mlr
         JOIN meal_lists ml ON ml.id = mlr.list_id
         WHERE ml.user_id = $1
       )
     ORDER BY r.created_at DESC`,
    [session.user.id],
  );

  const recipes = result.rows;
  if (recipes.length === 0) return NextResponse.json({ recipes: [] });

  const ids = recipes.map((r: { id: string }) => r.id);

  const stepsResult = await db.query<{ recipe_id: string; step_number: number; instruction: string }>(
    `SELECT recipe_id, step_number, instruction FROM recipe_steps
     WHERE recipe_id = ANY($1) ORDER BY recipe_id, step_number`,
    [ids],
  );

  const ingredientsResult = await db.query<{
    recipe_id: string;
    ingredient_id: string;
    ingredient_name: string;
    taxonomy_name: string;
    quantity: number;
    unit: string;
  }>(
    `SELECT ri.recipe_id,
            ri.ingredient_id,
            i.ingredient_name,
            COALESCE(ia.alias_name, i.ingredient_name) AS taxonomy_name,
            ri.quantity,
            ri.unit
     FROM recipe_ingredients ri
     JOIN ingredients i ON i.id = ri.ingredient_id
     LEFT JOIN ingredient_aliases ia ON ia.id = ri.alias_id
     WHERE ri.recipe_id = ANY($1) ORDER BY ri.recipe_id, i.ingredient_name`,
    [ids],
  );

  const stepsByRecipe: Record<string, { step_number: number; instruction: string }[]> = {};
  for (const s of stepsResult.rows) {
    if (!stepsByRecipe[s.recipe_id]) stepsByRecipe[s.recipe_id] = [];
    stepsByRecipe[s.recipe_id].push({ step_number: s.step_number, instruction: s.instruction });
  }

  const ingredientsByRecipe: Record<
    string,
    { ingredient_id: string; ingredient_name: string; taxonomy_name: string; quantity: number; unit: string }[]
  > = {};
  for (const i of ingredientsResult.rows) {
    if (!ingredientsByRecipe[i.recipe_id]) ingredientsByRecipe[i.recipe_id] = [];
    ingredientsByRecipe[i.recipe_id].push({
      ingredient_id: i.ingredient_id,
      ingredient_name: i.ingredient_name,
      taxonomy_name: i.taxonomy_name,
      quantity: i.quantity,
      unit: i.unit,
    });
  }

  return NextResponse.json({
    recipes: recipes.map((r: { id: string }) => ({
      ...r,
      steps: stepsByRecipe[r.id] ?? [],
      ingredients: ingredientsByRecipe[r.id] ?? [],
    })),
  });
}
