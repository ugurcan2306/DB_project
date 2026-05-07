"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ChallengeRow } from "@/lib/challenges";

type FormState = {
  title: string;
  description: string;
  emoji: string;
  ends_at: string;
  target_count: string;
  required_tag: string;
  reward_points: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  emoji: "🏆",
  ends_at: "",
  target_count: "1",
  required_tag: "",
  reward_points: "100",
};

function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminChallengesClient({ challenges }: { challenges: ChallengeRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setCreating(true);
    setError(null);
  }

  function openEdit(c: ChallengeRow) {
    setForm({
      title: c.title,
      description: c.description,
      emoji: c.emoji,
      ends_at: toDateTimeLocal(c.ends_at),
      target_count: String(c.target_count),
      required_tag: c.required_tag ?? "",
      reward_points: String(c.reward_points),
    });
    setEditing(c.id);
    setCreating(false);
    setError(null);
  }

  function closeForm() {
    setEditing(null);
    setCreating(false);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function submit() {
    setError(null);
    if (!form.title.trim() || !form.description.trim() || !form.ends_at) {
      setError("Title, description, and end date are required.");
      return;
    }

    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      emoji: form.emoji.trim() || "🏆",
      ends_at: new Date(form.ends_at).toISOString(),
      target_count: Number(form.target_count) || 1,
      required_tag: form.required_tag.trim() || null,
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

  return (
    <div>
      {!showForm && (
        <div style={{ marginBottom: "1rem" }}>
          <button className="btn btn-primary" onClick={openCreate} disabled={pending}>
            + New Challenge
          </button>
        </div>
      )}

      {error ? <div className="alert-error">{error}</div> : null}

      {showForm && (
        <div className="dashboard-card" style={{ marginBottom: "1.5rem" }}>
          <div className="section-title">{editing ? "Edit Challenge" : "Create Challenge"}</div>
          <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "1fr 1fr" }}>
            <label>
              <span>Title</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Vegan Week"
              />
            </label>
            <label>
              <span>Emoji</span>
              <input
                value={form.emoji}
                onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                maxLength={4}
              />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="What participants need to do…"
              />
            </label>
            <label>
              <span>Ends At</span>
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              />
            </label>
            <label>
              <span>Target Count</span>
              <input
                type="number"
                min={1}
                value={form.target_count}
                onChange={(e) => setForm({ ...form, target_count: e.target.value })}
              />
            </label>
            <label>
              <span>Required Tag (optional)</span>
              <input
                value={form.required_tag}
                onChange={(e) => setForm({ ...form, required_tag: e.target.value })}
                placeholder="e.g. vegan"
              />
            </label>
            <label>
              <span>Reward Points</span>
              <input
                type="number"
                min={0}
                value={form.reward_points}
                onChange={(e) => setForm({ ...form, reward_points: e.target.value })}
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button className="btn btn-primary" onClick={submit} disabled={pending}>
              {editing ? "Save Changes" : "Create"}
            </button>
            <button className="btn btn-secondary" onClick={closeForm} disabled={pending}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Title</th>
              <th>Tag</th>
              <th>Target</th>
              <th>Reward</th>
              <th>Participants</th>
              <th>Days Left</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {challenges.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "2rem" }}>
                  No challenges yet. Create one to get started.
                </td>
              </tr>
            )}
            {challenges.map((c) => (
              <tr key={c.id}>
                <td style={{ fontSize: "1.5rem" }}>{c.emoji}</td>
                <td>
                  <strong>{c.title}</strong>
                  <div style={{ fontSize: "0.85em", color: "#666" }}>{c.description}</div>
                </td>
                <td>{c.required_tag ?? "—"}</td>
                <td>{c.target_count}</td>
                <td>+{c.reward_points} pts</td>
                <td>{c.participants}</td>
                <td>{c.days_left}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button className="btn btn-secondary" onClick={() => openEdit(c)} disabled={pending}>
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
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
    </div>
  );
}
