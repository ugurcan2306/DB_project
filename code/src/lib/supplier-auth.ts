import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireSupplierSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "local_supplier") {
    return null;
  }

  return session;
}
