"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Ingredient = {
  id: string;
  ingredient_name: string;
  category_name: string | null;
};

type IngredientAlias = {
  id: string;
  alias_name: string;
  canonical_ingredient_id: string;
  canonical_name: string;
};

type IngredientOption = {
  value: string; // unique option id (alias/canonical)
  ingredientId: string; // canonical ingredient id
  aliasId: string | null;
  label: string; // taxonomy display label
};

type IngredientRow = {
  ingredientId: string;
  aliasId: string | null;
  ingredientName: string;
  quantity: string;
  unit: string;
};

type StepRow = {
  instruction: string;
};

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

const UNITS = ["kg", "g", "ml", "L"];

export function CreateRecipeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceRecipeId = searchParams.get("from");

  // Metadata state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState("2");
  const [cookingTime, setCookingTime] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [coverImageUrl, setCoverImageUrl] = useState("");

  // Ingredients state
  const [availableIngredients, setAvailableIngredients] = useState<IngredientOption[]>([]);
  const [ingredientsLoading, setIngredientsLoading] = useState(true);
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [ingredientQty, setIngredientQty] = useState("");
  const [ingredientUnit, setIngredientUnit] = useState("g");
  const [addedIngredients, setAddedIngredients] = useState<IngredientRow[]>([]);

  // Steps state
  const [currentStep, setCurrentStep] = useState("");
  const [steps, setSteps] = useState<StepRow[]>([]);

  // Form state
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [prefillNote, setPrefillNote] = useState<string | null>(null);
  const [prefillLoading, setPrefillLoading] = useState(Boolean(sourceRecipeId));

  // Ingredient picker UX
  const [ingredientSearch, setIngredientSearch] = useState("");
  const filteredIngredients = useMemo(() => {
    const q = ingredientSearch.trim().toLowerCase();
    if (!q) return availableIngredients;
    return availableIngredients.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [availableIngredients, ingredientSearch]);

  useEffect(() => {
    Promise.all([
      fetch("/api/ingredients").then((r) => r.json()),
      fetch("/api/ingredient-aliases").then((r) => r.json()),
    ])
      .then(([ingredientData, aliasData]: [
        { ingredients?: Ingredient[] },
        { aliases?: IngredientAlias[] },
      ]) => {
        const options: IngredientOption[] = [];
        const aliases = aliasData.aliases ?? [];
        const canonicals = ingredientData.ingredients ?? [];

        if (aliases.length > 0) {
          for (const alias of aliases) {
            options.push({
              value: `alias:${alias.id}`,
              ingredientId: alias.canonical_ingredient_id,
              aliasId: alias.id,
              label: `${alias.alias_name} (${alias.canonical_name})`,
            });
          }
        } else {
          for (const ingredient of canonicals) {
            options.push({
              value: `ingredient:${ingredient.id}`,
              ingredientId: ingredient.id,
              aliasId: null,
              label: ingredient.category_name
                ? `${ingredient.ingredient_name} (${ingredient.category_name})`
                : ingredient.ingredient_name,
            });
          }
        }

        setAvailableIngredients(options);
        if (options.length) setSelectedIngredientId(options[0].value);
      })
      .catch(() => setError("Failed to load ingredients."))
      .finally(() => setIngredientsLoading(false));
  }, []);

  // Pre-fill the form when arriving from "Use this Recipe" (?from=<id>)
  useEffect(() => {
    if (!sourceRecipeId || ingredientsLoading) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/recipes/${sourceRecipeId}/public`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Failed to load source recipe.");
          return;
        }
        const r = data.recipe as {
          title: string;
          description: string | null;
          servings: number;
          cooking_time_minutes: number;
          difficulty: string;
          dietary_tags: string[];
          cover_image_url: string | null;
          author_name: string;
        };
        const srcIngredients = data.ingredients as {
          ingredient_id: string;
          ingredient_name: string;
          quantity: number;
          unit: string;
        }[];
        const srcSteps = data.steps as { step_number: number; instruction: string }[];

        setTitle(`${r.title} (my version)`);
        setDescription(
          r.description
            ? `${r.description}\n\nAdapted from ${r.author_name}'s original recipe.`
            : `Adapted from ${r.author_name}'s original recipe.`,
        );
        setServings(String(r.servings));
        setCookingTime(String(r.cooking_time_minutes));
        setDifficulty(r.difficulty);
        setDietaryTags(r.dietary_tags ?? []);
        setCoverImageUrl(r.cover_image_url ?? "");
        setAddedIngredients(
          srcIngredients.map((ing) => ({
            ingredientId: ing.ingredient_id,
            aliasId: null,
            ingredientName: ing.ingredient_name,
            quantity: String(ing.quantity),
            unit: ing.unit,
          })),
        );
        setSteps(
          srcSteps
            .sort((a, b) => a.step_number - b.step_number)
            .map((s) => ({ instruction: s.instruction })),
        );
        setPrefillNote(`Pre-filled from "${r.title}" by ${r.author_name}. Tweak anything below before publishing.`);
      } catch {
        if (!cancelled) setError("Failed to load source recipe.");
      } finally {
        if (!cancelled) setPrefillLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sourceRecipeId, ingredientsLoading]);

  function toggleTag(value: string) {
    setDietaryTags((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  }

  function addIngredient() {
    if (!selectedIngredientId) return;
    const qty = parseFloat(ingredientQty);
    if (!ingredientQty || isNaN(qty) || qty <= 0) {
      setError("Please enter a valid quantity.");
      return;
    }
    const found = availableIngredients.find((i) => i.value === selectedIngredientId);
    if (!found) return;
    if (addedIngredients.some((i) => i.ingredientId === found.ingredientId && i.aliasId === found.aliasId)) {
      setError("That ingredient is already added.");
      return;
    }
    setError("");
    setAddedIngredients((prev) => [
      ...prev,
      {
        ingredientId: found.ingredientId,
        aliasId: found.aliasId,
        ingredientName: found.label,
        quantity: ingredientQty,
        unit: ingredientUnit,
      },
    ]);
    setIngredientQty("");
  }

  function removeIngredient(ingredientId: string, aliasId: string | null) {
    setAddedIngredients((prev) => prev.filter((i) => !(i.ingredientId === ingredientId && i.aliasId === aliasId)));
  }

  function addStep() {
    if (!currentStep.trim()) return;
    setSteps((prev) => [...prev, { instruction: currentStep.trim() }]);
    setCurrentStep("");
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function moveStep(index: number, direction: "up" | "down") {
    const next = [...steps];
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setSteps(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) return setError("Title is required.");
    if (!cookingTime || parseInt(cookingTime) <= 0) return setError("Cooking time is required.");
    if (!servings || parseInt(servings) <= 0) return setError("Servings must be at least 1.");
    if (!addedIngredients.length) return setError("Add at least one ingredient.");
    if (!steps.length) return setError("Add at least one preparation step.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          servings: parseInt(servings),
          cookingTimeMinutes: parseInt(cookingTime),
          difficulty,
          dietaryTags,
          coverImageUrl: coverImageUrl.trim() || undefined,
          steps,
          ingredients: addedIngredients.map((i) => ({
            ingredientId: i.ingredientId,
            aliasId: i.aliasId,
            quantity: parseFloat(i.quantity),
            unit: i.unit,
          })),
        }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string; recipeId?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to create recipe.");
        return;
      }

      router.push("/recipes/my");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="recipe-form-layout">
      {prefillLoading && (
        <div
          className="filter-section"
          style={{ background: "#fff8f2", borderColor: "#f0d4b4", textAlign: "center" }}
        >
          <p style={{ margin: 0, color: "#b85a1f", fontWeight: 600 }}>
            Loading source recipe — pre-filling the form…
          </p>
        </div>
      )}
      {prefillNote && !prefillLoading && (
        <div
          className="filter-section"
          style={{
            background: "linear-gradient(135deg,#fff8f2,#fdebd9)",
            borderColor: "#f0d4b4",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div>
            <strong style={{ color: "#b85a1f" }}>📋 Pre-filled</strong>{" "}
            <span style={{ color: "#555" }}>{prefillNote}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: "4px 10px", fontSize: "0.78rem" }}
            onClick={() => setPrefillNote(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Section 1: Metadata ── */}
      <section className="filter-section">
        <h2 className="recipe-section-title">Recipe Details</h2>

        <div className="form-group auth-field">
          <label htmlFor="recipe-title">Title *</label>
          <input
            id="recipe-title"
            type="text"
            placeholder="e.g. Creamy Tuscan Pasta"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
          />
        </div>

        <div className="form-group auth-field">
          <label htmlFor="recipe-desc">Description</label>
          <textarea
            id="recipe-desc"
            rows={3}
            placeholder="A short description of your recipe..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ resize: "vertical" }}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="recipe-servings">Servings *</label>
            <input
              id="recipe-servings"
              type="number"
              min={1}
              max={100}
              placeholder="2"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="recipe-time">Cooking Time (minutes) *</label>
            <input
              id="recipe-time"
              type="number"
              min={1}
              max={1440}
              placeholder="30"
              value={cookingTime}
              onChange={(e) => setCookingTime(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group auth-field">
          <label>Difficulty *</label>
          <div className="chip-group">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={`chip ${difficulty === d ? "active" : ""}`}
                onClick={() => setDifficulty(d)}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group auth-field">
          <label>Dietary Tags</label>
          <div className="chip-group">
            {DIETARY_TAGS.map((tag) => (
              <button
                key={tag.value}
                type="button"
                className={`chip ${dietaryTags.includes(tag.value) ? "active" : ""}`}
                onClick={() => toggleTag(tag.value)}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group auth-field">
          <label htmlFor="recipe-cover">Cover Image URL</label>
          <input
            id="recipe-cover"
            type="url"
            placeholder="https://example.com/image.jpg"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
          />
        </div>
      </section>

      {/* ── Section 2: Ingredients (Taxonomy) ── */}
      <section className="filter-section">
        <h2 className="recipe-section-title">Ingredients</h2>
        <p className="recipe-section-hint">
          Select from standardized ingredients to ensure proper supplier matching.
        </p>

        <div className="recipe-ingredient-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label>Ingredient *</label>
            {ingredientsLoading ? (
              <p className="recipe-loading">Loading ingredients…</p>
            ) : (
              <>
                <input
                  type="search"
                  className="supplier-input"
                  placeholder="Search ingredients (e.g. tomato, rice)…"
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  style={{ marginBottom: 6 }}
                />
                <div
                  style={{
                    maxHeight: 160,
                    overflowY: "auto",
                    border: "1px solid #e6dccd",
                    borderRadius: 6,
                    background: "#fff",
                  }}
                >
                  {filteredIngredients.length === 0 ? (
                    <p style={{ padding: "8px 12px", margin: 0, color: "#888", fontSize: "0.85rem" }}>
                      No ingredients match &ldquo;{ingredientSearch}&rdquo;.
                    </p>
                  ) : (
                    filteredIngredients.map((opt) => {
                      const alreadyAdded = addedIngredients.some(
                        (a) => a.ingredientId === opt.ingredientId && a.aliasId === opt.aliasId,
                      );
                      const selected = selectedIngredientId === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSelectedIngredientId(opt.value)}
                          disabled={alreadyAdded}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                            padding: "6px 10px",
                            background: selected ? "#fff0e3" : "transparent",
                            border: "none",
                            borderBottom: "1px solid #f5ece0",
                            cursor: alreadyAdded ? "not-allowed" : "pointer",
                            color: alreadyAdded ? "#aaa" : "#333",
                            fontSize: "0.88rem",
                            textAlign: "left",
                          }}
                        >
                          <span>{opt.label}</span>
                          {alreadyAdded && (
                            <span style={{ color: "#27ae60", fontSize: "0.72rem" }}>✓ added</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Quantity *</label>
            <input
              type="number"
              min={0.001}
              step={0.001}
              placeholder="200"
              value={ingredientQty}
              onChange={(e) => setIngredientQty(e.target.value)}
              className="supplier-input"
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Unit *</label>
            <select
              value={ingredientUnit}
              onChange={(e) => setIngredientUnit(e.target.value)}
              className="supplier-select"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="form-group recipe-add-btn-wrap">
            <label>&nbsp;</label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={addIngredient}
              disabled={ingredientsLoading || !availableIngredients.length}
            >
              + Add
            </button>
          </div>
        </div>

        {addedIngredients.length > 0 && (
          <div className="recipe-list-wrap">
            <table className="supplier-table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {addedIngredients.map((ing) => (
                  <tr key={`${ing.ingredientId}-${ing.aliasId ?? "canonical"}`}>
                    <td>{ing.ingredientName}</td>
                    <td>{ing.quantity}</td>
                    <td>{ing.unit}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary supplier-action-btn"
                        onClick={() => removeIngredient(ing.ingredientId, ing.aliasId)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {availableIngredients.length === 0 && !ingredientsLoading && (
          <p className="recipe-empty-hint">
            No ingredients in the system yet. Ask an admin to add ingredients first.
          </p>
        )}
      </section>

      {/* ── Section 3: Preparation Steps ── */}
      <section className="filter-section">
        <h2 className="recipe-section-title">Preparation Steps</h2>

        <div className="recipe-step-input-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label htmlFor="step-input">Step instruction *</label>
            <textarea
              id="step-input"
              rows={2}
              placeholder="e.g. Bring a large pot of salted water to a boil..."
              value={currentStep}
              onChange={(e) => setCurrentStep(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  addStep();
                }
              }}
              style={{ resize: "vertical" }}
            />
          </div>
          <div className="form-group recipe-add-btn-wrap">
            <label>&nbsp;</label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={addStep}
              disabled={!currentStep.trim()}
            >
              + Add Step
            </button>
          </div>
        </div>

        {steps.length > 0 && (
          <ol className="recipe-steps-list">
            {steps.map((step, i) => (
              <li key={i} className="recipe-step-item">
                <span className="recipe-step-num">{i + 1}</span>
                <span className="recipe-step-text">{step.instruction}</span>
                <div className="recipe-step-actions">
                  <button
                    type="button"
                    className="btn btn-secondary supplier-action-btn"
                    onClick={() => moveStep(i, "up")}
                    disabled={i === 0}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary supplier-action-btn"
                    onClick={() => moveStep(i, "down")}
                    disabled={i === steps.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary supplier-action-btn"
                    onClick={() => removeStep(i)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ── Submit ── */}
      {error && <p className="error-text">{error}</p>}
      <div className="recipe-submit-row">
        <button
          type="submit"
          className="btn btn-primary btn-large"
          disabled={submitting}
        >
          {submitting ? "Publishing…" : "Publish Recipe"}
        </button>
      </div>
    </form>
  );
}
