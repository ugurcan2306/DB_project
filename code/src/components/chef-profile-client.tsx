"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Chef = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  recipe_count: number;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  avg_rating: number | null;
  total_cooks: number;
  created_at: string;
};

type ChefRecipe = {
  id: string;
  title: string;
  description: string | null;
  cooking_time_minutes: number;
  servings: number;
  difficulty: string;
  dietary_tags: string[];
  cover_image_url: string | null;
  created_at: string;
  avg_rating: number | null;
  review_count: number;
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
}

export function ChefProfileClient({ chefId }: { chefId: string }) {
  const [chef, setChef] = useState<Chef | null>(null);
  const [recipes, setRecipes] = useState<ChefRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followBusy, setFollowBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/chefs/${chefId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load chef.");
        return;
      }
      setChef(data.chef);
      setRecipes(data.recipes);
    } catch {
      setError("Failed to load chef.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chefId]);

  async function toggleFollow() {
    if (!chef) return;
    setFollowBusy(true);
    try {
      const res = chef.is_following
        ? await fetch(`/api/follows?chefId=${chef.id}`, { method: "DELETE" })
        : await fetch("/api/follows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chefId: chef.id }),
          });
      if (res.ok) {
        setChef({
          ...chef,
          is_following: !chef.is_following,
          follower_count: chef.follower_count + (chef.is_following ? -1 : 1),
        });
      }
    } finally {
      setFollowBusy(false);
    }
  }

  if (loading) return <p>Loading chef…</p>;
  if (error || !chef) return <p style={{ color: "red" }}>{error || "Not found."}</p>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Hero */}
      <section className="filter-section" style={{ display: "flex", gap: 20, alignItems: "center" }}>
        {chef.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={chef.avatar_url}
            alt={chef.full_name}
            style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#fdebd9,#f5cfa3)",
              color: "#b85a1f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "2rem",
            }}
          >
            {initials(chef.full_name)}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            {chef.full_name}
            {chef.is_verified && <span style={{ color: "#3498db", fontSize: "1.2rem" }} title="Verified">✓</span>}
          </h1>
          <p style={{ margin: "4px 0 12px 0", color: "#666" }}>{chef.bio ?? "Verified chef on FarmToTable."}</p>
          <div style={{ display: "flex", gap: 24, color: "#444", fontSize: "0.9rem" }}>
            <span><strong>{chef.recipe_count}</strong> recipes</span>
            <span><strong>{chef.follower_count}</strong> followers</span>
            <span><strong>{chef.following_count}</strong> following</span>
            <span>
              ⭐ <strong>{chef.avg_rating ?? "—"}</strong>{" "}
              <span style={{ color: "#888" }}>({chef.total_cooks} cooks)</span>
            </span>
          </div>
        </div>
        <button
          type="button"
          className={chef.is_following ? "btn btn-secondary" : "btn btn-primary"}
          onClick={toggleFollow}
          disabled={followBusy}
        >
          {followBusy ? "…" : chef.is_following ? "Following" : "+ Follow"}
        </button>
      </section>

      {/* Recipes grid */}
      <section className="filter-section">
        <h2 style={{ marginTop: 0 }}>Recipes by {chef.full_name}</h2>
        {recipes.length === 0 ? (
          <p style={{ color: "#888" }}>This chef hasn&apos;t published any recipes yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {recipes.map((r) => (
              <Link
                key={r.id}
                href={`/recipes/${r.id}`}
                style={{
                  border: "1px solid #f0e6dd",
                  borderRadius: 12,
                  background: "#fff",
                  textDecoration: "none",
                  color: "inherit",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.15s ease",
                }}
              >
                <div style={{ height: 140, background: "linear-gradient(135deg,#fff8f2,#fdebd9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {r.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.cover_image_url} alt={r.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: "2.5rem" }}>🍴</span>
                  )}
                </div>
                <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  <h3 style={{ margin: 0, fontSize: "1rem" }}>{r.title}</h3>
                  <div style={{ display: "flex", gap: 10, fontSize: "0.78rem", color: "#888", flexWrap: "wrap" }}>
                    <span>⏱ {r.cooking_time_minutes} min</span>
                    <span style={{ textTransform: "capitalize" }}>{r.difficulty}</span>
                    {r.dietary_tags?.[0] && (
                      <span style={{ color: "#27ae60", fontWeight: 600 }}>{r.dietary_tags[0]}</span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#666" }}>
                    ⭐ {r.avg_rating ?? "—"}{" "}
                    {r.review_count > 0 && <span style={{ color: "#999" }}>({r.review_count})</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
