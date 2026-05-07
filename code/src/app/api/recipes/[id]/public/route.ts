import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// Public-ish recipe fetch: any authenticated user can view a published, non-deleted recipe.
// Returns the recipe + steps + ingredients + author info + the viewer's own cook_log rating.
export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const recipeResult = await db.query(
    `SELECT r.id, r.title, r.description, r.servings, r.cooking_time_minutes,
            r.difficulty, r.dietary_tags, r.cover_image_url, r.created_at,
            u.id AS author_id, u.full_name AS author_name, u.avatar_url AS author_avatar,
            EXISTS (
              SELECT 1 FROM follows f WHERE f.follower_id = $2 AND f.followed_id = u.id
            ) AS is_following_author,
            (SELECT ROUND(AVG(cl.rating)::numeric, 2)::float
              FROM cook_logs cl WHERE cl.recipe_id = r.id) AS avg_rating,
            (SELECT COUNT(*)::int
              FROM cook_logs cl WHERE cl.recipe_id = r.id) AS review_count,
            (SELECT cl.rating FROM cook_logs cl
              WHERE cl.recipe_id = r.id AND cl.user_id = $2) AS my_rating
     FROM recipes r
     JOIN users u ON u.id = r.author_id
     WHERE r.id = $1 AND r.is_published = TRUE AND r.is_deleted = FALSE`,
    [id, session.user.id],
  );

  if (recipeResult.rows.length === 0) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  const stepsResult = await db.query(
    `SELECT step_number, instruction FROM recipe_steps
     WHERE recipe_id = $1 ORDER BY step_number`,
    [id],
  );

  const ingredientsResult = await db.query(
    `SELECT ri.ingredient_id, i.ingredient_name, ri.quantity, ri.unit
     FROM recipe_ingredients ri
     JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE ri.recipe_id = $1
     ORDER BY i.ingredient_name`,
    [id],
  );

  return NextResponse.json({
    recipe: recipeResult.rows[0],
    steps: stepsResult.rows,
    ingredients: ingredientsResult.rows,
  });
}
