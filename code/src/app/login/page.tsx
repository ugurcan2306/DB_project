"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppNavbar } from "@/components/app-navbar";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const callbackUrl = "/dashboard";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!result || result.error) {
      setError("Invalid credentials.");
      return;
    }

    router.push(callbackUrl);
  }

  return (
    <>
      <AppNavbar activePath="login" />

      <div className="container auth-wrap">
        <div className="filter-section auth-card">
          <div className="page-header auth-header">
            <h1>Login to FarmToTable🍴</h1>
            <p>Welcome back! Please enter your details.</p>
          </div>

          <form onSubmit={onSubmit}>
            <div className="form-group full auth-field">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                required
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="form-group full auth-field">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error ? <p className="error-text">{error}</p> : null}

            <button disabled={loading} type="submit" className="btn btn-primary btn-block btn-large">
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="or-sep">- OR -</div>

            <button type="button" disabled className="btn btn-secondary btn-block btn-large">
              G Login with Google
            </button>

            <div className="auth-footer">
              {"Don't have an account? "}
              <Link href="/register">Register here</Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
