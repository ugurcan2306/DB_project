"use client";

import { useEffect, useState, useMemo } from "react";

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

type SharedRecipe = {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  cooking_time_minutes: number;
  servings: number;
  dietary_tags: string[];
  cover_image_url: string | null;
  author_id: string;
  author_name: string;
  author_avg_rating: number | null;
  is_following_author: boolean;
  created_at: string;
  steps: { step_number: number; instruction: string }[];
  ingredients: { ingredient_id: string; alias_id: string | null; ingredient_name: string; taxonomy_name: string; quantity: number; unit: string }[];
};

type MealList = { id: string; name: string };

type RecipeQuote = {
  totalPrice: string;
  canFulfill: boolean;
  suppliersUsed: number;
  shortages: Array<{ ingredientName: string; required: number; available: number; unit: string }>;
  substitutionsUsed?: boolean;
  substitutionNotes?: Array<{ requested: string; usedAlternatives: string[] }>;
};

function difficultyBadgeClass(d: string) {
  if (d === "easy") return "my-diff-badge my-diff-easy";
  if (d === "hard") return "my-diff-badge my-diff-hard";
  return "my-diff-badge my-diff-medium";
}

export function SharedRecipesClient() {
  const [recipes, setRecipes] = useState<SharedRecipe[]>([]);
  const [lists, setLists] = useState<MealList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [scaledServings, setScaledServings] = useState<Record<string, number>>({});

  const [selectedList, setSelectedList] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState<string | null>(null);
  const [addedTo, setAddedTo] = useState<Record<string, string>>({});
  const [buying, setBuying] = useState<string | null>(null);
  const [purchaseInfo, setPurchaseInfo] = useState<Record<string, string>>({});
  const [quotes, setQuotes] = useState<Record<string, RecipeQuote>>({});
  const [followBusy, setFollowBusy] = useState<string | null>(null);

  // Filter state
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterDifficulty, setFilterDifficulty] = useState<string[]>([]);
  const [filterMaxTime, setFilterMaxTime] = useState(0);
  const [filterIngredient, setFilterIngredient] = useState("");
  const [filterMinRating, setFilterMinRating] = useState(0);

  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      if (filterTags.length > 0 && !filterTags.every((t) => r.dietary_tags.includes(t))) return false;
      if (filterDifficulty.length > 0 && !filterDifficulty.includes(r.difficulty)) return false;
      if (filterMaxTime > 0 && r.cooking_time_minutes > filterMaxTime) return false;
      if (filterIngredient.trim()) {
        const term = filterIngredient.trim().toLowerCase();
        if (!r.ingredients.some((i) => (i.taxonomy_name ?? i.ingredient_name).toLowerCase().includes(term))) return false;
      }
      if (filterMinRating > 0) {
        if (r.author_avg_rating == null || r.author_avg_rating < filterMinRating) return false;
      }
      return true;
    });
  }, [recipes, filterTags, filterDifficulty, filterMaxTime, filterIngredient, filterMinRating]);

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

  function toggleRecipe(id: string, baseServings: number) {
    if (expandedRecipeId === id) {
      setExpandedRecipeId(null);
    } else {
      setExpandedRecipeId(id);
      setScaledServings((prev) => ({ ...prev, [id]: prev[id] ?? baseServings }));
    }
  }

  async function toggleFollow(authorId: string, isFollowing: boolean) {
    setFollowBusy(authorId);
    try {
      const res = isFollowing
        ? await fetch(`/api/follows?chefId=${authorId}`, { method: "DELETE" })
        : await fetch("/api/follows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chefId: authorId }),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as { error?: string }));
        alert(data.error ?? "Failed to update follow.");
        return;
      }
      setRecipes((prev) =>
        prev.map((r) => r.author_id === authorId ? { ...r, is_following_author: !isFollowing } : r),
      );
    } finally {
      setFollowBusy(null);
    }
  }


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

  // Initial quote fetch (base quantities) for all recipes
  useEffect(() => {
    if (!recipes.length) return;
    let active = true;
    const loadQuotes = async () => {
      const entries = await Promise.all(
        recipes.map(async (recipe) => {
          const res = await fetch("/api/orders/quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scale: 1,
              ingredients: recipe.ingredients.map((ing) => ({
                ingredientId: ing.ingredient_id,
                aliasId: ing.alias_id,
                ingredientName: ing.taxonomy_name ?? ing.ingredient_name,
                quantity: ing.quantity,
                unit: ing.unit,
              })),
            }),
          });
          const json = (await res.json()) as RecipeQuote;
          return [recipe.id, json] as const;
        }),
      );
      if (!active) return;
      const next: Record<string, RecipeQuote> = {};
      for (const [id, quote] of entries) next[id] = quote;
      setQuotes(next);
    };
    void loadQuotes();
    return () => { active = false; };
  }, [recipes]);

  // Re-fetch quote when serving scale changes for the expanded recipe
  useEffect(() => {
    if (!expandedRecipeId) return;
    const recipe = recipes.find((r) => r.id === expandedRecipeId);
    if (!recipe) return;
    const currentServings = scaledServings[expandedRecipeId] ?? recipe.servings;
    const scale = currentServings / recipe.servings;

    const timer = setTimeout(async () => {
      const res = await fetch("/api/orders/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: recipe.ingredients.map((ing) => ({
            ingredientId: ing.ingredient_id,
            ingredientName: ing.ingredient_name,
            quantity: parseFloat((ing.quantity * scale).toFixed(3)),
            unit: ing.unit,
          })),
        }),
      });
      const json = (await res.json()) as RecipeQuote;
      setQuotes((prev) => ({ ...prev, [expandedRecipeId]: json }));
    }, 400);

    return () => clearTimeout(timer);
  }, [scaledServings, expandedRecipeId, recipes]);

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
      if (!res.ok) { alert(data.error ?? "Failed to add recipe."); return; }
      const list = lists.find((l) => l.id === listId);
      setAddedTo((prev) => ({ ...prev, [recipeId]: list?.name ?? "your list" }));
    } finally {
      setAdding(null);
    }
  }

  async function handleShopThisMeal(recipe: SharedRecipe, scale: number) {
    setBuying(recipe.id);
    try {
      const res = await fetch("/api/orders/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          scale,
          ingredients: recipe.ingredients.map((ing) => ({
            ingredientId: ing.ingredient_id,
            ingredientName: ing.ingredient_name,
            quantity: parseFloat((ing.quantity * scale).toFixed(3)),
            unit: ing.unit,
          })),
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        shortages?: Array<{ ingredientName: string; required: number; available: number; unit: string }>;
        totalPrice?: string;
        remainingBalance?: string;
      };
      if (!res.ok) {
        if (json.shortages?.length) {
          alert(`Cannot complete purchase.\n${json.shortages
            .map((s) => `${s.ingredientName}: required ${s.required} ${s.unit}, available ${s.available} ${s.unit}`)
            .join("\n")}`);
        } else {
          alert(json.error ?? "Could not process checkout.");
        }
        return;
      }
      setPurchaseInfo((prev) => ({
        ...prev,
        [recipe.id]: `Purchased for $${json.totalPrice}. Remaining balance: $${json.remainingBalance}`,
      }));
    } finally {
      setBuying(null);
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
      {/* Filter bar */}
      <div className="filter-section" style={{ marginBottom: "1.5rem" }}>
        <div className="filter-row">
          <div className="filter-group">
            <span className="filter-label">Dietary Tags</span>
            <div className="chip-group">
              {DIETARY_TAGS.map((tag) => (
                <button key={tag.value} type="button"
                  className={`chip${filterTags.includes(tag.value) ? " active" : ""}`}
                  onClick={() => toggleTag(tag.value)}>{tag.label}</button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-label">Difficulty</span>
            <div className="chip-group">
              {DIFFICULTIES.map((d) => (
                <button key={d} type="button"
                  className={`chip${filterDifficulty.includes(d) ? " active" : ""}`}
                  onClick={() => toggleDifficulty(d)}>{d.charAt(0).toUpperCase() + d.slice(1)}</button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-label">Max Cook Time</span>
            <div className="chip-group">
              {TIME_OPTIONS.map((opt) => (
                <button key={opt.value} type="button"
                  className={`chip${filterMaxTime === opt.value ? " active" : ""}`}
                  onClick={() => setFilterMaxTime(opt.value)}>{opt.label}</button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-label">Min Chef Rating</span>
            <div className="chip-group">
              {RATING_OPTIONS.map((opt) => (
                <button key={opt.value} type="button"
                  className={`chip${filterMinRating === opt.value ? " active" : ""}`}
                  onClick={() => setFilterMinRating(opt.value)}>{opt.label}</button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-label">Ingredient</span>
            <div className="filter-ingredient-row">
              <span className="filter-ingredient-icon">🔍</span>
              <input type="text" placeholder="Search by ingredient…" value={filterIngredient}
                onChange={(e) => setFilterIngredient(e.target.value)}
                className="filter-ingredient-input" />
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
      ) : (
        <div className="shared-recipes-grid">
          {filteredRecipes.map((recipe) => {
            const isExpanded = expandedRecipeId === recipe.id;
            const currentServings = scaledServings[recipe.id] ?? recipe.servings;
            const scale = currentServings / recipe.servings;
            const quote = quotes[recipe.id];

            return (
              <article key={recipe.id} className="filter-section my-recipe-card">

                {/* ── Summary row ──────────────────────────────── */}
                <div className="my-recipe-summary" onClick={() => toggleRecipe(recipe.id, recipe.servings)}>
                  <div className="my-recipe-summary-main">
                    <div className="my-recipe-heading">
                      <h2 className="my-recipe-title">{recipe.title}</h2>
                      <div className="my-recipe-badges">
                        <span className={difficultyBadgeClass(recipe.difficulty)}>{recipe.difficulty}</span>
                      </div>
                    </div>

                    <p className="shared-recipe-author" style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0" }}
                      onClick={(e) => e.stopPropagation()}>
                      <span>By {recipe.author_name}</span>
                      {recipe.author_avg_rating != null && (
                        <span className="shared-chef-rating">★ {recipe.author_avg_rating}</span>
                      )}
                      <button type="button"
                        className={recipe.is_following_author ? "btn btn-secondary" : "btn btn-primary"}
                        style={{ padding: "2px 10px", fontSize: "0.72rem" }}
                        onClick={() => toggleFollow(recipe.author_id, recipe.is_following_author)}
                        disabled={followBusy === recipe.author_id}>
                        {followBusy === recipe.author_id ? "…" : recipe.is_following_author ? "Following" : "+ Follow"}
                      </button>
                    </p>

                    <div className="my-recipe-meta">
                      <span className="shared-meta-chip">{recipe.cooking_time_minutes} min</span>
                      <span className="shared-meta-chip">{recipe.servings} servings</span>
                      <span className="shared-meta-chip">{new Date(recipe.created_at).toLocaleDateString()}</span>
                    </div>

                    {recipe.dietary_tags.length > 0 && (
                      <div className="shared-recipe-tags" style={{ marginTop: 6 }}>
                        {recipe.dietary_tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
                      </div>
                    )}

                    {/* Price / stock summary always visible */}
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
                      onClick={(e) => e.stopPropagation()}>
                      {!quote ? (
                        <span className="shared-recipe-muted">Calculating price…</span>
                      ) : quote.canFulfill ? (
                        <span className="shared-recipe-price">
                          Est. ${quote.totalPrice} · {quote.suppliersUsed} supplier{quote.suppliersUsed === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.78rem", color: "#b71c1c", fontWeight: 600 }}>Not enough stock</span>
                      )}
                      {purchaseInfo[recipe.id] && (
                        <span className="shared-recipe-success">{purchaseInfo[recipe.id]}</span>
                      )}
                    </div>
                  </div>

                  <div className="my-recipe-summary-side" onClick={(e) => e.stopPropagation()}>
                    {recipe.cover_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={recipe.cover_image_url} alt={recipe.title} className="my-recipe-image" />
                    )}
                    <div className="my-recipe-actions">
                      <button type="button" className="btn btn-primary"
                        onClick={() => handleShopThisMeal(recipe, scale)}
                        disabled={buying === recipe.id || quote?.canFulfill === false}>
                        {buying === recipe.id ? "Processing…" : "Shop This Meal"}
                      </button>
                    </div>
                  </div>

                  <button type="button" className="my-recipe-expand-btn" aria-label="Toggle details">
                    {isExpanded ? "▲" : "▼"}
                  </button>
                </div>

                {/* ── Detail panel ──────────────────────────────── */}
                {isExpanded && (
                  <div className="my-recipe-detail">
                    {recipe.description && (
                      <p className="my-recipe-description">{recipe.description}</p>
                    )}

                    {recipe.ingredients?.length > 0 && (
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

                    <div className="shared-recipe-columns">
                      {recipe.ingredients?.length > 0 && (
                        <div className="shared-recipe-panel">
                          <strong className="shared-recipe-label">Ingredients</strong>
                          <div className="my-recipe-ingredients" style={{ marginTop: 8 }}>
                            {recipe.ingredients.map((ing) => {
                              const qty = ing.quantity * scale;
                              const display = qty % 1 === 0 ? qty : parseFloat(qty.toFixed(2));
                              return (
                                <span key={ing.ingredient_name} className="my-ingredient-pill">
                                  <span className="my-ingredient-qty">{display} {ing.unit}</span>
                                  {ing.taxonomy_name}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {recipe.steps?.length > 0 && (
                        <div className="shared-recipe-panel">
                          <strong className="shared-recipe-label">Instructions</strong>
                          <ol className="shared-recipe-list">
                            {recipe.steps.map((step) => (
                              <li key={step.step_number} className="shared-recipe-list-item">
                                {step.instruction}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>

                    {/* Substitution note */}
                    {quote?.canFulfill && quote?.substitutionsUsed && (
                      <p className="shared-substitution-note">
                        Disclaimer: exact taxonomy stock is partially unavailable. Substitutions for:{" "}
                        {(quote.substitutionNotes ?? []).map((n) => `${n.requested} → ${n.usedAlternatives.join(", ")}`).join(" | ")}
                      </p>
                    )}

                    {/* Shortage detail */}
                    {quote && !quote.canFulfill && (
                      <p className="error-text shared-shortage-note">
                        Not enough stock. Missing:{" "}
                        {quote.shortages.map((s) => `${s.ingredientName} (${s.available}/${s.required} ${s.unit})`).join(", ")}
                      </p>
                    )}

                    {/* Add to list */}
                    {lists.length === 0 ? (
                      <p className="shared-recipe-muted">Create a meal list first to save this recipe.</p>
                    ) : addedTo[recipe.id] ? (
                      <p className="shared-recipe-success">Added to &quot;{addedTo[recipe.id]}&quot;</p>
                    ) : (
                      <div className="shared-recipe-list-actions">
                        <select className="supplier-select shared-list-select"
                          value={selectedList[recipe.id] ?? ""}
                          onChange={(e) => setSelectedList((prev) => ({ ...prev, [recipe.id]: e.target.value }))}>
                          <option value="">— add to list —</option>
                          {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <button type="button" className="btn btn-secondary"
                          onClick={() => handleAddToList(recipe.id)}
                          disabled={adding === recipe.id || !selectedList[recipe.id]}>
                          {adding === recipe.id ? "Adding…" : "+ Add to List"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
