import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { toDisplayRole } from "@/lib/auth-utils";
import { LogoutButton } from "@/components/logout-button";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <>
      <header className="navbar">
        <Link href="/" className="logo">
          <span>🍴</span> FarmToTable
        </Link>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/dashboard" className="active">
            Dashboard
          </Link>
          <LogoutButton />
        </nav>
      </header>

      <main className="container">
        <section className="filter-section">
          <h1 className="dashboard-title">Protected Dashboard</h1>
          <p>You are authenticated.</p>
          <p>
            <strong>Name:</strong> {session.user.name}
          </p>
          <p>
            <strong>Email:</strong> {session.user.email}
          </p>
          <p>
            <strong>Role:</strong> {toDisplayRole(session.user.role)}
          </p>
        </section>
      </main>
    </>
  );
}
