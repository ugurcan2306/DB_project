import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { toDisplayRole } from "@/lib/auth-utils";
import { ProfileSettingsClient } from "@/components/profile-settings-client";
import { AppNavbar } from "@/components/app-navbar";

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const profile = await getUserProfile(session.user.id);
  if (!profile) {
    redirect("/dashboard");
  }

  return (
    <>
      <AppNavbar
        activePath="profile"
        user={{
          name: profile.fullName,
          role: profile.role,
          avatarUrl: profile.avatarUrl,
        }}
      />

      <main className="container profile-layout">
        <section className="filter-section profile-card">
          <div className="profile-avatar-wrap">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt={`${profile.fullName} avatar`} className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-fallback">{initialsFromName(profile.fullName)}</div>
            )}
          </div>
          <div>
            <h1 className="dashboard-title">{profile.fullName}</h1>
            <p>{profile.email}</p>
            <p className="profile-role-tag">{toDisplayRole(profile.role)}</p>
          </div>
        </section>

        <ProfileSettingsClient
          initialProfile={{
            fullName: profile.fullName,
            email: profile.email,
            role: profile.role,
            avatarUrl: profile.avatarUrl,
            deliveryAddress: profile.deliveryAddress,
            businessName: profile.businessName,
            businessAddress: profile.businessAddress,
            chefBio: profile.chefBio,
          }}
        />
      </main>
    </>
  );
}
