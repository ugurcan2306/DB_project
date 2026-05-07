"use client";

import { useEffect, useState } from "react";

type SharedRecipe = {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  cooking_time_minutes: number;
  servings: number;
  dietary_tags: string[];
  cover_image_url: string | null;
  author_name: string;
  created_at: string;
};

type MealList = {
  id: string;
  name: string;
};

export function SharedRecipesClient() {
  const [recipes, setRecipes] = useState<SharedRecipe[]>([]);
  const [lists, setLists] = useState<MealList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // per-recipe selected list id
  const [selectedList, setSelectedList] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState<string | null>(null);
  const [addedTo, setAddedTo] = useState<Record<string, string>>({});  // recipeId → list name

  useEffect(() => {
    Promise.all([
      fetch("/api/shared-recipes").then((r) => r.json()),
      fetch("/api/meal-lists").then((r) => r.json()),
    ])
      .then(([recipeData, listData]: [
        { recipes?: SharedRecipe[]; error?: string },
        { lists?: MealList[] },
      ]) => {
        if (recipeData.error) { setError(recipeData.error); return; }
        setRecipes(recipeData.recipes ?? []);
        setLists(listData.lists ?? []);
      })
      .catch(() => setError("Failed to load recipes."))
      .finally(() => setLoading(false));
  }, []);

  async function handleAddToList(recipeId: string) {
    const listId = selectedList[recipeId];
    if (!listId) return;
    setAdding(recipeId);
    try {
      const res = await fetch(`/api/meal-lists/${listId}/recipes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        alert(data.error ?? "Failed to add recipe.");
        return;
      }
      const list = lists.find((l) => l.id === listId);
      setAddedTo((prev) => ({ ...prev, [recipeId]: list?.name ?? "your list" }));
    } finally {
      setAdding(null);
    }
  }

  if (loading) return <p>Loading recipes…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  if (recipes.length === 0) {
    return (
      <div className="filter-section">
        <p>No shared recipes yet. Verified chefs will publish recipes here.</p>
      </div>
    );
  }

  return (
    <div>
      {recipes.map((recipe) => (
        <div key={recipe.id} className="filter-section" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: "0 0 0.25rem 0" }}>{recipe.title}</h2>
              <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.85rem", color: "#888" }}>
                by {recipe.author_name}
              </p>
              {recipe.description && (
                <p style={{ margin: "0 0 0.5rem 0", color: "#666" }}>{recipe.description}</p>
              )}
              <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>
                <strong>Difficulty:</strong> {recipe.difficulty} &nbsp;|&nbsp;
                <strong>Time:</strong> {recipe.cooking_time_minutes} min &nbsp;|&nbsp;
                <strong>Servings:</strong> {recipe.servings}
              </p>
              {recipe.dietary_tags.length > 0 && (
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem" }}>
                  <strong>Tags:</strong> {recipe.dietary_tags.join(", ")}
                </p>
              )}

              {/* Add to list controls */}
              {lists.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "#999", marginTop: "0.5rem" }}>
                  Create a meal list first to save this recipe.
                </p>
              ) : addedTo[recipe.id] ? (
                <p style={{ fontSize: "0.85rem", color: "green", marginTop: "0.5rem" }}>
                  Added to &quot;{addedTo[recipe.id]}&quot;
                </p>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: "0.5rem" }}>
                  <select
                    className="supplier-select"
                    value={selectedList[recipe.id] ?? ""}
                    onChange={(e) =>
                      setSelectedList((prev) => ({ ...prev, [recipe.id]: e.target.value }))
                    }
                    style={{ maxWidth: 220 }}
                  >
                    <option value="">— add to list —</option>
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleAddToList(recipe.id)}
                    disabled={adding === recipe.id || !selectedList[recipe.id]}
                  >
                    {adding === recipe.id ? "Adding…" : "+ Add to List"}
                  </button>
                </div>
              )}
            </div>

            {recipe.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={recipe.cover_image_url}
                alt={recipe.title}
                style={{ width: 110, height: 85, objectFit: "cover", borderRadius: 4, marginLeft: 16 }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
