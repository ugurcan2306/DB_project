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
  author_id: string;
  author_name: string;
  is_following_author: boolean;
  created_at: string;
  steps: { step_number: number; instruction: string }[];
  ingredients: { ingredient_id: string; alias_id: string | null; ingredient_name: string; taxonomy_name: string; quantity: number; unit: string }[];
};

type MealList = {
  id: string;
  name: string;
};

type RecipeQuote = {
  totalPrice: string;
  canFulfill: boolean;
  suppliersUsed: number;
  shortages: Array<{ ingredientName: string; required: number; available: number; unit: string }>;
  substitutionsUsed?: boolean;
  substitutionNotes?: Array<{ requested: string; usedAlternatives: string[] }>;
};

function difficultyClass(level: string) {
  if (level === "easy") return "shared-pill shared-pill-easy";
  if (level === "hard") return "shared-pill shared-pill-hard";
  return "shared-pill shared-pill-medium";
}

export function SharedRecipesClient() {
  const [recipes, setRecipes] = useState<SharedRecipe[]>([]);
  const [lists, setLists] = useState<MealList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // per-recipe selected list id
  const [selectedList, setSelectedList] = useState<Record<string, string>>({});
  const [desiredServings, setDesiredServings] = useState<Record<string, number>>({});
  const [adding, setAdding] = useState<string | null>(null);
  const [addedTo, setAddedTo] = useState<Record<string, string>>({});  // recipeId → list name
  const [buying, setBuying] = useState<string | null>(null);
  const [purchaseInfo, setPurchaseInfo] = useState<Record<string, string>>({});
  const [quotes, setQuotes] = useState<Record<string, RecipeQuote>>({});
  const [followBusy, setFollowBusy] = useState<string | null>(null);

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
        prev.map((r) => (r.author_id === authorId ? { ...r, is_following_author: !isFollowing } : r)),
      );
    } finally {
      setFollowBusy(null);
    }
  }

  async function refetchQuote(recipe: SharedRecipe, ds: number) {
    const scale = ds / (recipe.servings || 1);
    const res = await fetch("/api/orders/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scale,
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
    setQuotes((prev) => ({ ...prev, [recipe.id]: json }));
  }

  function handleServingsChange(recipe: SharedRecipe, val: string) {
    const ds = parseInt(val, 10);
    if (isNaN(ds) || ds < 1) return;
    setDesiredServings((prev) => ({ ...prev, [recipe.id]: ds }));
    void refetchQuote(recipe, ds);
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
    return () => {
      active = false;
    };
  }, [recipes]);

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

  async function handleShopThisMeal(recipe: SharedRecipe) {
    const ds = desiredServings[recipe.id] ?? recipe.servings;
    const scale = ds / (recipe.servings || 1);
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
            quantity: ing.quantity,
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
          alert(
            `Cannot complete purchase.\n${json.shortages
              .map((s) => `${s.ingredientName}: required ${s.required} ${s.unit}, available ${s.available} ${s.unit}`)
              .join("\n")}`,
          );
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
    <div className="shared-recipes-grid">
      {recipes.map((recipe) => (
        <article key={recipe.id} className="filter-section shared-recipe-card">
          <div className="shared-recipe-top">
            <div className="shared-recipe-main">
              <div className="shared-recipe-heading">
                <h2 className="shared-recipe-title">{recipe.title}</h2>
                <span className={difficultyClass(recipe.difficulty)}>{recipe.difficulty}</span>
              </div>
              <p
                className="shared-recipe-author"
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <span>By {recipe.author_name}</span>
                <button
                  type="button"
                  className={recipe.is_following_author ? "btn btn-secondary" : "btn btn-primary"}
                  style={{ padding: "2px 10px", fontSize: "0.72rem" }}
                  onClick={() => toggleFollow(recipe.author_id, recipe.is_following_author)}
                  disabled={followBusy === recipe.author_id}
                >
                  {followBusy === recipe.author_id
                    ? "…"
                    : recipe.is_following_author
                      ? "Following"
                      : "+ Follow"}
                </button>
              </p>
              {recipe.description ? <p className="shared-recipe-description">{recipe.description}</p> : null}
              <div className="shared-recipe-meta">
                <span className="shared-meta-chip">{recipe.cooking_time_minutes} min</span>
                <span className="shared-meta-chip">{recipe.servings} servings</span>
                <span className="shared-meta-chip">{new Date(recipe.created_at).toLocaleDateString()}</span>
              </div>
              {recipe.dietary_tags.length > 0 ? (
                <div className="shared-recipe-tags">
                  {recipe.dietary_tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="shared-recipe-columns">
                {recipe.ingredients?.length > 0 && (
                  <div className="shared-recipe-section shared-recipe-panel">
                    <strong className="shared-recipe-label">Ingredients</strong>
                    <ul className="shared-recipe-list">
                      {recipe.ingredients.map((ing) => (
                        <li key={ing.ingredient_name} className="shared-recipe-list-item">
                          <span className="shared-qty">{ing.quantity} {ing.unit}</span>
                          <span>{ing.taxonomy_name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {recipe.steps?.length > 0 && (
                  <div className="shared-recipe-section shared-recipe-panel">
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

              <div className="shared-recipe-actions" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <label htmlFor={`servings-${recipe.id}`} style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Servings:
                  </label>
                  <input
                    id={`servings-${recipe.id}`}
                    type="number"
                    min="1"
                    className="form-input"
                    style={{ width: "60px", padding: "4px" }}
                    value={desiredServings[recipe.id] ?? recipe.servings}
                    onChange={(e) => handleServingsChange(recipe, e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary shared-buy-btn"
                  onClick={() => handleShopThisMeal(recipe)}
                  disabled={buying === recipe.id || quotes[recipe.id]?.canFulfill === false}
                >
                  {buying === recipe.id ? "Processing..." : "Shop This Meal"}
                </button>
                {quotes[recipe.id] ? (
                  <span className="shared-recipe-price">
                    Estimated: ${quotes[recipe.id].totalPrice} · {quotes[recipe.id].suppliersUsed} supplier
                    {quotes[recipe.id].suppliersUsed === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span className="shared-recipe-muted">Calculating price…</span>
                )}
                {purchaseInfo[recipe.id] ? (
                  <span className="shared-recipe-success">{purchaseInfo[recipe.id]}</span>
                ) : null}
              </div>
              {quotes[recipe.id] && !quotes[recipe.id].canFulfill ? (
                <p className="error-text shared-shortage-note">
                  Not enough stock for this recipe right now. Missing:{" "}
                  {quotes[recipe.id].shortages
                    .map((s) => `${s.ingredientName} (${s.available}/${s.required} ${s.unit})`)
                    .join(", ")}
                </p>
              ) : null}
              {quotes[recipe.id]?.canFulfill && quotes[recipe.id]?.substitutionsUsed ? (
                <p className="shared-substitution-note">
                  Disclaimer: exact taxonomy stock is partially unavailable. We will use same-category substitutions for:{" "}
                  {(quotes[recipe.id].substitutionNotes ?? [])
                    .map((n) => `${n.requested} -> ${n.usedAlternatives.join(", ")}`)
                    .join(" | ")}
                </p>
              ) : null}

              {/* Add to list controls */}
              {lists.length === 0 ? (
                <p className="shared-recipe-muted">
                  Create a meal list first to save this recipe.
                </p>
              ) : addedTo[recipe.id] ? (
                <p className="shared-recipe-success">
                  Added to &quot;{addedTo[recipe.id]}&quot;
                </p>
              ) : (
                <div className="shared-recipe-list-actions">
                  <select
                    className="supplier-select shared-list-select"
                    value={selectedList[recipe.id] ?? ""}
                    onChange={(e) =>
                      setSelectedList((prev) => ({ ...prev, [recipe.id]: e.target.value }))
                    }
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
                className="shared-recipe-image"
              />
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
