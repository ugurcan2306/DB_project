import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <>
      <header className="navbar">
        <Link href="/" className="logo">
          <span>🍴</span> FarmToTable
        </Link>
        <nav>
          <Link href="/" className="active">
            Discover
          </Link>
          {session?.user ? <Link href="/dashboard">Dashboard</Link> : null}
          {!session?.user ? <Link href="/login">Login</Link> : null}
          {!session?.user ? <Link href="/register">Register</Link> : null}
        </nav>
      </header>

      <main className="container">
        <section className="filter-section">
          <div className="page-header">
            <h1>Culinary Discovery Platform</h1>
            <p>Phase 1 bootstrap is ready: role-based authentication and database foundation.</p>
          </div>
          <div className="home-actions">
            <Link href="/dashboard" className="btn btn-primary">
              Open Dashboard
            </Link>
            {!session?.user ? (
              <Link href="/login" className="btn btn-secondary">
                Go to Login
              </Link>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}
