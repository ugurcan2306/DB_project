import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as { recipeId?: string; rating?: number };

  if (!body.recipeId) return NextResponse.json({ error: "recipeId is required." }, { status: 400 });
  if (!body.rating || body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }

  const db = getDb();

  await db.query(
    `INSERT INTO cook_logs (user_id, recipe_id, rating)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, recipe_id)
     DO UPDATE SET rating = EXCLUDED.rating, cooked_at = NOW()`,
    [session.user.id, body.recipeId, body.rating],
  );

  return NextResponse.json({ success: true, rating: body.rating });
}
