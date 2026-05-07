"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Ingredient = { ingredient_id: string; ingredient_name: string; quantity: number; unit: string };
type Step = { step_number: number; instruction: string };
type Recipe = {
  id: string;
  title: string;
  description: string | null;
  servings: number;
  cooking_time_minutes: number;
  difficulty: string;
  dietary_tags: string[];
  cover_image_url: string | null;
  created_at: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  is_following_author: boolean;
  avg_rating: number | null;
  review_count: number;
  my_rating: number | null;
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
}

export function RecipeDetailClient({ recipeId }: { recipeId: string }) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/public`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load recipe.");
        return;
      }
      setRecipe(data.recipe);
      setSteps(data.steps);
      setIngredients(data.ingredients);
      setScale(1); // reset scale to 1× of base servings
    } catch {
      setError("Failed to load recipe.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId]);

  const scaledServings = useMemo(() => (recipe ? recipe.servings * scale : 0), [recipe, scale]);

  async function toggleFollow() {
    if (!recipe) return;
    setFollowBusy(true);
    try {
      const res = recipe.is_following_author
        ? await fetch(`/api/follows?chefId=${recipe.author_id}`, { method: "DELETE" })
        : await fetch("/api/follows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chefId: recipe.author_id }),
          });
      if (res.ok) {
        setRecipe({ ...recipe, is_following_author: !recipe.is_following_author });
      }
    } finally {
      setFollowBusy(false);
    }
  }

  if (loading) return <p>Loading recipe…</p>;
  if (error || !recipe) return <p style={{ color: "red" }}>{error || "Not found."}</p>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Hero card */}
      <section className="filter-section" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 24 }}>
        <div
          style={{
            background: "linear-gradient(135deg,#fff8f2,#fdebd9)",
            borderRadius: 12,
            minHeight: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {recipe.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recipe.cover_image_url} alt={recipe.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: "5rem" }}>🍴</span>
          )}
        </div>

        <div>
          <h1 style={{ margin: "0 0 8px 0" }}>{recipe.title}</h1>

          <Link
            href={`/chefs/${recipe.author_id}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit", marginBottom: 8 }}
          >
            {recipe.author_avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={recipe.author_avatar} alt={recipe.author_name} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#fdebd9", color: "#b85a1f", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem" }}>
                {initials(recipe.author_name)}
              </span>
            )}
            <span style={{ fontWeight: 600, color: "#333" }}>by {recipe.author_name}</span>
          </Link>
          <button
            type="button"
            className={recipe.is_following_author ? "btn btn-secondary" : "btn btn-primary"}
            style={{ padding: "4px 12px", fontSize: "0.78rem", marginLeft: 10 }}
            onClick={toggleFollow}
            disabled={followBusy}
          >
            {followBusy ? "…" : recipe.is_following_author ? "Following" : "+ Follow"}
          </button>

          <div style={{ display: "flex", gap: 16, color: "#666", fontSize: "0.92rem", margin: "12px 0", flexWrap: "wrap" }}>
            <span>⏱ {recipe.cooking_time_minutes} min</span>
            <span style={{ textTransform: "capitalize" }}>📊 {recipe.difficulty}</span>
            <span>
              ⭐ {recipe.avg_rating ?? "—"}{" "}
              <span style={{ color: "#999" }}>({recipe.review_count} review{recipe.review_count === 1 ? "" : "s"})</span>
            </span>
          </div>

          {recipe.dietary_tags.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {recipe.dietary_tags.map((t) => (
                <span
                  key={t}
                  style={{
                    display: "inline-block",
                    background: "#fff0e3",
                    color: "#b85a1f",
                    border: "1px solid #f0d4b4",
                    borderRadius: 999,
                    padding: "2px 10px",
                    fontSize: "0.75rem",
                    marginRight: 6,
                    marginBottom: 4,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {recipe.description && <p style={{ color: "#555", marginBottom: 12 }}>{recipe.description}</p>}

          {/* Scaling */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              border: "1px solid #f0e6dd",
              borderRadius: 8,
              background: "#fff8f2",
              marginBottom: 12,
            }}
          >
            <span style={{ fontWeight: 600 }}>🍽 Servings:</span>
            <button type="button" className="btn btn-secondary" style={{ padding: "2px 10px" }} onClick={() => setScale((s) => Math.max(0.5, +(s - 0.5).toFixed(2)))}>−</button>
            <span style={{ minWidth: 80, textAlign: "center", fontWeight: 700 }}>{scaledServings} people</span>
            <button type="button" className="btn btn-secondary" style={{ padding: "2px 10px" }} onClick={() => setScale((s) => +(s + 0.5).toFixed(2))}>+</button>
            <span style={{ color: "#888", fontSize: "0.78rem", marginLeft: "auto" }}>base recipe: {recipe.servings}</span>
          </div>
        </div>
      </section>

      {/* Ingredients (scaled) */}
      <section className="filter-section">
        <h2 style={{ marginTop: 0 }}>🥕 Ingredients ({scaledServings} servings)</h2>
        {ingredients.length === 0 ? (
          <p style={{ color: "#888" }}>No ingredients listed.</p>
        ) : (
          <table className="supplier-table">
            <thead>
              <tr>
                <th>Ingredient</th>
                <th style={{ textAlign: "right" }}>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing) => (
                <tr key={ing.ingredient_id}>
                  <td>{ing.ingredient_name}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {(+(ing.quantity * scale).toFixed(2))} {ing.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Instructions */}
      <section className="filter-section">
        <h2 style={{ marginTop: 0 }}>📋 Instructions</h2>
        {steps.length === 0 ? (
          <p style={{ color: "#888" }}>No steps listed.</p>
        ) : (
          <ol style={{ paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: 8 }}>
            {steps.map((s) => (
              <li key={s.step_number} style={{ lineHeight: 1.5 }}>{s.instruction}</li>
            ))}
          </ol>
        )}
      </section>

      {/* Use this recipe — clones into the user's own create form */}
      <section
        className="filter-section"
        style={{
          textAlign: "center",
          background: "linear-gradient(135deg,#fff8f2,#fdebd9)",
          borderColor: "#f0d4b4",
        }}
      >
        <h2 style={{ marginTop: 0 }}>👩‍🍳 Want to cook this yourself?</h2>
        <p style={{ color: "#666", maxWidth: 540, margin: "0 auto 16px" }}>
          We&apos;ll pre-fill the recipe creator with all of {recipe.author_name}&apos;s steps and ingredients
          so you can tweak them and save your own version. You&apos;ll be able to rate it once you&apos;ve cooked it.
        </p>
        <Link
          href={`/recipes/create?from=${recipe.id}`}
          className="btn btn-primary btn-large"
          style={{ textDecoration: "none" }}
        >
          Use this Recipe →
        </Link>
      </section>
    </div>
  );
}
