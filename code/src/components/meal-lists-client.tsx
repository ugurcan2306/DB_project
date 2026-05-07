"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type MealList = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  recipe_count: number;
};

type RecipeInList = {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  cooking_time_minutes: number;
  servings: number;
  dietary_tags: string[];
  cover_image_url: string | null;
  author_name: string;
  is_deleted: boolean;
  user_rating: number | null;
  steps: { step_number: number; instruction: string }[];
  ingredients: { ingredient_name: string; quantity: number; unit: string }[];
};

export function MealListsClient() {
  const [lists, setLists] = useState<MealList[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [listRecipes, setListRecipes] = useState<Record<string, RecipeInList[]>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const [deletingList, setDeletingList] = useState<string | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<string | null>(null);
  const [awaitingRating, setAwaitingRating] = useState<Record<string, boolean>>({});
  const [pendingRating, setPendingRating] = useState<Record<string, number>>({});
  const [submittingCook, setSubmittingCook] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/meal-lists")
      .then((r) => r.json())
      .then((data: { lists?: MealList[]; error?: string }) => {
        if (data.error) { setError(data.error); return; }
        setLists(data.lists ?? []);
      })
      .catch(() => setError("Failed to load lists."))
      .finally(() => setLoading(false));
  }, []);

  async function loadListRecipes(listId: string) {
    if (listRecipes[listId]) return;
    const res = await fetch(`/api/meal-lists/${listId}/recipes`);
    const data = await res.json() as { recipes?: RecipeInList[] };
    setListRecipes((prev) => ({ ...prev, [listId]: data.recipes ?? [] }));
  }

  function toggleExpand(listId: string) {
    if (expandedId === listId) {
      setExpandedId(null);
    } else {
      setExpandedId(listId);
      loadListRecipes(listId);
    }
  }

  async function handleCreate(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/meal-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }),
      });
      const data = await res.json() as { list?: MealList; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to create list."); return; }
      setLists((prev) => [data.list!, ...prev]);
      setNewName("");
      setNewDesc("");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteList(listId: string, name: string) {
    if (!confirm(`Delete list "${name}"? This cannot be undone.`)) return;
    setDeletingList(listId);
    try {
      await fetch(`/api/meal-lists/${listId}`, { method: "DELETE" });
      setLists((prev) => prev.filter((l) => l.id !== listId));
      if (expandedId === listId) setExpandedId(null);
    } finally {
      setDeletingList(null);
    }
  }

  async function handleCook(recipeId: string) {
    const rating = pendingRating[recipeId];
    if (!rating) return;
    setSubmittingCook(recipeId);
    try {
      const res = await fetch("/api/cook-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId, rating }),
      });
      if (!res.ok) { alert("Failed to save cook log."); return; }
      setListRecipes((prev) => {
        const updated: Record<string, RecipeInList[]> = {};
        for (const [lid, recipes] of Object.entries(prev)) {
          updated[lid] = recipes.map((r) => r.id === recipeId ? { ...r, user_rating: rating } : r);
        }
        return updated;
      });
    } finally {
      setSubmittingCook(null);
    }
  }

  async function handleRemoveRecipe(listId: string, recipeId: string) {
    setDeletingRecipe(recipeId);
    try {
      await fetch(`/api/meal-lists/${listId}/recipes/${recipeId}`, { method: "DELETE" });
      setListRecipes((prev) => ({ ...prev, [listId]: (prev[listId] ?? []).filter((r) => r.id !== recipeId) }));
      setLists((prev) => prev.map((l) => l.id === listId ? { ...l, recipe_count: Math.max(0, l.recipe_count - 1) } : l));
    } finally {
      setDeletingRecipe(null);
    }
  }

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div>
      {/* Create list form */}
      <div className="filter-section" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: "0 0 1rem 0" }}>Create New List</h2>
        <form onSubmit={handleCreate}>
          <div className="form-group auth-field" style={{ marginBottom: "0.75rem" }}>
            <label htmlFor="list-name">List Name *</label>
            <input
              id="list-name"
              type="text"
              placeholder="e.g. Weeknight Dinners"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={255}
            />
          </div>
          <div className="form-group auth-field" style={{ marginBottom: "0.75rem" }}>
            <label htmlFor="list-desc">Description</label>
            <input
              id="list-desc"
              type="text"
              placeholder="Optional description"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={creating || !newName.trim()}>
            {creating ? "Creating…" : "+ Create List"}
          </button>
        </form>
      </div>

      {/* Hint to browse shared recipes */}
      <div style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Browse <Link href="/shared-recipes">Shared Recipes</Link> to add recipes to your lists.
      </div>

      {/* Lists */}
      {lists.length === 0 ? (
        <div className="filter-section">
          <p>No meal lists yet. Create one above.</p>
        </div>
      ) : (
        lists.map((list) => (
          <div key={list.id} className="filter-section" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 style={{ margin: "0 0 0.25rem 0" }}>{list.name}</h2>
                {list.description && (
                  <p style={{ margin: "0 0 0.25rem 0", color: "#666", fontSize: "0.9rem" }}>{list.description}</p>
                )}
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#999" }}>
                  {list.recipe_count} recipe{list.recipe_count !== 1 ? "s" : ""} · Created {new Date(list.created_at).toLocaleDateString()}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => toggleExpand(list.id)}>
                  {expandedId === list.id ? "Collapse" : "View Recipes"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleDeleteList(list.id, list.name)}
                  disabled={deletingList === list.id}
                >
                  {deletingList === list.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>

            {expandedId === list.id && (
              <div style={{ marginTop: "1rem", borderTop: "1px solid #eee", paddingTop: "1rem" }}>
                {!listRecipes[list.id] ? (
                  <p style={{ fontSize: "0.9rem", color: "#999" }}>Loading…</p>
                ) : listRecipes[list.id].length === 0 ? (
                  <p style={{ fontSize: "0.9rem", color: "#999" }}>
                    No recipes yet. Go to <Link href="/shared-recipes">Shared Recipes</Link> to add some.
                  </p>
                ) : (
                  <div>
                    {listRecipes[list.id].map((recipe) => (
                      <div key={recipe.id} style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "0.85rem", marginBottom: "0.75rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ margin: "0 0 0.2rem 0" }}>{recipe.title}</h3>
                            <p style={{ margin: "0 0 0.35rem 0", fontSize: "0.82rem", color: "#888" }}>by {recipe.author_name}</p>
                            {recipe.description && (
                              <p style={{ margin: "0 0 0.35rem 0", fontSize: "0.9rem", color: "#555" }}>{recipe.description}</p>
                            )}
                            <p style={{ margin: "0 0 0.35rem 0", fontSize: "0.85rem" }}>
                              <strong>Difficulty:</strong> {recipe.difficulty} &nbsp;|&nbsp;
                              <strong>Time:</strong> {recipe.cooking_time_minutes} min &nbsp;|&nbsp;
                              <strong>Servings:</strong> {recipe.servings}
                            </p>
                            {recipe.dietary_tags?.length > 0 && (
                              <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.82rem" }}>
                                <strong>Tags:</strong> {recipe.dietary_tags.join(", ")}
                              </p>
                            )}

                            {recipe.ingredients?.length > 0 && (
                              <div style={{ marginBottom: "0.5rem" }}>
                                <strong style={{ fontSize: "0.85rem" }}>Ingredients</strong>
                                <ul style={{ margin: "0.25rem 0 0 1.1rem", padding: 0 }}>
                                  {recipe.ingredients.map((ing) => (
                                    <li key={ing.ingredient_name} style={{ fontSize: "0.85rem", marginBottom: "0.15rem" }}>
                                      {ing.quantity} {ing.unit} — {ing.ingredient_name}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {recipe.steps?.length > 0 && (
                              <div>
                                <strong style={{ fontSize: "0.85rem" }}>Instructions</strong>
                                <ol style={{ margin: "0.25rem 0 0 1.1rem", padding: 0 }}>
                                  {recipe.steps.map((step) => (
                                    <li key={step.step_number} style={{ fontSize: "0.85rem", marginBottom: "0.2rem" }}>
                                      {step.instruction}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, marginLeft: 12 }}>
                            {recipe.cover_image_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={recipe.cover_image_url} alt={recipe.title} style={{ width: 90, height: 70, objectFit: "cover", borderRadius: 4 }} />
                            )}
                            {recipe.user_rating ? (
                              <p style={{ margin: 0, fontSize: "0.85rem", color: "#065f46" }}>
                                Cooked — rated {recipe.user_rating}/5
                              </p>
                            ) : awaitingRating[recipe.id] ? (
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <select
                                  className="supplier-select"
                                  value={pendingRating[recipe.id] ?? ""}
                                  onChange={(e) => setPendingRating((prev) => ({ ...prev, [recipe.id]: Number(e.target.value) }))}
                                  style={{ width: 70 }}
                                >
                                  <option value="">★</option>
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={() => handleCook(recipe.id)}
                                  disabled={submittingCook === recipe.id || !pendingRating[recipe.id]}
                                  style={{ whiteSpace: "nowrap" }}
                                >
                                  {submittingCook === recipe.id ? "…" : "Submit"}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setAwaitingRating((prev) => ({ ...prev, [recipe.id]: true }))}
                                style={{ whiteSpace: "nowrap" }}
                              >
                                Cooked
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-secondary supplier-action-btn"
                              onClick={() => handleRemoveRecipe(list.id, recipe.id)}
                              disabled={deletingRecipe === recipe.id}
                            >
                              {deletingRecipe === recipe.id ? "…" : "Remove"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
