"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Step = {
  step_number: number;
  instruction: string;
};

type Ingredient = {
  ingredient_name: string;
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
  created_at: string;
  steps?: Step[];
  ingredients?: Ingredient[];
};

export function MyRecipesClient() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

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
    <div>
      <div style={{ marginBottom: "1rem" }}>
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
        <div>
          {recipes.map((recipe) => (
            <div key={recipe.id} className="filter-section" style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: "0 0 0.25rem 0" }}>{recipe.title}</h2>
                  {recipe.description && (
                    <p style={{ margin: "0 0 0.5rem 0", color: "#666" }}>{recipe.description}</p>
                  )}
                  <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>
                    <strong>Difficulty:</strong> {recipe.difficulty} &nbsp;|&nbsp;
                    <strong>Servings:</strong> {recipe.servings} &nbsp;|&nbsp;
                    <strong>Time:</strong> {recipe.cooking_time_minutes} min
                  </p>
                  {recipe.dietary_tags.length > 0 && (
                    <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.85rem" }}>
                      <strong>Tags:</strong> {recipe.dietary_tags.join(", ")}
                    </p>
                  )}
                  <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.8rem", color: "#999" }}>
                    Created: {new Date(recipe.created_at).toLocaleDateString()}
                  </p>
                  {(recipe.ingredients?.length ?? 0) > 0 && (
                    <div style={{ marginBottom: "0.75rem" }}>
                      <strong style={{ fontSize: "0.9rem" }}>Ingredients</strong>
                      <ul style={{ margin: "0.4rem 0 0 1.2rem", padding: 0 }}>
                        {(recipe.ingredients ?? []).map((ing) => (
                          <li key={ing.ingredient_name} style={{ fontSize: "0.9rem", marginBottom: "0.2rem" }}>
                            {ing.quantity} {ing.unit} — {ing.ingredient_name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(recipe.steps?.length ?? 0) > 0 && (
                    <div>
                      <strong style={{ fontSize: "0.9rem" }}>Instructions</strong>
                      <ol style={{ margin: "0.4rem 0 0 1.2rem", padding: 0 }}>
                        {(recipe.steps ?? []).map((step) => (
                          <li key={step.step_number} style={{ marginBottom: "0.3rem", fontSize: "0.9rem" }}>
                            {step.instruction}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, marginLeft: 12 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link href={`/recipes/${recipe.id}/edit`}>
                      <button type="button" className="btn btn-secondary" style={{ whiteSpace: "nowrap" }}>
                        Edit
                      </button>
                    </Link>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleDelete(recipe.id, recipe.title)}
                      disabled={deleting === recipe.id}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {deleting === recipe.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                  {recipe.cover_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={recipe.cover_image_url}
                      alt={recipe.title}
                      style={{ width: 100, height: 80, objectFit: "cover", borderRadius: 4 }}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
