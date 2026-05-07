"use client";

import { useEffect, useState } from "react";

type Category = { id: string; category_name: string };
type Ingredient = { id: string; ingredient_name: string; category_id: string | null; category_name: string | null };
type Alias = { id: string; alias_name: string; canonical_ingredient_id: string; canonical_name: string };

export function AdminTaxonomyClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);

  const [newCategory, setNewCategory] = useState("");
  const [newIngredient, setNewIngredient] = useState("");
  const [newIngredientCategory, setNewIngredientCategory] = useState("");
  const [newAliasName, setNewAliasName] = useState("");
  const [newAliasTarget, setNewAliasTarget] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    const [catRes, ingRes, aliasRes] = await Promise.all([
      fetch("/api/admin/ingredient-categories"),
      fetch("/api/admin/ingredients"),
      fetch("/api/admin/ingredient-aliases"),
    ]);
    const catData = (await catRes.json()) as { categories?: Category[] };
    const ingData = (await ingRes.json()) as { ingredients?: Ingredient[] };
    const aliasData = (await aliasRes.json()) as { aliases?: Alias[] };
    setCategories(catData.categories ?? []);
    setIngredients(ingData.ingredients ?? []);
    setAliases(aliasData.aliases ?? []);
  }

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const [catRes, ingRes, aliasRes] = await Promise.all([
          fetch("/api/admin/ingredient-categories"),
          fetch("/api/admin/ingredients"),
          fetch("/api/admin/ingredient-aliases"),
        ]);
        const catData = (await catRes.json()) as { categories?: Category[] };
        const ingData = (await ingRes.json()) as { ingredients?: Ingredient[] };
        const aliasData = (await aliasRes.json()) as { aliases?: Alias[] };
        if (!active) return;
        setCategories(catData.categories ?? []);
        setIngredients(ingData.ingredients ?? []);
        setAliases(aliasData.aliases ?? []);
      } catch {
        if (active) {
          setError("Failed to load taxonomy data.");
        }
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, []);

  function notify(msg: string) { setMessage(msg); setError(null); }
  function fail(msg: string) { setError(msg); setMessage(null); }

  async function addCategory() {
    if (!newCategory.trim()) { fail("Enter a category name."); return; }
    const res = await fetch("/api/admin/ingredient-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category_name: newCategory }),
    });
    if (!res.ok) { fail("Could not add category."); return; }
    notify(`Category "${newCategory}" saved.`);
    setNewCategory("");
    await loadAll();
  }

  async function addIngredient() {
    if (!newIngredient.trim()) { fail("Enter an ingredient name."); return; }
    const res = await fetch("/api/admin/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredient_name: newIngredient,
        category_id: newIngredientCategory || null,
      }),
    });
    if (!res.ok) { fail("Could not add ingredient."); return; }
    notify(`Ingredient "${newIngredient}" saved.`);
    setNewIngredient("");
    setNewIngredientCategory("");
    await loadAll();
  }

  async function addAlias() {
    if (!newAliasName.trim() || !newAliasTarget) { fail("Fill in both alias name and canonical ingredient."); return; }
    const res = await fetch("/api/admin/ingredient-aliases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alias_name: newAliasName, canonical_ingredient_id: newAliasTarget }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      fail(data.error ?? "Could not add alias.");
      return;
    }
    notify(`Alias "${newAliasName}" mapped.`);
    setNewAliasName("");
    setNewAliasTarget("");
    await loadAll();
  }

  async function deleteAlias(id: string, name: string) {
    const res = await fetch("/api/admin/ingredient-aliases", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { fail("Could not delete alias."); return; }
    notify(`Alias "${name}" removed.`);
    await loadAll();
  }

  return (
    <div className="admin-layout">
      {/* Categories */}
      <section className="filter-section">
        <h2 className="dashboard-title">Ingredient Categories</h2>
        <p>Top-level groupings used for ingredient organisation (e.g. &quot;Vegetables&quot;, &quot;Dairy&quot;).</p>
        <div className="admin-toolbar">
          <div className="supplier-field">
            <label className="supplier-label" htmlFor="catName">Category Name</label>
            <input
              id="catName"
              className="supplier-input"
              placeholder="e.g. Vegetables"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={addCategory}>Add Category</button>
        </div>
        <div className="supplier-table-wrap">
          <table className="supplier-table">
            <thead><tr><th>#</th><th>Category Name</th></tr></thead>
            <tbody>
              {categories.map((c, i) => (
                <tr key={c.id}><td>{i + 1}</td><td>{c.category_name}</td></tr>
              ))}
              {!categories.length ? <tr><td colSpan={2}>No categories yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Canonical Ingredients */}
      <section className="filter-section">
        <h2 className="dashboard-title">Canonical Ingredients</h2>
        <p>The authoritative ingredient list. Aliases are mapped to these entries.</p>
        <div className="admin-toolbar">
          <div className="supplier-field">
            <label className="supplier-label" htmlFor="ingName">Ingredient Name</label>
            <input
              id="ingName"
              className="supplier-input"
              placeholder="e.g. Tomato"
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
            />
          </div>
          <div className="supplier-field">
            <label className="supplier-label" htmlFor="ingCat">Category (optional)</label>
            <select
              id="ingCat"
              className="supplier-select"
              value={newIngredientCategory}
              onChange={(e) => setNewIngredientCategory(e.target.value)}
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.category_name}</option>
              ))}
            </select>
          </div>
          <button type="button" className="btn btn-primary" onClick={addIngredient}>Add Ingredient</button>
        </div>
        <div className="supplier-table-wrap">
          <table className="supplier-table">
            <thead><tr><th>Ingredient</th><th>Category</th></tr></thead>
            <tbody>
              {ingredients.map((i) => (
                <tr key={i.id}>
                  <td>{i.ingredient_name}</td>
                  <td>{i.category_name ?? "—"}</td>
                </tr>
              ))}
              {!ingredients.length ? <tr><td colSpan={2}>No ingredients yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Taxonomy Aliases */}
      <section className="filter-section">
        <h2 className="dashboard-title">Taxonomy Aliases</h2>
        <p>
          Map a specific item name (e.g. <strong>Roma Tomato</strong>) to a canonical ingredient
          (e.g. <strong>Tomato</strong>). Used for substitution when exact stock is unavailable.
        </p>

        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="ok-text">{message}</p> : null}

        <div className="admin-toolbar">
          <div className="supplier-field">
            <label className="supplier-label" htmlFor="aliasName">Specific Name (alias)</label>
            <input
              id="aliasName"
              className="supplier-input"
              placeholder="e.g. Roma Tomato"
              value={newAliasName}
              onChange={(e) => setNewAliasName(e.target.value)}
            />
          </div>
          <div className="supplier-field">
            <label className="supplier-label" htmlFor="aliasTarget">Maps To (canonical)</label>
            <select
              id="aliasTarget"
              className="supplier-select"
              value={newAliasTarget}
              onChange={(e) => setNewAliasTarget(e.target.value)}
            >
              <option value="">— Select ingredient —</option>
              {ingredients.map((i) => (
                <option key={i.id} value={i.id}>{i.ingredient_name}</option>
              ))}
            </select>
          </div>
          <button type="button" className="btn btn-primary" onClick={addAlias}>Map Alias</button>
        </div>

        <div className="supplier-table-wrap">
          <table className="supplier-table">
            <thead>
              <tr>
                <th>Specific Name (alias)</th>
                <th>Canonical Ingredient</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {aliases.map((a) => (
                <tr key={a.id}>
                  <td>{a.alias_name}</td>
                  <td>{a.canonical_name}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary supplier-action-btn"
                      onClick={() => deleteAlias(a.id, a.alias_name)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {!aliases.length ? <tr><td colSpan={3}>No aliases defined yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
