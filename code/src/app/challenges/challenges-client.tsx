"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChallengeRow, UserChallengeRow, LeaderboardRow } from "@/lib/challenges";

type ActiveChallenge = ChallengeRow & { joined: boolean };

type Badge = {
  badge_id: string;
  badge_name: string;
  badge_emoji: string;
  description: string | null;
  earned_at: string;
};

type Tab = "active" | "joined" | "leaderboard" | "completed" | "badges";

export function ChallengesClient({
  active,
  inProgress,
  completed,
  leaderboard,
  badges,
  currentUserId,
  isAdmin = false,
}: {
  active: ActiveChallenge[];
  inProgress: UserChallengeRow[];
  completed: UserChallengeRow[];
  leaderboard: LeaderboardRow[];
  badges: Badge[];
  currentUserId: string;
  isAdmin?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("active");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function call(url: string, body?: unknown) {
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? `Request failed (${res.status})`);
      return false;
    }
    return true;
  }

  async function join(id: string) {
    if (await call(`/api/challenges/${id}/join`)) refresh();
  }
  async function leave(id: string) {
    if (await call(`/api/challenges/${id}/leave`)) refresh();
  }

  return (
    <div>
      {isAdmin && (
        <div className="dashboard-card" style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div>
            <strong>Admin view</strong>
            <p style={{ margin: "0.25rem 0 0", color: "#666" }}>
              You organize these challenges — admins don&apos;t join or compete on the leaderboard.
            </p>
          </div>
          <Link href="/admin/challenges" className="btn btn-primary">
            Manage Challenges
          </Link>
        </div>
      )}

      <div className="challenge-tabs">
        <button className={tab === "active" ? "tab active" : "tab"} onClick={() => setTab("active")}>
          Active ({active.length})
        </button>
        {!isAdmin && (
          <button className={tab === "joined" ? "tab active" : "tab"} onClick={() => setTab("joined")}>
            My Challenges ({inProgress.length})
          </button>
        )}
        <button className={tab === "leaderboard" ? "tab active" : "tab"} onClick={() => setTab("leaderboard")}>
          Leaderboard
        </button>
        {!isAdmin && (
          <button className={tab === "completed" ? "tab active" : "tab"} onClick={() => setTab("completed")}>
            Completed ({completed.length})
          </button>
        )}
        {!isAdmin && (
          <button className={tab === "badges" ? "tab active" : "tab"} onClick={() => setTab("badges")}>
            My Badges ({badges.length})
          </button>
        )}
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      {tab === "active" && (
        <div className="challenges-grid">
          {active.length === 0 && <p>No active challenges right now.</p>}
          {active.map((c) => (
            <ChallengeCard
              key={c.id}
              c={c}
              onJoin={() => join(c.id)}
              onLeave={() => leave(c.id)}
              busy={pending}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {tab === "joined" && (
        <div className="challenges-grid">
          {inProgress.length === 0 && <p>You haven&apos;t joined any active challenges. Open the Active tab to join one.</p>}
          {inProgress.map((c) => (
            <JoinedCard
              key={c.id}
              c={c}
              onLeave={() => leave(c.id)}
              busy={pending}
            />
          ))}
        </div>
      )}

      {tab === "leaderboard" && (
        <div className="dashboard-card">
          <div className="section-title">🏆 Top Cooks</div>
          {leaderboard.length === 0 ? (
            <p>No one has earned points yet — be the first!</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>User</th>
                    <th>Challenges Completed</th>
                    <th>Badges</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((r, i) => {
                    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1;
                    return (
                      <tr key={r.user_id} className={r.user_id === currentUserId ? "leader-row-self" : ""}>
                        <td>{medal}</td>
                        <td>
                          {r.full_name}
                          {r.user_id === currentUserId ? <span className="self-badge"> (You)</span> : null}
                        </td>
                        <td>{r.challenges_completed}</td>
                        <td>{r.badges_earned}</td>
                        <td>
                          <strong>{r.total_points.toLocaleString()}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "completed" && (
        <div className="challenges-grid">
          {completed.length === 0 && <p>No completed challenges yet. Keep cooking!</p>}
          {completed.map((c) => (
            <div className="challenge-card" key={c.id}>
              <div className="challenge-emoji">{c.emoji}</div>
              <div className="challenge-body">
                <h3>{c.title}</h3>
                <p>{c.description}</p>
                <div className="challenge-meta">
                  <span style={{ color: "#27ae60", fontWeight: 600 }}>
                    ✓ Completed on {new Date(c.completed_at!).toLocaleDateString()}
                  </span>
                </div>
                {c.badge_name ? (
                  <div className="challenge-reward">
                    {c.badge_emoji} {c.badge_name} earned · +{c.reward_points} pts
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "badges" && (
        <div className="badges-grid">
          {badges.length === 0 && <p>No badges yet — complete a challenge to earn your first one!</p>}
          {badges.map((b) => (
            <div className="badge-card" key={b.badge_id}>
              <div className="badge-emoji">{b.badge_emoji}</div>
              <h3>{b.badge_name}</h3>
              {b.description ? <p>{b.description}</p> : null}
              <div className="badge-date">Earned {new Date(b.earned_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChallengeCard({
  c,
  onJoin,
  onLeave,
  busy,
  isAdmin,
}: {
  c: ActiveChallenge;
  onJoin: () => void;
  onLeave: () => void;
  busy: boolean;
  isAdmin: boolean;
}) {
  return (
    <div className="challenge-card">
      <div className="challenge-emoji">{c.emoji}</div>
      <div className="challenge-body">
        <h3>{c.title}</h3>
        <p>{c.description}</p>
        <div className="challenge-meta">
          <span>🕐 {c.days_left} days left</span> · <span>👥 {c.participants} joined</span>
          {c.required_tag ? (
            <>
              {" · "}
              <span className="tag">tag: {c.required_tag}</span>
            </>
          ) : null}
        </div>
        {c.badge_name ? (
          <div className="challenge-reward">
            🎁 Reward: {c.badge_emoji} {c.badge_name} · +{c.reward_points} pts
          </div>
        ) : null}
      </div>
      {isAdmin ? (
        <Link
          href="/admin/challenges"
          className="btn btn-secondary"
          style={{ whiteSpace: "nowrap" }}
        >
          Manage
        </Link>
      ) : (
        <button
          className={`btn ${c.joined ? "btn-secondary" : "btn-primary"}`}
          style={{ whiteSpace: "nowrap" }}
          disabled={busy}
          onClick={c.joined ? onLeave : onJoin}
        >
          {c.joined ? "✓ Joined" : "Join"}
        </button>
      )}
    </div>
  );
}

function JoinedCard({
  c,
  onLeave,
  busy,
}: {
  c: UserChallengeRow;
  onLeave: () => void;
  busy: boolean;
}) {
  const pct = Math.min(100, Math.round((c.progress_count / c.target_count) * 100));

  return (
    <div className="challenge-card">
      <div className="challenge-emoji">{c.emoji}</div>
      <div className="challenge-body">
        <h3>{c.title}</h3>
        <p>{c.description}</p>
        <div className="challenge-meta">
          <span>🕐 {c.days_left} days left</span>
          {c.required_tag ? (
            <>
              {" · "}
              <span className="tag">required tag: {c.required_tag}</span>
            </>
          ) : null}
        </div>
        <div className="progress-row">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="progress-text">
            {c.progress_count} / {c.target_count}
          </div>
        </div>
        {c.badge_name ? (
          <div className="challenge-reward">
            🎁 {c.badge_emoji} {c.badge_name} · +{c.reward_points} pts
          </div>
        ) : null}
      </div>
      <div className="card-actions">
        <button className="btn btn-secondary" onClick={onLeave} disabled={busy}>
          Leave
        </button>
      </div>
    </div>
  );
}
