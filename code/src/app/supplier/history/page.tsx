import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { AppNavbar } from "@/components/app-navbar";
import { SupplierHistoryClient } from "@/components/supplier-history-client";

export default async function SupplierHistoryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "local_supplier") {
    redirect("/dashboard");
  }

  const profile = await getUserProfile(session.user.id);

  return (
    <>
      <AppNavbar
        activePath="supplier_history"
        user={
          profile
            ? {
                name: profile.fullName,
                role: profile.role,
                avatarUrl: profile.avatarUrl,
              }
            : null
        }
      />
      <main className="container">
        <SupplierHistoryClient />
      </main>
    </>
  );
}
