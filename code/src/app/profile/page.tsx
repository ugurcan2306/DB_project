import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { toDisplayRole } from "@/lib/auth-utils";
import { ProfileSettingsClient } from "@/components/profile-settings-client";
import { AppNavbar } from "@/components/app-navbar";
import { getUserBadges, getUserRecipeHistory, getUserChallengeStats } from "@/lib/challenges";
import { RecipeHistoryList } from "@/components/recipe-history-list";
import { getChefRatings, getChefAllTimeStats } from "@/lib/cook-logs";
import type { ChefRecipeRating, ChefAllTimeStats } from "@/lib/cook-logs";
import { listFollowableChefs, getFollowerCount, getFollowingCount } from "@/lib/follows";
import Link from "next/link";

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const profile = await getUserProfile(session.user.id);
  if (!profile) {
    redirect("/dashboard");
  }

  const [badges, recipeHistory, stats, chefRatings, chefAllTime, allChefs, followerCount, followingCount] = await Promise.all([
    getUserBadges(session.user.id),
    getUserRecipeHistory(session.user.id),
    getUserChallengeStats(session.user.id),
    profile.role === "verified_chef" ? getChefRatings(session.user.id) : Promise.resolve([] as ChefRecipeRating[]),
    profile.role === "verified_chef" ? getChefAllTimeStats(session.user.id) : Promise.resolve(null as ChefAllTimeStats | null),
    listFollowableChefs(session.user.id),
    getFollowerCount(session.user.id),
    getFollowingCount(session.user.id),
  ]);

  const followingList = allChefs.filter((c) => c.is_following);

  return (
    <>
      <AppNavbar
        activePath="profile"
        user={{
          name: profile.fullName,
          role: profile.role,
          avatarUrl: profile.avatarUrl,
        }}
      />

      <main className="container profile-layout">
        <section className="filter-section profile-card">
          <div className="profile-avatar-wrap">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt={`${profile.fullName} avatar`} className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-fallback">{initialsFromName(profile.fullName)}</div>
            )}
          </div>
          <div>
            <h1 className="dashboard-title">{profile.fullName}</h1>
            <p>{profile.email}</p>
            <p className="profile-role-tag">{toDisplayRole(profile.role)}</p>
          </div>
        </section>

        <ProfileSettingsClient
          initialProfile={{
            fullName: profile.fullName,
            email: profile.email,
            role: profile.role,
            balance: profile.balance,
            avatarUrl: profile.avatarUrl,
            deliveryAddress: profile.deliveryAddress,
            businessName: profile.businessName,
            businessAddress: profile.businessAddress,
            chefBio: profile.chefBio,
          }}
        />

        {/* Follow Stats + Following list */}
        <section className="filter-section">
          <h2 className="profile-section-title">👥 Network</h2>
          <div className="profile-stats-row" style={{ marginBottom: "1rem" }}>
            <div className="profile-stat">
              <span className="profile-stat-value">{followingCount}</span>
              <span className="profile-stat-label">Following</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">{followerCount}</span>
              <span className="profile-stat-label">Followers</span>
            </div>
          </div>

          {followingList.length === 0 ? (
            <p className="profile-empty">
              You aren&apos;t following any chefs yet.{" "}
              <Link href="/following" style={{ color: "#e07b39", fontWeight: 600 }}>
                Find chefs to follow →
              </Link>
            </p>
          ) : (
            <>
              <h3 style={{ fontSize: "1rem", marginBottom: 8 }}>Chefs you follow</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {followingList.map((c) => (
                  <li
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 12px",
                      border: "1px solid #f0e6dd",
                      borderRadius: 8,
                    }}
                  >
                    {c.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.avatar_url}
                        alt={c.full_name}
                        style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "#fdebd9",
                          color: "#b85a1f",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                        }}
                      >
                        {initialsFromName(c.full_name)}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>
                        {c.full_name}
                        {c.is_verified && <span style={{ color: "#3498db", marginLeft: 4 }}>✓</span>}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#888" }}>
                        {c.recipe_count} recipes · {c.follower_count} followers
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: 12, fontSize: "0.85rem" }}>
                <Link href="/following" style={{ color: "#e07b39", fontWeight: 600 }}>
                  Open Following Feed →
                </Link>
              </p>
            </>
          )}
        </section>

        {/* Achievements */}
        <section className="filter-section">
          <h2 className="profile-section-title">🏆 Achievements</h2>

          <div className="profile-stats-row">
            <div className="profile-stat">
              <span className="profile-stat-value">{stats.challenges_completed}</span>
              <span className="profile-stat-label">Completed</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">{stats.challenges_joined}</span>
              <span className="profile-stat-label">Joined</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">{stats.badges_earned}</span>
              <span className="profile-stat-label">Badges</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">{stats.total_points.toLocaleString()}</span>
              <span className="profile-stat-label">Points</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">{stats.recipes_logged}</span>
              <span className="profile-stat-label">Recipes Logged</span>
            </div>
          </div>

          {badges.length === 0 ? (
            <p className="profile-empty">No badges yet — join a challenge to earn your first one!</p>
          ) : (
            <div className="profile-badges-row">
              {badges.map((b) => (
                <div key={b.badge_id} className="profile-badge" title={b.description ?? b.badge_name}>
                  <span className="profile-badge-emoji">{b.badge_emoji}</span>
                  <span className="profile-badge-name">{b.badge_name}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recipe History */}
        <section className="filter-section">
          <h2 className="profile-section-title">📋 Recipe History</h2>
          <RecipeHistoryList recipes={recipeHistory} />
        </section>

        {/* Chef Ratings */}
        {profile.role === "verified_chef" && (
          <section className="filter-section">
            <h2 className="profile-section-title">⭐ Recipe Ratings</h2>
            {chefAllTime && (chefAllTime.total_cook_count > 0) && (
              <div className="profile-stats-row" style={{ marginBottom: "1rem" }}>
                <div className="profile-stat">
                  <span className="profile-stat-value">{chefAllTime.total_cook_count}</span>
                  <span className="profile-stat-label">All-Time Cooks</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat-value">{chefAllTime.overall_avg_rating ?? "—"} / 5</span>
                  <span className="profile-stat-label">All-Time Avg Rating</span>
                </div>
              </div>
            )}
            {chefRatings.length === 0 ? (
              <p className="profile-empty">No ratings yet — share your recipes so users can cook and rate them.</p>
            ) : (
              <table className="supplier-table">
                <thead>
                  <tr>
                    <th>Recipe</th>
                    <th>Times Cooked</th>
                    <th>Avg Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {chefRatings.map((r) => (
                    <tr key={r.id}>
                      <td>{r.title}</td>
                      <td>{r.cook_count}</td>
                      <td>{r.avg_rating !== null ? `${r.avg_rating} / 5` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
      </main>
    </>
  );
}
