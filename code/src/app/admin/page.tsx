import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { AppNavbar } from "@/components/app-navbar";
import Link from "next/link";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  const profile = await getUserProfile(session.user.id);

  return (
    <>
      <AppNavbar
        activePath="admin"
        user={profile ? { name: profile.fullName, role: profile.role, avatarUrl: profile.avatarUrl } : null}
      />
      <main className="container">
        <div className="page-header">
          <h1>Admin Panel</h1>
          <p>Platform administration tools. Use the sections below to manage the system.</p>
        </div>

        <div className="analytics-grid">
          <Link href="/admin/users" className="analytics-card admin-nav-card">
            <h3>User Management</h3>
            <p>View, activate/deactivate users and verify chefs across all roles.</p>
            <span className="admin-nav-arrow">→</span>
          </Link>

          <Link href="/admin/taxonomy" className="analytics-card admin-nav-card">
            <h3>Taxonomy Mapping</h3>
            <p>
              Manage ingredient categories, canonical ingredients, and alias mappings (e.g. &quot;Roma Tomato&quot; → &quot;Tomato&quot;).
            </p>
            <span className="admin-nav-arrow">→</span>
          </Link>

          <Link href="/admin/analytics" className="analytics-card admin-nav-card">
            <h3>System Analytics</h3>
            <p>Platform insights: trending ingredients, revenue breakdown, and user statistics.</p>
            <span className="admin-nav-arrow">→</span>
          </Link>
        </div>
      </main>
    </>
  );
}
