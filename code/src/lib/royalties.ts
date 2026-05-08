import { getDb } from "@/db/pool";

// Kept in sync with TRG_Update_Chef_Royalty in schema.sql.
export const ROYALTY_PERCENT = 0.05;       // 5% of every Shop This Meal purchase
export const ROYALTY_PER_REVIEW = 0.10;    // flat $0.10 per first manual cook log

export type RecipeRoyaltyRow = {
  recipe_id: string;
  title: string;
  cover_image_url: string | null;
  is_published: boolean;
  purchase_count: number;
  purchase_revenue: number;   // gross sales of this recipe (used as basis for 5%)
  purchase_royalty: number;   // chef's slice from purchases (= 5% of purchase_revenue)
  review_count: number;
  avg_rating: number | null;
  royalty_earned: number;     // purchase_royalty + review_count * 0.10
};

export type ChefRoyaltyDashboard = {
  totalPurchases: number;
  totalRevenue: number;
  totalReviews: number;
  totalEarned: number;
  currentBalance: number;
  recipes: RecipeRoyaltyRow[];
};

export async function getChefRoyaltyDashboard(chefUserId: string): Promise<ChefRoyaltyDashboard> {
  const db = getDb();

  // Reads from the spec-required ChefRoyaltyDashboard view.
  const recipesRes = await db.query<{
    recipe_id: string;
    recipe_title: string;
    cover_image_url: string | null;
    is_published: boolean;
    purchase_count: string;
    purchase_revenue: string;
    purchase_royalty: string;
    review_count: string;
    avg_rating: string | null;
    royalty_earned: string;
  }>(
    `SELECT recipe_id,
            recipe_title,
            cover_image_url,
            is_published,
            purchase_count,
            purchase_revenue,
            purchase_royalty,
            review_count,
            avg_rating,
            royalty_earned
     FROM ChefRoyaltyDashboard
     WHERE chef_user_id = $1
     ORDER BY recipe_title ASC`,
    [chefUserId],
  );

  const recipes: RecipeRoyaltyRow[] = recipesRes.rows.map((row) => ({
    recipe_id: row.recipe_id,
    title: row.recipe_title,
    cover_image_url: row.cover_image_url,
    is_published: row.is_published,
    purchase_count: Number(row.purchase_count),
    purchase_revenue: Number(row.purchase_revenue),
    purchase_royalty: Number(row.purchase_royalty),
    review_count: Number(row.review_count),
    avg_rating: row.avg_rating !== null ? Number(row.avg_rating) : null,
    royalty_earned: Number(row.royalty_earned),
  }));

  const totalPurchases = recipes.reduce((s, r) => s + r.purchase_count, 0);
  const totalRevenue = recipes.reduce((s, r) => s + r.purchase_revenue, 0);
  const totalReviews = recipes.reduce((s, r) => s + r.review_count, 0);
  const totalEarned = recipes.reduce((s, r) => s + r.royalty_earned, 0);

  const balanceRes = await db.query<{ balance: string }>(
    `SELECT balance FROM users WHERE id = $1`,
    [chefUserId],
  );
  const currentBalance = Number(balanceRes.rows[0]?.balance ?? 0);

  return { totalPurchases, totalRevenue, totalReviews, totalEarned, currentBalance, recipes };
}
