"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

const DIETARY_TAGS = [
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "keto", label: "Keto" },
  { value: "gluten_free", label: "Gluten-Free" },
  { value: "dairy_free", label: "Dairy-Free" },
  { value: "nut_free", label: "Nut-Free" },
  { value: "halal", label: "Halal" },
  { value: "paleo", label: "Paleo" },
];
const DIFFICULTIES = ["easy", "medium", "hard"];
const TIME_OPTIONS = [
  { label: "Any", value: 0 },
  { label: "≤ 15 min", value: 15 },
  { label: "≤ 30 min", value: 30 },
  { label: "≤ 60 min", value: 60 },
  { label: "≤ 90 min", value: 90 },
];
const RATING_OPTIONS = [
  { label: "Any", value: 0 },
  { label: "2★+", value: 2 },
  { label: "3★+", value: 3 },
  { label: "4★+", value: 4 },
  { label: "5★", value: 5 },
];

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
  author_avg_rating: number | null;
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

  // Filter state (applies to the currently expanded list)
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterDifficulty, setFilterDifficulty] = useState<string[]>([]);
  const [filterMaxTime, setFilterMaxTime] = useState(0);
  const [filterIngredient, setFilterIngredient] = useState("");
  const [filterMinRating, setFilterMinRating] = useState(0);

  const filteredListRecipes = useMemo(() => {
    const base = expandedId ? (listRecipes[expandedId] ?? []) : [];
    return base.filter((r) => {
      if (filterTags.length > 0 && !filterTags.every((t) => r.dietary_tags.includes(t))) return false;
      if (filterDifficulty.length > 0 && !filterDifficulty.includes(r.difficulty)) return false;
      if (filterMaxTime > 0 && r.cooking_time_minutes > filterMaxTime) return false;
      if (filterIngredient.trim()) {
        const term = filterIngredient.trim().toLowerCase();
        if (!r.ingredients.some((i) => i.ingredient_name.toLowerCase().includes(term))) return false;
      }
      if (filterMinRating > 0) {
        if (r.author_avg_rating == null || r.author_avg_rating < filterMinRating) return false;
      }
      return true;
    });
  }, [listRecipes, expandedId, filterTags, filterDifficulty, filterMaxTime, filterIngredient, filterMinRating]);

  function toggleTag(val: string) {
    setFilterTags((prev) => prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val]);
  }
  function toggleDifficulty(val: string) {
    setFilterDifficulty((prev) => prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val]);
  }
  function clearFilters() {
    setFilterTags([]);
    setFilterDifficulty([]);
    setFilterMaxTime(0);
    setFilterIngredient("");
    setFilterMinRating(0);
  }
  const isFiltered = filterTags.length > 0 || filterDifficulty.length > 0 || filterMaxTime > 0 || filterIngredient.trim() || filterMinRating > 0;

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
                    {/* Filter bar */}
                    <div className="filter-section" style={{ marginBottom: "1rem" }}>
                      <div className="filter-row">
                        <div className="filter-group">
                          <span className="filter-label">Dietary Tags</span>
                          <div className="chip-group">
                            {DIETARY_TAGS.map((tag) => (
                              <button
                                key={tag.value}
                                type="button"
                                className={`chip${filterTags.includes(tag.value) ? " active" : ""}`}
                                onClick={() => toggleTag(tag.value)}
                              >
                                {tag.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="filter-group">
                          <span className="filter-label">Difficulty</span>
                          <div className="chip-group">
                            {DIFFICULTIES.map((d) => (
                              <button
                                key={d}
                                type="button"
                                className={`chip${filterDifficulty.includes(d) ? " active" : ""}`}
                                onClick={() => toggleDifficulty(d)}
                              >
                                {d.charAt(0).toUpperCase() + d.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="filter-group">
                          <span className="filter-label">Max Cook Time</span>
                          <div className="chip-group">
                            {TIME_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className={`chip${filterMaxTime === opt.value ? " active" : ""}`}
                                onClick={() => setFilterMaxTime(opt.value)}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="filter-group">
                          <span className="filter-label">Min Chef Rating</span>
                          <div className="chip-group">
                            {RATING_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className={`chip${filterMinRating === opt.value ? " active" : ""}`}
                                onClick={() => setFilterMinRating(opt.value)}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="filter-group">
                          <span className="filter-label">Ingredient</span>
                          <div className="filter-ingredient-row">
                            <span className="filter-ingredient-icon">🔍</span>
                            <input
                              type="text"
                              placeholder="Search by ingredient…"
                              value={filterIngredient}
                              onChange={(e) => setFilterIngredient(e.target.value)}
                              className="filter-ingredient-input"
                            />
                            {filterIngredient && (
                              <button
                                type="button"
                                className="filter-ingredient-clear"
                                onClick={() => setFilterIngredient("")}
                                aria-label="Clear ingredient filter"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="filter-footer">
                        <span className="filter-count">
                          {filteredListRecipes.length} of {listRecipes[list.id].length} recipe{listRecipes[list.id].length === 1 ? "" : "s"}
                        </span>
                        {isFiltered && (
                          <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                            Clear Filters
                          </button>
                        )}
                      </div>
                    </div>

                    {filteredListRecipes.length === 0 ? (
                      <p style={{ fontSize: "0.9rem", color: "#999" }}>No recipes match the selected filters.</p>
                    ) : null}

                    {filteredListRecipes.map((recipe) => (
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
