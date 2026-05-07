"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Step = {
  step_number: number;
  instruction: string;
};

type Ingredient = {
  ingredient_name: string;
  taxonomy_name?: string;
  quantity: number;
  unit: string;
};

type Recipe = {
  id: string;
  title: string;
  description: string | null;
  servings: number;
  cooking_time_minutes: number;
  difficulty: string;
  dietary_tags: string[];
  cover_image_url: string | null;
  is_published: boolean;
  created_at: string;
  steps?: Step[];
  ingredients?: Ingredient[];
};

export function MyRecipesClient({ userRole }: { userRole: string }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);

  async function handleShare(id: string) {
    setSharing(id);
    try {
      const res = await fetch(`/api/recipes/${id}/share`, { method: "POST" });
      const data = (await res.json()) as { is_published?: boolean; error?: string };
      if (!res.ok) { alert(data.error ?? "Failed to update share status."); return; }
      setRecipes((prev) =>
        prev.map((r) => r.id === id ? { ...r, is_published: data.is_published! } : r),
      );
    } finally {
      setSharing(null);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRecipes((prev) => prev.filter((r) => r.id !== id));
      } else {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? "Failed to delete recipe.");
      }
    } catch {
      alert("Something went wrong.");
    } finally {
      setDeleting(null);
    }
  }

  useEffect(() => {
    fetch("/api/recipes/my")
      .then((r) => r.json())
      .then((data: { recipes?: Recipe[]; error?: string }) => {
        if (data.error) {
          setError(data.error);
        } else {
          setRecipes(data.recipes ?? []);
        }
      })
      .catch(() => setError("Failed to load recipes."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading your recipes…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div className="my-recipes-layout">
      <div className="my-recipes-toolbar">
        <Link href="/recipes/create">
          <button type="button" className="btn btn-primary">+ Create New Recipe</button>
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="filter-section">
          <p>You have not created any recipes yet.</p>
          <p>
            <Link href="/recipes/create">Create your first recipe</Link>
          </p>
        </div>
      ) : (
        <div className="my-recipes-grid">
          {recipes.map((recipe) => (
            <article key={recipe.id} className="filter-section my-recipe-card">
              <div className="my-recipe-top">
                <div className="my-recipe-main">
                  <div className="my-recipe-heading">
                    <h2 className="my-recipe-title">{recipe.title}</h2>
                    {userRole === "verified_chef" && recipe.is_published && (
                      <span className="my-recipe-shared-badge">
                        Shared
                      </span>
                    )}
                  </div>
                  {recipe.description ? <p className="my-recipe-description">{recipe.description}</p> : null}
                  <div className="my-recipe-meta">
                    <span>Difficulty: {recipe.difficulty}</span>
                    <span>Servings: {recipe.servings}</span>
                    <span>Time: {recipe.cooking_time_minutes} min</span>
                  </div>
                  {recipe.dietary_tags.length > 0 && (
                    <p className="my-recipe-tags">
                      <strong>Tags:</strong> {recipe.dietary_tags.join(", ")}
                    </p>
                  )}
                  <p className="my-recipe-created">
                    Created: {new Date(recipe.created_at).toLocaleDateString()}
                  </p>
                  {(recipe.ingredients?.length ?? 0) > 0 && (
                    <div className="my-recipe-panel">
                      <strong className="my-recipe-label">Ingredients</strong>
                      <ul className="my-recipe-list">
                        {(recipe.ingredients ?? []).map((ing) => (
                          <li key={`${ing.ingredient_name}-${ing.quantity}-${ing.unit}`} className="my-recipe-list-item">
                            {ing.quantity} {ing.unit} — {ing.taxonomy_name ?? ing.ingredient_name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(recipe.steps?.length ?? 0) > 0 && (
                    <div className="my-recipe-panel">
                      <strong className="my-recipe-label">Instructions</strong>
                      <ol className="my-recipe-list">
                        {(recipe.steps ?? []).map((step) => (
                          <li key={step.step_number} className="my-recipe-list-item">
                            {step.instruction}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
                <div className="my-recipe-side">
                  <div className="my-recipe-actions">
                    {userRole === "verified_chef" && !recipe.is_published && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleShare(recipe.id)}
                        disabled={sharing === recipe.id}
                      >
                        {sharing === recipe.id ? "…" : "Share"}
                      </button>
                    )}
                    <Link href={`/recipes/${recipe.id}/edit`}>
                      <button type="button" className="btn btn-secondary">
                        Edit
                      </button>
                    </Link>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleDelete(recipe.id, recipe.title)}
                      disabled={deleting === recipe.id}
                    >
                      {deleting === recipe.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                  {recipe.cover_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={recipe.cover_image_url}
                      alt={recipe.title}
                      className="my-recipe-image"
                    />
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
