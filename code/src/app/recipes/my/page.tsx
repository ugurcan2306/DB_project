import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { AppNavbar } from "@/components/app-navbar";
import { MyRecipesClient } from "@/components/my-recipes-client";

export default async function MyRecipesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { role } = session.user;
  if (role !== "home_cook" && role !== "verified_chef") redirect("/dashboard");

  const profile = await getUserProfile(session.user.id);

  return (
    <>
      <AppNavbar
        activePath="my-recipes"
        user={
          profile
            ? { name: profile.fullName, role: profile.role, avatarUrl: profile.avatarUrl }
            : null
        }
      />
      <main className="container">
        <div className="page-header">
          <h1>My Recipes</h1>
          <p>All recipes you have created.</p>
        </div>
        <MyRecipesClient userRole={role} />
      </main>
    </>
  );
}
