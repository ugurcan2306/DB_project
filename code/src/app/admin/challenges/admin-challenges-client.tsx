"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ChallengeRow, BadgeRow } from "@/lib/challenges";

type IngredientOption = { id: string; ingredient_name: string };

type FormState = {
  title: string;
  description: string;
  emoji: string;
  starts_at: string;
  ends_at: string;
  target_count: string;
  required_tag: string;
  required_ingredient_id: string;
  reward_badge_id: string;
  reward_points: string;
};

const EMOJI_PALETTE = ["🏆", "🥗", "♻️", "⏱️", "🌱", "🌶️", "🌿", "⚡", "🍅", "🥦", "🍞", "🍳", "🍝", "🍣", "🌾"];

const DIETARY_TAGS = [
  { value: "", label: "— Any (no tag requirement) —" },
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "keto", label: "Keto" },
  { value: "gluten_free", label: "Gluten-Free" },
  { value: "dairy_free", label: "Dairy-Free" },
  { value: "nut_free", label: "Nut-Free" },
  { value: "halal", label: "Halal" },
  { value: "paleo", label: "Paleo" },
];

function defaultEndsAt(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return toDateTimeLocal(d.toISOString());
}

function nowLocal(): string {
  return toDateTimeLocal(new Date().toISOString());
}

function emptyForm(): FormState {
  return {
    title: "",
    description: "",
    emoji: "🏆",
    starts_at: nowLocal(),
    ends_at: defaultEndsAt(7),
    target_count: "3",
    required_tag: "",
    required_ingredient_id: "",
    reward_badge_id: "",
    reward_points: "100",
  };
}

function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminChallengesClient({
  challenges,
  badges,
  ingredients,
}: {
  challenges: ChallengeRow[];
  badges: BadgeRow[];
  ingredients: IngredientOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [ingredientSearch, setIngredientSearch] = useState("");

  const filteredIngredients = useMemo(() => {
    const q = ingredientSearch.trim().toLowerCase();
    const list = q
      ? ingredients.filter((i) => i.ingredient_name.toLowerCase().includes(q))
      : ingredients;
    return list.slice(0, 80);
  }, [ingredients, ingredientSearch]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  function openCreate() {
    setForm(emptyForm());
    setEditing(null);
    setCreating(true);
    setError(null);
    setIngredientSearch("");
  }

  function openEdit(c: ChallengeRow) {
    setForm({
      title: c.title,
      description: c.description,
      emoji: c.emoji,
      starts_at: toDateTimeLocal(c.starts_at),
      ends_at: toDateTimeLocal(c.ends_at),
      target_count: String(c.target_count),
      required_tag: c.required_tag ?? "",
      required_ingredient_id: c.required_ingredient_id ?? "",
      reward_badge_id: c.reward_badge_id ?? "",
      reward_points: String(c.reward_points),
    });
    setEditing(c.id);
    setCreating(false);
    setError(null);
    setIngredientSearch("");
  }

  function closeForm() {
    setEditing(null);
    setCreating(false);
    setForm(emptyForm());
    setError(null);
  }

  async function submit() {
    setError(null);
    if (!form.title.trim() || !form.description.trim() || !form.ends_at) {
      setError("Title, description, and end date are required.");
      return;
    }
    if (form.starts_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      setError("End date must be after start date.");
      return;
    }

    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      emoji: form.emoji.trim() || "🏆",
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: new Date(form.ends_at).toISOString(),
      target_count: Number(form.target_count) || 1,
      required_tag: form.required_tag.trim() || null,
      required_ingredient_id: form.required_ingredient_id || null,
      reward_badge_id: form.reward_badge_id || null,
      reward_points: Number(form.reward_points) || 100,
    };

    const url = editing ? `/api/admin/challenges/${editing}` : `/api/admin/challenges`;
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? `Request failed (${res.status})`);
      return;
    }

    closeForm();
    refresh();
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Delete challenge "${title}"? This will also remove all participation and logs.`)) return;
    const res = await fetch(`/api/admin/challenges/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? `Delete failed (${res.status})`);
      return;
    }
    refresh();
  }

  const showForm = creating || editing !== null;

  const pickedIngredient = ingredients.find((i) => i.id === form.required_ingredient_id);
  const pickedBadge = badges.find((b) => b.id === form.reward_badge_id);

  return (
    <div className="admin-layout">
      {!showForm && (
        <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ color: "#666", margin: 0 }}>
            {challenges.length} challenge{challenges.length === 1 ? "" : "s"} configured.
          </p>
          <button className="btn btn-primary" onClick={openCreate} disabled={pending}>
            + New Challenge
          </button>
        </div>
      )}

      {error ? <p className="error-text">{error}</p> : null}

      {showForm && (
        <section className="filter-section" style={{ marginBottom: "1.5rem" }}>
          <h2 className="dashboard-title">{editing ? "Edit Challenge" : "Create New Challenge"}</h2>

          {/* Basic info */}
          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#4a3728", marginBottom: 10 }}>
              1. Basic info
            </h3>

            <div className="form-group auth-field">
              <label>Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Vegan Week"
                maxLength={160}
              />
            </div>

            <div className="form-group auth-field">
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="What participants need to do…"
                style={{ resize: "vertical" }}
              />
            </div>

            <div className="form-group auth-field">
              <label>Emoji</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  value={form.emoji}
                  onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                  maxLength={4}
                  style={{ width: 80, fontSize: "1.4rem", textAlign: "center" }}
                />
                <span style={{ color: "#888", fontSize: "0.82rem" }}>or pick one:</span>
                {EMOJI_PALETTE.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                    style={{
                      background: form.emoji === e ? "#fff0e3" : "#fff",
                      border: `2px solid ${form.emoji === e ? "#e07b39" : "#e8e0d8"}`,
                      borderRadius: 8,
                      padding: "4px 8px",
                      cursor: "pointer",
                      fontSize: "1.2rem",
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dates & target */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#4a3728", marginBottom: 10 }}>
              2. Time window & target
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label>Starts At</label>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Ends At</label>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.82rem", color: "#888" }}>Quick presets:</span>
              {[
                { label: "+ 7 days", days: 7 },
                { label: "+ 14 days", days: 14 },
                { label: "+ 30 days", days: 30 },
                { label: "+ 90 days", days: 90 },
              ].map((p) => (
                <button
                  key={p.days}
                  type="button"
                  className="btn btn-secondary supplier-action-btn"
                  onClick={() =>
                    setForm((f) => ({ ...f, starts_at: nowLocal(), ends_at: defaultEndsAt(p.days) }))
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="form-group auth-field" style={{ marginTop: 16 }}>
              <label>
                Target Count{" "}
                <span style={{ fontSize: "0.78rem", color: "#888", fontWeight: 400 }}>
                  — how many qualifying recipes the user must log to complete the challenge
                </span>
              </label>
              <input
                type="number"
                min={1}
                value={form.target_count}
                onChange={(e) => setForm({ ...form, target_count: e.target.value })}
              />
            </div>
          </div>

          {/* Qualifying conditions */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#4a3728", marginBottom: 10 }}>
              3. Qualifying conditions
              <span style={{ fontWeight: 400, color: "#888", fontSize: "0.82rem" }}>
                {" "}— a recipe counts only if BOTH conditions match (or are blank)
              </span>
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label>Required Dietary Tag</label>
                <select
                  value={form.required_tag}
                  onChange={(e) => setForm({ ...form, required_tag: e.target.value })}
                  className="supplier-select"
                >
                  {DIETARY_TAGS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Required Ingredient</label>
                {pickedIngredient ? (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      padding: "8px 12px",
                      background: "#fff0e3",
                      border: "2px solid #e07b39",
                      borderRadius: 8,
                    }}
                  >
                    <strong>{pickedIngredient.ingredient_name}</strong>
                    <button
                      type="button"
                      className="btn btn-secondary supplier-action-btn"
                      style={{ marginLeft: "auto" }}
                      onClick={() => setForm((f) => ({ ...f, required_ingredient_id: "" }))}
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="search"
                      className="supplier-input"
                      placeholder="Search ingredients (or leave blank)…"
                      value={ingredientSearch}
                      onChange={(e) => setIngredientSearch(e.target.value)}
                      style={{ marginBottom: 6 }}
                    />
                    <div
                      style={{
                        maxHeight: 140,
                        overflowY: "auto",
                        border: "1px solid #e6dccd",
                        borderRadius: 6,
                        background: "#fff",
                      }}
                    >
                      {filteredIngredients.length === 0 ? (
                        <p style={{ padding: "8px 12px", margin: 0, color: "#888", fontSize: "0.85rem" }}>
                          No ingredients match.
                        </p>
                      ) : (
                        filteredIngredients.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, required_ingredient_id: opt.id }))}
                            style={{
                              display: "block",
                              width: "100%",
                              padding: "6px 10px",
                              background: "#fff",
                              border: "none",
                              borderBottom: "1px solid #f5ece0",
                              cursor: "pointer",
                              textAlign: "left",
                              fontSize: "0.85rem",
                            }}
                          >
                            {opt.ingredient_name}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Rewards */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#4a3728", marginBottom: 10 }}>
              4. Rewards on completion
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label>Reward Badge</label>
                <select
                  value={form.reward_badge_id}
                  onChange={(e) => setForm({ ...form, reward_badge_id: e.target.value })}
                  className="supplier-select"
                >
                  <option value="">— No badge —</option>
                  {badges.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.badge_emoji} {b.badge_name}
                    </option>
                  ))}
                </select>
                {pickedBadge ? (
                  <p style={{ marginTop: 4, fontSize: "0.78rem", color: "#888" }}>
                    {pickedBadge.description ?? ""}
                  </p>
                ) : null}
              </div>

              <div className="form-group">
                <label>Reward Points</label>
                <input
                  type="number"
                  min={0}
                  value={form.reward_points}
                  onChange={(e) => setForm({ ...form, reward_points: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem" }}>
            <button className="btn btn-primary btn-large" onClick={submit} disabled={pending}>
              {editing ? "Save Changes" : "Create Challenge"}
            </button>
            <button className="btn btn-secondary" onClick={closeForm} disabled={pending}>
              Cancel
            </button>
          </div>
        </section>
      )}

      <section className="filter-section">
        <h2 className="dashboard-title">All Challenges</h2>
        <div className="supplier-table-wrap">
          <table className="supplier-table">
            <thead>
              <tr>
                <th></th>
                <th>Title</th>
                <th>Tag</th>
                <th>Required Ingredient</th>
                <th>Target</th>
                <th>Badge</th>
                <th>Points</th>
                <th>Participants</th>
                <th>Days Left</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {challenges.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "1.5rem" }}>
                    No challenges yet. Create one to get started.
                  </td>
                </tr>
              )}
              {challenges.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontSize: "1.4rem" }}>{c.emoji}</td>
                  <td>
                    <strong>{c.title}</strong>
                    <div style={{ fontSize: "0.82rem", color: "#666" }}>{c.description}</div>
                  </td>
                  <td>{c.required_tag ?? "—"}</td>
                  <td>{c.required_ingredient_name ?? "—"}</td>
                  <td>{c.target_count}</td>
                  <td>
                    {c.badge_name ? (
                      <span>{c.badge_emoji} {c.badge_name}</span>
                    ) : "—"}
                  </td>
                  <td>+{c.reward_points}</td>
                  <td>{c.participants}</td>
                  <td>{c.days_left}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button
                        className="btn btn-secondary supplier-action-btn"
                        onClick={() => openEdit(c)}
                        disabled={pending}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-secondary supplier-action-btn"
                        style={{ color: "#b42318", borderColor: "#f0c4c4" }}
                        onClick={() => remove(c.id, c.title)}
                        disabled={pending}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
