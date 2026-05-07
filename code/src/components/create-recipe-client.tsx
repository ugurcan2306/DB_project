"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Ingredient = {
  id: string;
  ingredient_name: string;
  category_name: string | null;
};

type IngredientRow = {
  ingredientId: string;
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

const UNITS = ["g", "kg", "ml", "l", "cup", "tbsp", "tsp", "piece", "slice", "unit", "oz", "lb", "clove", "pinch"];

export function CreateRecipeClient() {
  const router = useRouter();

  // Metadata state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState("2");
  const [cookingTime, setCookingTime] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [coverImageUrl, setCoverImageUrl] = useState("");

  // Ingredients state
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
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

  useEffect(() => {
    fetch("/api/ingredients")
      .then((r) => r.json())
      .then((data: { ingredients?: Ingredient[] }) => {
        setAvailableIngredients(data.ingredients ?? []);
        if (data.ingredients?.length) setSelectedIngredientId(data.ingredients[0].id);
      })
      .catch(() => setError("Failed to load ingredients."))
      .finally(() => setIngredientsLoading(false));
  }, []);

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
    if (addedIngredients.some((i) => i.ingredientId === selectedIngredientId)) {
      setError("That ingredient is already added.");
      return;
    }
    const found = availableIngredients.find((i) => i.id === selectedIngredientId);
    if (!found) return;
    setError("");
    setAddedIngredients((prev) => [
      ...prev,
      { ingredientId: found.id, ingredientName: found.ingredient_name, quantity: ingredientQty, unit: ingredientUnit },
    ]);
    setIngredientQty("");
  }

  function removeIngredient(id: string) {
    setAddedIngredients((prev) => prev.filter((i) => i.ingredientId !== id));
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
              <select
                value={selectedIngredientId}
                onChange={(e) => setSelectedIngredientId(e.target.value)}
                className="supplier-select"
              >
                {availableIngredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.ingredient_name}
                    {ing.category_name ? ` (${ing.category_name})` : ""}
                  </option>
                ))}
              </select>
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
                  <tr key={ing.ingredientId}>
                    <td>{ing.ingredientName}</td>
                    <td>{ing.quantity}</td>
                    <td>{ing.unit}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary supplier-action-btn"
                        onClick={() => removeIngredient(ing.ingredientId)}
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
