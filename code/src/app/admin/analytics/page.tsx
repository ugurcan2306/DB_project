import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { AppNavbar } from "@/components/app-navbar";
import { AdminAnalyticsClient } from "@/components/admin-analytics-client";

export default async function AdminAnalyticsPage() {
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
          <h1>Admin — System Analytics</h1>
          <p>Platform-wide insights: trending ingredients, revenue, and user statistics.</p>
        </div>
        <AdminAnalyticsClient />
      </main>
    </>
  );
}
