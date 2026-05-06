import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { AppNavbar } from "@/components/app-navbar";
import { CreateRecipeClient } from "@/components/create-recipe-client";

export default async function CreateRecipePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { role } = session.user;
  if (role !== "home_cook" && role !== "verified_chef") redirect("/dashboard");

  const profile = await getUserProfile(session.user.id);

  return (
    <>
      <AppNavbar
        activePath="create-recipe"
        user={
          profile
            ? { name: profile.fullName, role: profile.role, avatarUrl: profile.avatarUrl }
            : null
        }
      />
      <main className="container">
        <div className="page-header">
          <h1>Create a Recipe</h1>
          <p>Share your culinary creation with the community.</p>
        </div>
        <CreateRecipeClient />
      </main>
    </>
  );
}
