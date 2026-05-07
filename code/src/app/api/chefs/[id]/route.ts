import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/db/pool";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const chefResult = await db.query(
    `SELECT
       u.id,
       u.full_name,
       u.email,
       u.avatar_url,
       u.created_at,
       vc.bio,
       COALESCE(vc.is_verified, FALSE) AS is_verified,
       (SELECT COUNT(*)::int FROM recipes r
          WHERE r.author_id = u.id AND r.is_published = TRUE AND r.is_deleted = FALSE) AS recipe_count,
       (SELECT COUNT(*)::int FROM follows f WHERE f.followed_id = u.id) AS follower_count,
       (SELECT COUNT(*)::int FROM follows f WHERE f.follower_id = u.id) AS following_count,
       EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $2 AND f.followed_id = u.id) AS is_following,
       (SELECT ROUND(AVG(cl.rating)::numeric, 2)::float
          FROM cook_logs cl
          JOIN recipes r ON r.id = cl.recipe_id
          WHERE r.author_id = u.id) AS avg_rating,
       (SELECT COUNT(*)::int
          FROM cook_logs cl
          JOIN recipes r ON r.id = cl.recipe_id
          WHERE r.author_id = u.id) AS total_cooks
     FROM users u
     JOIN verified_chefs vc ON vc.user_id = u.id
     WHERE u.id = $1 AND u.is_active = TRUE`,
    [id, session.user.id],
  );

  if (chefResult.rows.length === 0) {
    return NextResponse.json({ error: "Chef not found." }, { status: 404 });
  }

  const recipesResult = await db.query(
    `SELECT
       r.id, r.title, r.description, r.cooking_time_minutes, r.servings,
       r.difficulty, r.dietary_tags, r.cover_image_url, r.created_at,
       (SELECT ROUND(AVG(cl.rating)::numeric, 2)::float
          FROM cook_logs cl WHERE cl.recipe_id = r.id) AS avg_rating,
       (SELECT COUNT(*)::int FROM cook_logs cl WHERE cl.recipe_id = r.id) AS review_count
     FROM recipes r
     WHERE r.author_id = $1 AND r.is_published = TRUE AND r.is_deleted = FALSE
     ORDER BY r.created_at DESC`,
    [id],
  );

  return NextResponse.json({
    chef: chefResult.rows[0],
    recipes: recipesResult.rows,
  });
}
