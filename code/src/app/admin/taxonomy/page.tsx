import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { AppNavbar } from "@/components/app-navbar";
import { AdminTaxonomyClient } from "@/components/admin-taxonomy-client";

export default async function AdminTaxonomyPage() {
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
          <h1>Admin — Taxonomy Management</h1>
          <p>Manage ingredient categories, canonical ingredients, and alias mappings.</p>
        </div>
        <AdminTaxonomyClient />
      </main>
    </>
  );
}
