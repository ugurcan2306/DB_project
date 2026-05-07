import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { AppNavbar } from "@/components/app-navbar";
import { getDb } from "@/db/pool";

async function getPlatformStats() {
  try {
    const db = getDb();
    const result = await db.query<{ recipe_count: string; chef_count: string; challenge_count: string }>(`
      SELECT
        (SELECT COUNT(*) FROM recipes WHERE is_published = TRUE AND is_deleted = FALSE) AS recipe_count,
        (SELECT COUNT(*) FROM verified_chefs WHERE is_verified = TRUE) AS chef_count,
        (SELECT COUNT(*) FROM challenges WHERE ends_at > NOW()) AS challenge_count
    `);
    const row = result.rows[0];
    return {
      recipes: parseInt(row.recipe_count),
      chefs: parseInt(row.chef_count),
      challenges: parseInt(row.challenge_count),
    };
  } catch {
    return { recipes: 0, chefs: 0, challenges: 0 };
  }
}

const FEATURES = [
  {
    emoji: "🍽️",
    title: "Discover Recipes",
    desc: "Browse curated recipes published by verified chefs. Add any to your personal meal lists.",
    href: "/shared-recipes",
    cta: "Browse Recipes",
  },
  {
    emoji: "🏆",
    title: "Kitchen Challenges",
    desc: "Join weekly cooking challenges, track your progress, and earn badges along the way.",
    href: "/challenges",
    cta: "View Challenges",
  },
  {
    emoji: "🛒",
    title: "Fresh Ingredients",
    desc: "Order seasonal, locally-sourced ingredients directly from verified local suppliers.",
    href: "/dashboard",
    cta: "Go to Dashboard",
  },
];

export default async function Home() {
  const session = await getServerSession(authOptions);
  const profile = session?.user ? await getUserProfile(session.user.id) : null;
  const stats = await getPlatformStats();

  const firstName = profile?.fullName?.split(" ")[0] ?? null;

  return (
    <>
      <AppNavbar
        activePath="discover"
        user={
          session?.user && profile
            ? { name: profile.fullName, role: profile.role, avatarUrl: profile.avatarUrl }
            : null
        }
      />

      <main style={{ minHeight: "calc(100vh - 64px)" }}>
        {/* Hero */}
        <section
          style={{
            background: "linear-gradient(135deg, #fff8f2 0%, #fdf3e8 60%, #fce8d4 100%)",
            borderBottom: "1px solid #f0e0cc",
            padding: "72px 24px 64px",
          }}
        >
          <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                background: "#fff0e3",
                color: "#b85a1f",
                border: "1px solid #f0d4b4",
                borderRadius: 999,
                padding: "4px 16px",
                fontSize: "0.8rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              Farm to Table Platform
            </div>
            <h1
              style={{
                fontSize: "2.8rem",
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                color: "#1f1f1f",
                marginBottom: 16,
              }}
            >
              {firstName ? (
                <>Welcome back, <span style={{ color: "#e07b39" }}>{firstName}</span></>
              ) : (
                <>Cook, Share &amp; <span style={{ color: "#e07b39" }}>Discover</span></>
              )}
            </h1>
            <p
              style={{
                fontSize: "1.05rem",
                color: "#666",
                lineHeight: 1.7,
                marginBottom: 32,
                maxWidth: 560,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              {firstName
                ? "Pick up where you left off — explore new recipes, check your challenges, or browse fresh ingredients."
                : "A platform for home cooks and verified chefs. Explore recipes, join cooking challenges, and order fresh ingredients from local suppliers."}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {session?.user ? (
                <>
                  <Link href="/shared-recipes" className="btn btn-primary btn-large">Shared Recipes</Link>
                  <Link href="/challenges" className="btn btn-secondary btn-large">View Challenges</Link>
                </>
              ) : (
                <>
                  <Link href="/register" className="btn btn-primary btn-large">Get Started</Link>
                  <Link href="/login" className="btn btn-secondary btn-large">Sign In</Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section style={{ background: "#fff", borderBottom: "1px solid #f0e6dd", padding: "28px 24px" }}>
          <div
            style={{
              maxWidth: 640,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <StatBlock value={stats.recipes} label="Recipes Published" />
            <Divider />
            <StatBlock value={stats.chefs} label="Verified Chefs" />
            <Divider />
            <StatBlock value={stats.challenges} label="Active Challenges" />
          </div>
        </section>

        {/* Features */}
        <section style={{ padding: "56px 24px 72px", maxWidth: 1100, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {FEATURES.map((f) => (
              <div
                key={f.title}
                style={{
                  background: "#fff",
                  border: "1px solid #f0e6dd",
                  borderRadius: 20,
                  padding: "32px 28px",
                  boxShadow: "0 2px 16px rgb(0 0 0 / 5%)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: "2.2rem", lineHeight: 1, marginBottom: 4 }}>{f.emoji}</div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1f1f1f" }}>{f.title}</h3>
                <p style={{ fontSize: "0.9rem", color: "#666", lineHeight: 1.6, flex: 1 }}>{f.desc}</p>
                <Link
                  href={f.href}
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "#e07b39",
                    marginTop: 8,
                    display: "inline-block",
                  }}
                >
                  {f.cta} →
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: "2rem", fontWeight: 800, color: "#e07b39", lineHeight: 1 }}>{value}</span>
      <span
        style={{
          fontSize: "0.78rem",
          color: "#999",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 48, background: "#f0e6dd", flexShrink: 0, margin: "0 24px" }} />;
}
