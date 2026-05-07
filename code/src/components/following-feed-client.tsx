"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";

type FeedRecipe = {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  cooking_time_minutes: number;
  servings: number;
  dietary_tags: string[];
  cover_image_url: string | null;
  created_at: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  avg_rating: number | null;
  review_count: number;
  my_rating: number | null;
};

type Chef = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  recipe_count: number;
  follower_count: number;
  is_following: boolean;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
}

function Stars({ rating }: { rating: number | null }) {
  if (rating === null) {
    return <span style={{ color: "#bbb", fontSize: "0.8rem" }}>No ratings yet</span>;
  }
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars: string[] = [];
  for (let i = 0; i < full; i++) stars.push("★");
  if (half) stars.push("★");
  while (stars.length < 5) stars.push("☆");
  return <span style={{ color: "#f5b301" }}>{stars.join("")}</span>;
}

export function FollowingFeedClient() {
  const [recipes, setRecipes] = useState<FeedRecipe[]>([]);
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyChef, setBusyChef] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [feedRes, chefsRes] = await Promise.all([
        fetch("/api/feed").then((r) => r.json()),
        fetch("/api/chefs").then((r) => r.json()),
      ]);
      if (feedRes.error) setError(feedRes.error);
      setRecipes(feedRes.recipes ?? []);
      setChefs(chefsRes.chefs ?? []);
    } catch {
      setError("Failed to load feed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function toggleFollow(chef: Chef) {
    setBusyChef(chef.id);
    try {
      if (chef.is_following) {
        await fetch(`/api/follows?chefId=${chef.id}`, { method: "DELETE" });
      } else {
        await fetch("/api/follows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chefId: chef.id }),
        });
      }
      await loadAll();
    } finally {
      setBusyChef(null);
    }
  }

  const followingChefs = useMemo(() => chefs.filter((c) => c.is_following), [chefs]);
  const availableChefs = useMemo(() => chefs.filter((c) => !c.is_following), [chefs]);
  const [search, setSearch] = useState("");
  const filteredAvailable = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableChefs;
    return availableChefs.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (c.bio?.toLowerCase().includes(q) ?? false),
    );
  }, [availableChefs, search]);

  if (loading) return <p>Loading feed…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 24, alignItems: "start" }}>
      {/* MAIN FEED */}
      <div>
        {followingChefs.length === 0 ? (
          <div className="filter-section" style={{ textAlign: "center" }}>
            <p style={{ marginBottom: 8, fontWeight: 600 }}>You aren&apos;t following any chefs yet.</p>
            <p style={{ color: "#777", marginBottom: 0 }}>
              Follow verified chefs from the panel on the right to see their newest recipes here.
            </p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="filter-section">
            <p>The chefs you follow haven&apos;t published anything yet. Check back soon!</p>
          </div>
        ) : (
          recipes.map((r) => (
            <article key={r.id} className="filter-section" style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>
              {/* author header — click to visit chef profile */}
              <Link
                href={`/chefs/${r.author_id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 16,
                  borderBottom: "1px solid #f0ebe5",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                {r.author_avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.author_avatar}
                    alt={r.author_name}
                    style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "#fdebd9",
                      color: "#b85a1f",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                    }}
                  >
                    {initials(r.author_name)}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{r.author_name}</div>
                  <div style={{ fontSize: "0.8rem", color: "#888" }}>Posted {timeAgo(r.created_at)}</div>
                </div>
                <span style={{ fontSize: "0.75rem", color: "#e07b39", fontWeight: 600 }}>
                  View profile →
                </span>
              </Link>

              {/* image */}
              {r.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.cover_image_url}
                  alt={r.title}
                  style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: 180,
                    background: "linear-gradient(135deg,#fff8f2,#fdebd9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "3rem",
                  }}
                >
                  🍴
                </div>
              )}

              {/* body */}
              <div style={{ padding: 16 }}>
                <h3 style={{ margin: "0 0 6px 0" }}>{r.title}</h3>
                {r.description && (
                  <p style={{ margin: "0 0 12px 0", color: "#555", fontSize: "0.92rem" }}>{r.description}</p>
                )}
                <div style={{ display: "flex", gap: 16, color: "#888", fontSize: "0.85rem", marginBottom: 12, flexWrap: "wrap" }}>
                  <span>⏱ {r.cooking_time_minutes} min</span>
                  <span style={{ textTransform: "capitalize" }}>{r.difficulty}</span>
                  {r.dietary_tags?.[0] && (
                    <span style={{ color: "#27ae60", fontWeight: 600 }}>{r.dietary_tags[0]}</span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid #f0ebe5",
                    paddingTop: 12,
                    gap: 12,
                  }}
                >
                  <div>
                    <Stars rating={r.avg_rating} />
                    {r.review_count > 0 && (
                      <span style={{ color: "#999", fontSize: "0.78rem", marginLeft: 6 }}>
                        ({r.review_count})
                      </span>
                    )}
                    {r.my_rating && (
                      <span style={{ color: "#27ae60", fontSize: "0.78rem", marginLeft: 8 }}>
                        · You rated {r.my_rating}/5
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link
                      href={`/recipes/${r.id}`}
                      className="btn btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "0.82rem", textDecoration: "none" }}
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/recipes/create?from=${r.id}`}
                      className="btn btn-primary"
                      style={{ padding: "6px 14px", fontSize: "0.85rem", textDecoration: "none" }}
                    >
                      Use this Recipe →
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* SIDEBAR */}
      <aside>
        <div className="filter-section" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Following ({followingChefs.length})</h3>
          {followingChefs.length === 0 ? (
            <p style={{ color: "#888", fontSize: "0.88rem", margin: 0 }}>
              You don&apos;t follow anyone yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {followingChefs.map((c) => (
                <ChefRow
                  key={c.id}
                  chef={c}
                  onToggle={() => toggleFollow(c)}
                  busy={busyChef === c.id}
                />
              ))}
            </div>
          )}
        </div>

        <div className="filter-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Available Chefs</h3>
            <span style={{ fontSize: "0.78rem", color: "#999" }}>{availableChefs.length} total</span>
          </div>
          <input
            type="search"
            placeholder="Search chefs by name or bio…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="supplier-input"
            style={{ marginBottom: 12, fontSize: "0.85rem" }}
          />
          {availableChefs.length === 0 ? (
            <p style={{ color: "#888", fontSize: "0.88rem", margin: 0 }}>
              You&apos;re following every verified chef on the platform 🎉
            </p>
          ) : filteredAvailable.length === 0 ? (
            <p style={{ color: "#888", fontSize: "0.88rem", margin: 0 }}>
              No chefs match &ldquo;{search}&rdquo;.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 460, overflowY: "auto" }}>
              {filteredAvailable.map((c) => (
                <AvailableChefCard
                  key={c.id}
                  chef={c}
                  onToggle={() => toggleFollow(c)}
                  busy={busyChef === c.id}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function AvailableChefCard({ chef, onToggle, busy }: { chef: Chef; onToggle: () => void; busy: boolean }) {
  return (
    <div
      style={{
        border: "1px solid #f0e6dd",
        borderRadius: 12,
        padding: 12,
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {chef.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={chef.avatar_url}
            alt={chef.full_name}
            style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#fdebd9,#f5cfa3)",
              color: "#b85a1f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
            }}
          >
            {initials(chef.full_name)}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "0.92rem", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {chef.full_name}
            </span>
            {chef.is_verified && (
              <span title="Verified" style={{ color: "#3498db", fontSize: "0.85rem" }}>✓</span>
            )}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#888", display: "flex", gap: 8 }}>
            <span>📖 {chef.recipe_count}</span>
            <span>👥 {chef.follower_count}</span>
          </div>
        </div>
      </div>

      {chef.bio && (
        <p
          style={{
            margin: 0,
            fontSize: "0.78rem",
            color: "#666",
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {chef.bio}
        </p>
      )}

      <button
        type="button"
        className="btn btn-primary"
        style={{ padding: "6px 10px", fontSize: "0.8rem", marginTop: 2 }}
        onClick={onToggle}
        disabled={busy}
      >
        {busy ? "Following…" : "+ Follow"}
      </button>
    </div>
  );
}

function ChefRow({ chef, onToggle, busy }: { chef: Chef; onToggle: () => void; busy: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {chef.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={chef.avatar_url}
          alt={chef.full_name}
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
          {initials(chef.full_name)}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {chef.full_name}
          {chef.is_verified && <span style={{ color: "#3498db", marginLeft: 4 }}>✓</span>}
        </div>
        <div style={{ fontSize: "0.75rem", color: "#888" }}>
          {chef.recipe_count} recipes · {chef.follower_count} followers
        </div>
      </div>
      <button
        type="button"
        className={chef.is_following ? "btn btn-secondary" : "btn btn-primary"}
        style={{ padding: "4px 10px", fontSize: "0.78rem" }}
        onClick={onToggle}
        disabled={busy}
      >
        {busy ? "…" : chef.is_following ? "Following" : "Follow"}
      </button>
    </div>
  );
}
