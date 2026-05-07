"use client";

import { useEffect, useState } from "react";

type HistoryEntry = {
  id: string;
  action_type: string;
  quantity_change: string | null;
  note: string | null;
  created_at: string;
  ingredient_name: string | null;
  supplier_order_id: string | null;
};

const ACTION_OPTIONS = [
  "all",
  "initialize_stock",
  "add_batch",
  "remove_stock",
  "remove_ingredient",
  "manual_update",
  "order_status_update",
  "order_fulfilled",
] as const;

const ACTION_LABELS: Record<(typeof ACTION_OPTIONS)[number], string> = {
  all: "All Actions",
  initialize_stock: "Initialize Stock",
  add_batch: "Add Batch",
  remove_stock: "Remove Stock",
  remove_ingredient: "Remove Ingredient",
  manual_update: "Manual Update",
  order_status_update: "Order Status Update",
  order_fulfilled: "Order Fulfilled",
};

function prettyActionLabel(actionType: string) {
  const mapped = ACTION_LABELS[actionType as (typeof ACTION_OPTIONS)[number]];
  if (mapped) return mapped;
  return actionType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function SupplierHistoryClient() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [action, setAction] = useState<(typeof ACTION_OPTIONS)[number]>("all");
  const [ingredient, setIngredient] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("action", action);
    if (ingredient.trim()) params.set("ingredient", ingredient.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const response = await fetch(`/api/supplier/history?${params.toString()}`);
    const data = (await response.json()) as { error?: string; entries?: HistoryEntry[] };
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Failed to load history.");
      return;
    }
    setEntries(data.entries ?? []);
  }

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const params = new URLSearchParams();
        params.set("action", "all");
        const response = await fetch(`/api/supplier/history?${params.toString()}`);
        const data = (await response.json()) as { error?: string; entries?: HistoryEntry[] };
        if (!active) return;
        if (!response.ok) {
          setError(data.error ?? "Failed to load history.");
          return;
        }
        setEntries(data.entries ?? []);
      } catch {
        if (active) {
          setError("Failed to load history.");
        }
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="filter-section">
      <h2 className="dashboard-title">Supplier Action History</h2>
      <p>Track ingredient actions: initialize, add, remove, updates, and order events.</p>

      <div className="supplier-form-grid history-filter-grid">
        <div className="supplier-field">
          <label className="supplier-label" htmlFor="historyAction">
            Action
          </label>
          <select id="historyAction" className="supplier-select" value={action} onChange={(event) => setAction(event.target.value as (typeof ACTION_OPTIONS)[number])}>
            {ACTION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {ACTION_LABELS[option]}
              </option>
            ))}
          </select>
        </div>

        <div className="supplier-field">
          <label className="supplier-label" htmlFor="historyIngredient">
            Ingredient
          </label>
          <input
            id="historyIngredient"
            className="supplier-input"
            placeholder="e.g. Tomato"
            value={ingredient}
            onChange={(event) => setIngredient(event.target.value)}
          />
        </div>

        <div className="supplier-field">
          <label className="supplier-label" htmlFor="historyFrom">
            From
          </label>
          <input id="historyFrom" className="supplier-input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </div>

        <div className="supplier-field">
          <label className="supplier-label" htmlFor="historyTo">
            To
          </label>
          <input id="historyTo" className="supplier-input" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>

        <div className="supplier-field supplier-field-action">
          <button type="button" className="btn btn-primary supplier-add-btn" onClick={loadHistory} disabled={loading}>
            {loading ? "Loading..." : "Apply Filters"}
          </button>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="supplier-table-wrap">
        <table className="supplier-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Ingredient</th>
              <th>Quantity Change</th>
              <th>Order Ref</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.created_at).toLocaleString()}</td>
                <td>{prettyActionLabel(entry.action_type)}</td>
                <td>{entry.ingredient_name ?? "-"}</td>
                <td>{entry.quantity_change ?? "-"}</td>
                <td>{entry.supplier_order_id ? entry.supplier_order_id.slice(0, 8) : "-"}</td>
                <td>{entry.note ?? "-"}</td>
              </tr>
            ))}
            {!entries.length ? (
              <tr>
                <td colSpan={6}>No history entries found for selected filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
