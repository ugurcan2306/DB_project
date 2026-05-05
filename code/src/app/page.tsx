import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { AppNavbar } from "@/components/app-navbar";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const profile = session?.user ? await getUserProfile(session.user.id) : null;

  return (
    <>
      <AppNavbar
        activePath="discover"
        user={
          session?.user && profile
            ? {
                name: profile.fullName,
                role: profile.role,
                avatarUrl: profile.avatarUrl,
              }
            : null
        }
      />

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
            {session?.user?.role === "local_supplier" ? (
              <Link href="/supplier" className="btn btn-secondary">
                Open Supplier Portal
              </Link>
            ) : null}
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
