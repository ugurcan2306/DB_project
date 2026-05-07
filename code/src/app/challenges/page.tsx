import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { AppNavbar } from "@/components/app-navbar";
import {
  listActiveChallenges,
  listUserChallenges,
  getLeaderboard,
  getUserBadges,
} from "@/lib/challenges";
import { ChallengesClient } from "./challenges-client";

export default async function ChallengesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login?callbackUrl=/challenges");
  }

  const profile = await getUserProfile(session.user.id);
  const [active, mine, leaderboard, badges] = await Promise.all([
    listActiveChallenges(),
    listUserChallenges(session.user.id),
    getLeaderboard(25),
    getUserBadges(session.user.id),
  ]);

  const joinedIds = new Set(mine.map((m) => m.id));
  const completed = mine.filter((m) => m.completed_at);
  const inProgress = mine.filter((m) => !m.completed_at);

  return (
    <>
      <AppNavbar
        activePath="challenges"
        user={
          profile
            ? {
                name: profile.fullName,
                role: profile.role,
                avatarUrl: profile.avatarUrl,
              }
            : null
        }
      />
      <main className="container">
        <div className="page-header">
          <h1>🏆 Kitchen Challenges</h1>
          <p>Join time-bound challenges, log qualifying recipes, climb the leaderboard, and earn badges.</p>
        </div>

        <ChallengesClient
          active={active.map((c) => ({ ...c, joined: joinedIds.has(c.id) }))}
          inProgress={inProgress}
          completed={completed}
          leaderboard={leaderboard}
          badges={badges}
          currentUserId={session.user.id}
        />
      </main>
    </>
  );
}
