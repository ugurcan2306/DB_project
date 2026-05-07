import { getDb } from "@/db/pool";

export type FollowableChef = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  recipe_count: number;
  follower_count: number;
  is_following: boolean;
};

export async function followChef(followerId: string, chefId: string) {
  const db = getDb();
  // Verify the target is a verified_chef before letting anyone follow.
  const check = await db.query<{ role: string }>(
    `SELECT role FROM users WHERE id = $1 AND is_active = TRUE`,
    [chefId],
  );
  if (check.rows.length === 0 || check.rows[0].role !== "verified_chef") {
    throw new Error("Target user is not a verified chef.");
  }
  if (followerId === chefId) {
    throw new Error("You cannot follow yourself.");
  }
  await db.query(
    `INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2)
     ON CONFLICT (follower_id, followed_id) DO NOTHING`,
    [followerId, chefId],
  );
}

export async function unfollowChef(followerId: string, chefId: string) {
  await getDb().query(
    `DELETE FROM follows WHERE follower_id = $1 AND followed_id = $2`,
    [followerId, chefId],
  );
}

export async function listFollowableChefs(viewerId: string): Promise<FollowableChef[]> {
  const result = await getDb().query<FollowableChef>(
    `SELECT
       u.id,
       u.full_name,
       u.avatar_url,
       vc.bio,
       COALESCE(vc.is_verified, FALSE) AS is_verified,
       (SELECT COUNT(*)::int FROM recipes r
          WHERE r.author_id = u.id AND r.is_published = TRUE AND r.is_deleted = FALSE) AS recipe_count,
       (SELECT COUNT(*)::int FROM follows f WHERE f.followed_id = u.id) AS follower_count,
       EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.followed_id = u.id) AS is_following
     FROM users u
     JOIN verified_chefs vc ON vc.user_id = u.id
     WHERE u.is_active = TRUE
       AND u.id <> $1
     ORDER BY follower_count DESC, u.full_name ASC`,
    [viewerId],
  );
  return result.rows;
}

export async function getFollowingFeed(viewerId: string) {
  const db = getDb();
  const result = await db.query(
    `SELECT
       r.id,
       r.title,
       r.description,
       r.difficulty,
       r.cooking_time_minutes,
       r.servings,
       r.dietary_tags,
       r.cover_image_url,
       r.created_at,
       u.id AS author_id,
       u.full_name AS author_name,
       u.avatar_url AS author_avatar,
       (SELECT ROUND(AVG(cl.rating)::numeric, 2)::float
          FROM cook_logs cl WHERE cl.recipe_id = r.id) AS avg_rating,
       (SELECT COUNT(*)::int
          FROM cook_logs cl WHERE cl.recipe_id = r.id) AS review_count,
       (SELECT cl.rating FROM cook_logs cl
          WHERE cl.recipe_id = r.id AND cl.user_id = $1) AS my_rating
     FROM recipes r
     JOIN users u ON u.id = r.author_id
     JOIN follows f ON f.followed_id = u.id
     WHERE f.follower_id = $1
       AND r.is_published = TRUE
       AND r.is_deleted = FALSE
     ORDER BY r.created_at DESC
     LIMIT 50`,
    [viewerId],
  );
  return result.rows;
}

export async function getFollowingCount(userId: string) {
  const r = await getDb().query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM follows WHERE follower_id = $1`,
    [userId],
  );
  return parseInt(r.rows[0].c, 10);
}

export async function getFollowerCount(userId: string) {
  const r = await getDb().query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM follows WHERE followed_id = $1`,
    [userId],
  );
  return parseInt(r.rows[0].c, 10);
}
