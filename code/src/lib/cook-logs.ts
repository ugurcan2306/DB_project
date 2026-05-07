import { getDb } from "@/db/pool";

export type ChefRecipeRating = {
  id: string;
  title: string;
  cook_count: number;
  avg_rating: number | null;
};

export type ChefAllTimeStats = {
  total_cook_count: number;
  overall_avg_rating: number | null;
};

export async function getChefRatings(chefId: string): Promise<ChefRecipeRating[]> {
  const db = getDb();
  const result = await db.query<ChefRecipeRating>(
    `SELECT r.id, r.title,
            COUNT(cl.id)::int AS cook_count,
            ROUND(AVG(cl.rating), 1)::float AS avg_rating
     FROM recipes r
     LEFT JOIN cook_logs cl ON cl.recipe_id = r.id
     WHERE r.author_id = $1 AND r.is_deleted = FALSE
     GROUP BY r.id, r.title
     ORDER BY avg_rating DESC NULLS LAST, cook_count DESC`,
    [chefId],
  );
  return result.rows;
}

export async function getChefAllTimeStats(chefId: string): Promise<ChefAllTimeStats> {
  const db = getDb();
  const result = await db.query<ChefAllTimeStats>(
    `SELECT COUNT(cl.id)::int AS total_cook_count,
            ROUND(AVG(cl.rating), 1)::float AS overall_avg_rating
     FROM recipes r
     JOIN cook_logs cl ON cl.recipe_id = r.id
     WHERE r.author_id = $1`,
    [chefId],
  );
  return result.rows[0] ?? { total_cook_count: 0, overall_avg_rating: null };
}
