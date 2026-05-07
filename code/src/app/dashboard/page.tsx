import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { toDisplayRole } from "@/lib/auth-utils";
import { getUserProfile } from "@/lib/profile";
import { AppNavbar } from "@/components/app-navbar";
import type { UserRole } from "@/types/user";

type QuickLink = { label: string; desc: string; href: string; emoji: string };

function getQuickLinks(role: UserRole): QuickLink[] {
  switch (role) {
    case "home_cook":
      return [
        { emoji: "📋", label: "My Meal Lists", desc: "Organise your saved recipes into lists.", href: "/meal-lists" },
        { emoji: "🍽️", label: "Shared Recipes", desc: "Browse recipes from verified chefs.", href: "/shared-recipes" },
        { emoji: "🏆", label: "Challenges", desc: "Join cooking challenges and earn badges.", href: "/challenges" },
        { emoji: "👤", label: "Edit Profile", desc: "Update your name and delivery address.", href: "/profile" },
      ];
    case "verified_chef":
      return [
        { emoji: "📖", label: "My Recipes", desc: "View and manage all your recipes.", href: "/recipes/my" },
        { emoji: "✏️", label: "Create Recipe", desc: "Publish a new recipe for the community.", href: "/recipes/create" },
        { emoji: "💰", label: "Royalties", desc: "Track earnings from cooks and reviews.", href: "/royalties" },
        { emoji: "🏆", label: "Challenges", desc: "Participate in cooking challenges.", href: "/challenges" },
        { emoji: "👤", label: "Edit Profile", desc: "Update your bio and avatar.", href: "/profile" },
      ];
    case "local_supplier":
      return [
        { emoji: "📦", label: "Inventory", desc: "Manage your ingredient stock and prices.", href: "/supplier" },
        { emoji: "🕓", label: "Order History", desc: "Review past orders and fulfilments.", href: "/supplier/history" },
        { emoji: "👤", label: "Edit Profile", desc: "Update your business name and address.", href: "/profile" },
      ];
    case "admin":
      return [
        { emoji: "👥", label: "User Management", desc: "View and manage all platform users.", href: "/admin/users" },
        { emoji: "🌿", label: "Taxonomy", desc: "Manage ingredient categories and aliases.", href: "/admin/taxonomy" },
        { emoji: "📊", label: "Analytics", desc: "Platform-wide usage statistics.", href: "/admin/analytics" },
        { emoji: "🏆", label: "Challenges", desc: "Oversee active cooking challenges.", href: "/challenges" },
      ];
    default:
      return [];
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/dashboard");

  const profile = await getUserProfile(session.user.id);
  const role = session.user.role as UserRole;
  const firstName = profile?.fullName?.split(" ")[0] ?? session.user.name ?? "there";
  const links = getQuickLinks(role);

  return (
    <>
      <AppNavbar
        activePath="dashboard"
        user={profile ? { name: profile.fullName, role: profile.role, avatarUrl: profile.avatarUrl } : null}
      />

      <main style={{ minHeight: "calc(100vh - 64px)", background: "#f9f5f1" }}>
        {/* Header */}
        <section
          style={{
            background: "linear-gradient(135deg, #fff8f2 0%, #fdf3e8 60%, #fce8d4 100%)",
            borderBottom: "1px solid #f0e0cc",
            padding: "48px 24px 40px",
          }}
        >
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "3px solid #e07b39" }}
                />
              ) : (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "#e07b39",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {firstName[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <h1 style={{ fontSize: "1.9rem", fontWeight: 800, color: "#1f1f1f", margin: 0, lineHeight: 1.2 }}>
                  Hello, <span style={{ color: "#e07b39" }}>{firstName}</span>
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      background: "#fff0e3",
                      color: "#b85a1f",
                      border: "1px solid #f0d4b4",
                      borderRadius: 999,
                      padding: "2px 12px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {toDisplayRole(role)}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "#999" }}>{profile?.email ?? session.user.email}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 20 }}>
            Quick Access
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  background: "#fff",
                  border: "1px solid #f0e6dd",
                  borderRadius: 16,
                  padding: "24px 20px",
                  textDecoration: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  boxShadow: "0 2px 12px rgb(0 0 0 / 4%)",
                  transition: "box-shadow 0.15s",
                }}
              >
                <span style={{ fontSize: "2rem", lineHeight: 1 }}>{l.emoji}</span>
                <span style={{ fontSize: "1rem", fontWeight: 700, color: "#1f1f1f" }}>{l.label}</span>
                <span style={{ fontSize: "0.85rem", color: "#888", lineHeight: 1.5 }}>{l.desc}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Profile Info */}
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 56px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 20 }}>
            Account Info
          </h2>
          <div
            style={{
              background: "#fff",
              border: "1px solid #f0e6dd",
              borderRadius: 16,
              padding: "24px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxShadow: "0 2px 12px rgb(0 0 0 / 4%)",
            }}
          >
            <InfoRow label="Full Name" value={profile?.fullName ?? session.user.name ?? "—"} />
            <InfoRow label="Email" value={profile?.email ?? session.user.email ?? "—"} />
            <InfoRow label="Role" value={toDisplayRole(role)} />
            {role === "home_cook" && profile?.deliveryAddress && (
              <InfoRow label="Delivery Address" value={profile.deliveryAddress} />
            )}
            {role === "local_supplier" && profile?.businessName && (
              <InfoRow label="Business" value={profile.businessName} />
            )}
            {role === "verified_chef" && profile?.chefBio && (
              <InfoRow label="Bio" value={profile.chefBio} />
            )}
            <div style={{ marginTop: 4 }}>
              <Link href="/profile" style={{ fontSize: "0.88rem", fontWeight: 700, color: "#e07b39" }}>
                Edit Profile →
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", borderBottom: "1px solid #f9f5f1", paddingBottom: 10 }}>
      <span style={{ minWidth: 140, fontSize: "0.85rem", color: "#999", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: "0.9rem", color: "#1f1f1f" }}>{value}</span>
    </div>
  );
}
