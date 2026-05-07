import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { AppNavbar } from "@/components/app-navbar";
import { OrdersClient } from "@/components/orders-client";

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const profile = await getUserProfile(session.user.id);
  if (!profile) redirect("/dashboard");

  return (
    <>
      <AppNavbar
        activePath="orders"
        user={
          profile
            ? { name: profile.fullName, role: profile.role, avatarUrl: profile.avatarUrl }
            : null
        }
      />
      <main className="container">
        <div className="page-header">
          <h1>My Orders</h1>
          <p>Track your active order and review your order history.</p>
        </div>
        <OrdersClient />
      </main>
    </>
  );
}

