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

type Step = { step_number: number; instruction: string };
type Ingredient = { ingredient_name: string; taxonomy_name?: string; quantity: number; unit: string };

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

function difficultyBadgeClass(d: string) {
  if (d === "easy") return "my-diff-badge my-diff-easy";
  if (d === "hard") return "my-diff-badge my-diff-hard";
  return "my-diff-badge my-diff-medium";
}

export function MyRecipesClient({ userRole }: { userRole: string }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scaledServings, setScaledServings] = useState<Record<string, number>>({});

  // Filter state
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterDifficulty, setFilterDifficulty] = useState<string[]>([]);
  const [filterMaxTime, setFilterMaxTime] = useState(0);
  const [filterIngredient, setFilterIngredient] = useState("");

  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      if (filterTags.length > 0 && !filterTags.every((t) => r.dietary_tags.includes(t))) return false;
      if (filterDifficulty.length > 0 && !filterDifficulty.includes(r.difficulty)) return false;
      if (filterMaxTime > 0 && r.cooking_time_minutes > filterMaxTime) return false;
      if (filterIngredient.trim()) {
        const term = filterIngredient.trim().toLowerCase();
        const match = (r.ingredients ?? []).some((i) =>
          (i.taxonomy_name ?? i.ingredient_name).toLowerCase().includes(term),
        );
        if (!match) return false;
      }
      return true;
    });
  }, [recipes, filterTags, filterDifficulty, filterMaxTime, filterIngredient]);

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
  }
  const isFiltered = filterTags.length > 0 || filterDifficulty.length > 0 || filterMaxTime > 0 || filterIngredient.trim();

  function toggleExpand(id: string, baseServings: number) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      setScaledServings((prev) => ({ ...prev, [id]: prev[id] ?? baseServings }));
    }
  }

  async function handleShare(id: string) {
    setSharing(id);
    try {
      const res = await fetch(`/api/recipes/${id}/share`, { method: "POST" });
      const data = (await res.json()) as { is_published?: boolean; error?: string };
      if (!res.ok) { alert(data.error ?? "Failed to update share status."); return; }
      setRecipes((prev) => prev.map((r) => r.id === id ? { ...r, is_published: data.is_published! } : r));
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
        if (expandedId === id) setExpandedId(null);
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
        if (data.error) setError(data.error);
        else setRecipes(data.recipes ?? []);
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
          <p><Link href="/recipes/create">Create your first recipe</Link></p>
        </div>
      ) : (
        <>
          {/* Filter bar */}
          <div className="filter-section">
            <div className="filter-row">
              <div className="filter-group">
                <span className="filter-label">Dietary Tags</span>
                <div className="chip-group">
                  {DIETARY_TAGS.map((tag) => (
                    <button key={tag.value} type="button"
                      className={`chip${filterTags.includes(tag.value) ? " active" : ""}`}
                      onClick={() => toggleTag(tag.value)}
                    >{tag.label}</button>
                  ))}
                </div>
              </div>
              <div className="filter-group">
                <span className="filter-label">Difficulty</span>
                <div className="chip-group">
                  {DIFFICULTIES.map((d) => (
                    <button key={d} type="button"
                      className={`chip${filterDifficulty.includes(d) ? " active" : ""}`}
                      onClick={() => toggleDifficulty(d)}
                    >{d.charAt(0).toUpperCase() + d.slice(1)}</button>
                  ))}
                </div>
              </div>
              <div className="filter-group">
                <span className="filter-label">Max Cook Time</span>
                <div className="chip-group">
                  {TIME_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button"
                      className={`chip${filterMaxTime === opt.value ? " active" : ""}`}
                      onClick={() => setFilterMaxTime(opt.value)}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>
              <div className="filter-group">
                <span className="filter-label">Ingredient</span>
                <div className="filter-ingredient-row">
                  <span className="filter-ingredient-icon">🔍</span>
                  <input type="text" placeholder="Search by ingredient…" value={filterIngredient}
                    onChange={(e) => setFilterIngredient(e.target.value)}
                    className="filter-ingredient-input"
                  />
                  {filterIngredient && (
                    <button type="button" className="filter-ingredient-clear"
                      onClick={() => setFilterIngredient("")} aria-label="Clear">×</button>
                  )}
                </div>
              </div>
            </div>
            <div className="filter-footer">
              <span className="filter-count">
                {filteredRecipes.length} of {recipes.length} recipe{recipes.length === 1 ? "" : "s"}
              </span>
              {isFiltered && (
                <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {filteredRecipes.length === 0 ? (
            <div className="filter-section"><p>No recipes match the selected filters.</p></div>
          ) : null}

          <div className="my-recipes-grid">
            {filteredRecipes.map((recipe) => {
              const isExpanded = expandedId === recipe.id;
              const currentServings = scaledServings[recipe.id] ?? recipe.servings;
              const scale = currentServings / recipe.servings;

              return (
                <article key={recipe.id} className="filter-section my-recipe-card">

                  {/* ── Summary row ─────────────────────────────── */}
                  <div className="my-recipe-summary" onClick={() => toggleExpand(recipe.id, recipe.servings)}>
                    <div className="my-recipe-summary-main">
                      <div className="my-recipe-heading">
                        <h2 className="my-recipe-title">{recipe.title}</h2>
                        <div className="my-recipe-badges">
                          <span className={difficultyBadgeClass(recipe.difficulty)}>{recipe.difficulty}</span>
                          {userRole === "verified_chef" && recipe.is_published && (
                            <span className="my-recipe-shared-badge">Shared</span>
                          )}
                        </div>
                      </div>
                      <div className="my-recipe-meta">
                        <span className="shared-meta-chip">{recipe.cooking_time_minutes} min</span>
                        <span className="shared-meta-chip">{recipe.servings} servings</span>
                        <span className="shared-meta-chip">{new Date(recipe.created_at).toLocaleDateString()}</span>
                      </div>
                      {recipe.dietary_tags.length > 0 && (
                        <div className="shared-recipe-tags" style={{ marginTop: 6 }}>
                          {recipe.dietary_tags.map((tag) => (
                            <span key={tag} className="tag">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="my-recipe-summary-side" onClick={(e) => e.stopPropagation()}>
                      <div className="my-recipe-actions">
                        {userRole === "verified_chef" && !recipe.is_published && (
                          <button type="button" className="btn btn-secondary"
                            onClick={() => handleShare(recipe.id)} disabled={sharing === recipe.id}>
                            {sharing === recipe.id ? "…" : "Share"}
                          </button>
                        )}
                        <Link href={`/recipes/${recipe.id}/edit`}>
                          <button type="button" className="btn btn-secondary">Edit</button>
                        </Link>
                        <button type="button" className="btn btn-secondary"
                          onClick={() => handleDelete(recipe.id, recipe.title)}
                          disabled={deleting === recipe.id}>
                          {deleting === recipe.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                      {recipe.cover_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={recipe.cover_image_url} alt={recipe.title} className="my-recipe-image" />
                      )}
                    </div>

                    <button type="button" className="my-recipe-expand-btn" aria-label="Toggle details">
                      {isExpanded ? "▲" : "▼"}
                    </button>
                  </div>

                  {/* ── Detail panel ────────────────────────────── */}
                  {isExpanded && (
                    <div className="my-recipe-detail">
                      {recipe.description && (
                        <p className="my-recipe-description">{recipe.description}</p>
                      )}

                      {/* Serving scaler */}
                      {(recipe.ingredients?.length ?? 0) > 0 && (
                        <div className="my-recipe-scaler">
                          <span className="my-recipe-scaler-label">Scale servings</span>
                          <div className="my-recipe-scaler-controls">
                            <button type="button" className="my-scaler-btn"
                              onClick={() => setScaledServings((prev) => ({
                                ...prev, [recipe.id]: Math.max(1, (prev[recipe.id] ?? recipe.servings) - 1),
                              }))}>−</button>
                            <span className="my-scaler-value">{currentServings}</span>
                            <button type="button" className="my-scaler-btn"
                              onClick={() => setScaledServings((prev) => ({
                                ...prev, [recipe.id]: Math.min(100, (prev[recipe.id] ?? recipe.servings) + 1),
                              }))}>+</button>
                            <span className="my-scaler-hint">
                              {scale !== 1 && `(×${scale % 1 === 0 ? scale : scale.toFixed(2)} from ${recipe.servings})`}
                            </span>
                          </div>
                        </div>
                      )}

                      {(recipe.ingredients?.length ?? 0) > 0 && (
                        <div className="my-recipe-panel">
                          <strong className="my-recipe-label">Ingredients</strong>
                          <div className="my-recipe-ingredients">
                            {(recipe.ingredients ?? []).map((ing) => {
                              const qty = ing.quantity * scale;
                              const display = qty % 1 === 0 ? qty : parseFloat(qty.toFixed(2));
                              return (
                                <span key={`${ing.ingredient_name}-${ing.quantity}`} className="my-ingredient-pill">
                                  <span className="my-ingredient-qty">{display} {ing.unit}</span>
                                  {ing.taxonomy_name ?? ing.ingredient_name}
                                </span>
                              );
                            })}
                          </div>
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
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
