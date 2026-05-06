"use client";

import { useEffect, useState } from "react";

type TrendingIngredient = { ingredient_name: string; total_quantity: string; order_count: string };
type RevenueIngredient = { ingredient_name: string; total_revenue: string; order_count: string };
type UserStat = { role: string; count: string; active_count: string };
type OrderStat = { status: string; count: string; revenue: string };

type Analytics = {
  trendingIngredients: TrendingIngredient[];
  topRevenueIngredients: RevenueIngredient[];
  userStats: UserStat[];
  orderStats: OrderStat[];
};

export function AdminAnalyticsClient() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => setData(d as Analytics))
      .catch(() => setError("Failed to load analytics."));
  }, []);

  if (error) return <p className="error-text">{error}</p>;
  if (!data) return <p>Loading analytics…</p>;

  const totalUsers = data.userStats.reduce((s, r) => s + Number(r.count), 0);
  const totalRevenue = data.orderStats
    .filter((r) => r.status === "fulfilled")
    .reduce((s, r) => s + Number(r.revenue), 0);

  return (
    <div className="admin-layout">
      {/* Summary strip */}
      <section className="filter-section">
        <h2 className="dashboard-title">Platform Overview</h2>
        <div className="analytics-grid">
          <div className="analytics-card">
            <h3>Total Users</h3>
            <p style={{ fontSize: "2rem", fontWeight: 800, color: "#e07b39" }}>{totalUsers}</p>
            <ul className="analytics-list" style={{ marginTop: 10 }}>
              {data.userStats.map((r) => (
                <li key={r.role}>
                  <span>{r.role}</span>
                  <span className="analytics-count">{r.count} <span style={{ fontWeight: 400, color: "#888", fontSize: "0.8rem" }}>({r.active_count} active)</span></span>
                </li>
              ))}
            </ul>
          </div>

          <div className="analytics-card">
            <h3>Order Status Breakdown</h3>
            <ul className="analytics-list">
              {data.orderStats.map((r) => (
                <li key={r.status}>
                  <span style={{ textTransform: "capitalize" }}>{r.status}</span>
                  <span className="analytics-count">{r.count}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="analytics-card">
            <h3>Fulfilled Revenue</h3>
            <p style={{ fontSize: "2rem", fontWeight: 800, color: "#027a48" }}>${totalRevenue.toFixed(2)}</p>
            <p style={{ fontSize: "0.85rem", color: "#888", marginTop: 6 }}>From fulfilled orders only</p>
          </div>
        </div>
      </section>

      {/* Trending Ingredients */}
      <section className="filter-section">
        <h2 className="dashboard-title">Trending Ingredients</h2>
        <p>Most-ordered ingredients by total quantity in the last 30 days (excluding cancelled orders).</p>
        <div className="supplier-table-wrap">
          <table className="supplier-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Ingredient</th>
                <th>Total Quantity Ordered</th>
                <th>Orders Appeared In</th>
              </tr>
            </thead>
            <tbody>
              {data.trendingIngredients.map((row, i) => (
                <tr key={row.ingredient_name}>
                  <td>{i + 1}</td>
                  <td>{row.ingredient_name}</td>
                  <td>{Number(row.total_quantity).toFixed(2)}</td>
                  <td>{row.order_count}</td>
                </tr>
              ))}
              {!data.trendingIngredients.length ? (
                <tr><td colSpan={4}>No order data in the last 30 days.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top Revenue Ingredients */}
      <section className="filter-section">
        <h2 className="dashboard-title">Most Profitable Ingredients</h2>
        <p>
          Ranked by total line revenue across all non-cancelled orders.{" "}
          <em>Recipe-level profitability will be available once the Recipes module is integrated.</em>
        </p>
        <div className="supplier-table-wrap">
          <table className="supplier-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Ingredient</th>
                <th>Total Revenue ($)</th>
                <th>Orders Appeared In</th>
              </tr>
            </thead>
            <tbody>
              {data.topRevenueIngredients.map((row, i) => (
                <tr key={row.ingredient_name}>
                  <td>{i + 1}</td>
                  <td>{row.ingredient_name}</td>
                  <td>${Number(row.total_revenue).toFixed(2)}</td>
                  <td>{row.order_count}</td>
                </tr>
              ))}
              {!data.topRevenueIngredients.length ? (
                <tr><td colSpan={4}>No revenue data yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
