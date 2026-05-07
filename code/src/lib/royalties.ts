import { getDb } from "@/db/pool";
import type { PoolClient } from "pg";

export const ROYALTY_PER_PURCHASE = 0.5;
export const ROYALTY_PER_REVIEW = 0.1;

export type RecipeRoyaltyRow = {
  recipe_id: string;
  title: string;
  cover_image_url: string | null;
  is_published: boolean;
  purchase_count: number;
  review_count: number;
  avg_rating: number | null;
  royalty_earned: number;
};

export type ChefRoyaltyDashboard = {
  totalPurchases: number;
  totalReviews: number;
  totalEarned: number;
  currentBalance: number;
  recipes: RecipeRoyaltyRow[];
};

export async function getChefRoyaltyDashboard(chefUserId: string): Promise<ChefRoyaltyDashboard> {
  const db = getDb();

  const recipesRes = await db.query<{
    recipe_id: string;
    title: string;
    cover_image_url: string | null;
    is_published: boolean;
    purchase_count: string;
    review_count: string;
    avg_rating: string | null;
  }>(
    `SELECT r.id AS recipe_id,
            r.title,
            r.cover_image_url,
            r.is_published,
            COUNT(cl.*) FILTER (WHERE cl.source = 'purchased')::int AS purchase_count,
            COUNT(cl.*) FILTER (WHERE cl.source = 'manual')::int    AS review_count,
            ROUND(AVG(cl.rating)::numeric, 2)                       AS avg_rating
     FROM recipes r
     LEFT JOIN cook_logs cl ON cl.recipe_id = r.id
     WHERE r.author_id = $1 AND r.is_deleted = FALSE
     GROUP BY r.id, r.title, r.cover_image_url, r.is_published, r.created_at
     ORDER BY r.created_at DESC`,
    [chefUserId],
  );

  const recipes: RecipeRoyaltyRow[] = recipesRes.rows.map((row) => {
    const purchases = Number(row.purchase_count);
    const reviews = Number(row.review_count);
    return {
      recipe_id: row.recipe_id,
      title: row.title,
      cover_image_url: row.cover_image_url,
      is_published: row.is_published,
      purchase_count: purchases,
      review_count: reviews,
      avg_rating: row.avg_rating !== null ? Number(row.avg_rating) : null,
      royalty_earned: purchases * ROYALTY_PER_PURCHASE + reviews * ROYALTY_PER_REVIEW,
    };
  });

  const totalPurchases = recipes.reduce((s, r) => s + r.purchase_count, 0);
  const totalReviews = recipes.reduce((s, r) => s + r.review_count, 0);
  const totalEarned = recipes.reduce((s, r) => s + r.royalty_earned, 0);

  const balanceRes = await db.query<{ balance: string }>(
    `SELECT balance FROM users WHERE id = $1`,
    [chefUserId],
  );
  const currentBalance = Number(balanceRes.rows[0]?.balance ?? 0);

  return { totalPurchases, totalReviews, totalEarned, currentBalance, recipes };
}

/**
 * Credits the recipe author's balance based on a cook_log transition.
 * Pass the previous source value (or null if the row didn't exist before).
 * Returns the amount credited.
 *
 * Rules:
 *  - First-ever log (prevSource = null) with newSource='manual'   → +ROYALTY_PER_REVIEW
 *  - First-ever log (prevSource = null) with newSource='purchased'→ +ROYALTY_PER_PURCHASE
 *  - Upgrade from 'manual' to 'purchased'                         → +(PURCHASE - REVIEW) delta
 *  - Otherwise                                                    → +0 (already credited)
 */
export async function creditRoyaltyForCookLog(
  client: PoolClient,
  recipeId: string,
  prevSource: string | null,
  newSource: "manual" | "purchased",
): Promise<number> {
  let delta = 0;
  if (prevSource === null) {
    delta = newSource === "purchased" ? ROYALTY_PER_PURCHASE : ROYALTY_PER_REVIEW;
  } else if (prevSource === "manual" && newSource === "purchased") {
    delta = ROYALTY_PER_PURCHASE - ROYALTY_PER_REVIEW;
  }

  if (delta <= 0) return 0;

  await client.query(
    `UPDATE users
     SET balance = balance + $1::numeric
     WHERE id = (SELECT author_id FROM recipes WHERE id = $2)`,
    [delta, recipeId],
  );
  return delta;
}
