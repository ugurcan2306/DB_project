import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logChallengeRecipe } from "@/lib/challenges";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let body: { recipeTitle?: string; tags?: string; ingredients?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const recipeTitle = (body.recipeTitle ?? "").trim();
  if (!recipeTitle) {
    return NextResponse.json({ error: "Recipe title is required" }, { status: 400 });
  }
  try {
    const result = await logChallengeRecipe(
      session.user.id,
      id,
      recipeTitle,
      body.tags ?? "",
      body.ingredients ?? "",
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to log recipe" },
      { status: 400 },
    );
  }
}
