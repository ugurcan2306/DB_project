import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SupplierPortalClient } from "@/components/supplier-portal-client";
import { getUserProfile } from "@/lib/profile";
import { AppNavbar } from "@/components/app-navbar";

export default async function SupplierPage() {
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
        activePath="supplier"
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
        <div className="page-header">
          <h1>Local Supplier Inventory Portal</h1>
          <p>Manage stock, batches, and incoming orders.</p>
        </div>
        <SupplierPortalClient />
      </main>
    </>
  );
}
