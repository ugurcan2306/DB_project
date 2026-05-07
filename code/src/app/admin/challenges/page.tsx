import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { AppNavbar } from "@/components/app-navbar";
import { listAllChallenges } from "@/lib/challenges";
import { AdminChallengesClient } from "./admin-challenges-client";

export default async function AdminChallengesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  const profile = await getUserProfile(session.user.id);
  const challenges = await listAllChallenges();

  return (
    <>
      <AppNavbar
        activePath="admin"
        user={profile ? { name: profile.fullName, role: profile.role, avatarUrl: profile.avatarUrl } : null}
      />
      <main className="container">
        <div className="page-header">
          <h1>Admin — Challenge Management</h1>
          <p>Create, edit, and delete kitchen challenges.</p>
        </div>
        <AdminChallengesClient challenges={challenges} />
      </main>
    </>
  );
}
