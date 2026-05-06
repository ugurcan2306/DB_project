import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { toDisplayRole } from "@/lib/auth-utils";
import { ProfileSettingsClient } from "@/components/profile-settings-client";
import { AppNavbar } from "@/components/app-navbar";
import { getUserBadges, getUserRecipeHistory, getUserChallengeStats } from "@/lib/challenges";
import { RecipeHistoryList } from "@/components/recipe-history-list";

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

  const [badges, recipeHistory, stats] = await Promise.all([
    getUserBadges(session.user.id),
    getUserRecipeHistory(session.user.id),
    getUserChallengeStats(session.user.id),
  ]);

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
            avatarUrl: profile.avatarUrl,
            deliveryAddress: profile.deliveryAddress,
            businessName: profile.businessName,
            businessAddress: profile.businessAddress,
            chefBio: profile.chefBio,
          }}
        />

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
      </main>
    </>
  );
}
