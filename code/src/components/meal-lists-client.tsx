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
  difficulty: string;
  cooking_time_minutes: number;
  servings: number;
  author_name: string;
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

  async function handleCreate(e: React.FormEvent) {
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
                  <table className="supplier-table">
                    <thead>
                      <tr>
                        <th>Recipe</th>
                        <th>By</th>
                        <th>Difficulty</th>
                        <th>Time</th>
                        <th>Servings</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {listRecipes[list.id].map((recipe) => (
                        <tr key={recipe.id}>
                          <td>{recipe.title}</td>
                          <td>{recipe.author_name}</td>
                          <td>{recipe.difficulty}</td>
                          <td>{recipe.cooking_time_minutes} min</td>
                          <td>{recipe.servings}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary supplier-action-btn"
                              onClick={() => handleRemoveRecipe(list.id, recipe.id)}
                              disabled={deletingRecipe === recipe.id}
                            >
                              {deletingRecipe === recipe.id ? "…" : "Remove"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
