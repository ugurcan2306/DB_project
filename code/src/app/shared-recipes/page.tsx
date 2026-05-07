import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { AppNavbar } from "@/components/app-navbar";
import { SharedRecipesClient } from "@/components/shared-recipes-client";

export default async function SharedRecipesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { role } = session.user;
  if (role !== "home_cook" && role !== "verified_chef") redirect("/dashboard");

  const profile = await getUserProfile(session.user.id);

  return (
    <>
      <AppNavbar
        activePath="shared-recipes"
        user={
          profile
            ? { name: profile.fullName, role: profile.role, avatarUrl: profile.avatarUrl }
            : null
        }
      />
      <main className="container">
        <div className="page-header">
          <h1>Shared Recipes</h1>
          <p>Recipes published by verified chefs. Add any to your meal lists.</p>
        </div>
        <SharedRecipesClient />
      </main>
    </>
  );
}
