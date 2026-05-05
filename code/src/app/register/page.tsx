"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { REGISTERABLE_USER_ROLES, type RegisterableUserRole } from "@/types/user";

const ROLE_LABELS: Record<RegisterableUserRole, string> = {
  home_cook: "Home Cook",
  verified_chef: "Chef",
  local_supplier: "Supplier",
};

type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
  role: RegisterableUserRole;
};

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RegisterableUserRole>("home_cook");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const payload: RegisterPayload = { fullName, email, password, role };

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Registration failed.");
      return;
    }

    router.push("/login");
  }

  return (
    <>
      <header className="navbar">
        <Link href="/" className="logo">
          <span>🍴</span> FarmToTable
        </Link>
        <nav>
          <Link href="/">Discover</Link>
          <Link href="/login">Login</Link>
          <Link href="/register" className="active">
            Register
          </Link>
        </nav>
      </header>

      <div className="container auth-wrap">
        <div className="filter-section auth-card register-card">
          <div className="page-header auth-header">
            <h1>Create an Account</h1>
            <p>Join FarmToTable🍴 as a Home Cook, Chef, or Supplier</p>
          </div>

          <form onSubmit={onSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            <div className="form-group full auth-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                placeholder="Create a password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <div className="form-group full auth-field">
              <label>Register As</label>
              <div className="chip-group">
                {REGISTERABLE_USER_ROLES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`chip ${role === item ? "active" : ""}`}
                    onClick={() => setRole(item)}
                  >
                    {ROLE_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>

            {error ? <p className="error-text">{error}</p> : null}

            <button disabled={loading} type="submit" className="btn btn-primary btn-block btn-large auth-submit">
              {loading ? "Registering..." : "Register"}
            </button>

            <div className="auth-footer">
              {"Already have an account? "}
              <Link href="/login">Login here</Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
