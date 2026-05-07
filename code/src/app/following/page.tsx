import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { AppNavbar } from "@/components/app-navbar";
import { FollowingFeedClient } from "@/components/following-feed-client";

export default async function FollowingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const profile = await getUserProfile(session.user.id);

  return (
    <>
      <AppNavbar
        activePath="following"
        user={
          profile
            ? { name: profile.fullName, role: profile.role, avatarUrl: profile.avatarUrl }
            : null
        }
      />
      <main className="container">
        <div className="page-header" style={{ textAlign: "center" }}>
          <h1>Your Feed</h1>
          <p>Latest recipes from the chefs you follow</p>
        </div>
        <FollowingFeedClient />
      </main>
    </>
  );
}
