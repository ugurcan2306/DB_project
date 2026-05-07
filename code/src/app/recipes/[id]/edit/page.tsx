import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { AppNavbar } from "@/components/app-navbar";
import { EditRecipeClient } from "@/components/edit-recipe-client";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { role } = session.user;
  if (role !== "home_cook" && role !== "verified_chef") redirect("/dashboard");

  const { id } = await params;
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
          <h1>Edit Recipe</h1>
          <p>Update your recipe details.</p>
        </div>
        <EditRecipeClient recipeId={id} />
      </main>
    </>
  );
}
