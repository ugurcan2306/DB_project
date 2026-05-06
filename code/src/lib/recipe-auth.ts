import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireRecipeCreatorSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const { role } = session.user;
  if (role !== "home_cook" && role !== "verified_chef") return null;
  return session;
}
