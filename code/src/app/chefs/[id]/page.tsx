import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { AppNavbar } from "@/components/app-navbar";
import { ChefProfileClient } from "@/components/chef-profile-client";

type Params = { params: Promise<{ id: string }> };

export default async function ChefProfilePage({ params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { id } = await params;
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
        <ChefProfileClient chefId={id} />
      </main>
    </>
  );
}
