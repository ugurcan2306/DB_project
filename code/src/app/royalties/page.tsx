import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { AppNavbar } from "@/components/app-navbar";
import {
  getChefRoyaltyDashboard,
  ROYALTY_PERCENT,
  ROYALTY_PER_REVIEW,
} from "@/lib/royalties";

export default async function RoyaltiesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/royalties");
  if (session.user.role !== "verified_chef") redirect("/dashboard");

  const profile = await getUserProfile(session.user.id);
  const data = await getChefRoyaltyDashboard(session.user.id);

  return (
    <>
      <AppNavbar
        activePath="dashboard"
        user={profile ? { name: profile.fullName, role: profile.role, avatarUrl: profile.avatarUrl } : null}
      />
      <main className="container">
        <div className="page-header">
          <h1>💰 Royalty Dashboard</h1>
          <p>
            Earn {(ROYALTY_PERCENT * 100).toFixed(0)}% of every &quot;Shop This Meal&quot; purchase total
            (multi-buys count separately), plus ${ROYALTY_PER_REVIEW.toFixed(2)} for each first-time manual cook log.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: "1.5rem",
          }}
        >
          <SummaryCard
            label="Total Purchases"
            value={data.totalPurchases.toString()}
            sub={`Shop This Meal events · ${(ROYALTY_PERCENT * 100).toFixed(0)}% of cart`}
            color="#27ae60"
          />
          <SummaryCard
            label="Gross Sales"
            value={`$${data.totalRevenue.toFixed(2)}`}
            sub="Total cart value across all your recipes"
            color="#16a085"
          />
          <SummaryCard
            label="Total Reviews"
            value={data.totalReviews.toString()}
            sub={`Manual logs · $${ROYALTY_PER_REVIEW.toFixed(2)} each`}
            color="#e07b39"
          />
          <SummaryCard
            label="Lifetime Royalties"
            value={`$${data.totalEarned.toFixed(2)}`}
            sub="Across all your recipes"
            color="#8e44ad"
          />
          <SummaryCard
            label="Account Balance"
            value={`$${data.currentBalance.toFixed(2)}`}
            sub="Available to spend"
            color="#2c3e50"
          />
        </div>

        <div className="dashboard-card">
          <div className="section-title">Per-Recipe Breakdown</div>
          {data.recipes.length === 0 ? (
            <p style={{ color: "#666" }}>You haven&apos;t published any recipes yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Recipe</th>
                    <th style={{ textAlign: "right" }}>Purchases</th>
                    <th style={{ textAlign: "right" }}>Gross Sales</th>
                    <th style={{ textAlign: "right" }}>Reviews / Logs</th>
                    <th style={{ textAlign: "right" }}>Avg Rating</th>
                    <th style={{ textAlign: "right" }}>Royalties Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recipes.map((r) => (
                    <tr key={r.recipe_id}>
                      <td>
                        <strong>{r.title}</strong>
                        {!r.is_published && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: "0.7rem",
                              color: "#888",
                              border: "1px solid #ddd",
                              padding: "1px 6px",
                              borderRadius: 4,
                            }}
                          >
                            unpublished
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <strong>{r.purchase_count}</strong>
                      </td>
                      <td style={{ textAlign: "right" }}>${r.purchase_revenue.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>{r.review_count}</td>
                      <td style={{ textAlign: "right" }}>
                        {r.avg_rating !== null ? `${r.avg_rating.toFixed(2)} ★` : "—"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <strong style={{ color: "#27ae60" }}>${r.royalty_earned.toFixed(2)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>
                      <strong>Total</strong>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong>{data.totalPurchases}</strong>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong>${data.totalRevenue.toFixed(2)}</strong>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong>{data.totalReviews}</strong>
                    </td>
                    <td></td>
                    <td style={{ textAlign: "right" }}>
                      <strong style={{ color: "#27ae60" }}>${data.totalEarned.toFixed(2)}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #f0e6dd",
        borderRadius: 16,
        padding: "20px 22px",
        boxShadow: "0 2px 12px rgb(0 0 0 / 4%)",
      }}
    >
      <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#888", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: "1.8rem", fontWeight: 800, color, marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: "0.8rem", color: "#999", marginTop: 4 }}>{sub}</div>
    </div>
  );
}
