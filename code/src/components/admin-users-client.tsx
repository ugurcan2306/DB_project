"use client";

import { useEffect, useState } from "react";

type AdminUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  chef_verified: boolean | null;
};

const ROLES = ["", "home_cook", "verified_chef", "local_supplier", "admin"];

export function AdminUsersClient() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers(role: string) {
    const url = role ? `/api/admin/users?role=${role}` : "/api/admin/users";
    const res = await fetch(url);
    const data = (await res.json()) as { users?: AdminUser[] };
    setUsers(data.users ?? []);
  }

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const url = roleFilter ? `/api/admin/users?role=${roleFilter}` : "/api/admin/users";
        const res = await fetch(url);
        const data = (await res.json()) as { users?: AdminUser[] };
        if (active) {
          setUsers(data.users ?? []);
        }
      } catch {
        if (active) {
          setError("Failed to load users.");
        }
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [roleFilter]);

  async function toggleActive(user: AdminUser) {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !user.is_active }),
    });
    if (!res.ok) {
      setError("Failed to update user.");
      return;
    }
    setMessage(`${user.full_name} ${user.is_active ? "deactivated" : "activated"}.`);
    await loadUsers(roleFilter);
  }

  async function toggleVerified(user: AdminUser) {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_verified: !user.chef_verified }),
    });
    if (!res.ok) {
      setError("Failed to update chef verification.");
      return;
    }
    setMessage(`${user.full_name} ${user.chef_verified ? "unverified" : "verified"}.`);
    await loadUsers(roleFilter);
  }

  return (
    <div className="admin-layout">
      <section className="filter-section">
        <h2 className="dashboard-title">User Management</h2>
        <p>View, activate/deactivate, and verify users across all roles.</p>

        <div className="admin-toolbar">
          <div className="supplier-field">
            <label className="supplier-label" htmlFor="roleFilter">Filter by Role</label>
            <select
              id="roleFilter"
              className="supplier-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r || "All Roles"}</option>
              ))}
            </select>
          </div>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="ok-text">{message}</p> : null}

        <div className="supplier-table-wrap">
          <table className="supplier-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Chef Verified</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.full_name}</td>
                  <td>{user.email}</td>
                  <td><span className="role-badge">{user.role}</span></td>
                  <td>
                    <span className={user.is_active ? "status-active" : "status-inactive"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    {user.role === "verified_chef"
                      ? (user.chef_verified ? "✓ Verified" : "Pending")
                      : "—"}
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="admin-actions-cell">
                    <button
                      type="button"
                      className={`btn supplier-action-btn ${user.is_active ? "btn-secondary" : "btn-primary"}`}
                      onClick={() => toggleActive(user)}
                    >
                      {user.is_active ? "Deactivate" : "Activate"}
                    </button>
                    {user.role === "verified_chef" ? (
                      <button
                        type="button"
                        className={`btn supplier-action-btn ${user.chef_verified ? "btn-secondary" : "btn-primary"}`}
                        onClick={() => toggleVerified(user)}
                      >
                        {user.chef_verified ? "Unverify" : "Verify Chef"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!users.length ? (
                <tr>
                  <td colSpan={7}>No users found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
