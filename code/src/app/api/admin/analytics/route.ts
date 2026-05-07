import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();

  const [trendingRes, revenueRes, userStatsRes, orderStatsRes] = await Promise.all([
    // Trending ingredients: most ordered by quantity in the last 30 days
    db.query(`
      SELECT i.ingredient_name,
             SUM(soi.quantity) AS total_quantity,
             COUNT(DISTINCT soi.supplier_order_id) AS order_count
      FROM supplier_order_items soi
      JOIN ingredients i ON i.id = soi.ingredient_id
      JOIN supplier_orders so ON so.id = soi.supplier_order_id
      WHERE so.created_at >= NOW() - INTERVAL '30 days'
        AND so.status != 'cancelled'
      GROUP BY i.id, i.ingredient_name
      ORDER BY total_quantity DESC
      LIMIT 10
    `),

    // Top revenue-generating ingredients (proxy for profitability until recipes table exists)
    db.query(`
      SELECT i.ingredient_name,
             SUM(soi.line_total) AS total_revenue,
             COUNT(DISTINCT soi.supplier_order_id) AS order_count
      FROM supplier_order_items soi
      JOIN ingredients i ON i.id = soi.ingredient_id
      JOIN supplier_orders so ON so.id = soi.supplier_order_id
      WHERE so.status != 'cancelled'
      GROUP BY i.id, i.ingredient_name
      ORDER BY total_revenue DESC
      LIMIT 10
    `),

    // User counts by role
    db.query(`
      SELECT role, COUNT(*) AS count, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active_count
      FROM users
      GROUP BY role
      ORDER BY role
    `),

    // Order stats
    db.query(`
      SELECT status, COUNT(*) AS count, COALESCE(SUM(total_price), 0) AS revenue
      FROM supplier_orders
      GROUP BY status
      ORDER BY status
    `),
  ]);

  return NextResponse.json({
    trendingIngredients: trendingRes.rows,
    topRevenueIngredients: revenueRes.rows,
    userStats: userStatsRes.rows,
    orderStats: orderStatsRes.rows,
  });
}
